import 'server-only';
import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from './supabase/server';
import { createCommerceService, hasCommerceService } from './supabase/service';
import { refreshExchangeRate, type ExchangeSnapshot } from './exchange-rate';
import type { Product } from './types';
import {projectPublicUsdPrices,readPublicPriceVerification,type PublicUsdPrice} from './usd-price-projection';
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
    console.error('[monetary] store_usd_prices_v1 error, using unverified reference prices:', result.error);
    return projectPublicUsdPrices(products,[],[]);
  }
  const rows=(result.data??[]) as PublicUsdPrice[];
  const verification=await readPublicPriceVerification(products.map(p=>p.id),hasCommerceService()?createCommerceService():null);
  return projectPublicUsdPrices(products,rows,verification);
}

/** Admin sees all records; canonical amounts do not depend on public eligibility. */
export async function projectAdminUsdProducts(products:Product[],client:SupabaseClient):Promise<Product[]>{
 if(!products.length)return products;
 const {readAllPages}=await import('./read-all-pages');
 const {projectAdminUsdAmounts}=await import('./admin-usd-projection');
 const exchange=await getExchangeSnapshot();
 const rows=await readAllPages<import('./admin-usd-projection').AdminUsdAmount>((from,to)=>client.from('product_usd_prices').select('id,product_id,variant_id,retail_usd,wholesale_usd,state').order('id').range(from,to));
 return projectAdminUsdAmounts(products,rows,exchange?.status==='valid'?exchange.rate:null,exchange?.roundArs??'1');
}
