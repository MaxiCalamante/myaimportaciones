import type {Product} from './types';
import {usdToArs} from './money';
export interface AdminUsdAmount {product_id:string;variant_id:string|null;retail_usd:string|number;wholesale_usd:string|number|null;state:string}
/** Display projection only: no margins, publication filtering or writes. */
export function projectAdminUsdAmounts(products:Product[],rows:AdminUsdAmount[],rate:string|null,step='1'):Product[]{
 const key=(p:string,v:string|null)=>`${p}:${v??''}`;
 const byIdentity=new Map(rows.map(r=>[key(r.product_id,r.variant_id),r]));
 function project<T extends {retailPrice:number;wholesalePrice?:number}>(item:T,productId:string,variantId:string|null){
  const usd=byIdentity.get(key(productId,variantId));if(!usd)return item;
  return {...item,retailUsd:String(usd.retail_usd),wholesaleUsd:usd.wholesale_usd===null?null:String(usd.wholesale_usd),
   retailPrice:rate?usdToArs(usd.retail_usd,rate,step):item.retailPrice,
   wholesalePrice:usd.wholesale_usd===null?0:rate?usdToArs(usd.wholesale_usd,rate,step):item.wholesalePrice,
   priceWarning:!rate?'Sin cotización vigente: referencia ARS histórica.':usd.state!=='active'?'Precio USD guardado en revisión.':undefined};
 }
 return products.map(p=>{
  const variants=p.variants?.map(v=>project(v,p.id,v.id));
  const prices=variants?.filter(v=>v.isActive).map(v=>v.retailPrice).filter(n=>n>0)??[];
  return {...project(p,p.id,null),variants,...(p.hasVariants&&prices.length?{minPrice:Math.min(...prices),maxPrice:Math.max(...prices)}:{})};
 });
}
