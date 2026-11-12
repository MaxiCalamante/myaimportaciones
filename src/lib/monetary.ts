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
