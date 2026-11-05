import { isVerifiedStock } from "./commerce-policy";
import { cartLineQuantityLimit } from "./cart-mutations";
import { cartLineUnitPrice } from "./wholesale-policy";
import type { CartLine, Product } from "./types";

export function reconcileCart<T extends CartLine>(lines: T[], products: Product[]): T[] {
  const current = new Map(products.map(product => [product.id, product]));
  return lines.flatMap(line => {
    const refreshed = current.get(line.product.id);
    if (!refreshed) return [];
    // Public retail responses can omit wholesale prices and offers. Keep the
    // cart estimate until the dedicated wholesale quote replaces it.
    const product = line.channel === "wholesale" ? {
      ...refreshed,
      wholesalePrice: refreshed.wholesalePrice || line.product.wholesalePrice,
      wholesaleOffer: refreshed.wholesaleOffer ?? line.product.wholesaleOffer,
      variants: refreshed.variants?.map(variant => {
        const previous = line.product.variants?.find(v => v.id === variant.id);
        return { ...variant, wholesalePrice: variant.wholesalePrice || previous?.wholesalePrice || 0, wholesaleOffer: variant.wholesaleOffer ?? previous?.wholesaleOffer };
      }),
    } : refreshed;

    if (line.variantId) {
      const variant = product.variants?.find(v => v.id === line.variantId);
      if (!variant || !variant.isActive || line.channel==='retail'&&!isVerifiedStock(variant)) return [];
      const unitPrice = line.channel === "wholesale" ? (cartLineUnitPrice({ ...line, product }) ?? null) : variant.retailPrice;
      const maxQty = cartLineQuantityLimit({ ...line, product });
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

    if (line.channel==='retail'&&!isVerifiedStock(product)) return [];
    const maxQty = cartLineQuantityLimit({ ...line, product });
    if (maxQty < 1) return [];
    return [{ ...line, product, quantity: Math.min(line.quantity, maxQty) }];
  });
}

