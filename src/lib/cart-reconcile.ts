import { isVerifiedStock, purchasableQuantity } from "./commerce-policy";
import type { CartLine, Product } from "./types";

export function reconcileCart<T extends CartLine>(lines: T[], products: Product[]): T[] {
  const current = new Map(products.map(product => [product.id, product]));
  return lines.flatMap(line => {
    const product = current.get(line.product.id);
    if (!product) return [];

    if (line.variantId) {
      const variant = product.variants?.find(v => v.id === line.variantId);
      if (!variant || !variant.isActive || !isVerifiedStock(variant)) return [];
      const unitPrice = line.channel === "wholesale" ? (variant.wholesalePrice ?? variant.retailPrice) : variant.retailPrice;
      const maxQty = purchasableQuantity(variant);
      if (maxQty < 1) return [];
      return [{
        ...line,
        product,
        variantTitle: variant.title,
        variantPrice: unitPrice,
        variantImage: variant.imageUrl || null,
        variantSku: variant.sku || null,
        quantity: Math.min(line.quantity, maxQty),
      }];
    }

    if (!isVerifiedStock(product)) return [];
    const maxQty = purchasableQuantity(product);
    if (maxQty < 1) return [];
    return [{ ...line, product, quantity: Math.min(line.quantity, maxQty) }];
  });
}

