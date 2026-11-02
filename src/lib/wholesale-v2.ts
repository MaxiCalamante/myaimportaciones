/** Public prices are a projection of reviewed private costs; never a discount off retail. */
export type WholesalePayment = 'mercado_pago' | 'transferencia';
export interface PublicWholesalePolicy { minAmountArs:number; minUnits:number }
export interface WholesaleTier { minQty:number; unitPrice:number }
export interface PublicWholesaleOffer {
 productId:string; variantId:string|null; unitPrice:number|null;
 status:'ready'|'review'|'unavailable'; reason:string; tiers:WholesaleTier[];
 validUntil:string|null; policyId:string|null;
}
export interface WholesaleMargin {minimum:number;target:number}
export interface WholesaleV2Policy extends PublicWholesalePolicy {
 confirmed:boolean; autoUpdate:boolean;
 minimumMarginPercent:number|null; targetMarginPercent:number|null;
 paymentFees:Record<WholesalePayment,number|null>;
 riskPercent:number|null; fixedUnitArs:number|null; transferDiscountPercent:number|null;
 roundArs:number; costValidityHours:number; maxPriceChangePercent:number;
 categoryMargins:Record<string,WholesaleMargin>; brandMargins:Record<string,WholesaleMargin>;
 productMargins:Record<string,WholesaleMargin>;
 quantityMargins:Array<{minQty:number;targetMarginPercent:number}>; notes:string;
}
export const INITIAL_PUBLIC_WHOLESALE_POLICY:PublicWholesalePolicy={minAmountArs:100000,minUnits:5};
export const DRAFT_WHOLESALE_POLICY:WholesaleV2Policy={
 ...INITIAL_PUBLIC_WHOLESALE_POLICY,confirmed:false,autoUpdate:false,minimumMarginPercent:null,targetMarginPercent:null,
 paymentFees:{mercado_pago:null,transferencia:null},riskPercent:null,fixedUnitArs:null,transferDiscountPercent:null,
 roundArs:100,costValidityHours:24,maxPriceChangePercent:20,categoryMargins:{},brandMargins:{},productMargins:{},quantityMargins:[],notes:'Pendiente de ratificar costos, comisiones y márgenes.',
};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const number=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const percentage=(v:unknown)=>number(v,0,99.99);
export function validateWholesaleV2Policy(value:unknown):WholesaleV2Policy{
 if(!record(value)||!number(value.minAmountArs,0,1e12)||!Number.isInteger(value.minUnits)||!number(value.minUnits,1,10000)
  ||typeof value.confirmed!=='boolean'||typeof value.autoUpdate!=='boolean'||!number(value.roundArs,.01,1e9)
  ||!number(value.costValidityHours,1,720)||!number(value.maxPriceChangePercent,0,100)
  ||typeof value.notes!=='string'||value.notes.length>5000||!record(value.paymentFees))throw new Error('Revisá los mínimos, vigencia y reglas mayoristas.');
 const keys=['minimumMarginPercent','targetMarginPercent','riskPercent','transferDiscountPercent'] as const;
 for(const key of keys)if(value[key]!==null&&!percentage(value[key]))throw new Error(`Revisá ${key}.`);
 if(value.fixedUnitArs!==null&&!number(value.fixedUnitArs,0,1e12))throw new Error('Revisá los gastos comerciales adicionales.');
 for(const payment of ['mercado_pago','transferencia'])if(value.paymentFees[payment]!==null&&!percentage(value.paymentFees[payment]))throw new Error('Revisá las comisiones de los medios de pago.');
 for(const key of ['categoryMargins','brandMargins','productMargins']){
  const map=value[key];if(!record(map)||Object.keys(map).length>2000)throw new Error('Revisá las excepciones de margen.');
  for(const [id,m]of Object.entries(map))if(!id.trim()||['__proto__','prototype','constructor'].includes(id)||id.length>120||!record(m)||!percentage(m.minimum)||!percentage(m.target)||(m.target as number)<(m.minimum as number))throw new Error('Cada excepción requiere mínimo y objetivo válidos.');
 }
 if(!Array.isArray(value.quantityMargins)||value.quantityMargins.length>20)throw new Error('Revisá las escalas por cantidad.');
 const quantities=new Set<number>();
 for(const tier of value.quantityMargins){if(!record(tier)||!Number.isInteger(tier.minQty)||!number(tier.minQty,2,10000)||!percentage(tier.targetMarginPercent)||quantities.has(tier.minQty as number))throw new Error('Cada escala requiere cantidad única y margen válido.');quantities.add(tier.minQty as number);}
 if(value.confirmed){
  if([...keys,'fixedUnitArs'].some(k=>value[k]===null)||Object.values(value.paymentFees).some(v=>v===null))throw new Error('Completá todos los costos y porcentajes antes de confirmar la política.');
  const minimum=value.minimumMarginPercent as number,target=value.targetMarginPercent as number;
  if(target<minimum||Object.values(value.paymentFees).some(f=>(f as number)+target>=100))throw new Error('El objetivo debe respetar el mínimo y dejar espacio para la comisión.');
  if(value.quantityMargins.some(t=>(t as {targetMarginPercent:number}).targetMarginPercent<minimum))throw new Error('Las escalas deben respetar el margen mínimo.');
 }
 return value as unknown as WholesaleV2Policy;
}
/** Display only: the server repeats the quote for the chosen identity, quantity and payment. */
export function publicWholesaleUnitPrice(offer:PublicWholesaleOffer|undefined|null,quantity=1):number|null{
 if(!offer||offer.status!=='ready'||!Number.isInteger(quantity)||quantity<1||quantity>10000||!(Number(offer.unitPrice)>0))return null;
 const tier=[...offer.tiers].filter(t=>t.minQty<=quantity&&Number.isInteger(t.minQty)&&t.minQty>=1&&Number.isFinite(t.unitPrice)&&t.unitPrice>0).sort((a,b)=>b.minQty-a.minQty)[0];
 return tier?.unitPrice??offer.unitPrice;
}
export function publicWholesaleLineTotal(offer:PublicWholesaleOffer|undefined|null,quantity=1){const price=publicWholesaleUnitPrice(offer,quantity);return price===null?null:Math.round(price*quantity*100)/100;}
export function wholesaleMinimumProgress(lines:Array<{quantity:number;unitPrice:number}>,policy:PublicWholesalePolicy){
 const units=lines.reduce((n,l)=>n+l.quantity,0),amount=Math.round(lines.reduce((n,l)=>n+l.quantity*l.unitPrice,0)*100)/100;
 return{units,amount,meetsMinimum:units>=policy.minUnits||amount>=policy.minAmountArs,missingUnits:Math.max(0,policy.minUnits-units),missingAmount:Math.max(0,policy.minAmountArs-amount)};
}
export interface WholesaleUnitCost {landedCost:number|null;variableCost:number|null;minimumContribution:number|null;paymentFeePercent:number|null;confirmed:boolean}
export function quoteWholesaleV2(cost:WholesaleUnitCost,policy:WholesaleV2Policy,input:{productId:string;categoryId:string;brand:string;quantity:number;payment:WholesalePayment;fixedPrice?:number|null}){
 const unavailable={price:null as number|null,minimumPrice:null as number|null,marginPercent:null as number|null,reason:''};
 try{validateWholesaleV2Policy(policy);}catch(e){return{...unavailable,reason:e instanceof Error?e.message:'Política inválida.'};}
 if(!policy.confirmed||!cost.confirmed||![cost.landedCost,cost.variableCost,cost.minimumContribution,cost.paymentFeePercent].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0)||!(Number(cost.landedCost)>0))return{...unavailable,reason:'Costos o política pendientes de confirmar.'};
 if(!Number.isInteger(input.quantity)||input.quantity<1||input.quantity>10000||!['mercado_pago','transferencia'].includes(input.payment))return{...unavailable,reason:'Cantidad o medio de pago inválidos.'};
 const m=policy.productMargins[input.productId]??policy.brandMargins[input.brand]??policy.categoryMargins[input.categoryId];
 const minimum=m?.minimum??policy.minimumMarginPercent!,baseTarget=m?.target??policy.targetMarginPercent!;
 const tier=policy.quantityMargins.filter(t=>t.minQty<=input.quantity).sort((a,b)=>b.minQty-a.minQty)[0];
 const target=tier?.targetMarginPercent??baseTarget,fee=Math.max(cost.paymentFeePercent!,policy.paymentFees[input.payment]!);
 if(target<minimum||target+fee>=100||minimum+fee>=100)return{...unavailable,reason:'Margen y comisión incompatibles.'};
 const c=cost.landedCost!*(1+policy.riskPercent!/100)+cost.variableCost!+policy.fixedUnitArs!;
 const up=(n:number)=>Math.ceil((n-1e-8)/policy.roundArs)*policy.roundArs;
 const floor=up(Math.max(c/(1-(fee+minimum)/100),(c+cost.minimumContribution!)/(1-fee/100)));
 const discount=input.payment==='transferencia'?policy.transferDiscountPercent!:0;
 const price=input.fixedPrice??up(Math.max(floor,c/(1-(fee+target)/100)*(1-discount/100)));
 const contribution=price*(1-fee/100)-c,margin=contribution/price*100;
 if(!(price>0)||price>1e12||margin+1e-8<minimum||contribution+1e-8<cost.minimumContribution!)return{...unavailable,minimumPrice:floor,reason:'El precio no cubre costos, comisión y margen mínimo.'};
 return{price:Math.round(price*100)/100,minimumPrice:floor,marginPercent:margin,reason:''};
}
