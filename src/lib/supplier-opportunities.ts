import { getAdminClient } from "./admin-auth";
import { readAllPages } from "./read-all-pages";
import { slugifyProduct } from "./admin-product";
import {
  calculateLandedCostArs,
  calculateSuggestedRetailPrice,
  calculateCommercialMargin,
  getCategoryMarginBenchmark,
} from "./supplier-commercial";
import { revalidatePath } from "next/cache";

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
  lastCheckedAt: string | null;
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
  title: string;
  categoryId: string;
  retailPrice: number;
  wholesalePrice?: number;
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

  // Eliminar prefijos de perfumería
  clean = clean.replace(/^PERF\s+(?:TESTER\s+)?(?:FEM|MASC|UNI)\s+/i, "Perfume ");
  clean = clean.replace(/^PERF\s+(?:TESTER\s+)?/i, "Perfume ");
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
  categories: CategoryInfo[]
): { categoryId: string; categorySlug: string; categoryName: string } {
  const t = title.toLowerCase();

  // Helper para buscar categoría por slug
  const findCat = (slug: string) => categories.find((c) => c.slug === slug);
  const generalFallbacks = [
    findCat("cosmetica-coreana"),
    findCat("cuidado-capilar"),
    findCat("perfumeria"),
    findCat("herramientas-equipamiento"),
    findCat("electronica"),
    categories[0],
  ].filter(Boolean) as CategoryInfo[];

  // 1. Perfumería
  if (/lattafa|asdaf|yara|khamrah|bade'e|asad|qaed|fakhar|ejaazi|orientica|al haramain|afnan/i.test(t)) {
    const c = findCat("perfumes-arabes") || findCat("perfumeria");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }
  if (/body mist|body splash|bruma|mist corp/i.test(t)) {
    const c = findCat("body-mists-brumas") || findCat("perfumeria");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }
  if (/perfum|edp|edt|cologne|eau de/i.test(t)) {
    const c = findCat("perfumes-arabes") || findCat("perfumeria");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }

  // 2. Cosmética Coreana (K-Beauty)
  if (/medicube|skin1004|anua|celimax|althea|beauty of joseon|cosrx|torriden|round lab|dr\.?jart/i.test(t)) {
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

  // 5. Electrónica & Smartphones & Informática
  if (/iphone|galaxy|spark|armor|smartphone|xiaomi|swap|redmi|poco|motorola/i.test(t)) {
    const c = findCat("electronica-smartphones") || findCat("electronica");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }
  if (/macbook|notebook|laptop|vivobook|thinkpad|zenbook|asus|hp|lenovo/i.test(t)) {
    const c = findCat("electronica-notebooks") || findCat("electronica");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }
  if (/ipad|tablet|tab s/i.test(t)) {
    const c = findCat("electronica-tablets") || findCat("electronica");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }
  if (/ssd|ram|kingston|sandisk|pendrive|auricular|headphone|gamer|silla|monitor|teclado|mouse|jbl|alexa|echo/i.test(t)) {
    const c = findCat("electronica");
    if (c) return { categoryId: c.id, categorySlug: c.slug, categoryName: c.name };
  }

  const fallback = generalFallbacks[0];
  return {
    categoryId: fallback.id,
    categorySlug: fallback.slug,
    categoryName: fallback.name,
  };
}

/**
 * Consulta todas las oportunidades comerciales disponibles en los proveedores
 * aplicando filtros de rentabilidad, stock y ordenamiento.
 */
export async function searchSupplierOpportunities(
  params: OpportunitySearchParams = {}
): Promise<OpportunitySearchResult> {
  const db = await getAdminClient();

  // 1. Cargar proveedores y categorías en paralelo
  const [suppliersRes, categoriesRes] = await Promise.all([
    db.from("suppliers").select("id, name, official_key, is_active").eq("is_active", true),
    db.from("categories").select("id, name, slug, parent_id, image_url").order("name"),
  ]);

  const suppliers = suppliersRes.data ?? [];
  const categories: CategoryInfo[] = (categoriesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parent_id,
    imageUrl: c.image_url,
  }));
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

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
  }>((from, to) =>
    db
      .from("supplier_offers")
      .select("id, supplier_id, external_id, title, brand, model, source_url, origin_cost, currency, availability, last_success_at")
      .is("product_id", null)
      .gt("origin_cost", 0)
      .order("id")
      .range(from, to)
  );

  // 3. Procesar y enriquecer cada oportunidad con el motor financiero comercial
  const allOpportunities: SupplierOpportunity[] = unassignedOffers.map((offer) => {
    const sup = supplierMap.get(offer.supplier_id);
    const cleanTitle = cleanWholesaleTitle(offer.title);
    const cat = detectStoreCategory(offer.title, categories);

    // Tipo de cambio oficial configurado: 1.600 ARS/USD + 20% pasero
    const fx = 1600;
    const pasero = 20;
    const { totalLandedArs } = calculateLandedCostArs(offer.origin_cost, fx, pasero);
    const benchmark = getCategoryMarginBenchmark(cat.categorySlug, offer.title);

    // Sugerir precio minorista con terminación psicológica .900
    const { suggestedPrice } = calculateSuggestedRetailPrice(totalLandedArs, cat.categorySlug, offer.title, {
      psychologicalEnding: true,
    });

    const { marginPercent, markupPercent, profitArs } = calculateCommercialMargin(suggestedPrice, totalLandedArs);

    let marginHealth: "excelente" | "adecuado" | "bajo" | "negativo" = "adecuado";
    if (marginPercent < 0) {
      marginHealth = "negativo";
    } else if (marginPercent < benchmark.minMargin) {
      marginHealth = "bajo";
    } else if (marginPercent >= benchmark.benchmarkMargin) {
      marginHealth = "excelente";
    }

    const avail = (offer.availability === "in_stock" || offer.availability === "out_of_stock")
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
      lastCheckedAt: offer.last_success_at,
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

/**
 * Importa y publica una oportunidad mayorista en el catálogo de MYA Importaciones.
 * Crea el producto con fulfillment 'supplier', asigna precios oficiales y vincula la oferta.
 */
export async function importSupplierOpportunity(
  input: ImportOpportunityInput
): Promise<{ success: boolean; productId: string; slug: string; title: string }> {
  const db = await getAdminClient();

  if (!input.offerId) {
    throw new Error("Identificador de oferta requerido.");
  }
  if (!input.title || input.title.trim().length < 2) {
    throw new Error("El título del producto debe tener al menos 2 caracteres.");
  }
  if (!input.retailPrice || input.retailPrice <= 0) {
    throw new Error("El precio de venta minorista debe ser mayor a 0.");
  }

  // 1. Verificar la oferta mayorista
  const { data: offer, error: offerError } = await db
    .from("supplier_offers")
    .select("id, supplier_id, external_id, title, brand, model, source_url, origin_cost, currency, availability, product_id")
    .eq("id", input.offerId)
    .single();

  if (offerError || !offer) {
    throw new Error("No se encontró la oferta mayorista especificada.");
  }
  if (offer.product_id) {
    throw new Error("Esta oferta ya está vinculada a un producto existente del catálogo.");
  }

  // 2. Validar categoría y obtener imagen de portada de respaldo
  const { data: category } = await db
    .from("categories")
    .select("id, name, slug, image_url")
    .eq("id", input.categoryId)
    .single();

  if (!category) {
    throw new Error("La categoría seleccionada no existe.");
  }

  // 3. Generar slug único
  const baseSlug = slugifyProduct(input.title);
  const { data: existingSlug } = await db
    .from("products")
    .select("id")
    .eq("slug", baseSlug)
    .maybeSingle();

  const finalSlug = existingSlug ? `${baseSlug}-${crypto.randomUUID().slice(0, 6)}` : baseSlug;

  // 4. Costo landed calculado con pasero oficial
  const fx = 1600;
  const pasero = 20;
  const { totalLandedArs } = calculateLandedCostArs(offer.origin_cost || 0, fx, pasero);

  // Precio mayorista por defecto (descuento del 12% sobre el minorista para compras por volumen)
  const wholesalePrice = input.wholesalePrice && input.wholesalePrice > 0
    ? input.wholesalePrice
    : Math.round((input.retailPrice * 0.88) / 100) * 100;

  const defaultImageUrl = category.image_url || null;
  const defaultImageUrls = defaultImageUrl ? [defaultImageUrl] : [];

  // 5. Insertar el nuevo producto en products
  const { data: newProduct, error: insertError } = await db
    .from("products")
    .insert({
      title: input.title.trim(),
      slug: finalSlug,
      description: `Producto importado con abastecimiento mayorista directo. Garantía oficial y entrega coordinada.`,
      category_id: category.id,
      retail_price: input.retailPrice,
      wholesale_price: wholesalePrice,
      wholesale_min_qty: 3,
      stock: 0,
      payment_methods: ["transferencia", "tarjeta", "mercado_pago", "efectivo"],
      tags: [category.slug, offer.brand || ""].filter(Boolean),
      is_featured: false,
      is_wholesale_only: false,
      is_active: input.isActive ?? true,
      image_url: defaultImageUrl,
      image_urls: defaultImageUrls,
      source_url: offer.source_url,
      fulfillment_mode: "supplier",
      supplier_available: offer.availability !== "out_of_stock",
      supplier_live_price: totalLandedArs,
      supplier_stock_status: offer.availability || "unknown",
      supplier_last_checked_at: new Date().toISOString(),
      brand: offer.brand || "",
      model: offer.model || "",
    })
    .select("id, slug, title")
    .single();

  if (insertError || !newProduct) {
    throw new Error(`Error al crear el producto en la tienda: ${insertError?.message || "Desconocido"}`);
  }

  // 6. Vincular la oferta de proveedor al nuevo producto
  const { error: linkError } = await db
    .from("supplier_offers")
    .update({
      product_id: newProduct.id,
      verification: "verified",
      updated_at: new Date().toISOString(),
    })
    .eq("id", offer.id);

  if (linkError) {
    console.error("Advertencia: No se pudo actualizar el vínculo en supplier_offers:", linkError);
  }

  // 7. Invalidar cachés
  revalidatePath("/admin");
  revalidatePath("/catalogo");
  revalidatePath("/admin/oportunidades");

  return {
    success: true,
    productId: newProduct.id,
    slug: newProduct.slug,
    title: newProduct.title,
  };
}
