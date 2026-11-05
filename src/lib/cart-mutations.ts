import { isVerifiedStock, MAX_ORDER_QUANTITY, purchasableQuantity } from './commerce-policy';
import type { CartLine } from './types';

export function cartLineQuantityLimit(line: Pick<CartLine, 'product' | 'channel' | 'variantId'>) {
  const variant = line.variantId ? line.product.variants?.find(v => v.id === line.variantId) : null;
  const target = variant || line.product;
  // Unconfirmed wholesale selections are requests, never authorization to charge.
  if (line.channel === 'wholesale' && (target.fulfillmentMode === 'supplier' || !isVerifiedStock(target))) return MAX_ORDER_QUANTITY;
  return purchasableQuantity(target);
}

export function incrementCartLine<T extends CartLine>(line: T, quantity: number): T {
  return { ...line, quantity: Math.min(cartLineQuantityLimit(line), line.quantity + quantity) };
}
