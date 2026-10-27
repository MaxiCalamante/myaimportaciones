import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "./admin-auth";
import { readAllPages } from "./read-all-pages";
import {
  calculateCommercialMargin,
  getCategoryMarginBenchmark,
} from "./supplier-commercial";
import { buildMercadoLibreSearchUrl, isMercadoLibreProductUrl } from "./mercadolibre-url";
export { buildMercadoLibreSearchUrl };
import { revalidatePath } from "next/cache";

export type PriceStrategyAction =
  | "raise_price" // Subir precio para maximizar ganancia (nuestro precio es más bajo de lo necesario vs ML)
  | "lower_price" // Bajar precio para ser competitivo (estamos más caros que ML)
  | "optimal" // Precio óptimo (5-10% más barato que ML con margen sano)
  | "cost_constrained" // Caro vs ML pero el costo del proveedor no permite bajar sin perder margen
  | "missing_benchmark"; // Sin referencia de ML aún

export interface ProductMarketComparison {
  productId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  brand: string | null;
  model: string | null;
  currentPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  landedCostArs: number;
  mlPrice: number | null;
  mlUrl: string | null;
  mlCheckedAt: string | null;
  mlSearchUrl: string;
  targetPrice: number;
  priceDifferenceArs: number;
  priceDifferencePercent: number;
  action: PriceStrategyAction;
  actionLabel: string;
  potentialGainArs: number;
  currentMarginPercent: number;
  targetMarginPercent: number;
  isActive: boolean;
  supplierAvailable: boolean;
}

export interface MarketPricingStats {
  totalEvaluated: number;
  withMlBenchmark: number;
  canRaiseCount: number;
  canLowerCount: number;
  optimalCount: number;
  missingCount: number;
  potentialExtraProfitArs: number;
}

export interface MarketComparisonFilterParams {
  query?: string;
  action?: PriceStrategyAction | "all";
  categorySlug?: string;
  sortBy?: "gain_desc" | "diff_asc" | "diff_desc" | "price_desc" | "title_asc";
  page?: number;
  pageSize?: number;
}


/**
 * Calcula la recomendación de precio competitivo y de maximización de ganancias contra Mercado Libre.
 *
 * Estrategia oficial:
 * 1. Precio objetivo según el descuento configurado para el producto.
 * 2. Terminación psicológica (.900 o .000).
 * 3. Piso de seguridad: el costo landed + margen mínimo de categoría.
 * 4. Si nuestro precio es mucho menor que el objetivo, PODEMOS SUBIR PRECIO para ganar más margen sin perder la venta.
 * 5. Si nuestro precio es mayor que ML, DEBEMOS BAJAR PRECIO para ganar la venta.
 */
