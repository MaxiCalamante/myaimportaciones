import type { SupplierCheckResult } from "./supplier-sync";

function decodeAttribute(value: string) {
  return value.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
    const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
    return point <= 0x10ffff ? String.fromCodePoint(point) : "";
  }).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

export function parsePrestashopAvailability(html: string, supplier: string): SupplierCheckResult {
  const unknown: SupplierCheckResult = { available: false, status: "error", message: `No se pudo confirmar el producto principal en ${supplier}.` };

  // 1. Classic PrestaShop format (used by Star Company and standard PrestaShop stores)
  const tag = [...html.matchAll(/<[^>]+>/g)].map(match => match[0]).find(value => /\bid\s*=\s*["']product-details["']/i.test(value));
  const attribute = tag?.match(/\bdata-product\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
  if (attribute) {
    try {
      const product = JSON.parse(decodeAttribute(attribute));
      const quantity = Number(product.quantity);
      if (product.quantity !== undefined && product.quantity !== null && Number.isInteger(quantity) && quantity >= 0 && product.id_product) {
        const amount = Number(product.price_amount);
        const price = Number.isFinite(amount) && amount > 0 ? amount : null;
        const available = quantity > 0;
        return {
          available,
          status: available ? "in_stock" : "out_of_stock",
          livePrice: price,
          currency: "USD",
          message: available ? `Disponible en ${supplier}${price ? ` (USD ${price.toFixed(2)})` : ""}.` : `Agotado en ${supplier}.`,
        };
      }
    } catch {
      // Continue to alternative checks
    }
  }

  // 2. Atacado USA modern visual layout (.av-product-detail)
  if (html.includes("av-product-detail")) {
    const priceMatch = html.match(/class=["'][^"']*av-detail-price[^"']*["']>([^<]+)</i);
    let price: number | null = null;
    if (priceMatch) {
      const raw = priceMatch[1].replace(/[^\d.,]/g, "").replace(",", ".");
      const parsed = parseFloat(raw);
      if (Number.isFinite(parsed) && parsed > 0) price = parsed;
    }

    const hasAddForm = /av-detail-add-form|Adicionar ao orçamento/i.test(html);
    const isOutOfStock = /esgotado|indispon[íi]vel|sem estoque|sin stock/i.test(html);
    const available = hasAddForm && !isOutOfStock;

    return {
      available,
      status: available ? "in_stock" : "out_of_stock",
      livePrice: price,
      currency: "USD",
      message: available ? `Disponible en ${supplier}${price ? ` (USD ${price.toFixed(2)})` : ""}.` : `Agotado en ${supplier}.`,
    };
  }

  // 3. Atacado USA / PrestaShop soft 404: redirects to store home or categories without product detail
  if (html.includes("av-hero-slider") || html.includes("av-hero-layout") || (html.includes("av-root") && !html.includes("av-product-detail"))) {
    return {
      available: false,
      status: "not_found",
      message: `Página no encontrada o dada de baja en ${supplier} (redirige a la portada).`,
    };
  }

  return unknown;
}
