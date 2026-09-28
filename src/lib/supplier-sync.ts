import { createServerSupabaseClient } from "@/lib/supabase/server";

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
        const res = await fetch(searchUrl, {
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) {
          return {
            available: false,
            status: "error",
            message: `Mayorista respondió con error HTTP ${res.status}`,
            checkedUrl: searchUrl,
          };
        }
        const html = await res.text();
        const hasSku = html.includes(`data-item_codigo="${sku}"`) || html.includes(sku);
        if (!hasSku) {
          return {
            available: false,
            status: "not_found",
            message: `SKU ${sku} no encontrado en catálogo del mayorista`,
            checkedUrl: searchUrl,
          };
        }
        const priceMatch = html.match(/data-item_preco="([^"]+)"/i);
        const price = priceMatch ? parseFloat(priceMatch[1]) : null;
        const isOut = /esgotado|indispon[íi]vel|sem estoque|fora de estoque|produto esgotado/i.test(html);
        if (isOut || (price !== null && price <= 0)) {
          return {
            available: false,
            status: "out_of_stock",
            livePrice: price,
            currency: "USD",
            message: "Agotado / Sin stock en catálogo del mayorista",
            checkedUrl: searchUrl,
          };
        }
        return {
          available: true,
          status: "in_stock",
          livePrice: price,
          currency: "USD",
          message: `En stock en mayorista (USD ${price?.toFixed(2) ?? "—"})`,
          checkedUrl: searchUrl,
        };
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
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(12000),
    });

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

    const html = await res.text();

    // Check specific scrapers based on URL domain
    if (targetUrl.includes("totalherramientasoficial.com.py")) {
      const priceMatch = html.match(/data-item_preco="([^"]+)"/i);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;
      const isOut = /esgotado|indispon[íi]vel|sem estoque|fora de estoque|produto esgotado/i.test(html);

      if (isOut || (price !== null && price <= 0)) {
        return {
          available: false,
          status: "out_of_stock",
          livePrice: price,
          currency: "USD",
          message: "Agotado / Sin existencias en Total Tools",
          checkedUrl: targetUrl,
        };
      }

      return {
        available: true,
        status: "in_stock",
        livePrice: price,
        currency: "USD",
        message: `En stock en Total Tools (USD ${price?.toFixed(2) ?? "—"})`,
        checkedUrl: targetUrl,
      };
    }

    if (targetUrl.includes("atacadousa.com.py")) {
      const isOut = /esgotado|indispon[íi]vel|sem estoque|fora de estoque|out of stock|agotado/i.test(html);
      const priceMatch = html.match(/class="[^"]*current-price-value[^"]*"[^>]*>([\s\S]*?)<\/span>/i) || html.match(/\$\s*([0-9.,]+)/);
      let price: number | null = null;
      if (priceMatch) {
        const raw = priceMatch[1].replace(".", "").replace(",", ".").trim();
        const num = parseFloat(raw);
        if (!isNaN(num) && num > 0) price = num;
      }

      if (isOut) {
        return {
          available: false,
          status: "out_of_stock",
          livePrice: price,
          currency: "USD",
          message: "Agotado en Atacado USA",
          checkedUrl: targetUrl,
        };
      }

      return {
        available: true,
        status: "in_stock",
        livePrice: price,
        currency: "USD",
        message: `En stock en Atacado USA (${price ? "USD " + price.toFixed(2) : "Disponible"})`,
        checkedUrl: targetUrl,
      };
    }

    // Generic fallback for any other supplier website
    const isOutGeneric = /esgotado|indispon[íi]vel|sem estoque|fora de estoque|out of stock|agotado|sin stock|no disponible/i.test(html);
    if (isOutGeneric) {
      return {
        available: false,
        status: "out_of_stock",
        message: "Mayorista indica sin stock / agotado",
        checkedUrl: targetUrl,
      };
    }

    return {
      available: true,
      status: "in_stock",
      message: "Disponible en sitio del proveedor",
      checkedUrl: targetUrl,
    };
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
  const supabase = await createServerSupabaseClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("id, title, sku, brand, source_url, fulfillment_mode, supplier_available")
    .eq("id", productId)
    .single();

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

  await supabase.rpc("update_product_supplier_sync_v1", {
    product_id_input: productId,
    available_input: newAvailable,
    status_input: check.status,
    live_price_input: check.livePrice ?? null,
  });

  return {
    ...check,
    productId,
    available: newAvailable,
  };
}

export async function runBatchSupplierStockSync(options?: {
  limit?: number;
  onlySupplierMode?: boolean;
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
  const limit = Math.min(options?.limit ?? 25, 100);
  const supabase = await createServerSupabaseClient();

  // Pick active products with source_url, prioritizing supplier mode and least recently checked
  let query = supabase
    .from("products")
    .select("id, title, sku, brand, source_url, fulfillment_mode, supplier_available, supplier_last_checked_at")
    .eq("is_active", true)
    .not("source_url", "is", null);

  if (options?.onlySupplierMode !== false) {
    query = query.eq("fulfillment_mode", "supplier");
  }

  const { data: products, error } = await query
    .order("supplier_last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error || !products || products.length === 0) {
    return {
      total: 0,
      checked: 0,
      inStock: 0,
      outOfStock: 0,
      errors: 0,
      results: [],
    };
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
    const chunk = products.slice(i, i + concurrency);
    const chunkPromises = chunk.map(async (p) => {
      const check = await checkSupplierProductAvailability(p.source_url, p.sku, p.brand);
      const newAvailable =
        check.status === "in_stock"
          ? true
          : check.status === "out_of_stock" || check.status === "not_found"
          ? false
          : Boolean(p.supplier_available);

      await supabase.rpc("update_product_supplier_sync_v1", {
        product_id_input: p.id,
        available_input: newAvailable,
        status_input: check.status,
        live_price_input: check.livePrice ?? null,
      });

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
