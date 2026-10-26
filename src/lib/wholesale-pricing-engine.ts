import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "./admin-auth";
import { readAllPages } from "./read-all-pages";
import { revalidatePath } from "next/cache";

export type WholesaleRubro =
  | "cosmetica"
  | "capilar"
  | "perfumeria"
  | "herramientas"
  | "electro_barata"
  | "ineligible";

export interface WholesaleCalculationInput {
  productId: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  brand?: string | null;
  retailPrice: number;
  landedCostArs: number;
  mlPrice?: number | null;
}

export interface WholesaleCalculationResult {
  productId: string;
  title: string;
  isEligible: boolean;
  ineligibilityReason?: string;
  rubro: WholesaleRubro;
  costLandedArs: number;
  retailPriceArs: number;
  mlPriceArs: number | null;
  resaleCeilingArs: number;
  suggestedWholesalePrice: number | null;
  minQuantity: number;
  myaProfitArs: number;
  myaMarginPercent: number;
  myaMarkupPercent: number;
  resellerProfitArs: number;
  resellerMarginPercent: number;
  resellerMarkupPercent: number;
  theoryExplanation: string;
}

export interface CatalogWholesaleSyncSummary {
  totalEvaluated: number;
  eligibleCount: number;
  excludedCount: number;
  updatedCount: number;
  avgMyaWholesaleMarginPercent: number;
  avgResellerMarginPercent: number;
  totalWholesaleCatalogValueArs: number;
  byRubro: Record<WholesaleRubro, number>;
}

/**
 * Determina el rubro comercial para venta mayorista y si es apto.
 *
 * Criterio de exclusión estricto:
 *  - Celulares, iPhones, Samsung Galaxy, smartphones.
 *  - MacBooks, notebooks, laptops, computadoras de escritorio.
 *  - Tablets de alta gama (iPads, Galaxy Tab S).
 *  - Productos de alto valor unitario (> $150.000 ARS en electrónica).
 *
 * Criterio de inclusión:
 *  - Cosmética coreana / K-Beauty (serums, cremas, tónicos, protectores solares).
 *  - Cuidado capilar (Karseell, Shiseido Fino, mascarillas, shampoos).
 *  - Perfumería y fragancias árabes (Lattafa, Asad, Yara, body mists).
 *  - Herramientas y equipamiento (Total Tools, Wadfow, taladros, amoladoras, soldadoras, etc.).
 *  - Pequeña electrónica barata / accesorios (auriculares, cargadores, cables, parlantes económicos).
 */
export function classifyWholesaleRubro(
  title: string,
  categorySlug: string,
  brand?: string | null,
  retailPrice?: number
): { rubro: WholesaleRubro; isEligible: boolean; reason?: string } {
  const t = title.toLowerCase();
  const cat = (categorySlug || "").toLowerCase();
  const b = (brand || "").toLowerCase();
  const price = retailPrice || 0;

  // 1. EXCLUSIONES ABSOLUTAS: Alta tecnología y dispositivos caros
  const isExcludedTech =
    /iphone|macbook|ipad|galaxy|smartphone|notebook|computadora|desktop|pc |tablet|monitor|laptop/i.test(t) ||
    cat.includes("smartphone") ||
    cat.includes("notebook") ||
    cat.includes("tablet") ||
    cat.includes("computadoras");

  if (isExcludedTech) {
    return {
      rubro: "ineligible",
      isEligible: false,
      reason: "Tecnología de alto valor no apta para reventa mayorista (smartphones, notebooks, PCs o tablets).",
    };
  }

  // 2. COSMÉTICA COREANA (K-Beauty)
  if (
    cat.includes("facial") ||
    cat.includes("serum") ||
    cat.includes("tonico") ||
    cat.includes("crema") ||
    cat.includes("limpieza") ||
    cat.includes("solar") ||
    cat.includes("corporal") ||
    cat.includes("cosmetica") ||
    /medicube|anua|skin1004|beauty of joseon|cosrx|torriden|round lab|dr\.?\s*althea/i.test(t)
  ) {
    return { rubro: "cosmetica", isEligible: true };
  }

  // 3. CUIDADO CAPILAR
  if (
    cat.includes("capilar") ||
    cat.includes("shampoo") ||
    /karseell|fino|kérastase|kerastase/i.test(t)
  ) {
    return { rubro: "capilar", isEligible: true };
  }

  // 4. PERFUMERÍA & FRAGANCIAS
  if (
    cat.includes("perfum") ||
    cat.includes("mist") ||
    cat.includes("bruma") ||
    /lattafa|yara|khamrah|asad|afnan|orientica|al haramain/i.test(t)
  ) {
    return { rubro: "perfumeria", isEligible: true };
  }

  // 5. HERRAMIENTAS & EQUIPAMIENTO
  if (
    cat.includes("herramienta") ||
    cat.includes("taladro") ||
    cat.includes("amoladora") ||
    cat.includes("sierra") ||
    cat.includes("soldadora") ||
    cat.includes("hidrolavadora") ||
    cat.includes("llave") ||
    cat.includes("nivel") ||
    cat.includes("medicion") ||
    cat.includes("compresor") ||
    cat.includes("destornillador") ||
    cat.includes("alicate") ||
    cat.includes("electricidad") ||
    cat.includes("bateria") ||
    cat.includes("aspiradora") ||
    cat.includes("pistola") ||
    cat.includes("lijadora") ||
    cat.includes("albanileria") ||
    /total|wadfow/i.test(t) ||
    /total|wadfow/i.test(b)
  ) {
    return { rubro: "herramientas", isEligible: true };
  }

  // 6. PEQUEÑA ELECTRÓNICA BARATA / ACCESORIOS (solo si retail < $150.000 ARS)
  if (
    (cat.includes("electronica") || /auricular|cable|cargador|pendrive|headphone|mouse|teclado|parlante|soundbar/i.test(t)) &&
    price > 0 &&
    price < 150_000
  ) {
    return { rubro: "electro_barata", isEligible: true };
  }

  return {
    rubro: "ineligible",
    isEligible: false,
    reason: "Categoría no comercializada por canal mayorista.",
  };
}

