import {isWholesaleAmountVerified} from "@/lib/usd-price-projection";
import type { Product, ProductVariant } from "@/lib/types";

import { publicWholesaleUnitPrice } from "@/lib/wholesale-v2";
export const publicWholesalePrice = publicWholesaleUnitPrice;

export function wholesaleDisplay(product: Product, variant?: ProductVariant | null, quantity = 1) {
  if (variant) {
    const p = publicWholesalePrice(variant.wholesaleOffer, quantity);
    const fallbackPrice = (variant.wholesalePrice && variant.wholesalePrice > 0)
      ? variant.wholesalePrice
      : (!variant || variant.retailPrice === product.retailPrice) && product.wholesalePrice && product.wholesalePrice > 0
        ? product.wholesalePrice
        : (variant && variant.retailPrice && product.retailPrice && product.wholesalePrice && product.wholesalePrice > 0)
          ? Math.round((product.wholesalePrice / product.retailPrice) * variant.retailPrice / 100) * 100
          : null;
    return { price: p ?? fallbackPrice, from: false, offer: variant.wholesaleOffer };
  }
  if (product.hasVariants) {
    const offers = (product.variants ?? []).filter(v => v.isActive).map(v => v.wholesaleOffer);
    const prices = offers.map(o => publicWholesalePrice(o, quantity)).filter((p): p is number => p !== null);
    if (prices.length) return { price: Math.min(...prices), from: prices.length > 0, offer: undefined };
    const fallbackPrices = (product.variants ?? []).filter(v => v.isActive).map(v => v.wholesalePrice).filter((p): p is number => p != null && p > 0);
    if (fallbackPrices.length) return { price: Math.min(...fallbackPrices), from: fallbackPrices.length > 0, offer: undefined };
    return { price: product.wholesalePrice || null, from: false, offer: undefined };
  }
  const p = publicWholesalePrice(product.wholesaleOffer, quantity);
  return { price: p ?? (product.wholesalePrice || null), from: false, offer: product.wholesaleOffer };
}

export function isWholesaleDisplayVerified(product:Product,variant?:ProductVariant|null,quantity=1):boolean{
 if(variant&&variant.productId!==product.id)return false;
 if(!variant&&product.hasVariants)return false;
 return isWholesaleAmountVerified(variant??product,wholesaleDisplay(product,variant,quantity).price);
}
