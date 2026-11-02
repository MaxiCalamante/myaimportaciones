import type {SupabaseClient} from '@supabase/supabase-js';
/** Reuse the existing hosted cycle; this function installs no local scheduler. */
export async function runWholesalePriceRefresh(db:SupabaseClient,limit=20){
 const r=await db.rpc('refresh_wholesale_prices_v1',{limit_input:limit});
 if(r.error){if(['PGRST202','42883'].includes(r.error.code))return{installed:false,enabled:false,checked:0,applied:0};throw new Error('No se pudieron revisar los precios mayoristas.');}
 return{installed:true,...r.data};
}