export function calculateCompetitivePricing(
  currentPrice: number,
  landedCostArs: number,
  mlPrice: number | null,
  categorySlug?: string,
  title?: string,
  discountPercent = 10
): {
  targetPrice: number;
  priceDifferenceArs: number;
  priceDifferencePercent: number;
  action: PriceStrategyAction;
  actionLabel: string;
  potentialGainArs: number;
  currentMarginPercent: number;
  targetMarginPercent: number;
} {
  const benchmark = getCategoryMarginBenchmark(categorySlug, title);
  const currentMargin = landedCostArs > 0 ? calculateCommercialMargin(currentPrice, landedCostArs) : { marginPercent: 0 };

  if (!mlPrice || mlPrice <= 0 || landedCostArs <= 0) {
    return {
      targetPrice: currentPrice,
      priceDifferenceArs: 0,
      priceDifferencePercent: 0,
      action: "missing_benchmark",
      actionLabel: landedCostArs <= 0 ? "Costo sin verificar" : "Sin referencia ML vigente",
      potentialGainArs: 0,
      currentMarginPercent: currentMargin.marginPercent,
      targetMarginPercent: currentMargin.marginPercent,
    };
  }

  // Objetivo configurado, redondeado hacia abajo.
  const targetPrice = Math.floor((mlPrice * (1 - discountPercent / 100)) / 100) * 100;

  // Piso de seguridad según margen mínimo
  const minCostFloor = landedCostArs > 0 ? landedCostArs / (1 - benchmark.minMargin / 100) : 0;
  const targetMargin = calculateCommercialMargin(targetPrice, landedCostArs);

  const diffArs = currentPrice - mlPrice;
  const diffPercent = Math.round((diffArs / mlPrice) * 1000) / 10;

  let action: PriceStrategyAction = "optimal";
  let actionLabel = "Precio óptimo";
  let potentialGainArs = 0;

  // CASO 1: Subir precio para maximizar ganancia
  // Si nuestro precio actual es más de 6% inferior al targetPrice, estamos regalando margen
  if (targetPrice < minCostFloor) {
    action = "cost_constrained";
    actionLabel = "Alerta: Costo alto vs ML";
  } else if (currentPrice < targetPrice * 0.94) {
    action = "raise_price";
    potentialGainArs = targetPrice - currentPrice;
    actionLabel = `Subir a $${targetPrice.toLocaleString("es-AR")} (+${Math.round(potentialGainArs).toLocaleString("es-AR")})`;
  }
  // CASO 2: Bajar precio para ser competitivo
  // Si nuestro precio es mayor que Mercado Libre, perdemos la venta
  else if (currentPrice > mlPrice) {
    if (targetPrice >= minCostFloor) {
      action = "lower_price";
      potentialGainArs = currentPrice - targetPrice;
      actionLabel = `Bajar a $${targetPrice.toLocaleString("es-AR")} (Ganar a ML)`;
    } else {
      action = "cost_constrained";
      actionLabel = "Alerta: Costo alto vs ML";
    }
  }
  // CASO 3: Ya está en el rango óptimo (más barato que ML y con margen sano)
  else {
    action = "optimal";
    actionLabel = "Competitivo vs ML ✓";
  }

  return {
    targetPrice,
    priceDifferenceArs: diffArs,
    priceDifferencePercent: diffPercent,
    action,
    actionLabel,
    potentialGainArs: Math.round(potentialGainArs),
    currentMarginPercent: currentMargin.marginPercent,
    targetMarginPercent: targetMargin.marginPercent,
  };
}

/**
 * Carga todos los productos con sus comparativas de Mercado Libre y estadísticas de oportunidad.
 */
