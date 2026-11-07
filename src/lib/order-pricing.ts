import {decimalUnits,moneyCents} from './money';
export interface PricedItem {
  channel?: "retail" | "wholesale";
  id: string;
  variant_id?: string | null;
  title: string;
  quantity: number;
  price: number;
  landedCost: number | null;
  variableCost: number;
  minimumContribution: number;
  beauty: boolean;
}

export interface OrderQuote {
  discountAllocations?: Record<string,number>;
  shippingDiscount?: number;
  quoteId?: string;
  expiresAt?: string;
  exchangeRate?: string;
  exchangeLabel?: string;
  shippingQuotedSeparately?: boolean;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  promotion: string;
  couponMessage: string;
}

/** Cost floors and a 30-day cost review protect contribution. */
export function priceOrder(items: PricedItem[], payment: string, coupon: string, shipping: number, postalCode: string): OrderQuote {
  if (!items.length || !Number.isFinite(shipping) || shipping < 0) throw new Error("Pedido inválido.");
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100 || !Number.isFinite(item.price) || item.price <= 0) throw new Error("Cantidad o precio inválido.");
    if (item.landedCost !== null && item.price < item.landedCost + item.variableCost + item.minimumContribution) throw new Error(`El precio de ${item.title} requiere revisión. Consultanos antes de comprar.`);
  }
  const subtotalCents=items.reduce((s,i)=>s+moneyCents(i.price)*i.quantity,0);
  if(!Number.isSafeInteger(subtotalCents))throw Error('Importe fuera de rango.');
  const subtotal=subtotalCents/100;
  const percentFloor=(pct:number)=>Number(BigInt(subtotalCents)*decimalUnits(pct)/(BigInt(10000)*BigInt(1000000)));
  const capacity=items.some(i=>i.landedCost===null)?0:Number(items.reduce((sum,i)=>{const room=decimalUnits(i.price)-decimalUnits(i.landedCost!)-decimalUnits(i.variableCost)-decimalUnits(i.minimumContribution);return sum+(room>BigInt(0)?room:BigInt(0))*BigInt(i.quantity);},BigInt(0))/BigInt(1000000));
  const units = items.reduce((s, i) => s + i.quantity, 0);
  const candidates = [{ amount: 0, label: "Sin promoción", shipping:false }];
  if (units >= 2) candidates.push({ amount: percentFloor(units >= 3 ? 8 : 5), label: "Cantidad",shipping:false });
  const code = coupon.trim().toUpperCase();
  let couponMessage = "";
  if (code) {
    if (code === "MYA5") candidates.push({ amount: percentFloor(5), label: code,shipping:false });
    else if (code === "KBEAUTY8" && items.every(i => i.beauty) && subtotal >= 25000) candidates.push({ amount: Math.min(20000, percentFloor(8)), label: code,shipping:false });
    else if (code === "TANDIL" && /^B?7000([A-Z]{3})?$/.test(postalCode.toUpperCase()) && subtotal >= 10000) candidates.push({ amount: Math.min(2500, shipping), label: code,shipping:true });
    else couponMessage = "El cupón no está habilitado para este pedido.";
  }
  const best = candidates.sort((a, b) => b.amount - a.amount)[0];
  const promotionDiscount = best.shipping?0:Math.min(best.amount, capacity);
  const shippingDiscount=best.shipping?Math.min(best.amount,capacity):0;
  // Transfer pricing is additional to the best offer, but never exceeds verified margin.
  const configuredPercent = Number(process.env.TRANSFER_DISCOUNT_PERCENT ?? 3);
  const transferPercent = Number.isFinite(configuredPercent) ? Math.max(0, Math.min(5, configuredPercent)) : 0;
  const transferDiscount = payment === "transferencia" ? Math.min(percentFloor(transferPercent), capacity - promotionDiscount-shippingDiscount) : 0;
  const discount = promotionDiscount + transferDiscount;
  const promotion = [promotionDiscount||shippingDiscount ? best.label : "", transferDiscount ? `Transferencia ${transferPercent}%` : ""].filter(Boolean).join(" + ") || "Sin promoción disponible";
  // Largest-remainder allocation conserves cents exactly. Promotions above apply
  // to all product lines; a shipping benefit is kept outside their discounts.
  const cents=moneyCents(discount),weights=items.map(i=>BigInt(moneyCents(i.price))*BigInt(i.quantity));
  const portions=weights.map(w=>Number(BigInt(cents)*w/BigInt(subtotalCents)));
  const order=weights.map((w,i)=>({i,remainder:BigInt(cents)*w%BigInt(subtotalCents)})).sort((a,b)=>a.remainder>b.remainder?-1:a.remainder<b.remainder?1:a.i-b.i);
  for(let rest=cents-portions.reduce((a,b)=>a+b,0),i=0;rest>0;rest--,i++)portions[order[i].i]++;
  const discountAllocations=Object.fromEntries(items.map((item,i)=>[`${item.id}:${item.variant_id??''}`,portions[i]/100]));
  return { subtotal, discount, discountAllocations,shippingDiscount, shipping:shipping-shippingDiscount, total: (subtotalCents-moneyCents(discount)+moneyCents(shipping-shippingDiscount))/100, promotion, couponMessage };
}
