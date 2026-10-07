import { isVerifiedStock, purchasableQuantity } from "./commerce-policy";
import type { Product, ProductChannel } from "./types";

export function reconcileCart<T extends { product: Product; quantity: number; channel: ProductChannel }>(lines: T[], products: Product[]): T[] {
  const current = new Map(products.map(product => [product.id, product]));
  return lines.flatMap(line => {
    const product = current.get(line.product.id);
    if (!product || !isVerifiedStock(product)) return [];
    return [{ ...line, product, quantity: Math.min(line.quantity, purchasableQuantity(product)) }];
  });
}
