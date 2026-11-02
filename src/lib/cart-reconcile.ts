import { isVerifiedStock, purchasableQuantity } from "./commerce-policy";
import type { CartLine, Product } from "./types";

export function reconcileCart<T extends CartLine>(lines: T[], products: Product[]): T[] {
  const current = new Map(products.map(product => [product.id, product]));
  return lines.flatMap(line => {
    const product = current.get(line.product.id);
    if (!product) return [];

    if (line.variantId) {
      const variant = product.variants?.find(v => v.id === line.variantId);
      if (!variant || !variant.isActive || line.channel==='retail'&&!isVerifiedStock(variant)) return [];
      const unitPrice = line.channel === "wholesale" ? (variant.wholesaleOffer?.unitPrice ?? null) : variant.retailPrice;
      const maxQty = line.channel==='wholesale' ? 100 : purchasableQuantity(variant);
      if (maxQty < 1) return [];
      return [{
        ...line,
        product:line.channel==='wholesale'?{...product,wholesaleOffer:product.wholesaleOffer??line.product.wholesaleOffer,variants:product.variants?.map(v=>({...v,wholesaleOffer:v.wholesaleOffer??line.product.variants?.find(old=>old.id===v.id)?.wholesaleOffer}))}:product,
        variantTitle: variant.title,
        variantPrice: unitPrice,
        variantImage: variant.imageUrl || null,
        variantSku: variant.sku || null,
        quantity: Math.min(line.quantity, maxQty),
      }];
    }

    if (line.channel==='retail'&&!isVerifiedStock(product)) return [];
    const maxQty = line.channel==='wholesale' ? 100 : purchasableQuantity(product);
    if (maxQty < 1) return [];
    return [{ ...line, product:line.channel==='wholesale'?{...product,wholesaleOffer:product.wholesaleOffer??line.product.wholesaleOffer}:product, quantity: Math.min(line.quantity, maxQty) }];
  });
}

