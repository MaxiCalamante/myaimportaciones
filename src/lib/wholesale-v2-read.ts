import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createServerSupabaseClient} from './supabase/server';
import {DRAFT_WHOLESALE_POLICY,type PublicWholesaleOffer,type PublicWholesalePolicy,type WholesalePayment,type WholesaleV2Policy} from './wholesale-v2';
export async function getPublicWholesalePolicy(client?:SupabaseClient):Promise<PublicWholesalePolicy>{
 const db=client??await createServerSupabaseClient(),r=await db.rpc('wholesale_public_policy_v1');
 if(r.error)throw new Error('No se pudieron leer las condiciones mayoristas.');return r.data as PublicWholesalePolicy;
}
export async function getPublicWholesaleOffers(items:Array<{productId:string;variantId?:string|null;quantity?:number}>,payment:WholesalePayment='mercado_pago',client?:SupabaseClient):Promise<PublicWholesaleOffer[]>{
 if(!items.length)return[];if(items.length>1000)throw new Error('La consulta mayorista supera el límite.');
 const db=client??await createServerSupabaseClient(),result:PublicWholesaleOffer[]=[];
 for(let i=0;i<items.length;i+=100){const r=await db.rpc('wholesale_public_offers_v1',{items_input:items.slice(i,i+100),payment_input:payment});if(r.error)throw new Error('No se pudieron actualizar los precios mayoristas.');result.push(...r.data as PublicWholesaleOffer[]);}
 return result;
}
export async function readWholesaleAdmin(db:SupabaseClient){
 const [policy,controls,events]=await Promise.all([db.from('wholesale_v2_policies').select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1).maybeSingle(),db.from('wholesale_product_controls').select('*').order('updated_at',{ascending:false}).limit(500),db.from('wholesale_price_events').select('id,product_id,variant_id,action,created_at,detail').order('created_at',{ascending:false}).limit(50)]);
 if(policy.error||controls.error||events.error)throw new Error('No se pudo leer el control mayorista.');
 return{policy:(policy.data?.config??DRAFT_WHOLESALE_POLICY) as WholesaleV2Policy,policyId:policy.data?.id??null,controls:controls.data??[],events:events.data??[]};
}
