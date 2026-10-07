import type { SupplierCheckResult } from "./supplier-sync";

function decodeAttribute(value: string) {
  return value.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
    const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
    return point <= 0x10ffff ? String.fromCodePoint(point) : "";
  }).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

export function parsePrestashopAvailability(html: string, supplier: string): SupplierCheckResult {
  const unknown: SupplierCheckResult = { available: false, status: "error", message: `No se pudo confirmar el producto principal en ${supplier}.` };
  const tag = [...html.matchAll(/<[^>]+>/g)].map(match => match[0]).find(value => /\bid\s*=\s*["']product-details["']/i.test(value));
  const attribute = tag?.match(/\bdata-product\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
  if (!attribute) return unknown;
  try {
    const product = JSON.parse(decodeAttribute(attribute));
    const quantity = Number(product.quantity);
    if (product.quantity === undefined || product.quantity === null || !Number.isInteger(quantity) || quantity < 0 || !product.id_product) return unknown;
    const amount = Number(product.price_amount);
    const price = Number.isFinite(amount) && amount > 0 ? amount : null;
    const available = quantity > 0;
    return {
      available, status: available ? "in_stock" : "out_of_stock", livePrice: price, currency: "USD",
      message: available ? `Disponible en ${supplier}${price ? ` (USD ${price.toFixed(2)})` : ""}.` : `Agotado en ${supplier}.`,
    };
  } catch { return unknown; }
}
