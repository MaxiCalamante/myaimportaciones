import { getAdminClient } from "@/lib/admin-auth";
import { readAdminProducts } from "@/lib/admin-catalog-read";
import { readAllPages } from "@/lib/read-all-pages";
import { fetchSupplierPage, readSupplierHtml, supplierUrl } from "./supplier-url";
import { parsePrestashopAvailability } from "./prestashop-availability";
import { parseTotalAvailability } from "@/lib/total-availability";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SupplierCheckResult {
  productId?: string;
  available: boolean;
  status: "in_stock" | "out_of_stock" | "not_found" | "error" | "no_url";
  livePrice?: number | null;
  currency?: string | null;
  message: string;
  checkedUrl?: string | null;
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
  const { data, error } = await readAdminProducts(supabase, { ids: [productId], size: 1 });
  const product = data?.[0] as { source_url: string; sku: string; brand: string; supplier_available: boolean } | undefined;

  if (error || !product) {
    return {
      productId,
      available: false,
      status: "error",
      message: "Producto no encontrado en la base de datos",
    };
  }

  const check = await checkSupplierProductAvailability(product.source_url, product.sku, product.brand);

  // If the supplier is definitively out of stock or not found, set supplier_available to false.
  // If it's in stock, set supplier_available to true.
  // If there was a network error, keep current availability to prevent accidental disruption, but record status.
  const newAvailable = check.status === "in_stock" ? true : check.status === "out_of_stock" || check.status === "not_found" ? false : Boolean(product.supplier_available);

  const { error: updateError } = await supabase.rpc("update_product_supplier_sync_v1", {
    product_id_input: productId,
    available_input: newAvailable,
    status_input: check.status,
    // supplier_live_price is used as an ARS cost throughout the admin; scraper prices are USD.
    live_price_input: null,
  });
  if (updateError) {
    return { ...check, productId, available: Boolean(product.supplier_available), status: "error", message: `No se pudo guardar la verificación: ${updateError.message}` };
  }

  return {
    ...check,
    productId,
    available: newAvailable,
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

  // Process with concurrency pool of 4 to be polite to the supplier server
  const concurrency = 4;
  for (let i = 0; i < products.length; i += concurrency) {
    // Leave time for the final supplier timeout and database writes within the route's 60s limit.
    if (Date.now() - startedAt >= timeBudgetMs) break;
    const chunk = products.slice(i, i + concurrency);
    const chunkPromises = chunk.map(async (p) => {
      const check = await checkSupplierProductAvailability(p.source_url, p.sku, p.brand);
      const newAvailable =
        check.status === "in_stock"
          ? true
          : check.status === "out_of_stock" || check.status === "not_found"
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
      else if (res.status === "out_of_stock" || res.status === "not_found") outOfStock++;
      else errors++;
      results.push(res);
    }

    // Brief polite pause between chunks
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
