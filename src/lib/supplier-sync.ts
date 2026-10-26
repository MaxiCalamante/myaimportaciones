import { getAdminClient } from "@/lib/admin-auth";
import { readAdminProducts } from "@/lib/admin-catalog-read";
import { readAllPages } from "@/lib/read-all-pages";
import { fetchSupplierPage, readSupplierHtml, supplierUrl } from "./supplier-url";
import { parsePrestashopAvailability } from "./prestashop-availability";
import { parseTotalAvailability } from "@/lib/total-availability";
import { calculateLandedCostArs, calculateSuggestedRetailPrice } from "./supplier-commercial";
import type { TrackingConfig } from "./supplier-automation";
import { matchSupplierProduct, type MatchTarget, type MatchSource } from "./supplier-matching";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SupplierCheckResult {
  productId?: string;
  available: boolean;
  status: "in_stock" | "out_of_stock" | "not_found" | "error" | "no_url";
  livePrice?: number | null;
  currency?: string | null;
  message: string;
  checkedUrl?: string | null;
  cheapestSupplier?: string | null;
  isActive?: boolean;
}

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export async function checkSupplierProductAvailability(
  url?: string | null,
  sku?: string | null,
  brand?: string | null
): Promise<SupplierCheckResult> {
  const targetUrl = url?.trim();
  if (!targetUrl) {
    // If no URL but has SKU and is Total/Wadfow, try official search
    if (sku && brand && /total|wadfow/i.test(brand)) {
      const searchUrl = `https://www.totalherramientasoficial.com.py/produtos?busca=${encodeURIComponent(sku)}`;
      try {
        const res = await fetchSupplierPage(searchUrl, USER_AGENT);
        if (!res.ok) {
          return {
            available: false,
            status: "error",
            message: `Mayorista respondió con error HTTP ${res.status}`,
            checkedUrl: searchUrl,
          };
        }
        const html = await readSupplierHtml(res);
        return { ...parseTotalAvailability(html, sku), checkedUrl: searchUrl };
      } catch (err: unknown) {
        return {
          available: false,
          status: "error",
          message: err instanceof Error ? err.message : "Error al conectar con mayorista",
          checkedUrl: searchUrl,
        };
      }
    }

    return {
      available: false,
      status: "no_url",
      message: "Producto sin URL del mayorista ni SKU configurado",
    };
  }

  try {
    const res = await fetchSupplierPage(targetUrl, USER_AGENT);

    if (res.status === 404) {
      return {
        available: false,
        status: "not_found",
        message: "Página no encontrada en el mayorista (404 - Posible baja de producto)",
        checkedUrl: targetUrl,
      };
    }

    if (!res.ok) {
      return {
        available: false,
        status: "error",
        message: `Mayorista respondió código HTTP ${res.status}`,
        checkedUrl: targetUrl,
      };
    }

    const html = await readSupplierHtml(res);

    const host = new URL(supplierUrl(targetUrl)).hostname;
    if (host === "totalherramientasoficial.com.py" || host === "www.totalherramientasoficial.com.py") {
      return { ...parseTotalAvailability(html, sku), checkedUrl: targetUrl };
    }
    const name = host.endsWith("atacadousa.com.py") ? "Atacado USA" : "Star Company";
    return { ...parsePrestashopAvailability(html, name), checkedUrl: targetUrl };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error al conectar con la web del proveedor";
    return {
      available: false,
      status: "error",
      message: errorMsg.includes("timeout") ? "Tiempo de espera agotado al conectar al mayorista" : errorMsg,
      checkedUrl: targetUrl,
    };
  }
}

