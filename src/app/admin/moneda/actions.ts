'use server';
import{AdminFormError,runAdminFormAction}from'@/lib/admin-action-result';
import {getAdminClient} from '@/lib/admin-auth';
import {createCommerceService} from '@/lib/supabase/service';
import {refreshExchangeRate} from '@/lib/exchange-rate';
import {revalidatePath} from 'next/cache';
import type{ProfitabilityResult}from'@/lib/profitability';
export async function previewUsdProfitability(input:{productId:string;variantId:string|null;retail:string;wholesale:string;paymentMethod:string;rate:string}){
 const db=await getAdminClient();const r=await db.rpc('store_review_product_prices_v2',{product_input:input.productId,variant_input:input.variantId,prices_input:{retailUsd:input.retail,wholesaleUsd:input.wholesale,retailSource:'manual',wholesaleSource:'manual'},payment_input:input.paymentMethod});
 if(r.error)return{ok:false as const,error:'La revisión de rentabilidad no está disponible en este entorno.'};
 const review=r.data as{reason:string|null;results:Record<string,ProfitabilityResult>};
 return{ok:true as const,values:(['retail','wholesale']as const).map(channel=>({channel,result:review.results[`${channel}:${input.paymentMethod}`]??null,error:review.results[`${channel}:${input.paymentMethod}`]?undefined:review.reason??'Precio o costo pendiente.'}))};
}
export async function saveProfitabilityProfile(form:FormData){
 const db=await getAdminClient();let basis:unknown;
 try{basis=JSON.parse(String(form.get('basis')));}catch{return{ok:false,error:'El desglose debe ser JSON válido.'};}
 const r=await db.rpc('save_store_profitability_profile_v2',{product_input:form.get('productId'),variant_input:form.get('variantId')||null,basis_input:basis,revision_input:Number(form.get('revision')),note_input:form.get('note')});
 if(r.error)return{ok:false,error:`No se guardó el costo: ${r.error.message}`};revalidatePath('/admin/moneda');return{ok:true};
}
export async function saveProfitabilityPolicy(form:FormData){
 const db=await getAdminClient();let methods:unknown;
 try{methods=JSON.parse(String(form.get('methods')));}catch{return{ok:false,error:'Las tarifas deben ser JSON válido.'};}
 const p={retailTarget:form.get('retailTarget'),wholesaleTarget:form.get('wholesaleTarget'),minimumMargin:form.get('minimumMargin'),usdStep:form.get('usdStep'),costMaxAgeSeconds:form.get('costMaxAgeSeconds'),methods};
 const r=await db.rpc('save_store_profitability_policy_v2',{p,note_input:form.get('note')});
 if(r.error)return{ok:false,error:'No se guardó la política. Revisá los campos y el piso de seguridad.'};revalidatePath('/admin/moneda');return{ok:true};
}
async function saveMoneySettingsImpl(form:FormData){
 const db=await getAdminClient();const number=(key:string)=>String(form.get(key)??'').trim()||null;
 const config={kind:form.get('kind'),refreshSeconds:number('refreshSeconds'),maxAgeSeconds:number('maxAgeSeconds'),quoteSeconds:number('quoteSeconds'),adjustment:number('adjustment'),roundArs:number('roundArs'),maxChange:number('maxChange'),retailMargin:number('retailMargin'),wholesaleMargin:number('wholesaleMargin'),minimumMargin:number('minimumMargin')};
 const r=await db.rpc('save_store_money_settings_v1',{config_input:config,note_input:form.get('note')});
 if(r.error)throw new AdminFormError('No se guardó la configuración. Revisá valores, márgenes y motivo.');
 await refreshExchangeRate(createCommerceService());revalidatePath('/','layout');
}
async function refreshMoneyRateImpl(){await getAdminClient();await refreshExchangeRate(createCommerceService(),true);revalidatePath('/','layout');}
async function saveEmergencyRateImpl(form:FormData){
 const db=await getAdminClient();const r=await db.rpc('store_manual_rate_v1',{rate_input:String(form.get('rate')),hours_input:Number(form.get('hours')),note_input:form.get('note')});
 if(r.error)throw new AdminFormError('No se guardó la cotización de emergencia. Revisá el importe, la vigencia y el motivo.');revalidatePath('/','layout');
}
async function saveUsdProductImpl(form:FormData){
 const db=await getAdminClient();let costBasis:unknown=null;
 if(form.get('updateCosts')==='on'){
  const fields=['currency','origin','unitsPerUsd','fxEvidence','fxAt','acquisitionArs','acquisitionAt','carrierPercent','carrierFixedUsd','carrierArs','carrierAt','extraUsd','extraArs','feePercent','variableArs','minimumContribution','supplierUrl','document'];
  costBasis=Object.fromEntries(fields.map(key=>[key,String(form.get(`cost_${key}`)??'').trim()]));
  (costBasis as Record<string,unknown>).confirmed=form.get('costConfirmed')==='on';
 }
 const r=await db.rpc('save_product_usd_v1',{product_input:form.get('productId'),variant_input:form.get('variantId')||null,prices_input:{retailUsd:String(form.get('retailUsd')),wholesaleUsd:form.get('wholesaleUsd')||null,retailSource:form.get('retailSource'),wholesaleSource:form.get('wholesaleSource'),retailMargin:form.get('retailMargin')||null,wholesaleMargin:form.get('wholesaleMargin')||null,revision:Number(form.get('revision')),costBasis},note_input:form.get('note')});
 if(r.error)throw new AdminFormError(`No se guardaron los precios USD: ${r.error.message}`);revalidatePath('/','layout');
}

export async function saveMoneySettings(form:FormData){return runAdminFormAction(()=>saveMoneySettingsImpl(form));}
export async function refreshMoneyRate(){return runAdminFormAction(()=>refreshMoneyRateImpl());}
export async function saveEmergencyRate(form:FormData){return runAdminFormAction(()=>saveEmergencyRateImpl(form));}
export async function saveUsdProduct(form:FormData){return runAdminFormAction(()=>saveUsdProductImpl(form));}