/**
 * Redondeo psicológico y comercial para precios mayoristas en ARS.
 */
function roundWholesalePrice(price: number): number {
  if (price <= 0) return 0;

  if (price < 10_000) {
    // Redondeo a centenas limpias
    return Math.round(price / 100) * 100;
  }

  if (price < 100_000) {
    // Redondeo a centenas; preferir terminación .900 o .500
    let rounded = Math.round(price / 100) * 100;
    if (rounded % 1000 === 0) rounded -= 100; // Ej: 24.900 en vez de 25.000
    return rounded;
  }

  // Mayores a 100.000: redondeo a múltiplos de 500 o 1.000
  let rounded = Math.round(price / 500) * 500;
  if (rounded % 1000 === 0) rounded -= 100; // Ej: 124.900 en vez de 125.000
  return rounded;
}

/**
 * Calcula el precio mayorista optimizado según la teoría financiera:
 *  - Maximizar ganancia para MYA con piso de seguridad del 18-22%.
 *  - Garantizar margen de reventa atractivo (20% al 30%) frente al techo minorista (Mercado Pago / Mercado Libre).
 */
export function calculateProductWholesalePricing(
  input: WholesaleCalculationInput
): WholesaleCalculationResult {
  const { rubro, isEligible, reason } = classifyWholesaleRubro(
    input.title,
    input.categorySlug,
    input.brand,
    input.retailPrice
  );

  const retailPrice = Math.max(0, input.retailPrice);
  const mlPrice = input.mlPrice && input.mlPrice > 0 ? input.mlPrice : null;

  // Techo de reventa minorista del mercado:
  // Si ML está por debajo de nuestra tienda, el revendedor compite contra ese precio de ML.
  const resaleCeiling = mlPrice ? Math.min(retailPrice, mlPrice) : retailPrice;

  // Costo landed efectivo (costo proveedor + 20% pasero)
  // Si no está cargado el costo exacto, estimar un costo conservador del 55% del PVP
  const costLanded = input.landedCostArs > 0 ? input.landedCostArs : Math.round(resaleCeiling * 0.55);

  const baseResult: WholesaleCalculationResult = {
    productId: input.productId,
    title: input.title,
    isEligible: false,
    ineligibilityReason: reason || "No cumple condiciones de margen mayorista.",
    rubro,
    costLandedArs: costLanded,
    retailPriceArs: retailPrice,
    mlPriceArs: mlPrice,
    resaleCeilingArs: resaleCeiling,
    suggestedWholesalePrice: null,
    minQuantity: 1,
    myaProfitArs: 0,
    myaMarginPercent: 0,
    myaMarkupPercent: 0,
    resellerProfitArs: 0,
    resellerMarginPercent: 0,
    resellerMarkupPercent: 0,
    theoryExplanation: "",
  };

  if (!isEligible || retailPrice <= 0 || resaleCeiling <= 0) {
    return baseResult;
  }

  // Margen bruto total disponible entre costo landed y techo minorista
  const totalMarginArs = resaleCeiling - costLanded;
  const totalMarginPercent = (totalMarginArs / resaleCeiling) * 100;

  // Si el margen total es menor a 18%, no hay espacio para dos escalones de ganancia
  if (totalMarginPercent < 18) {
    baseResult.ineligibilityReason = `Margen bruto total insuficiente (${Math.round(totalMarginPercent)}%) para sostener canal minorista y mayorista.`;
    return baseResult;
  }

  // Parámetros de descuento mayorista y lote mínimo según rubro
  let resellerTargetMarginPercent = 0.28; // 28% de margen para el revendedor
  let minQty = 4;
  let myaSafetyMarkup = 1.18; // MYA gana al menos 18% sobre costo

  switch (rubro) {
    case "cosmetica":
      resellerTargetMarginPercent = 0.28;
      minQty = 4;
      myaSafetyMarkup = 1.20;
      break;
    case "capilar":
      resellerTargetMarginPercent = 0.28;
      minQty = 4;
      myaSafetyMarkup = 1.20;
      break;
    case "perfumeria":
      resellerTargetMarginPercent = 0.25;
      minQty = 3;
      myaSafetyMarkup = 1.20;
      break;
    case "herramientas":
      // Herramientas tienen tickets más altos y rotación técnica; el revendedor suele operar con 20%
      resellerTargetMarginPercent = 0.20;
      minQty = costLanded > 80_000 ? 2 : 3;
      myaSafetyMarkup = 1.18;
      break;
    case "electro_barata":
      resellerTargetMarginPercent = 0.25;
      minQty = 5;
      myaSafetyMarkup = 1.20;
      break;
  }

  // 1. Precio que dejaría el margen objetivo al revendedor vendiendo al techo
  let wholesalePriceTarget = resaleCeiling * (1 - resellerTargetMarginPercent);

  // 2. Piso de rentabilidad de MYA (costo landed + markup de seguridad)
  const myaFloor = costLanded * myaSafetyMarkup;

  let finalWholesalePriceRaw = wholesalePriceTarget;

  if (wholesalePriceTarget < myaFloor) {
    // Si el descuento al revendedor perfora el piso de MYA, buscar punto de equilibrio
    if (resaleCeiling > myaFloor * 1.08) {
      // Reparto proporcional del margen disponible
      finalWholesalePriceRaw = costLanded + (resaleCeiling - costLanded) * 0.50;
    } else {
      baseResult.ineligibilityReason = "El precio de mercado no permite garantizar ganancia a MYA y al revendedor simultáneamente.";
      return baseResult;
    }
  }

  // 3. Aplicar redondeo comercial
  const finalWholesalePrice = roundWholesalePrice(finalWholesalePriceRaw);

  // 4. Métricas de rentabilidad mutua
  const myaProfit = finalWholesalePrice - costLanded;
  const myaMargin = Math.round((myaProfit / finalWholesalePrice) * 100);
  const myaMarkup = Math.round((myaProfit / costLanded) * 100);

  const resellerProfit = resaleCeiling - finalWholesalePrice;
  const resellerMargin = Math.round((resellerProfit / resaleCeiling) * 100);
  const resellerMarkup = Math.round((resellerProfit / finalWholesalePrice) * 100);

  const explanation =
    `Rubro ${rubro.toUpperCase()}: MYA captura $${myaProfit.toLocaleString("es-AR")} (+${myaMarkup}% markup sobre landed). ` +
    `El revendedor compra a $${finalWholesalePrice.toLocaleString("es-AR")} y al revender al techo de mercado ($${resaleCeiling.toLocaleString("es-AR")}) ` +
    `obtiene $${resellerProfit.toLocaleString("es-AR")} de ganancia neta (${resellerMargin}% de margen comercial, +${resellerMarkup}% markup). ` +
    `Lote mínimo: ${minQty} unidades.`;

  return {
    productId: input.productId,
    title: input.title,
    isEligible: true,
    rubro,
    costLandedArs: costLanded,
    retailPriceArs: retailPrice,
    mlPriceArs: mlPrice,
    resaleCeilingArs: resaleCeiling,
    suggestedWholesalePrice: finalWholesalePrice,
    minQuantity: minQty,
    myaProfitArs: myaProfit,
    myaMarginPercent: myaMargin,
    myaMarkupPercent: myaMarkup,
    resellerProfitArs: resellerProfit,
    resellerMarginPercent: resellerMargin,
    resellerMarkupPercent: resellerMarkup,
    theoryExplanation: explanation,
  };
}

