/** Public channel switch. Keep the B2B implementation dormant until its launch review. */
export const WHOLESALE_ENABLED = false;
export const MAX_ORDER_QUANTITY = 100;
export const MAX_ORDER_LINES = 50;

export function isExcludedCategory(slug: string) {
  return /smartphone|telefon|tecnologia|celular/i.test(slug);
}

export function purchasableQuantity(product: { stock: number; stockVerifiedAt?: string | null; fulfillmentMode?: string; supplierAvailable?: boolean }) {
  if (product.fulfillmentMode === "supplier") return product.supplierAvailable ? MAX_ORDER_QUANTITY : 0;
  return product.stockVerifiedAt ? Math.max(0, Math.min(MAX_ORDER_QUANTITY, product.stock)) : 0;
}
export function isVerifiedStock(product: { stock: number; stockVerifiedAt?: string | null; fulfillmentMode?: string; supplierAvailable?: boolean }) {
  if (product.fulfillmentMode === "supplier") return Boolean(product.supplierAvailable);
  return product.stock > 0 && Boolean(product.stockVerifiedAt);
}

export function cleanProductTitle(title: string) {
  return title.replace(/^(MEDICUBE|SKIN1004|KARSEELL|ANUA|CELIMAX)\s+\1\s+/i, "$1 ").replace(/\s*\/$/, "").trim();
}
