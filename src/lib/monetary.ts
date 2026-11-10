import 'server-only';
import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from './supabase/server';
import { createCommerceService, hasCommerceService } from './supabase/service';
import { refreshExchangeRate, type ExchangeSnapshot } from './exchange-rate';
import type { Product } from './types';
export interface PublicUsdPrice {productId:string;variantId:string|null;retailUsd:string;wholesaleUsd:string|null;retailArs:number|null;wholesaleArs:number|null;rateId:string|null}
export const getExchangeSnapshot=cache(async():Promise<ExchangeSnapshot|null>=>{
  const db=await createServerSupabaseClient();
  // Refresh is best effort. An outage preserves the persisted source timestamp.
  if(hasCommerceService())try{await refreshExchangeRate(createCommerceService());}catch{}
  const r=await db.rpc('store_exchange_public_v1');
  return r.error?null:r.data as ExchangeSnapshot;
});
export async function projectUsdProducts(products:Product[],client?:SupabaseClient):Promise<Product[]> {
  if(!products.length)return products;
  await getExchangeSnapshot();
  const db=client??await createServerSupabaseClient();
  const result=await db.rpc('store_usd_prices_v1',{ids_input:products.map(p=>p.id)});
  if(result.error){
    console.error('[monetary] store_usd_prices_v1 error, using base product prices:', result.error);
    return products;
  }
  const rows=result.data as PublicUsdPrice[];
  const byIdentity=new Map(rows.map(r=>[r.variantId??r.productId,r]));
  return products.map(p=>{
    const base=byIdentity.get(p.id);
    const variants=p.variants?.map(v=>{const r=byIdentity.get(v.id);return r?{...v,retailUsd:r.retailUsd,wholesaleUsd:r.wholesaleUsd,retailPrice:r.retailArs??0,wholesalePrice:r.wholesaleArs??0}:v;});
    const prices=variants?.filter(v=>v.isActive).map(v=>v.retailPrice).filter(v=>v>0)??[];
    return {...p,...(base?{retailUsd:base.retailUsd,wholesaleUsd:base.wholesaleUsd,retailPrice:base.retailArs??0,wholesalePrice:base.wholesaleArs??0}:{}),variants,
      ...(p.hasVariants?{minPrice:prices.length?Math.min(...prices):undefined,maxPrice:prices.length?Math.max(...prices):undefined}:{}),};
  });
}