export async function getProductMarketComparisons(
  filters: MarketComparisonFilterParams = {},
  options?: { client?: SupabaseClient }
): Promise<{
  items: ProductMarketComparison[];
  total: number;
  stats: MarketPricingStats;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const db = options?.client ?? (await getAdminClient());

  // 1. Cargar productos activos, categorías, referencias ML y costos en paralelo
  const [productsRes, categoriesRes, marketRefsRes, productCostsRes, settingsRes] = await Promise.all([
    readAllPages<{
      id: string;
      slug: string;
      title: string;
      image_url: string | null;
      category_id: string;
      retail_price: number;
      wholesale_price: number | null;
      wholesale_min_qty: number | null;
      brand: string | null;
      model: string | null;
      is_active: boolean;
      supplier_available: boolean;
    }>((from, to) =>
      db
        .from("products")
        .select("id, slug, title, image_url, category_id, retail_price, wholesale_price, wholesale_min_qty, brand, model, is_active, supplier_available")
        .is("deleted_at", null)
        .order("title")
        .range(from, to)
    ),
    db.from("categories").select("id, name, slug"),
    readAllPages<{ id: string; product_id: string; price_ars: number; source_url: string; checked_at: string | null; identity_verified: boolean; variant_id: string | null }>((from, to) => db.from("supplier_market_references").select("id, product_id, price_ars, source_url, checked_at, identity_verified, variant_id").eq("identity_verified", true).is("variant_id", null).not("price_ars", "is", null).order("id").range(from, to)),
    readAllPages<{ product_id: string; landed_cost: number | null }>((from, to) => db.from("product_costs").select("product_id, landed_cost").order("product_id").range(from, to)),
    db.from("supplier_tracking_settings").select("config").eq("id", true).single(),
  ]);

  if (categoriesRes.error || settingsRes.error || !settingsRes.data?.config) throw new Error("No se pudieron cargar las categorías o la configuración de precios.");
  const settings = settingsRes.data.config;
  const freshnessHours = Number(settings.marketFreshnessHours);
  const defaultDiscount = Number(settings.marketDiscountPercent);
  if (!(freshnessHours > 0) || !(defaultDiscount >= 0 && defaultDiscount < 100)) throw new Error("Revisá la configuración de referencias y precios.");
  const categories = categoriesRes.data ?? [];
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Indexar referencias de costos y de Mercado Libre por product_id
  const mlMap = new Map<string, { priceArs: number; url: string | null; checkedAt: string | null }>();
  const costMap = new Map<string, number>();

  // 1ro: product_costs
  for (const pc of productCostsRes) {
    if (pc.landed_cost && Number(pc.landed_cost) > 0) {
      costMap.set(pc.product_id, Number(pc.landed_cost));
    }
  }

  // 2do: supplier_market_references (tienen prioridad si son más recientes o menores)
  for (const ref of marketRefsRes) {
    const checked = ref.checked_at ? Date.parse(ref.checked_at) : NaN;
    if (!isMercadoLibreProductUrl(ref.source_url) || !Number.isFinite(checked) || checked > Date.now() + 300000 || Date.now() - checked > freshnessHours * 3600000) continue;
    const existing = mlMap.get(ref.product_id);
    if (!existing || checked > Date.parse(existing.checkedAt || "")) {
      mlMap.set(ref.product_id, {
        priceArs: Number(ref.price_ars),
        url: ref.source_url || null,
        checkedAt: ref.checked_at || null,
      });
    }
  }

  // 2. Construir la comparativa de mercado para cada producto
  const allComparisons: ProductMarketComparison[] = productsRes.map((prod) => {
    const cat = categoryMap.get(prod.category_id);
    const categoryName = cat?.name || "Sin categoría";
    const categorySlug = cat?.slug || "general";

    const ref = mlMap.get(prod.id);
    const mlPrice = ref ? ref.priceArs : null;
    const mlUrl = ref ? ref.url : null;
    const mlCheckedAt = ref ? ref.checkedAt : null;
    const mlSearchUrl = buildMercadoLibreSearchUrl(prod.title, prod.brand || undefined, prod.model || undefined);

    const landedCost = costMap.get(prod.id) ?? 0;
    const currentPrice = Number(prod.retail_price || 0);

    const pricing = calculateCompetitivePricing(
      currentPrice,
      landedCost,
      mlPrice,
      categorySlug,
      prod.title,
      Number(settings.productDiscountPercent?.[prod.id] ?? defaultDiscount)
    );

    return {
      productId: prod.id,
      slug: prod.slug,
      title: prod.title,
      imageUrl: prod.image_url,
      categoryId: prod.category_id,
      categoryName,
      categorySlug,
      brand: prod.brand,
      model: prod.model,
      currentPrice,
      wholesalePrice: prod.wholesale_price ? Number(prod.wholesale_price) : null,
      wholesaleMinQty: prod.wholesale_min_qty ? Number(prod.wholesale_min_qty) : null,
      landedCostArs: landedCost,
      mlPrice,
      mlUrl,
      mlCheckedAt,
      mlSearchUrl,
      targetPrice: pricing.targetPrice,
      priceDifferenceArs: pricing.priceDifferenceArs,
      priceDifferencePercent: pricing.priceDifferencePercent,
      action: pricing.action,
      actionLabel: pricing.actionLabel,
      potentialGainArs: pricing.potentialGainArs,
      currentMarginPercent: pricing.currentMarginPercent,
      targetMarginPercent: pricing.targetMarginPercent,
      isActive: prod.is_active,
      supplierAvailable: prod.supplier_available,
    };
  });

  // 3. Métricas y estadísticas globales
  let canRaiseCount = 0;
  let canLowerCount = 0;
  let optimalCount = 0;
  let missingCount = 0;
  let potentialExtraProfitArs = 0;

  for (const c of allComparisons) {
    if (c.action === "raise_price") {
      canRaiseCount++;
      potentialExtraProfitArs += c.potentialGainArs;
    } else if (c.action === "lower_price" || c.action === "cost_constrained") {
      canLowerCount++;
    } else if (c.action === "optimal") {
      optimalCount++;
    } else if (c.action === "missing_benchmark") {
      missingCount++;
    }
  }

  const stats: MarketPricingStats = {
    totalEvaluated: allComparisons.length,
    withMlBenchmark: allComparisons.length - missingCount,
    canRaiseCount,
    canLowerCount,
    optimalCount,
    missingCount,
    potentialExtraProfitArs,
  };

  // 4. Filtros
  const q = (filters.query || "").toLowerCase().trim();
  const filtered = allComparisons.filter((c) => {
    // Filtro por acción
    if (filters.action && filters.action !== "all" && c.action !== filters.action) {
      return false;
    }

    // Filtro por categoría
    if (filters.categorySlug && filters.categorySlug !== "all" && c.categorySlug !== filters.categorySlug) {
      return false;
    }

    // Búsqueda
    if (q) {
      const match = `${c.title} ${c.brand || ""} ${c.model || ""} ${c.categoryName}`.toLowerCase();
      if (!match.includes(q)) return false;
    }

    return true;
  });

  // 5. Ordenamiento
  const sortBy = filters.sortBy || "gain_desc";
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "gain_desc":
        // Priorizar las oportunidades de mayor ganancia neta extra
        return b.potentialGainArs - a.potentialGainArs;
      case "diff_asc":
        // Más barato vs ML primero
        return a.priceDifferencePercent - b.priceDifferencePercent;
      case "diff_desc":
        // Más caro vs ML primero
        return b.priceDifferencePercent - a.priceDifferencePercent;
      case "price_desc":
        return b.currentPrice - a.currentPrice;
      case "title_asc":
        return a.title.localeCompare(b.title);
      default:
        return b.potentialGainArs - a.potentialGainArs;
    }
  });

  // 6. Paginación
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.max(1, Math.min(100, filters.pageSize || 25));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;
  const items = filtered.slice(offset, offset + pageSize);

  return {
    items,
    total,
    stats,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Aplica el nuevo precio minorista recomendado a un producto.
 */
export async function applyCompetitivePrice(
  productId: string,
  newPrice: number,
  options?: { client?: SupabaseClient }
): Promise<{ success: boolean; productId: string; newPrice: number }> {
  const db = options?.client ?? (await getAdminClient());

  void db; void productId; void newPrice;
  throw new Error("Revisá y aplicá precios desde Proveedores → Precios y stock, donde se revalidan costos y referencias.");
}

/**
 * Vincula o actualiza manualmente la referencia de precio de Mercado Libre para un producto.
 */
export async function linkMercadoLibreReference(
  productId: string,
  sourceUrl: string,
  priceArs: number,
  options?: { client?: SupabaseClient }
): Promise<{ success: boolean }> {
  const db = options?.client ?? (await getAdminClient());

  if (!productId) throw new Error("ID de producto inválido.");
  if (!priceArs || priceArs <= 0) throw new Error("El precio de Mercado Libre debe ser mayor a 0.");

  const cleanUrl = sourceUrl.trim();
  if (!isMercadoLibreProductUrl(cleanUrl)) throw new Error("Pegá el enlace HTTPS de una publicación concreta de Mercado Libre Argentina, no una búsqueda.");
  if (!Number.isFinite(priceArs)) throw new Error("Revisá el precio.");
  const stamp = new Date().toISOString();
  const { data: existing, error: lookupError } = await db.from("supplier_market_references")
    .select("id").eq("product_id", productId).eq("source_url", cleanUrl).maybeSingle();
  if (lookupError) throw new Error("No se pudo consultar la referencia.");
  const result = existing
    ? await db.from("supplier_market_references").update({ price_ars: priceArs, identity_verified: true, checked_at: stamp, last_error: null, refresh_mode: "manual" }).eq("id", existing.id)
    : await db.from("supplier_market_references").insert({ product_id: productId, source_url: cleanUrl, price_ars: priceArs, identity_verified: true, checked_at: stamp, refresh_mode: "manual" });
  if (result.error) throw new Error(`No se pudo guardar la referencia: ${result.error.message}`);

  try {
    revalidatePath("/admin/precios");
    revalidatePath("/admin/costos");
  } catch {}

  return { success: true };
}

/**
 * Aplica en lote los aumentos de precio recomendados para maximizar ganancias.
 */
export async function bulkApplyRecommendedRaises(
  productIds?: string[],
  options?: { client?: SupabaseClient }
): Promise<{ updatedCount: number; extraProfitArs: number }> {
  void productIds; void options;
  throw new Error("Los cambios de precio se revisan desde Proveedores → Precios y stock, con evidencia revalidada.");
}
