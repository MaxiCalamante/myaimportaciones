import type {SupabaseClient} from '@supabase/supabase-js';
import type {Product} from './types';
export interface PublicUsdPrice {productId:string;variantId:string|null;retailUsd:string;wholesaleUsd:string|null;retailArs:number|null;wholesaleArs:number|null;rateId:string|null}
export interface PublicPriceVerification {productId:string;variantId:string|null;retailVerified:boolean;wholesaleVerified:boolean;rateId:string|null;retailArs:number|null;wholesaleArs:number|null}
const key=(productId:string,variantId:string|null)=>`${productId}:${variantId??''}`;
const positive=(value:number|null|undefined):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>0;
const warning='Precio de referencia. Requiere cotización y costos vigentes antes de comprar.';

/** Only server-side callers supply the private service client. Failure is unverified. */
export async function readPublicPriceVerification(ids:string[],service:SupabaseClient|null):Promise<PublicPriceVerification[]> {
 if(!service)return[];
 const result:PublicPriceVerification[]=[],unique=[...new Set(ids)];
 for(let i=0;i<unique.length;i+=100){
  try{
   const r=await service.rpc('store_public_price_verification_v1',{ids_input:unique.slice(i,i+100)});
   if(!r.error&&Array.isArray(r.data))result.push(...r.data as PublicPriceVerification[]);
  }catch{/* Keep this batch as reference prices; other batches can still be verified. */}
 }
 return result;
}

/** Projection preserves reference amounts; affirmative verification belongs to each exact identity and channel. */
export function projectPublicUsdPrices(products:Product[],rows:PublicUsdPrice[],verification:PublicPriceVerification[]):Product[]{
 const prices=new Map(rows.map(r=>[key(r.productId,r.variantId),r]));
 const checks=new Map(verification.map(r=>[key(r.productId,r.variantId),r]));
 function project<T extends {retailPrice:number;wholesalePrice?:number}>(item:T,productId:string,variantId:string|null){
  const r=prices.get(key(productId,variantId)),v=checks.get(key(productId,variantId));
  const matched=Boolean(r?.rateId&&v?.rateId===r.rateId);
  const retailVerified=Boolean(matched&&positive(r?.retailArs)&&v?.retailArs===r?.retailArs&&v?.retailVerified===true);
  const wholesaleVerified=Boolean(matched&&positive(r?.wholesaleArs)&&v?.wholesaleArs===r?.wholesaleArs&&v?.wholesaleVerified===true);
  return{...item,...(r?{retailUsd:r.retailUsd,wholesaleUsd:r.wholesaleUsd,retailPrice:positive(r.retailArs)?r.retailArs:item.retailPrice,wholesalePrice:positive(r.wholesaleArs)?r.wholesaleArs:item.wholesalePrice??0}:{}),
   priceVerified:retailVerified,wholesalePriceVerified:wholesaleVerified,isPurchasable:retailVerified,priceWarning:retailVerified?undefined:warning};
 }
 return products.map(p=>{
  const variants=p.variants?.map(v=>project(v,p.id,v.id));
  const active=variants?.filter(v=>v.isActive)??[];
  const verified=active.filter(v=>v.priceVerified&&v.retailPrice>0);
  const references=(verified.length?verified:active).map(v=>v.retailPrice).filter(positive);
  return{...project(p,p.id,null),variants,...(p.hasVariants?{minPrice:references.length?Math.min(...references):undefined,maxPrice:references.length?Math.max(...references):undefined}:{})};
 });
}

/** Validation belongs to the exact amount; a different volume quote remains a reference. */
export function isWholesaleAmountVerified(identity:{wholesalePrice?:number;wholesalePriceVerified?:boolean},amount:number|null):boolean{
 return identity.wholesalePriceVerified===true&&positive(amount)&&amount===identity.wholesalePrice;
}
