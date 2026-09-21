/** Public channel switch. Keep the B2B implementation dormant until its launch review. */
export const WHOLESALE_ENABLED = false;
export const MAX_ORDER_QUANTITY = 100;
export const MAX_ORDER_LINES = 50;

export function isExcludedCategory(slug: string) {
  return /smartphone|telefon|tecnologia|celular/i.test(slug);
}

export function isVerifiedStock(product: { stock: number; stockVerifiedAt?: string | null }) {
  return product.stock > 0 && Boolean(product.stockVerifiedAt);
}

export function cleanProductTitle(title: string) {
  return title.replace(/^(MEDICUBE|SKIN1004|KARSEELL|ANUA|CELIMAX)\s+\1\s+/i, "$1 ").replace(/\s*\/$/, "").trim();
}
