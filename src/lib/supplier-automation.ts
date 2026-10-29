import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchSupplierPage, readSupplierHtml } from "./supplier-url";
import { inspectSupplierProduct } from "./supplier-offer-adapters";
import { observationFromPublic, titleIdentity } from "./supplier-public-data";
import {parseObservation,type IntelligenceSupplier,type SupplierOffer} from "./supplier-intelligence";
import { calculateImport, classifyImport, type ImportPolicy } from "./import-costs";
import { acquisitionFxFresh, type UsdtSettings } from "./supplier-usdt";

export interface TrackingConfig extends UsdtSettings {enabled:boolean;autoStock:boolean;autoPrices:boolean;autoPauseWhenOutOfStock?:boolean;acquisitionArsPerUsd:number;fxConfirmedOn:string;shippingPaidByMya:boolean;shippingArs:number;targetMarginPercent:number;marketDiscountPercent:number;productDiscountPercent?:Record<string,number>;roundArs:number;maxPriceChangePercent:number;freshnessHours:number;marketFreshnessHours:number;fxValidityHours:number;notes:string}
export interface SyncJob {id:string;supplier_id:string;product_id:string|null;variant_id:string|null;offer_id:string|null;source_url:string;attempts:number}
const pause=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const robotCache=new Map<string,Promise<{disallow:string[];delay:number}>>();
export async function publicReadRules(url:string){
  const origin=new URL(url).origin;
  if(!robotCache.has(origin))robotCache.set(origin,(async()=>{
    const response=await fetchSupplierPage(origin+'/robots.txt','MYA-CatalogMonitor/1.0');
    if(response.status===404)return {disallow:[],delay:10000};
    if(!response.ok)throw new Error('No se pudo verificar robots.txt; se conserva la fuente anterior.');
    const text=(await readSupplierHtml(response)).slice(0,50000);if(/<html|<!doctype/i.test(text))return {disallow:[],delay:10000};
    let applies=false;const disallow:string[]=[];let delay=10000;
    for(const line of text.split(/\r?\n/)){const m=line.replace(/#.*/,'').match(/^\s*([^:]+):\s*(.*?)\s*$/);if(!m)continue;
      const key=m[1].toLowerCase();if(key==='user-agent')applies=m[2]==='*'||/mya/i.test(m[2]);
      else if(applies&&key==='disallow'&&m[2])disallow.push(m[2]);
      else if(applies&&key==='crawl-delay'&&Number.isFinite(Number(m[2])))delay=Math.max(delay,Number(m[2])*1000);
    }return {disallow,delay:Math.min(delay,120000)};
  })());
  const rules=await robotCache.get(origin)!;
  const path=new URL(url).pathname+new URL(url).search;
  if(rules.disallow.some(rule=>new RegExp('^'+rule.split('*').map(part=>part.replace(/[.+?^${}()|[\]\\]/g,'\\$&')).join('.*').replace(/\\\$$/,'$')).test(path)))throw new Error('El sitio restringe esta ruta en robots.txt. Usá una lista autorizada.');
  return rules;
}
export function validateTrackingConfig(c:TrackingConfig){
  if(c.acquisitionFxMode!==undefined&&!['manual','usdt'].includes(c.acquisitionFxMode))throw new Error('Modo de cotización inválido.');
  if(c.usdtAutoPrices!==undefined&&typeof c.usdtAutoPrices!=='boolean')throw new Error('Revisá el ajuste automático por USDT.');
  if(!c||[c.enabled,c.autoStock,c.autoPrices,c.shippingPaidByMya].some(v=>typeof v!=='boolean'))throw new Error('Configuración de seguimiento inválida.');
  if(c.autoPauseWhenOutOfStock!==undefined&&typeof c.autoPauseWhenOutOfStock!=='boolean')throw new Error('Configuración de pausa automática inválida.');
  for(const key of ['acquisitionArsPerUsd','shippingArs','targetMarginPercent','marketDiscountPercent','roundArs','maxPriceChangePercent','freshnessHours','marketFreshnessHours','fxValidityHours']as const)if(!Number.isFinite(c[key])||c[key]<0)throw new Error(`Revisá ${key}.`);
  if(c.acquisitionArsPerUsd<=0||c.roundArs<=0||c.marketDiscountPercent>=100||c.targetMarginPercent>=100||c.maxPriceChangePercent>100||!/^\d{4}-\d{2}-\d{2}$/.test(c.fxConfirmedOn)||c.freshnessHours<1||c.fxValidityHours<1||c.notes.length>5000)throw new Error('Revisá cotización, margen, descuento y vigencia.');
  if(c.productDiscountPercent&&Object.entries(c.productDiscountPercent).some(([id,v])=>!/^[-\da-f]{36}$/i.test(id)||!Number.isFinite(v)||v<0||v>=100))throw new Error('Descuento particular inválido.');
  return c;
}
export async function processSupplierJob(db:SupabaseClient,job:SyncJob,supplier:IntelligenceSupplier,config:TrackingConfig){
  const stamp=new Date().toISOString();
  let prior:SupplierOffer|null=null;
  if(job.offer_id){const r=await db.from('supplier_offers').select('*').eq('id',job.offer_id).single();if(r.error)throw new Error('No se pudo leer la oferta vinculada.');prior=r.data as SupplierOffer;}
  try{
    await publicReadRules(job.source_url);
    const response=await fetchSupplierPage(job.source_url,'MYA-CatalogMonitor/1.0');
    if(response.status===404)throw new Error('HTTP 404: ficha desaparecida; no confirma agotamiento.');
    if(!response.ok)throw new Error(`HTTP ${response.status}; se conserva evidencia anterior.`);
    const html=await readSupplierHtml(response);
    let product:{id:string;title:string;sku:string;brand:string;model:string}|null=null;
    if(job.product_id){const r=await db.from('products').select('id,title,sku,brand,model').eq('id',job.product_id).single();if(r.error)throw new Error('No se pudo leer el producto.');product=r.data;}
    const found=inspectSupplierProduct(html,job.source_url,supplier,prior?.external_id??product?.sku);
    if(!found?.external_id||found.availability==='unknown')throw new Error('El producto principal no confirma identidad y disponibilidad; revisar la ficha.');
    if(prior&&(prior.external_id!==found.external_id||prior.variant_key!==found.variant_key))throw new Error('Cambió el identificador o la variante; requiere revisión de identidad.');
    const oldTitle=(prior as SupplierOffer&{evidence?:{sourceTitle?:string}}|null)?.evidence?.sourceTitle;
    if(oldTitle&&titleIdentity(oldTitle)!==titleIdentity(found.title))throw new Error('Cambió la presentación o nombre de la fuente; revisión de identidad.');
    if(!prior&&supplier.official_key!=='total'&&found.variant_key!=='base'&&found.variant_key!=='attribute:0')throw new Error('La fuente selecciona una variante no vinculada explícitamente.');
    const observation=observationFromPublic(found,supplier,job.product_id);
    if(prior?.gtin&&found.gtin&&prior.gtin!==found.gtin)throw new Error('Cambió el GTIN del proveedor; requiere revisión de identidad.');
    // A link does not rename the supplier's identity to the storefront title on every refresh.
    if(product){observation.title=prior?.title??product.title;observation.brand=prior?.brand??product.brand??found.brand;observation.model=prior?.model??product.model??found.model;}
    observation.gtin=prior?.gtin??found.gtin??null;
    const payload={...parseObservation({...observation,variant_id:job.variant_id},supplier,'product_page'),evidence:{sourceTitle:found.title,availabilityBasis:'explicit',matchedBy:'curated_source_url'}};
    const result=await db.rpc('record_supplier_observation_v1',{p:payload});if(result.error)throw new Error(result.error.message);
    const offerId=String(result.data);
    const saved=await db.from('supplier_sync_queue').update({offer_id:offerId,state:'ready',attempts:0,last_error:null,last_success_at:stamp,leased_until:null,next_run_at:new Date(Date.now()+6*3600000).toISOString(),updated_at:stamp}).eq('id',job.id);
    if(saved.error)throw new Error('La evidencia se guardó pero no se actualizó la cola.');
    if(config.autoStock&&job.product_id){
      const stock=await db.rpc('refresh_supplier_availability_v1',{product_input:job.product_id});
      if(stock.error)throw new Error(stock.error.message);
      if(config.autoPauseWhenOutOfStock!==false){
        const hasStock=Boolean(stock.data);
        await db.from('products').update({is_active:hasStock,updated_at:stamp}).eq('id',job.product_id).eq('fulfillment_mode','supplier');
      }
    }
    await db.from('supplier_source_health').upsert({supplier_id:supplier.id,last_attempt_at:stamp,last_success_at:stamp,status:'connected',message:'Consulta real del producto principal',updated_at:stamp});
    return {ok:true,offerId};
  }catch(error){
    const message=error instanceof Error?error.message:'Error de consulta';
    if(prior){const recorded=await db.rpc('record_supplier_observation_v1',{p:{supplier_id:supplier.id,external_id:prior.external_id,variant_key:prior.variant_key,method:message.includes('404')?'not_found':'error',observed_at:stamp,message}});if(recorded.error)throw new Error(`Error de consulta y de registro: ${recorded.error.message}`);}
    const attempts=job.attempts+1;
    await db.from('supplier_sync_queue').update({state:attempts>=5?'blocked':'retry',attempts,last_error:message,leased_until:null,next_run_at:new Date(Date.now()+Math.min(24,2**attempts)*3600000).toISOString(),updated_at:stamp}).eq('id',job.id);
    await db.from('supplier_source_health').upsert({supplier_id:supplier.id,last_attempt_at:stamp,status:'error',message,updated_at:stamp});
    return {ok:false,message};
  }
}
export async function runSupplierAutomation(db:SupabaseClient,options:{worker:string;limit?:number;timeBudgetMs?:number}){
  const {data:settings,error:settingsError}=await db.from('supplier_tracking_settings').select('config').eq('id',true).single();
  if(settingsError||!settings)throw new Error('Seguimiento no instalado.');
  const config=validateTrackingConfig(settings.config as TrackingConfig);if(!config.enabled)return {checked:0,success:0,errors:0,disabled:true};
  const {data:run,error:runError}=await db.from('supplier_sync_runs').insert({worker:options.worker}).select('id').single();if(runError||!run)throw new Error('No se pudo iniciar el registro de seguimiento.');
  const report={checked:0,success:0,errors:0,prices:0};
  let claimedJobs:SyncJob[]=[];
  try{
    const {data:jobs,error}=await db.rpc('claim_supplier_jobs_v1',{limit_input:options.limit??20});if(error)throw new Error(error.message);
    claimedJobs=(jobs??[])as SyncJob[];
    const suppliers=await db.from('suppliers').select('*').eq('is_active',true);if(suppliers.error)throw new Error('No se pudo leer proveedores.');
    const started=Date.now();
    for(const job of (jobs??[])as SyncJob[]){
      if(Date.now()-started>(options.timeBudgetMs??42000)){await db.from('supplier_sync_queue').update({state:'ready',leased_until:null}).in('id',(jobs as SyncJob[]).filter(j=>j.id===job.id||(jobs as SyncJob[]).indexOf(j)>(jobs as SyncJob[]).indexOf(job)).map(j=>j.id));break;}
      const supplier=(suppliers.data as IntelligenceSupplier[]).find(s=>s.id===job.supplier_id);if(!supplier)continue;
      let cadence=10000;try{cadence=(await publicReadRules(job.source_url)).delay;}catch{/* processSupplierJob records the source restriction. */}
      const slot=await db.rpc('reserve_supplier_source_slot_v1',{supplier_input:supplier.id,delay_input:cadence});if(slot.error)throw new Error(`No se pudo coordinar la consulta del proveedor: ${slot.error.message}`);
      const delay=Number(slot.data)||0;
      if(Date.now()-started+delay+15000>(options.timeBudgetMs??42000)){
        await db.from('supplier_sync_queue').update({state:'ready',leased_until:null}).in('id',(jobs as SyncJob[]).slice((jobs as SyncJob[]).indexOf(job)).map(j=>j.id));break;
      }
      if(delay>0)await pause(delay);
      const result=await processSupplierJob(db,job,supplier,config);report.checked++;if(result.ok)report.success++;else report.errors++;
    }
    const r=await db.from('supplier_sync_runs').update({completed_at:new Date().toISOString(),status:report.errors?'partial':'success',report}).eq('id',run.id);if(r.error)throw new Error('No se pudo cerrar el historial de sincronización.');
    return report;
  }catch(error){if(claimedJobs.length)await db.from('supplier_sync_queue').update({state:'ready',leased_until:null}).eq('state','running').in('id',claimedJobs.map(j=>j.id));await db.from('supplier_sync_runs').update({completed_at:new Date().toISOString(),status:'error',report:{...report,error:error instanceof Error?error.message:'Error'}}).eq('id',run.id);throw error;}
}
export async function repriceProduct(db:SupabaseClient,productId:string,config:TrackingConfig,policy:ImportPolicy){
  // USDT pricing has its own approved fixed baselines; do not race it with legacy market writes.
  if(config.acquisitionFxMode==='usdt')return 'usdt_policy';
  if(!acquisitionFxFresh(config))return 'expired_fx';
  const keep=async(reason:string)=>{
    const recent=await db.from('supplier_price_decisions').select('id').eq('product_id',productId).eq('reason',reason).gte('created_at',new Date(Date.now()-2*3600000).toISOString()).limit(1);
    if(recent.error)throw new Error('No se pudo revisar el historial de precio.');
    if(!recent.data?.length){const saved=await db.from('supplier_price_decisions').insert({product_id:productId,status:'blocked',reason,basis:{fx:config.acquisitionArsPerUsd}});if(saved.error)throw new Error('No se pudo registrar el precio conservado.');}
    return 'blocked';
  };
  const [productResult,offersResult,referenceResult]=await Promise.all([
    db.from('products').select('id,title,brand,retail_price').eq('id',productId).single(),
    db.from('supplier_offers').select('*').eq('product_id',productId).is('variant_id',null).eq('verification','verified').eq('availability','in_stock').is('last_error',null),
    db.from('supplier_market_references').select('*').eq('product_id',productId).eq('identity_verified',true).is('last_error',null).gte('checked_at',new Date(Date.now()-48*3600000).toISOString()).order('price_ars').limit(1).maybeSingle()
  ]);
  if(productResult.error||offersResult.error||referenceResult.error)throw new Error('No se pudo preparar la revisión de precio.');
  const p=productResult.data,reference=referenceResult.data;if(!p)return null;if(!reference)return keep('Sin comparable exacto vigente: precio conservado. Revisar referencia de mercado.');
  const costs=(offersResult.data??[]).flatMap(o=>{
    if(!o.origin_cost||o.currency!=='USD'||o.evidence?.costScope==='supplier_quote_inclusions_unconfirmed'||!o.cost_checked_at||Date.now()-Date.parse(o.cost_checked_at)>86400000)return [];
    try{const inches=Number(p.title.match(/\b(\d{2,3})\s*(?:pulgadas|polegadas|["″]|'')/i)?.[1])||undefined;const result=calculateImport({lines:[{id:o.id,title:p.title,productId:p.id,origin:Number(o.origin_cost),currency:'USD',quantity:1,acquisitionArsPerUnit:config.acquisitionArsPerUsd,originUnitsPerUsd:1,kind:classifyImport(p.title,p.brand),inches,sourceConfirmed:true,sourceReference:o.source_url,observedAt:o.cost_checked_at}],expenses:config.shippingPaidByMya?[{label:'Transporte a Tandil',amountArs:config.shippingArs,method:'quantity'}]:[],expensesConfirmed:true,targetMargin:config.targetMarginPercent},policy);return result.totalArs===null?[]:[{offer:o,total:result.totalArs,result}];}catch{return [];}
  }).sort((a,b)=>a.total-b.total);
  const best=costs[0];if(!best)return keep('Sin costo USD vigente y tarifa calculable: precio conservado.');
  if(best.result.warnings.some(w=>!/volumen|umbral/i.test(w)))return keep('Condiciones de costo o cotización requieren ratificación: precio conservado.');
  const discount=config.productDiscountPercent?.[p.id]??config.marketDiscountPercent;
  const price=Math.floor(Number(reference.price_ars)*(1-discount/100)/config.roundArs)*config.roundArs;
  const applied=await db.rpc('apply_supplier_price_v1',{product_input:p.id,offer_input:best.offer.id,reference_input:reference.id,expected_input:Number(p.retail_price),price_input:price,landed_input:best.total,basis_input:{source:best.offer.source_url,costCheckedAt:best.offer.cost_checked_at,reference:reference.source_url,referenceCheckedAt:reference.checked_at,fx:config.acquisitionArsPerUsd,shippingPaidByMya:config.shippingPaidByMya,warnings:best.result.warnings}});
  if(applied.error)throw new Error(applied.error.message);return applied.data as string;
}
