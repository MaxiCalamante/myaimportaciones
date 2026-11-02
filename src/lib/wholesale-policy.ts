import type { CartLine } from './types';
import { INITIAL_PUBLIC_WHOLESALE_POLICY, type PublicWholesalePolicy, type WholesaleTier } from './wholesale-v2';
/** Owner-confirmed terms, reconfirmed 28/10/2026. The two minimums are alternatives. */
export const WHOLESALE_MIN_AMOUNT = 100_000;
export const WHOLESALE_MIN_UNITS = 5;
export const WHOLESALE_MINIMUM_LABEL = "$100.000 en productos o 5 unidades en total";
export const WHOLESALE_MINIMUM_DETAILS = "Alcanzá $100.000 en productos o sumá al menos 5 unidades, del mismo producto o combinando varios. Basta con cumplir una de las dos condiciones. El envío se cotiza por separado.";

export interface VolumeTier {
  minQty: number;
  discountPct: number;
  label: string;
}

/** Extra quantity reductions only exist when a reviewed cost-based quote provides them. */
export const WHOLESALE_VOLUME_TIERS: VolumeTier[] = [];
export function getVolumeDiscount(_quantity:number){return{discountPct:0,tierLabel:null};}
export function calculateTieredWholesalePrice(baseWholesalePrice:number,quantity:number,tiers:WholesaleTier[]=[]){
 const selected=tiers.filter(t=>t.minQty<=quantity&&Number.isFinite(t.unitPrice)&&t.unitPrice>0).sort((a,b)=>b.minQty-a.minQty)[0];
 const unitPrice=selected?.unitPrice??baseWholesalePrice;
 return{unitPrice,discountPct:baseWholesalePrice>0?Math.round(Math.max(0,(1-unitPrice/baseWholesalePrice)*100)*100)/100:0,tierLabel:selected?`${selected.minQty}+ unidades`:null,total:unitPrice*quantity};
}
export function cartLineUnitPrice(line:CartLine):number|null{
 if(line.channel==='retail')return line.variantPrice??line.product.retailPrice;
 const variant=line.variantId?line.product.variants?.find(v=>v.id===line.variantId):null;
 const offer=variant?.wholesaleOffer??(!line.variantId?line.product.wholesaleOffer:null);
 if(offer?.status!=='ready'||offer.unitPrice===null)return null;
 return calculateTieredWholesalePrice(offer.unitPrice,line.quantity,offer.tiers).unitPrice;
}

export interface WholesaleValidationResult {
  hasWholesale: boolean;
  totalAmount: number;
  totalUnits: number;
  meetsMinimum: boolean;
  missingAmount: number;
  missingUnits: number;
  errorMessage?: string;
}

export function validateWholesaleOrder(
  lines: { channel?: string; price: number | null; quantity: number }[],
  policy:PublicWholesalePolicy=INITIAL_PUBLIC_WHOLESALE_POLICY
): WholesaleValidationResult {
  const wholesaleLines = lines.filter((l) => l.channel === "wholesale");
  if (!wholesaleLines.length) {
    return {
      hasWholesale: false,
      totalAmount: 0,
      totalUnits: 0,
      meetsMinimum: true,
      missingAmount: 0,
      missingUnits: 0,
    };
  }

  const totalAmount = wholesaleLines.reduce((sum, l) => {
    return sum + (l.price===null?0:l.price*l.quantity);
  }, 0);
  const totalUnits = wholesaleLines.reduce((sum, l) => sum + l.quantity, 0);
  const meetsMinimum = totalAmount >= policy.minAmountArs || totalUnits >= policy.minUnits;
  const missingAmount = Math.max(0, policy.minAmountArs - totalAmount);
  const missingUnits = Math.max(0, policy.minUnits - totalUnits);

  return {
    hasWholesale: true,
    totalAmount,
    totalUnits,
    meetsMinimum,
    missingAmount,
    missingUnits,
    errorMessage: meetsMinimum
      ? undefined
      : `El pedido mayorista requiere alcanzar $${policy.minAmountArs.toLocaleString("es-AR")} o sumar al menos ${policy.minUnits} unidades combinadas. Te faltan $${missingAmount.toLocaleString("es-AR")} o ${missingUnits} ${missingUnits === 1 ? "unidad" : "unidades"} para continuar.`,
  };
}

export function wholesaleProductInquiry(product: { title: string; slug: string }, quantity: number, variantTitle?: string | null) {
  return `Hola MYA Importaciones. Quisiera una cotización MAYORISTA.\nProducto: ${product.title}${variantTitle ? ` (${variantTitle})` : ""}.\nEnlace: https://myaimportaciones.com/producto/${encodeURIComponent(product.slug)}\nCantidad de este producto a consultar: ${quantity}.\nMínimo mayorista: ${WHOLESALE_MINIMUM_LABEL}, combinables entre productos.\nPor favor, confirmen precio mayorista, disponibilidad, pago y entrega. Si la selección no alcanza el mínimo, quisiera consultar cómo completar el pedido.`;
}