export async function checkAndUpdateProductSupplierStock(productId: string): Promise<SupplierCheckResult> {
  const supabase = await getAdminClient();
  const [productRes, offersRes, settingsRes, suppliersRes] = await Promise.all([
    readAdminProducts(supabase, { ids: [productId], size: 1 }),
    supabase.from("supplier_offers").select("*").eq("product_id", productId).eq("verification", "verified"),
    supabase.from("supplier_tracking_settings").select("config").eq("id", true).maybeSingle(),
    supabase.from("suppliers").select("id, name, official_key")
  ]);

  const product = productRes.data?.[0] as {
    id: string;
    title: string;
    source_url: string;
    sku: string;
    brand: string;
    supplier_available: boolean;
    is_active: boolean;
    fulfillment_mode: string;
  } | undefined;

  if (productRes.error || !product) {
    return {
      productId,
      available: false,
      status: "error",
      message: "Producto no encontrado en la base de datos",
    };
  }

  const config = (settingsRes.data?.config ?? {}) as TrackingConfig;
  const autoPause = config.autoPauseWhenOutOfStock !== false; // Default: true
  const fx = config.acquisitionArsPerUsd || 1600;
  const suppliers = (suppliersRes.data ?? []) as Array<{ id: string; name: string; official_key: string }>;

  const offers = (offersRes.data ?? []) as Array<{
    id: string;
    supplier_id: string;
    source_url: string;
    origin_cost: number | null;
    currency: string | null;
    availability: string;
    title: string;
    cost_checked_at: string | null;
    availability_checked_at: string | null;
  }>;

  // Case 1: Verified supplier offers exist in supplier_offers
  if (offers.length > 0) {
    const evaluatedOffers: Array<{
      offer: typeof offers[number];
      supplierName: string;
      isAvailable: boolean;
      landedCostArs: number | null;
    }> = [];

    for (const o of offers) {
      const sup = suppliers.find(s => s.id === o.supplier_id);
      const supplierName = sup?.name ?? "Mayorista";

      let checkStatus = o.availability;
      // If never checked or checked > 6 hours ago, check live if source_url exists
      if (o.source_url && (!o.availability_checked_at || Date.now() - Date.parse(o.availability_checked_at) > 6 * 3600000)) {
        try {
          const liveCheck = await checkSupplierProductAvailability(o.source_url, product.sku, product.brand);
          if (liveCheck.status === "in_stock" || liveCheck.status === "out_of_stock") {
            checkStatus = liveCheck.status;
            await supabase.from("supplier_offers").update({
              availability: checkStatus,
              availability_checked_at: new Date().toISOString(),
              last_error: null,
            }).eq("id", o.id);
          }
        } catch {
          // retain previous status on transient network glitch
        }
      }

      let landedCostArs: number | null = null;
      if (o.origin_cost !== null && o.origin_cost !== undefined) {
        if (o.currency === "USD") {
          landedCostArs = calculateLandedCostArs(Number(o.origin_cost), fx, 20).totalLandedArs;
        } else if (o.currency === "ARS") {
          landedCostArs = Number(o.origin_cost);
        }
      }

      evaluatedOffers.push({
        offer: o,
        supplierName,
        isAvailable: checkStatus === "in_stock",
        landedCostArs,
      });
    }

    const availableOffers = evaluatedOffers.filter(e => e.isAvailable);

    if (availableOffers.length > 0) {
      // Sort by landedCostArs ascending: lowest price wins!
      availableOffers.sort((a, b) => (a.landedCostArs ?? Infinity) - (b.landedCostArs ?? Infinity));
      const best = availableOffers[0];
      const newActive = autoPause ? true : product.is_active;

      await supabase.from("products").update({
        supplier_available: true,
        supplier_stock_status: "in_stock",
        supplier_last_checked_at: new Date().toISOString(),
        supplier_live_price: best.landedCostArs,
        source_url: best.offer.source_url || product.source_url,
        is_active: newActive,
        updated_at: new Date().toISOString(),
      }).eq("id", productId);

      return {
        productId,
        available: true,
        status: "in_stock",
        livePrice: best.landedCostArs,
        cheapestSupplier: best.supplierName,
        isActive: newActive,
        checkedUrl: best.offer.source_url,
        message: `Disponible en ${best.supplierName} al menor costo ($${best.landedCostArs ? best.landedCostArs.toLocaleString('es-AR') : 'S/D'}). Publicación activa.`,
      };
    } else {
      // All verified offers are out of stock!
      const newActive = autoPause ? false : product.is_active;

      await supabase.from("products").update({
        supplier_available: false,
        supplier_stock_status: "out_of_stock",
        supplier_last_checked_at: new Date().toISOString(),
        is_active: newActive,
        updated_at: new Date().toISOString(),
      }).eq("id", productId);

      return {
        productId,
        available: false,
        status: "out_of_stock",
        isActive: newActive,
        message: autoPause
          ? "Agotado en todos los proveedores vinculados. Publicación pausada automáticamente."
          : "Agotado en todos los proveedores vinculados.",
      };
    }
  }

  // Case 2: No multi-supplier offers linked yet, fallback to product.source_url
  const check = await checkSupplierProductAvailability(product.source_url, product.sku, product.brand);
  const newAvailable = check.status === "in_stock" ? true : check.status === "out_of_stock" ? false : Boolean(product.supplier_available);
  const newActive = autoPause
    ? (check.status === "out_of_stock" ? false : check.status === "in_stock" ? true : product.is_active)
    : product.is_active;

  const { error: updateError } = await supabase.rpc("update_product_supplier_sync_v1", {
    product_id_input: productId,
    available_input: newAvailable,
    status_input: check.status,
    live_price_input: null,
  });

  if (updateError) {
    return { ...check, productId, available: Boolean(product.supplier_available), status: "error", message: `No se pudo guardar la verificación: ${updateError.message}` };
  }

  if (autoPause && product.is_active !== newActive) {
    await supabase.from("products").update({
      is_active: newActive,
      updated_at: new Date().toISOString(),
    }).eq("id", productId);
  }

  return {
    ...check,
    productId,
    available: newAvailable,
    isActive: newActive,
  };
}

