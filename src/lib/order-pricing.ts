export interface PricedItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  landedCost: number | null;
  variableCost: number;
  minimumContribution: number;
  beauty: boolean;
}

export interface OrderQuote {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  promotion: string;
  couponMessage: string;
}

/** One best promotion, never stacked. Cost floors and a 30-day cost review protect contribution. */
export function priceOrder(items: PricedItem[], payment: string, coupon: string, shipping: number, postalCode: string): OrderQuote {
  if (!items.length || !Number.isFinite(shipping) || shipping < 0) throw new Error("Pedido inválido.");
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100 || !Number.isFinite(item.price) || item.price <= 0) throw new Error("Cantidad o precio inválido.");
    if (item.landedCost !== null && item.price < item.landedCost + item.variableCost + item.minimumContribution) throw new Error(`El precio de ${item.title} requiere revisión. Consultanos antes de comprar.`);
  }
  const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
  const capacity = items.some(i => i.landedCost === null) ? 0 : Math.max(0, Math.floor(items.reduce((s, i) => s + (i.landedCost === null ? 0 : Math.max(0, i.price - i.landedCost - i.variableCost - i.minimumContribution)) * i.quantity, 0)));
  const units = items.reduce((s, i) => s + i.quantity, 0);
  const candidates = [{ amount: 0, label: "Sin promoción" }];
  if (payment === "transferencia" || payment === "efectivo") candidates.push({ amount: Math.floor(subtotal * 0.1), label: "Transferencia / efectivo" });
  if (units >= 2) candidates.push({ amount: Math.floor(subtotal * (units >= 3 ? 0.08 : 0.05)), label: "Cantidad" });
  const code = coupon.trim().toUpperCase();
  let couponMessage = "";
  if (code) {
    if (code === "MYA5") candidates.push({ amount: Math.floor(subtotal * 0.05), label: code });
    else if (code === "KBEAUTY8" && items.every(i => i.beauty) && subtotal >= 25000) candidates.push({ amount: Math.min(20000, Math.floor(subtotal * 0.08)), label: code });
    else if (code === "TANDIL" && /^B?7000([A-Z]{3})?$/.test(postalCode.toUpperCase()) && subtotal >= 10000) candidates.push({ amount: Math.min(2500, shipping), label: code });
    else couponMessage = "El cupón no está habilitado para este pedido.";
  }
  const best = candidates.sort((a, b) => b.amount - a.amount)[0];
  const discount = Math.min(best.amount, capacity);
  return { subtotal, discount, shipping, total: Math.round((subtotal - discount + shipping) * 100) / 100, promotion: discount ? best.label : "Sin promoción disponible", couponMessage };
}