/**
 * Escanea todos los productos del catálogo, calcula su precio mayorista interno
 * y actualiza la base de datos (wholesale_price y wholesale_min_qty).
 *
 * Mantiene los precios de forma puramente interna (WHOLESALE_ENABLED = false en frontend).
 */
export async function calculateAndSyncCatalogWholesalePrices(options?: {
  client?: SupabaseClient;
  dryRun?: boolean;
}): Promise<CatalogWholesaleSyncSummary> {
  const db = options?.client ?? (await getAdminClient());

  // 1. Cargar productos, categorías y referencias de Mercado Libre
  const [productsRes, categoriesRes, mlRefsRes] = await Promise.all([
    readAllPages<{
      id: string;
      slug: string;
      title: string;
      category_id: string;
      retail_price: number;
      wholesale_price: number | null;
      wholesale_min_qty: number | null;
      supplier_live_price: number | null;
      brand: string | null;
      model: string | null;
    }>((from, to) =>
      db
        .from("products")
        .select("id, slug, title, category_id, retail_price, wholesale_price, wholesale_min_qty, supplier_live_price, brand, model")
        .is("deleted_at", null)
        .order("id")
        .range(from, to)
    ),
    db.from("categories").select("id, name, slug"),
    readAllPages<{ product_id: string; price_ars: number }>((from, to) =>
      db
        .from("supplier_market_references")
        .select("product_id, price_ars")
        .not("price_ars", "is", null)
        .order("id")
        .range(from, to)
    ),
  ]);

  const categories = categoriesRes.data ?? [];
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const mlMap = new Map(mlRefsRes.map((r) => [r.product_id, r.price_ars]));

  const byRubro: Record<WholesaleRubro, number> = {
    cosmetica: 0,
    capilar: 0,
    perfumeria: 0,
    herramientas: 0,
    electro_barata: 0,
    ineligible: 0,
  };

  let eligibleCount = 0;
  let excludedCount = 0;
  let updatedCount = 0;
  let totalMyaMargin = 0;
  let totalResellerMargin = 0;
  let totalWholesaleValue = 0;

  const updates: Array<{
    id: string;
    wholesale_price: number | null;
    wholesale_min_qty: number;
  }> = [];

  for (const product of productsRes) {
    const cat = catMap.get(product.category_id);
    const result = calculateProductWholesalePricing({
      productId: product.id,
      title: product.title,
      categorySlug: cat?.slug || "",
      categoryName: cat?.name || "",
      brand: product.brand,
      retailPrice: product.retail_price || 0,
      landedCostArs: product.supplier_live_price || 0,
      mlPrice: mlMap.get(product.id) || null,
    });

    byRubro[result.rubro]++;

    if (result.isEligible && result.suggestedWholesalePrice) {
      eligibleCount++;
      totalMyaMargin += result.myaMarginPercent;
      totalResellerMargin += result.resellerMarginPercent;
      totalWholesaleValue += result.suggestedWholesalePrice;

      updates.push({
        id: product.id,
        wholesale_price: result.suggestedWholesalePrice,
        wholesale_min_qty: result.minQuantity,
      });
    } else {
      excludedCount++;
      // Si el producto no es apto (iPhone, etc.), asegurar que wholesale_price quede null
      if (product.wholesale_price !== null && product.wholesale_price !== undefined) {
        updates.push({
          id: product.id,
          wholesale_price: null,
          wholesale_min_qty: 1,
        });
      }
    }
  }

  // 2. Aplicar actualizaciones en la base de datos (a menos que sea dryRun)
  if (!options?.dryRun && updates.length > 0) {
    const stamp = new Date().toISOString();
    // Procesar en chunks de 50 para evitar exceder límites de payload
    const chunkSize = 50;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((item) =>
          db
            .from("products")
            .update({
              wholesale_price: item.wholesale_price,
              wholesale_min_qty: item.wholesale_min_qty,
              updated_at: stamp,
            })
            .eq("id", item.id)
        )
      );
      updatedCount += chunk.length;
    }

    try {
      revalidatePath("/admin");
      revalidatePath("/admin/costos");
      revalidatePath("/admin/precios");
    } catch {}
  }

  const avgMyaWholesaleMarginPercent =
    eligibleCount > 0 ? Math.round((totalMyaMargin / eligibleCount) * 10) / 10 : 0;
  const avgResellerMarginPercent =
    eligibleCount > 0 ? Math.round((totalResellerMargin / eligibleCount) * 10) / 10 : 0;

  return {
    totalEvaluated: productsRes.length,
    eligibleCount,
    excludedCount,
    updatedCount: options?.dryRun ? 0 : updatedCount,
    avgMyaWholesaleMarginPercent,
    avgResellerMarginPercent,
    totalWholesaleCatalogValueArs: totalWholesaleValue,
    byRubro,
  };
}