export async function runBatchSupplierStockSync(options?: {
  limit?: number;
  onlySupplierMode?: boolean;
  client?: SupabaseClient;
  timeBudgetMs?: number;
}): Promise<{
  total: number;
  checked: number;
  inStock: number;
  outOfStock: number;
  errors: number;
  results: Array<{
    id: string;
    title: string;
    sku: string;
    available: boolean;
    status: string;
    message: string;
  }>;
}> {
  const limit = options?.limit ?? 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("El límite de verificación debe estar entre 1 y 100.");
  const supabase = options?.client ?? await getAdminClient();
  const timeBudgetMs = options?.timeBudgetMs ?? 43_000;
  if (!Number.isFinite(timeBudgetMs) || timeBudgetMs < 0 || timeBudgetMs > 43_000) throw new Error("Presupuesto de verificación inválido.");
  const startedAt = Date.now();
  type SyncProduct = { id: string; title: string; sku: string; brand: string; source_url: string; fulfillment_mode: string; supplier_available: boolean; supplier_last_checked_at: string | null; is_active: boolean };
  let products: SyncProduct[];
  if (options?.client) {
    let query = supabase.from("products").select("id,title,sku,brand,source_url,fulfillment_mode,supplier_available,supplier_last_checked_at,is_active").eq("is_active", true).not("source_url", "is", null);
    if (options?.onlySupplierMode !== false) query = query.eq("fulfillment_mode", "supplier");
    const result = await query.order("supplier_last_checked_at", { ascending: true, nullsFirst: true }).limit(limit);
    if (result.error) throw new Error("No se pudo leer el catálogo para verificar disponibilidad.");
    products = result.data as SyncProduct[];
  } else {
    const all = await readAllPages((from, to) => readAdminProducts(supabase, { from, size: to - from + 1 }));
    products = (all as SyncProduct[]).filter(p => p.is_active && p.source_url && (options?.onlySupplierMode === false || p.fulfillment_mode === "supplier"))
      .sort((a, b) => (a.supplier_last_checked_at ?? "").localeCompare(b.supplier_last_checked_at ?? "")).slice(0, limit);
  }

  const results: Array<{
    id: string;
    title: string;
    sku: string;
    available: boolean;
    status: string;
    message: string;
  }> = [];

  let inStock = 0;
  let outOfStock = 0;
  let errors = 0;

  const concurrency = 4;
  for (let i = 0; i < products.length; i += concurrency) {
    if (Date.now() - startedAt >= timeBudgetMs) break;
    const chunk = products.slice(i, i + concurrency);
    const chunkPromises = chunk.map(async (p) => {
      const check = await checkSupplierProductAvailability(p.source_url, p.sku, p.brand);
      const newAvailable =
        check.status === "in_stock"
          ? true
          : check.status === "out_of_stock"
          ? false
          : Boolean(p.supplier_available);

      const { error: updateError } = await supabase.rpc("update_product_supplier_sync_v1", {
        product_id_input: p.id,
        available_input: newAvailable,
        status_input: check.status,
        live_price_input: null,
      });

      if (updateError) {
        return {
          id: p.id,
          title: p.title,
          sku: p.sku ?? "",
          available: Boolean(p.supplier_available),
          status: "error",
          message: `No se pudo guardar la verificación: ${updateError.message}`,
        };
      }

      return {
        id: p.id,
        title: p.title,
        sku: p.sku ?? "",
        available: newAvailable,
        status: check.status,
        message: check.message,
      };
    });

    const chunkResults = await Promise.all(chunkPromises);
    for (const res of chunkResults) {
      if (res.status === "in_stock") inStock++;
      else if (res.status === "out_of_stock") outOfStock++;
      else errors++;
      results.push(res);
    }

    if (i + concurrency < products.length) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  return {
    total: products.length,
    checked: results.length,
    inStock,
    outOfStock,
    errors,
    results,
  };
}

export interface CatalogSyncProgress {
  offset: number;
  limit: number;
  total: number;
  processed: number;
  inStock: number;
  outOfStock: number;
  pausedCount: number;
  reactivatedCount: number;
  errors: number;
  done: boolean;
  nextOffset: number | null;
  results: Array<{
    id: string;
    title: string;
    sku: string;
    available: boolean;
    isActive: boolean;
    status: string;
    livePrice?: number | null;
    cheapestSupplier?: string | null;
    message: string;
  }>;
}

/**
 * Runner continuo de sincronización por trozos (chunks) para recorrer el 100% del catálogo.
 * Permite que el frontend en /admin orqueste la sincronización total en vivo sin caer por timeout.
 */
export async function runCatalogSyncChunk(options?: {
  offset?: number;
  limit?: number;
  client?: SupabaseClient;
}): Promise<CatalogSyncProgress> {
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 15;
  const supabase = options?.client ?? await getAdminClient();

  // Count total supplier products (excluding deleted)
  const countResult = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("fulfillment_mode", "supplier");

  const total = countResult.count ?? 0;

  // Read this chunk
  const { data: chunkProducts, error: chunkError } = await supabase
    .from("products")
    .select("id, title, sku, brand, source_url, fulfillment_mode, supplier_available, is_active")
    .is("deleted_at", null)
    .eq("fulfillment_mode", "supplier")
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (chunkError || !chunkProducts) {
    throw new Error(`Error al leer el catálogo para sincronización: ${chunkError?.message}`);
  }

  const results: CatalogSyncProgress["results"] = [];
  let inStock = 0;
  let outOfStock = 0;
  let pausedCount = 0;
  let reactivatedCount = 0;
  let errors = 0;

  for (const p of chunkProducts) {
    try {
      const checkResult = await checkAndUpdateProductSupplierStock(p.id);
      const isNowActive = checkResult.isActive ?? p.is_active;

      if (checkResult.available) {
        inStock++;
        if (!p.is_active && isNowActive) reactivatedCount++;
      } else {
        outOfStock++;
        if (p.is_active && !isNowActive) pausedCount++;
      }

      results.push({
        id: p.id,
        title: p.title,
        sku: p.sku || "",
        available: checkResult.available,
        isActive: isNowActive,
        status: checkResult.status,
        livePrice: checkResult.livePrice,
        cheapestSupplier: checkResult.cheapestSupplier,
        message: checkResult.message,
      });
    } catch (err: unknown) {
      errors++;
      results.push({
        id: p.id,
        title: p.title,
        sku: p.sku || "",
        available: Boolean(p.supplier_available),
        isActive: Boolean(p.is_active),
        status: "error",
        message: err instanceof Error ? err.message : "Error al procesar",
      });
    }
  }

  const processed = offset + chunkProducts.length;
  const done = processed >= total || chunkProducts.length === 0;
  const nextOffset = done ? null : processed;

  return {
    offset,
    limit,
    total,
    processed,
    inStock,
    outOfStock,
    pausedCount,
    reactivatedCount,
    errors,
    done,
    nextOffset,
    results,
  };
}

export interface AutoHuntResult {
  totalUnlinked: number;
  checked: number;
  matchedAndActivated: number;
  keptInPause: number;
  results: Array<{
    id: string;
    title: string;
    matchedSupplier?: string;
    sourceUrl?: string;
    landedCostArs?: number;
    suggestedPrice?: number;
    status: "matched" | "paused_no_stock" | "paused_no_match";
    message: string;
  }>;
}

/**
 * Auto-Hunter para productos huérfanos sin proveedor:
 * Rastrea en los catálogos y ofertas de los mayoristas oficiales.
 * Si encuentra coincidencia con stock disponible: vincula el más barato, calcula costo (USD * 1600 * 1.20)
 * y activa la publicación. Si no hay suerte o no hay stock, mantiene el producto en pausa.
 */
export async function huntSuppliersForUnlinkedProducts(options?: {
  limit?: number;
  client?: SupabaseClient;
}): Promise<AutoHuntResult> {
  const limit = options?.limit ?? 30;
  const supabase = options?.client ?? await getAdminClient();

  const [unlinkedRes, settingsRes, suppliersRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, title, brand, model, sku, category_id, retail_price, fulfillment_mode, is_active, specifications")
      .is("deleted_at", null)
      .eq("fulfillment_mode", "supplier")
      .or("source_url.is.null,source_url.eq.''")
      .order("id")
      .limit(limit),
    supabase.from("supplier_tracking_settings").select("config").eq("id", true).maybeSingle(),
    supabase.from("suppliers").select("id, name, official_key").eq("is_active", true)
  ]);

  if (unlinkedRes.error) {
    throw new Error(`No se pudo leer productos huérfanos: ${unlinkedRes.error.message}`);
  }

  const unlinkedProducts = unlinkedRes.data ?? [];
  const config = (settingsRes.data?.config ?? {}) as TrackingConfig;
  const fx = config.acquisitionArsPerUsd || 1600;
  const suppliers = suppliersRes.data ?? [];

  // Read available candidate offers that have public supplier cards or existing unassigned supplier_offers
  const { data: candidates } = await supabase
    .from("supplier_offers")
    .select("id, supplier_id, external_id, title, brand, model, gtin, source_url, origin_cost, currency, availability")
    .not("source_url", "is", null);

  const candidateOffers = candidates ?? [];

  let matchedAndActivated = 0;
  let keptInPause = 0;
  const results: AutoHuntResult["results"] = [];

  for (const product of unlinkedProducts) {
    const target: MatchTarget = {
      productId: product.id,
      variantId: null,
      title: product.title,
      brand: product.brand || "",
      model: product.model || "",
      sku: product.sku || "",
      specifications: (product.specifications as Record<string, string>) || {},
      sourceUrl: null,
    };

    // 1. Try matching with existing candidate offers
    const matchingOffers: Array<{
      offer: typeof candidateOffers[number];
      supplierName: string;
      landedCostArs: number;
    }> = [];

    for (const cand of candidateOffers) {
      const sup = suppliers.find(s => s.id === cand.supplier_id);
      const matchSource: MatchSource = {
        title: cand.title,
        brand: cand.brand,
        model: cand.model,
        gtin: cand.gtin,
        external_id: cand.external_id,
        source_url: cand.source_url,
        supplierKey: sup?.official_key,
      };

      const matchRes = matchSupplierProduct(matchSource, [target]);
      if (matchRes.status === "exact") {
        let landedCostArs = 0;
        if (cand.origin_cost && cand.currency === "USD") {
          landedCostArs = calculateLandedCostArs(Number(cand.origin_cost), fx, 20).totalLandedArs;
        } else if (cand.origin_cost && cand.currency === "ARS") {
          landedCostArs = Number(cand.origin_cost);
        }

        matchingOffers.push({
          offer: cand,
          supplierName: sup?.name || "Mayorista",
          landedCostArs,
        });
      }
    }

    // 2. Filter offers that are in stock
    const inStockMatches = matchingOffers.filter(m => m.offer.availability === "in_stock");

    if (inStockMatches.length > 0) {
      // Pick the cheapest one!
      inStockMatches.sort((a, b) => a.landedCostArs - b.landedCostArs);
      const winner = inStockMatches[0];

      // Calculate suggested selling price
      const priceSuggestion = calculateSuggestedRetailPrice(
        winner.landedCostArs,
        product.category_id,
        product.title,
        { psychologicalEnding: true }
      );

      const newRetailPrice = product.retail_price && product.retail_price > 0
        ? product.retail_price
        : priceSuggestion.suggestedPrice;

      // Update product: link winner, set cost, activate!
      await supabase.from("products").update({
        source_url: winner.offer.source_url,
        supplier_live_price: winner.landedCostArs,
        supplier_available: true,
        supplier_stock_status: "in_stock",
        supplier_last_checked_at: new Date().toISOString(),
        retail_price: newRetailPrice,
        is_active: true,
        updated_at: new Date().toISOString(),
      }).eq("id", product.id);

      // Link offer
      await supabase.from("supplier_offers").update({
        product_id: product.id,
        verification: "verified",
        updated_at: new Date().toISOString(),
      }).eq("id", winner.offer.id);

      matchedAndActivated++;
      results.push({
        id: product.id,
        title: product.title,
        matchedSupplier: winner.supplierName,
        sourceUrl: winner.offer.source_url,
        landedCostArs: winner.landedCostArs,
        suggestedPrice: newRetailPrice,
        status: "matched",
        message: `¡Emparejado con ${winner.supplierName}! Costo landed: $${winner.landedCostArs.toLocaleString('es-AR')} ARS. Publicación activada.`,
      });
    } else if (matchingOffers.length > 0) {
      // Matches exist but all are out of stock -> Keep in pause!
      await supabase.from("products").update({
        is_active: false,
        supplier_available: false,
        supplier_stock_status: "out_of_stock",
        supplier_last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", product.id);

      keptInPause++;
      results.push({
        id: product.id,
        title: product.title,
        status: "paused_no_stock",
        message: "Encontrado en mayoristas pero actualmente sin stock. Se mantiene en pausa.",
      });
    } else {
      // No match found across suppliers -> Keep in pause!
      await supabase.from("products").update({
        is_active: false,
        supplier_available: false,
        supplier_stock_status: "no_supplier_match",
        supplier_last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", product.id);

      keptInPause++;
      results.push({
        id: product.id,
        title: product.title,
        status: "paused_no_match",
        message: "Sin coincidencia exacta en los 7 mayoristas. Se mantiene en pausa de seguridad.",
      });
    }
  }

  return {
    totalUnlinked: unlinkedProducts.length,
    checked: results.length,
    matchedAndActivated,
    keptInPause,
    results,
  };
}
