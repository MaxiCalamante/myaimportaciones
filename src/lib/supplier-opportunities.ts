import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "./admin-auth";
import { AdminFormError } from "./admin-action-result";
import { readAllPages } from "./read-all-pages";
import {
  calculateSuggestedRetailPrice,
  calculateCommercialMargin,
  getCategoryMarginBenchmark,
  evaluateWithMarketBenchmark,
} from "./supplier-commercial";
import { fetchSupplierPage, readSupplierHtml } from "./supplier-url";
import { productImageUrl } from "./admin-product";
import { publicReadRules } from "./supplier-automation";
import { supplierSourceUrl } from "./supplier-intelligence";
import { calculateImport, classifyImport, type ImportPolicy } from "./import-costs";
import { acquisitionFxFresh } from "./supplier-usdt";
import { matchSupplierProduct, matchTargets, type MatchProduct } from './supplier-matching';

function estimateOpportunityCost(offer: { id: string; title: string; brand: string | null; origin_cost: number; source_url: string; cost_checked_at: string | null }, config: { acquisitionArsPerUsd: number; shippingPaidByMya: boolean; shippingArs: number }, policy: ImportPolicy): number | null {
  try {
    const inches = Number(offer.title.match(/\b(\d{2,3})\s*(?:pulgadas|polegadas|["″]|'')/i)?.[1]) || undefined;
    const result = calculateImport({ lines: [{ id: offer.id, title: offer.title, quantity: 1, currency: "USD", origin: Number(offer.origin_cost), acquisitionArsPerUnit: Number(config.acquisitionArsPerUsd), originUnitsPerUsd: 1, kind: classifyImport(offer.title, offer.brand ?? ""), inches, sourceConfirmed: false, sourceReference: offer.source_url, observedAt: offer.cost_checked_at ?? undefined }], expenses: config.shippingPaidByMya ? [{ label: "Transporte", amountArs: config.shippingArs, method: "quantity" }] : [], expensesConfirmed: false, targetMargin: 20 }, policy);
    return result.totalArs;
  } catch { return null; }
}

export interface SupplierOpportunity {
  offerId: string;
  supplierId: string;
  supplierName: string;
  supplierKey: string;
  externalId: string | null;
  title: string;
  cleanTitle: string;
  brand: string | null;
  model: string | null;
  sourceUrl: string;
  originCostUsd: number;
  exchangeRate: number;
  paseroPercent: number;
  landedCostArs: number;
  suggestedRetailPrice: number;
  profitArs: number;
  marginPercent: number;
  markupPercent: number;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  categoryBenchmarkMargin: number;
  marginHealth: "excelente" | "adecuado" | "bajo" | "negativo";
  availability: "in_stock" | "out_of_stock" | "unknown";
  pricingNeedsReview: boolean;
  lastCheckedAt: string | null;
  mlPrice?: number | null;
  mlUrl?: string | null;
  mlCheckedAt?: string | null;
}

export interface OpportunitySearchParams {
  query?: string;
  supplierId?: string;
  categorySlug?: string;
  onlyInStock?: boolean;
  minMargin?: number;
  sortBy?: "profit_desc" | "margin_desc" | "cost_asc" | "cost_desc" | "title_asc";
  page?: number;
  pageSize?: number;
}

export interface OpportunitySearchResult {
  items: SupplierOpportunity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: {
    totalOpportunities: number;
    inStockCount: number;
    avgMarginPercent: number;
    avgProfitArs: number;
  };
}

export interface ImportOpportunityInput {
  offerId: string;
  categoryId: string;
  isActive?: boolean;
}

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
}

/**
 * Limpia prefijos comunes de catálogos mayoristas para presentar un título comercial claro.
 */
export function cleanWholesaleTitle(title: string): string {
  if (!title) return "";
  let clean = title.trim();
  clean = clean.replace(/\b(?:SKU|COD|REF|ID):\s*[A-Z0-9-]+\b/gi, "");
  clean = clean.replace(/\bMARCA:\s*[A-Z0-9-]+\b/gi, "");

  // Eliminar prefijos de perfumería
  clean = clean.replace(/^PERF\s+(TESTER\s+)?(?:FEM|MASC|UNI)\s+/i, (_match, tester) => tester ? "Perfume Tester " : "Perfume ");
  clean = clean.replace(/^PERF\s+(TESTER\s+)?/i, (_match, tester) => tester ? "Perfume Tester " : "Perfume ");
  clean = clean.replace(/^MIST\s+(?:CORP\s+)?/i, "Body Mist ");

  // Normalizar mayúsculas sostenidas si la mayoría está en mayúsculas
  const words = clean.split(/\s+/);
  const upperCount = words.filter((w) => w === w.toUpperCase() && w.length > 1).length;
  if (words.length > 2 && upperCount >= words.length - 2 && !clean.includes("SSD") && !clean.includes("RAM")) {
    clean = words
      .map((w, idx) => {
        // Mantener siglas técnicas
        if (/^(EDP|EDT|RAM|SSD|USB|BT|GB|TB|LED|RGB|W|V|SIM|SWAP)$/i.test(w)) return w.toUpperCase();
        if (/^(X|\d+ML|\d+G|\d+KG|\d+W)$/i.test(w)) return w;
        // El código del fabricante no es una palabra: conservarlo tal como figura.
        if (/^[A-Z][A-Z0-9/-]*\d[A-Z0-9/-]*$/i.test(w) && w.length >= 5) return w.toUpperCase();
        if (w.toLowerCase() === "perfume" || w.toLowerCase() === "body" || w.toLowerCase() === "mist") return w;
        if (idx === 0) return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        if (["de", "del", "la", "el", "en", "para", "con", "y"].includes(w.toLowerCase())) return w.toLowerCase();
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(" ");
  }

  return clean.replace(/\s{2,}/g, " ").trim();
}

/**
 * Detecta la categoría y subcategoría de la tienda más adecuada según el título y palabras clave.
 */
export function detectStoreCategory(
  title: string,
  categories: CategoryInfo[],
  brand?: string | null
): { categoryId: string; categorySlug: string; categoryName: string } {
  const t = `${title} ${brand || ""}`.toLowerCase();

  // Helper para buscar categoría por slug
  const findCat = (slug: string) => categories.find((c) => c.slug === slug);


  // 1. Perfumería
  if (/\b(?:lattafa|asdaf|yara|khamrah|bade'e|asad|qaed|fakhar|ejaazi|orientica|al haramain|afnan)\b/i.test(t)) {
    const c = findCat("perfumes-arabes") || findCat("perfumeria");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }
  if (/body mist|body splash|bruma|mist corp/i.test(t)) {
    const c = findCat("body-mists-brumas") || findCat("perfumeria");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }
  if (/perfum|edp|edt|cologne|eau de/i.test(t)) {
    const c = findCat("perfumeria");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }

  // 2. Cosmética Coreana (K-Beauty)
  if (/\b(?:medicube|skin1004|anua|celimax|althea|beauty of joseon|cosrx|torriden|round lab|dr\.?jart)\b/i.test(t)) {
    if (/serum|ampoule|ampolla/i.test(t)) {
      const c = findCat("serums-ampollas") || findCat("cosmetica-coreana");
      if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
    }
    if (/pad|toner|tónico/i.test(t)) {
      const c = findCat("tonicos-pads") || findCat("cosmetica-coreana");
      if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
    }
    if (/cleanser|limpiador|oil cleanser|foam/i.test(t)) {
      const c = findCat("limpieza-exfoliantes") || findCat("cosmetica-coreana");
      if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
    }
    if (/sun|sunscreen|solar|bloqueador/i.test(t)) {
      const c = findCat("proteccion-solar") || findCat("cosmetica-coreana");
      if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
    }
    const c = findCat("cosmetica-coreana");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }
  if (/tree hut|exfoliante corporal|crema corporal/i.test(t)) {
    const c = findCat("lociones-corporales-fragancias") || findCat("cosmetica-coreana");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }

  // 3. Cuidado Capilar
  if (/karseell|shiseido fino|kérastase|kerastase|foligain|shampoo|acondicionador|maca power|mascara cap|botox capilar/i.test(t)) {
    if (/mascara|mask|tratamiento|botox|essence/i.test(t)) {
      const c = findCat("tratamientos-mascarillas-capilares") || findCat("cuidado-capilar");
      if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
    }
    if (/shampoo|acondicionador/i.test(t)) {
      const c = findCat("shampoos-acondicionadores") || findCat("cuidado-capilar");
      if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
    }
    if (/oil|aceite|leave-in/i.test(t)) {
      const c = findCat("aceites-leave-in") || findCat("cuidado-capilar");
      if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
    }
    const c = findCat("cuidado-capilar");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }

  // 4. Herramientas & Equipamiento
  if (/total|wadfow|rotomartillo|amoladora|taladro|caladora|sierra circular|soldadora|hidrolavadora/i.test(t)) {
    if (/pistola.*(?:pintura|pintar)|(?:paint|spray)\s+gun/i.test(t)) {
      const c = findCat("pistolas-pintura-calor") || findCat("herramientas-equipamiento");
      if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
    }
    if (/rotomartillo|taladro/i.test(t)) {
      const c = findCat("taladros-rotomartillos") || findCat("herramientas-equipamiento");
      if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
    }
    if (/amoladora|pulidora/i.test(t)) {
      const c = findCat("amoladoras-pulidoras") || findCat("herramientas-equipamiento");
      if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
    }
    if (/sierra|caladora/i.test(t)) {
      const c = findCat("sierras-corte") || findCat("herramientas-equipamiento");
      if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
    }
    if (/soldadora/i.test(t)) {
      const c = findCat("soldadoras-inverter") || findCat("herramientas-equipamiento");
      if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
    }
    if (/hidrolavadora/i.test(t)) {
      const c = findCat("hidrolavadoras-alta-presion") || findCat("herramientas-equipamiento");
      if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
    }
    const c = findCat("herramientas-equipamiento");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }

  // 5. Electrónica & Smartphones & Informática & Smartwatches & Audio
  if (/iphone|galaxy|spark|armor|smartphone|xiaomi|swap|redmi|poco|motorola/i.test(t)) {
    const c = findCat("electronica-smartphones") || findCat("electronica");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }
  if (/macbook|notebook|laptop|vivobook|thinkpad|zenbook|asus|hp|lenovo/i.test(t)) {
    const c = findCat("electronica-notebooks") || findCat("electronica");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }
  if (/\b(mac mini|mac studio|computadora de escritorio|pc de escritorio)\b/i.test(t)) {
    const c = findCat("electronica-computadoras-escritorio") || findCat("electronica");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }
  if (/ipad|tablet|tab s/i.test(t)) {
    const c = findCat("electronica-tablets") || findCat("electronica");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }
  if (/watch|smartwatch|apple watch|garmin|amazfit|reloj/i.test(t)) {
    const c = findCat("electronica-smartphones") || findCat("electronica");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }
  if (/apple|airpods|airpod|earpods|charger|cargador|magsafe/i.test(t)) {
    const c = findCat("electronica-smartphones") || findCat("electronica");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }
  if (/\b(tv|televisor|televis[aã]o|smart\s*tv|placa de video|placa de v[ií]deo|geforce|radeon|playstation|xbox)\b|ssd|ram|kingston|sandisk|pendrive|auricular|headphone|gamer|silla|monitor|teclado|mouse|jbl|alexa|echo|soundbar|parlante/i.test(t)) {
    const c = findCat("electronica");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }

  // 6. Si la marca es claramente tecnológica (ej: Apple, Samsung, Xiaomi)
  if (/apple|samsung|xiaomi|asus|lenovo|hp|sony|dell|acer|logitech|corsair/i.test(brand || "")) {
    const c = findCat("electronica");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }

  // Sin coincidencia clara, la categoría debe elegirse en el editor.
  return { categoryId: "", categorySlug: "", categoryName: "Sin clasificar" };
}

/**
 * Consulta todas las oportunidades comerciales disponibles en los proveedores
 * aplicando filtros de rentabilidad, stock y ordenamiento.
 */
export async function searchSupplierOpportunities(
  params: OpportunitySearchParams = {},
  options?: { client?: SupabaseClient }
): Promise<OpportunitySearchResult> {
  const db = options?.client ?? (await getAdminClient());

  // 1. Cargar proveedores y categorías en paralelo
  const [suppliersRes, categoriesRes, marketRefsRes, productsWithModelRes, settingsRes, policyRes] = await Promise.all([
    db.from("suppliers").select("id, name, official_key, is_active, freshness_hours").eq("is_active", true),
    db.from("categories").select("id, name, slug, parent_id, image_url").order("name"),
    db.from("supplier_market_references").select("product_id, price_ars, source_url, checked_at").eq("identity_verified", true).is("variant_id", null).is("last_error", null).gte("checked_at", new Date(Date.now()-48*3600000).toISOString()).not("price_ars", "is", null),
    db.from("products").select("id,title,brand,model,sku,specifications,source_url,has_variants").eq("has_variants",false).is("deleted_at",null),
    db.from("supplier_tracking_settings").select("config").eq("id", true).maybeSingle(),
    db.from("import_cost_policies").select("config").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (suppliersRes.error || categoriesRes.error || marketRefsRes.error || productsWithModelRes.error || settingsRes.error || policyRes.error || !settingsRes.data?.config || !policyRes.data?.config) throw new Error("No se pudo leer la configuración de proveedores y costos.");
  const trackingConfig = settingsRes.data.config;
  const importPolicy = policyRes.data.config;
  const fx = Number(trackingConfig.acquisitionArsPerUsd);
  const pasero = Number(policyRes.data.config.generalPercent);
  if (!(fx > 0) || !(pasero >= 0)) throw new Error("Revisá la configuración de costos y cotización.");
  const suppliers = suppliersRes.data ?? [];
  const categories: CategoryInfo[] = (categoriesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parent_id,
    imageUrl: c.image_url,
  }));
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const marketRefMap = new Map((marketRefsRes.data ?? []).map(ref => [ref.product_id, {
    priceArs: Number(ref.price_ars), url: ref.source_url, checkedAt: ref.checked_at,
  }]));
  const marketTargets = matchTargets(((productsWithModelRes.data ?? []) as MatchProduct[]).filter(p=>marketRefMap.has(p.id)), []);

  // 2. Cargar todas las ofertas sin producto asignado con costo de origen mayor a 0
  const unassignedOffers = await readAllPages<{
    id: string;
    supplier_id: string;
    external_id: string | null;
    title: string;
    brand: string | null;
    model: string | null;
    source_url: string;
    origin_cost: number;
    currency: string;
    availability: string | null;
    last_success_at: string | null;
    availability_checked_at: string | null;
    cost_checked_at: string | null;
    last_error: string | null;
    evidence: {availabilityBasis?:string;sourceTitle?:string} | null;
  }>((from, to) =>
    db
      .from("supplier_offers")
      .select("id, supplier_id, external_id, title, brand, model, source_url, origin_cost, currency, availability, last_success_at, availability_checked_at, cost_checked_at, last_error, evidence")
      .is("product_id", null)
      .gt("origin_cost", 0)
      .eq("currency", "USD")
      .order("id")
      .range(from, to)
  );

  // 3. Procesar y enriquecer cada oportunidad con el motor financiero comercial
  const allOpportunities: SupplierOpportunity[] = unassignedOffers.filter(offer => supplierMap.has(offer.supplier_id)).map((offer) => {
    const sup = supplierMap.get(offer.supplier_id);
    const cleanTitle = cleanWholesaleTitle(offer.title);
    const cat = detectStoreCategory(offer.title, categories, offer.brand);

    // Estimación general: las tarifas particulares y cotizaciones requieren revisión.
    const estimatedCost = estimateOpportunityCost(offer, trackingConfig, importPolicy);
    const totalLandedArs = estimatedCost ?? 0;
    const benchmark = getCategoryMarginBenchmark(cat.categorySlug, offer.title);

    const match = matchSupplierProduct({title:offer.evidence?.sourceTitle ?? offer.title,brand:offer.brand ?? '',model:offer.model ?? ''},marketTargets);
    const mlRef = match.status === 'exact' && match.target ? marketRefMap.get(match.target.productId) : undefined;

    let suggestedPrice: number;
    if (mlRef && mlRef.priceArs > 0) {
      const mlEval = evaluateWithMarketBenchmark(totalLandedArs, 0, mlRef.priceArs, cat.categorySlug, offer.title);
      suggestedPrice = mlEval.suggestedPrice;
    } else {
      const { suggestedPrice: baseSuggested } = calculateSuggestedRetailPrice(totalLandedArs, cat.categorySlug, offer.title, {
        psychologicalEnding: true,
      });
      suggestedPrice = baseSuggested;
    }

    const { marginPercent, markupPercent, profitArs } = calculateCommercialMargin(suggestedPrice, totalLandedArs);

    let marginHealth: "excelente" | "adecuado" | "bajo" | "negativo" = "adecuado";
    if (marginPercent < 0) {
      marginHealth = "negativo";
    } else if (marginPercent < benchmark.minMargin) {
      marginHealth = "bajo";
    } else if (marginPercent >= benchmark.benchmarkMargin) {
      marginHealth = "excelente";
    }

    const checked = offer.availability_checked_at ? Date.parse(offer.availability_checked_at) : NaN;
    const fresh = Number.isFinite(checked) && checked <= Date.now() + 300000 && Date.now() - checked <= Number(sup?.freshness_hours || 24) * 3600000;
    const avail = fresh && !offer.last_error && (!offer.evidence?.availabilityBasis || offer.evidence.availabilityBasis === 'explicit') && (offer.availability === "in_stock" || offer.availability === "out_of_stock")
      ? offer.availability
      : "unknown";

    return {
      offerId: offer.id,
      supplierId: offer.supplier_id,
      supplierName: sup?.name ?? "Proveedor Mayorista",
      supplierKey: sup?.official_key ?? "unknown",
      externalId: offer.external_id,
      title: offer.title,
      cleanTitle,
      brand: offer.brand,
      model: offer.model,
      sourceUrl: offer.source_url,
      originCostUsd: offer.origin_cost,
      exchangeRate: fx,
      paseroPercent: pasero,
      landedCostArs: totalLandedArs,
      suggestedRetailPrice: suggestedPrice,
      profitArs,
      marginPercent,
      markupPercent,
      categoryId: cat.categoryId,
      categorySlug: cat.categorySlug,
      categoryName: cat.categoryName,
      categoryBenchmarkMargin: benchmark.benchmarkMargin,
      marginHealth,
      availability: avail,
      pricingNeedsReview: estimatedCost === null || !importPolicy.confirmed || importPolicy.carrierFxDate !== new Date().toISOString().slice(0, 10) || !offer.cost_checked_at || !Number.isFinite(Date.parse(offer.cost_checked_at)) || Date.now() - Date.parse(offer.cost_checked_at) > Number(sup?.freshness_hours || 24) * 3600000 || !acquisitionFxFresh(trackingConfig) || /\b(iphone|tv|televisor)\b/i.test(offer.title),
      lastCheckedAt: offer.last_success_at,
      mlPrice: mlRef ? mlRef.priceArs : null,
      mlUrl: mlRef ? mlRef.url : null,
      mlCheckedAt: mlRef ? mlRef.checkedAt : null,
    };
  });

  // 4. Aplicar filtros de búsqueda
  const q = (params.query || "").toLowerCase().trim();
  const filtered = allOpportunities.filter((opp) => {
    // Proveedor
    if (params.supplierId && opp.supplierId !== params.supplierId) return false;

    // Categoría
    if (params.categorySlug && opp.categorySlug !== params.categorySlug) {
      // Si la categoría buscada es padre, permitir subcategorías
      const targetCategory = categories.find((c) => c.slug === params.categorySlug);
      if (targetCategory) {
        const childCategories = categories.filter((c) => c.parentId === targetCategory.id);
        const childSlugs = new Set([targetCategory.slug, ...childCategories.map((c) => c.slug)]);
        if (!childSlugs.has(opp.categorySlug)) return false;
      } else {
        return false;
      }
    }

    // Stock confirmado
    if (params.onlyInStock && opp.availability !== "in_stock") return false;

    // Margen mínimo
    if (params.minMargin && opp.marginPercent < params.minMargin) return false;

    // Texto de búsqueda
    if (q) {
      const matchText = `${opp.title} ${opp.cleanTitle} ${opp.brand || ""} ${opp.model || ""} ${opp.supplierName}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }

    return true;
  });

  // 5. Ordenamiento
  const sortBy = params.sortBy || "profit_desc";
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "profit_desc":
        return b.profitArs - a.profitArs;
      case "margin_desc":
        return b.marginPercent - a.marginPercent;
      case "cost_asc":
        return a.originCostUsd - b.originCostUsd;
      case "cost_desc":
        return b.originCostUsd - a.originCostUsd;
      case "title_asc":
        return a.cleanTitle.localeCompare(b.cleanTitle);
      default:
        return b.profitArs - a.profitArs;
    }
  });

  // 6. Métricas y estadísticas del universo filtrado
  const total = filtered.length;
  const inStockCount = filtered.filter((o) => o.availability === "in_stock").length;
  const totalMargin = filtered.reduce((acc, o) => acc + o.marginPercent, 0);
  const totalProfit = filtered.reduce((acc, o) => acc + o.profitArs, 0);
  const avgMarginPercent = total > 0 ? Math.round((totalMargin / total) * 10) / 10 : 0;
  const avgProfitArs = total > 0 ? Math.round(totalProfit / total) : 0;

  // 7. Paginación
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize || 24));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;
  const items = filtered.slice(offset, offset + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    stats: {
      totalOpportunities: total,
      inStockCount,
      avgMarginPercent,
      avgProfitArs,
    },
  };
}


/** Only accept the primary structured product with an exact supplier ID. Variant listings need review. */
export function imageFromOpportunityPage(html: string, offer: { external_id: string | null; variant_key: string | null; source_url: string }): string | null {
  if (!offer.external_id || !["base", `listing:${offer.external_id}`].includes(offer.variant_key ?? "")) return null;
  // Related-item lists may contain the same SKU. Only a top-level Product is accepted.
  const products: Record<string, unknown>[] = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const item = JSON.parse(match[1]);
      if (item && !Array.isArray(item) && (item["@type"] === "Product" || (Array.isArray(item["@type"]) && item["@type"].includes("Product"))) && String(item.productID ?? item.sku ?? "") === offer.external_id) products.push(item);
    } catch { /* malformed structured data is not evidence */ }
  }
  if (products.length !== 1) return null;
  const raw = products[0].image;
  const image = Array.isArray(raw) ? raw[0] : raw;
  const url = typeof image === "string" ? image : image && typeof image === "object" ? (image as Record<string, unknown>).url : null;
  if (typeof url !== "string") return null;
  try { return productImageUrl(new URL(url, offer.source_url).href) || null; } catch { return null; }
}

/** Infer a model only when the supplier title contains exactly one unambiguous code. */
export function opportunityModel(title: string, explicitModel: string | null): string {
  if (explicitModel?.trim()) return explicitModel.trim();
  const candidates = (title.toUpperCase().match(/\b[A-Z][A-Z0-9/-]*\d[A-Z0-9/-]*\b/g) ?? [])
    .filter(value => value.length >= 5 && !/^(IPHONE|WIFI|USB|SSD|RAM|LED|IOS)/.test(value));
  const unique = [...new Set(candidates)];
  return unique.length === 1 ? unique[0] : "";
}

/** Extrae tanto la portada principal como las imágenes secundarias del carrusel o galería del proveedor. */
export function opportunityImagesFromPage(
  html: string,
  offer: { external_id: string | null; variant_key: string | null; source_url: string }
): { mainImage: string | null; galleryImages: string[] } {
  const baseMain = imageFromOpportunityPage(html, offer);
  if (!baseMain) return { mainImage: null, galleryImages: [] };

  // Elevar a versión de alta resolución en tiendas Tray (1500px en vez de 400px o qm)
  const cleanUrl = (u: string) => u.replace(/\/produtos\/(?:400|qm)\//, "/produtos/1500/");
  const mainImage = cleanUrl(baseMain);

  const gallerySet = new Set<string>();
  gallerySet.add(mainImage);

  // 1. Extraer imágenes secundarias de JSON-LD
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const item = JSON.parse(match[1]);
      if (
        item &&
        !Array.isArray(item) &&
        (item["@type"] === "Product" || (Array.isArray(item["@type"]) && item["@type"].includes("Product"))) &&
        String(item.productID ?? item.sku ?? "") === offer.external_id
      ) {
        const raw = item.image;
        const list = Array.isArray(raw) ? raw : [raw];
        for (const entry of list) {
          const u = typeof entry === "string" ? entry : entry && typeof entry === "object" ? (entry as Record<string, unknown>).url : null;
          if (typeof u === "string") {
            try {
              const full = productImageUrl(new URL(cleanUrl(u), offer.source_url).href);
              if (full) gallerySet.add(full);
            } catch {}
          }
        }
      }
    } catch {}
  }

  // 2. Extraer imágenes secundarias del HTML vinculadas a este producto específico
  const trayIdMatch = offer.source_url.match(/-(\d+)\.html/);
  const trayId = trayIdMatch ? trayIdMatch[1] : null;

  const imgRegex = /(?:src|data-zoom-image|data-image|data-large|data-image-large-src)=["']([^"']+)["']/gi;
  for (const m of html.matchAll(imgRegex)) {
    const rawUrl = m[1];
    // En Tray (Total Herramientas), filtrar estrictamente por el ID de producto para no incluir productos relacionados
    if (trayId && !rawUrl.includes(`/img/${trayId}/produtos/`)) continue;
    if (!trayId && !/produtos|product|gallery|foto|large/i.test(rawUrl)) continue;

    try {
      const full = productImageUrl(new URL(cleanUrl(rawUrl), offer.source_url).href);
      if (full) gallerySet.add(full);
    } catch {}
  }

  const galleryImages = [mainImage, ...[...gallerySet].filter((u) => u !== mainImage)].slice(0, 8);
  return { mainImage, galleryImages };
}

export async function opportunityProductImages(
  db: SupabaseClient,
  offer: { supplier_id: string; external_id: string | null; variant_key: string | null; source_url: string }
): Promise<{ mainImage: string | null; galleryImages: string[] }> {
  try {
    const { data: supplier, error } = await db.from("suppliers").select("*").eq("id", offer.supplier_id).eq("is_active", true).single();
    if (error || !supplier || !supplier.automation_authorized || !["total", "star-company", "atacado-usa", "atacado-connect"].includes(supplier.official_key)) {
      return { mainImage: null, galleryImages: [] };
    }
    const url = supplierSourceUrl(offer.source_url, supplier);
    const rules = await publicReadRules(url);
    const slot = await db.rpc("reserve_supplier_source_slot_v1", { supplier_input: offer.supplier_id, delay_input: rules.delay });
    if (slot.error) return { mainImage: null, galleryImages: [] };
    if (slot.data) await new Promise(resolve => setTimeout(resolve, Number(slot.data)));
    const response = await fetchSupplierPage(url, "MYA-SupplierCheck/1.0");
    if (!response.ok) return { mainImage: null, galleryImages: [] };
    supplierSourceUrl(response.url, supplier);
    const html = await readSupplierHtml(response);
    return opportunityImagesFromPage(html, offer);
  } catch {
    return { mainImage: null, galleryImages: [] };
  }
}

export function buildRichProductDescription(params: {title:string;brand:string;model:string;categorySlug:string;categoryName:string}):string {
  return [params.title.trim(), params.brand ? `Marca informada: ${params.brand}.` : '', params.model ? `Modelo informado: ${params.model}.` : ''].filter(Boolean).join('\n');
}

export async function importSupplierOpportunity(
  input: ImportOpportunityInput,
  options?: { client?: SupabaseClient }
): Promise<{ success: boolean; productId: string; slug: string; title: string; isActive: boolean; outcome: string }> {
  const db = options?.client ?? (await getAdminClient());
  if (input.isActive === true) throw new AdminFormError("Importá como borrador y aprobá la publicación en Importación masiva y revisión de catálogo.");
  const { previewCatalogImport, readCatalogJob } = await import('./supplier-catalog-import');
  const preview = await previewCatalogImport(db, {filters:{},offerIds:[input.offerId],allMatching:false,categoryId:input.categoryId,limit:1});
  const confirmed = await db.rpc('control_catalog_import_job_v1',{job_input:preview.jobId,action_input:'confirm'});
  if (confirmed.error) throw new AdminFormError('No se pudo confirmar el borrador.');
  const processed = await db.rpc('process_catalog_import_job_v1',{job_input:preview.jobId,limit_input:1});
  if (processed.error) throw new AdminFormError('El lote quedó registrado; revisá el progreso antes de reintentar.');
  const result = await readCatalogJob(db,preview.jobId), item=result.items[0];
  if (!item?.product_id) throw new AdminFormError(item?.error || 'La oferta requiere revisión de identidad en el panel de importación.');
  const product=await db.from('products').select('id,slug,title,is_active').eq('id',item.product_id).single();
  if(product.error) throw new AdminFormError('Se guardó el borrador; actualizá el catálogo para verlo.');
  return {success:true,productId:product.data.id,slug:product.data.slug,title:product.data.title,isActive:product.data.is_active,outcome:item.state};
}
