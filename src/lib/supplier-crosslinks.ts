import type{SupabaseClient}from'@supabase/supabase-js';
import{readAllPages}from'./read-all-pages';
import{matchTargets,matchSupplierProduct,discoveryPlan,identityTokens,type MatchProduct,type MatchVariant,type MatchTarget}from'./supplier-matching';
import{parseObservation,supplierSourceUrl,type IntelligenceSupplier,type SupplierOffer}from'./supplier-intelligence';
import{observationFromPublic,parsePublicAmount,titleIdentity,type PublicProduct}from'./supplier-public-data';
import{fetchSupplierPage,readSupplierHtml}from'./supplier-url';
import{inspectSupplierProduct}from'./supplier-offer-adapters';
import{publicReadRules}from'./supplier-automation';

export interface TrackedOffer extends SupplierOffer{evidence?:{sourceTitle?:string;availabilityBasis?:string;costScope?:string;linkedBy?:string}}
export interface PublicCard{id:string;title:string;brand?:string;price?:string;currency?:PublicProduct['currency'];url:string;availability:PublicProduct['availability'];basis:string;scope:string;gtin?:string}
export interface CatalogPage{records:PublicCard[];url:string;searched?:boolean;nextUrl?:string|null;limited?:boolean}
export interface DiscoveryJob{id:string;supplier_id:string;kind:'search'|'detail';query:string;source_url:string;product_ids:string[];attempts:number}
export async function readCrosslinkCatalog(db:SupabaseClient){
 const [products,variants,suppliers,offers]=await Promise.all([
  readAllPages<MatchProduct>((from,to)=>db.from('products').select('id,title,brand,model,sku,source_url,has_variants,specifications').order('id').range(from,to)),
  readAllPages<MatchVariant>((from,to)=>db.from('product_variants').select('id,product_id,title,sku,options').order('id').range(from,to)),
  db.from('suppliers').select('*').eq('is_active',true),
  readAllPages<TrackedOffer>((from,to)=>db.from('supplier_offers').select('*').order('id').range(from,to))
 ]);if(suppliers.error)throw new Error('No se pudo leer el directorio de proveedores.');
 return{products,variants,suppliers:suppliers.data as IntelligenceSupplier[],offers,targets:matchTargets(products,variants)};
}
export type CrosslinkCatalog=Awaited<ReturnType<typeof readCrosslinkCatalog>>;
export async function seedSupplierDiscovery(db:SupabaseClient,catalog:CrosslinkCatalog){
 const plan=discoveryPlan(catalog.products,catalog.suppliers);
 const r=await db.from('supplier_discovery_jobs').upsert(plan.map(j=>({...j,kind:'search',source_url:'',next_run_at:new Date().toISOString()})),{onConflict:'supplier_id,kind,query,source_url',ignoreDuplicates:true});
 if(r.error)throw new Error('No se pudo programar la búsqueda de alternativas.');
 const existing=await readAllPages<{id:string;supplier_id:string;query:string;product_ids:string[]}>((from,to)=>db.from('supplier_discovery_jobs').select('id,supplier_id,query,product_ids').eq('kind','search').eq('source_url','').order('id').range(from,to));
 for(const job of plan){const saved=existing.find(j=>j.supplier_id===job.supplier_id&&j.query===job.query);if(saved&&JSON.stringify([...saved.product_ids].sort())!==JSON.stringify([...job.product_ids].sort())){const update=await db.from('supplier_discovery_jobs').update({product_ids:job.product_ids,next_run_at:new Date().toISOString()}).eq('id',saved.id);if(update.error)throw new Error('No se pudo actualizar la cobertura del catálogo.');}}
 for(const p of catalog.products){if(!p.source_url)continue;const supplier=catalog.suppliers.find(s=>{try{return new URL(s.website!).hostname.replace(/^www\./,'')===new URL(p.source_url!).hostname.replace(/^www\./,'');}catch{return false;}});
  if(supplier&&!catalog.offers.some(o=>o.product_id===p.id&&o.supplier_id===supplier.id&&o.verification==='verified'))await queueDetail(db,supplier,p.source_url,[p.id],true);
 }
 return plan.length;
}
async function reserve(db:SupabaseClient,supplier:IntelligenceSupplier,url:string){
 const rules=await publicReadRules(supplierSourceUrl(url,supplier));const r=await db.rpc('reserve_supplier_source_slot_v1',{supplier_input:supplier.id,delay_input:rules.delay});if(r.error)throw new Error('No se pudo coordinar la consulta de la fuente.');
 if(r.data)await new Promise(resolve=>setTimeout(resolve,Number(r.data)));return rules.delay;
}
function sourceOf(o:TrackedOffer){return{...o,title:o.evidence?.sourceTitle??o.title};}
function plausible(source:string,targets:MatchTarget[]){const tokens=identityTokens(source.replace(/\.\.\.|…/g,''));return targets.some(t=>{const own=new Set(identityTokens(t.title));return tokens.filter(k=>k.length>2&&own.has(k)).length>=3;});}
async function queueDetail(db:SupabaseClient,supplier:IntelligenceSupplier,url:string,productIds:string[],baseline=false){
 if(!['star-company','atacado-usa','total','atacado-connect'].includes(supplier.official_key??''))return;
 if(new URL(url).pathname==='/')return;
 const r=await db.from('supplier_discovery_jobs').upsert({supplier_id:supplier.id,kind:'detail',query:'',source_url:supplierSourceUrl(url,supplier),product_ids:[...new Set(productIds)],next_run_at:new Date(Date.now()-(baseline?2:1)*3600000).toISOString()},{onConflict:'supplier_id,kind,query,source_url',ignoreDuplicates:true});
 if(r.error)throw new Error('No se pudo programar la ficha exacta.');
}
async function review(db:SupabaseClient,o:TrackedOffer,reason:string,alternatives:string[]){
 const prior=await db.from('supplier_link_decisions').select('id').eq('offer_id',o.id).eq('status','review').eq('reason',reason).limit(1);if(prior.error)throw new Error('No se pudo leer la revisión de identidad.');
 if(!prior.data?.length){const r=await db.from('supplier_link_decisions').insert({offer_id:o.id,status:'review',reason,evidence:{sourceTitle:o.evidence?.sourceTitle??o.title,alternatives}});if(r.error)throw new Error('No se pudo registrar la revisión de identidad.');}
}
export function linkPayload(o:TrackedOffer,target:MatchTarget,catalog:CrosslinkCatalog,method:string,reason:string,confirmed=false){
 const p=catalog.products.find(p=>p.id===target.productId)!;const v=catalog.variants.find(v=>v.id===target.variantId);
 return{offerId:o.id,productId:target.productId,variantId:target.variantId,sourceTitle:o.evidence?.sourceTitle??o.title,
  productSnapshot:{title:p.title,brand:p.brand??null,model:p.model??null},variantSnapshot:v?{title:v.title,options:v.options??null}:null,
  method,reason,confirmed,evidence:{sourceUrl:o.source_url,externalId:o.external_id,variantKey:o.variant_key,costCheckedAt:o.cost_checked_at,availabilityCheckedAt:o.availability_checked_at}};
}
export async function matchAndLinkOffer(db:SupabaseClient,o:TrackedOffer,catalog:CrosslinkCatalog){
 if(o.product_id&&o.verification==='verified')return'unchanged';
 const supplier=catalog.suppliers.find(s=>s.id===o.supplier_id);if(!supplier)return'none';
 const result=matchSupplierProduct({...sourceOf(o),supplierKey:supplier.official_key??''},catalog.targets);
 const needsDetail=o.variant_key.startsWith('listing:')&&['star-company','atacado-usa','total','atacado-connect'].includes(supplier.official_key??'');
 if(needsDetail&&(result.status!=='none'||plausible(o.evidence?.sourceTitle??o.title,catalog.targets))){await queueDetail(db,supplier,o.source_url,result.target?[result.target.productId]:result.alternatives);return'detail';}
 if(result.status==='exact'&&result.target){
  const r=await db.rpc('link_supplier_offer_v1',{link_input:linkPayload(o,result.target,catalog,result.method!,result.reason)});
  if(r.error){await review(db,o,r.error.message,[result.target.productId]);return'review';}
  o.product_id=result.target.productId;o.variant_id=result.target.variantId;o.verification='verified';return String(r.data);
 }
 if(result.status==='review')await review(db,o,result.reason,result.alternatives);
 return result.status;
}
export async function reconcileSupplierOffers(db:SupabaseClient,catalog:CrosslinkCatalog){
 const report:Record<string,number>={};for(const o of catalog.offers){if(o.product_id&&o.verification==='verified')continue;const status=await matchAndLinkOffer(db,o,catalog);report[status]=(report[status]??0)+1;}return report;
}
/** One ingestion path for scheduled browsing and targeted searches. Existing verified links never reset. */
export async function persistSupplierCard(db:SupabaseClient,supplier:IntelligenceSupplier,card:PublicCard,catalog:CrosslinkCatalog){
 const key=`listing:${card.id}`;
 const raw:PublicProduct={external_id:card.id,variant_key:key,title:card.title,brand:card.brand??'',model:'',source_url:card.url,
  origin_cost:card.currency?parsePublicAmount(card.price??''):null,currency:card.currency??null,availability:card.basis==='explicit'?card.availability:'unknown',gtin:card.gtin??null};
 const prior=catalog.offers.find(o=>o.supplier_id===supplier.id&&o.external_id===card.id&&o.variant_key===key);
 if(prior?.verification==='verified'&&titleIdentity(prior.evidence?.sourceTitle??prior.title)!==titleIdentity(raw.title)){
  const r=await db.rpc('record_supplier_observation_v1',{p:{supplier_id:supplier.id,external_id:prior.external_id,variant_key:key,method:'error',observed_at:new Date().toISOString(),message:'Cambió el nombre/presentación de una alternativa vinculada; requiere revisión.'}});if(r.error)throw new Error(r.error.message);return'review';
 }
 const observation=observationFromPublic(raw,supplier,prior?.product_id??null);
 const payload={...observation,product_id:prior?.product_id??null,variant_id:prior?.variant_id??null,title:prior?.product_id?prior.title:raw.title,brand:prior?.product_id?prior.brand:raw.brand,model:prior?.product_id?prior.model:raw.model,verification:prior?.verification??'pending'};
 const parsed=parseObservation(payload,supplier,'product_page');
 const evidence={sourceTitle:raw.title,availabilityBasis:card.basis,costScope:card.scope,...(prior?.evidence?.linkedBy?{linkedBy:prior.evidence.linkedBy}:{})};
 const r=await db.rpc('record_supplier_observation_v1',{p:{...parsed,evidence}});if(r.error)throw new Error(r.error.message);
 const stamp=parsed.observed_at;const offer:TrackedOffer={...parsed,id:String(r.data),cost_checked_at:raw.origin_cost?stamp:prior?.cost_checked_at??null,availability_checked_at:raw.availability!=='unknown'?stamp:prior?.availability_checked_at??null,last_attempt_at:stamp,last_success_at:stamp,last_error:null,evidence};
 if(prior)Object.assign(prior,offer);else catalog.offers.push(offer);
 return matchAndLinkOffer(db,offer,catalog);
}
async function inspectDetail(db:SupabaseClient,job:DiscoveryJob,supplier:IntelligenceSupplier,catalog:CrosslinkCatalog){
 await reserve(db,supplier,job.source_url);const response=await fetchSupplierPage(job.source_url,'MYA-CatalogMonitor/1.0');if(!response.ok)throw new Error(`HTTP ${response.status}: no confirma falta de stock.`);
 const found=inspectSupplierProduct(await readSupplierHtml(response),job.source_url,supplier);if(!found?.external_id)throw new Error('La ficha no expone identidad primaria suficiente.');
 const prior=catalog.offers.find(o=>o.supplier_id===supplier.id&&o.external_id===found.external_id&&o.variant_key===found.variant_key);
 if(prior?.verification==='verified'&&titleIdentity(prior.evidence?.sourceTitle??prior.title)!==titleIdentity(found.title))throw new Error('Cambió la identidad primaria; se conserva el vínculo anterior.');
 const observation=observationFromPublic(found,supplier,prior?.product_id??null);
 const parsed=parseObservation({...observation,product_id:prior?.product_id??null,variant_id:prior?.variant_id??null,title:prior?.product_id?prior.title:found.title,brand:prior?.product_id?prior.brand:found.brand,model:prior?.product_id?prior.model:found.model,verification:prior?.verification??'pending'},supplier,'product_page');
 const evidence={sourceTitle:found.title,availabilityBasis:'explicit',costScope:supplier.official_key==='total'?'origin_includes_displayed_taxes':'origin'};
 const r=await db.rpc('record_supplier_observation_v1',{p:{...parsed,evidence}});if(r.error)throw new Error(r.error.message);
 const stamp=parsed.observed_at;const offer:TrackedOffer={...parsed,id:String(r.data),cost_checked_at:found.origin_cost?stamp:prior?.cost_checked_at??null,availability_checked_at:found.availability!=='unknown'?stamp:prior?.availability_checked_at??null,last_success_at:stamp,last_attempt_at:stamp,last_error:null,evidence};
 if(prior)Object.assign(prior,offer);else catalog.offers.push(offer);
 return{seen:1,linked:await matchAndLinkOffer(db,offer,catalog)==='linked'?1:0,complete:true};
}
export async function runSupplierDiscovery(db:SupabaseClient,catalog:CrosslinkCatalog,collect:(supplier:IntelligenceSupplier,query:string,startUrl:string|null,beforeSearch:()=>Promise<unknown>)=>Promise<CatalogPage>,options:{limit?:number;timeBudgetMs?:number;detailsOnly?:boolean;worker?:string}={}){
 const enabled=await db.from('supplier_tracking_settings').select('config').eq('id',true).single();if(enabled.error)throw new Error('No se pudo verificar el seguimiento.');if(!enabled.data.config.enabled)return{checked:0,linked:0,errors:0};
 const {data:jobs,error}=await db.rpc(options.detailsOnly?'claim_supplier_cloud_details_v1':'claim_supplier_discovery_v1',{limit_input:options.limit??18});if(error)throw new Error(error.message);
 const started=Date.now(),pending=[...(jobs??[])as DiscoveryJob[]],report={checked:0,seen:0,linked:0,errors:0};
 const run=await db.from('supplier_sync_runs').insert({worker:options.worker??'local-cross-supplier-discovery'}).select('id').single();if(run.error)throw new Error('No se pudo registrar el cruce de proveedores.');
 const task=async()=>{while(pending.length&&Date.now()-started<(options.timeBudgetMs??180000)-45000){
  const job=pending.shift()!,supplier=catalog.suppliers.find(s=>s.id===job.supplier_id);if(!supplier)continue;
  try{
   let result:{seen:number;linked:number;complete:boolean};
   if(job.kind==='detail')result=await inspectDetail(db,job,supplier,catalog);
   else{
    const url=job.source_url||supplier.website!;await reserve(db,supplier,url);
    const query=supplier.official_key==='star-company'&&job.query==='skin1004'?'skin 1004':/victoria/i.test(job.query)?'victoria':job.query;
    const page=await collect(supplier,query,job.source_url||null,()=>reserve(db,supplier,url));let linked=0;
    for(const card of page.records){if(await persistSupplierCard(db,supplier,card,catalog)==='linked')linked++;}
    if(page.nextUrl){const next=supplierSourceUrl(page.nextUrl,supplier);if(next!==url){const r=await db.from('supplier_discovery_jobs').upsert({supplier_id:supplier.id,kind:'search',query:job.query,source_url:next,product_ids:job.product_ids},{onConflict:'supplier_id,kind,query,source_url',ignoreDuplicates:true});if(r.error)throw new Error('No se pudo continuar la paginación.');}}
    result={seen:page.records.length,linked,complete:!!page.searched&&!page.nextUrl&&!page.limited};
   }
   const r=await db.from('supplier_discovery_jobs').update({state:'ready',attempts:0,leased_until:null,last_error:null,last_success_at:new Date().toISOString(),next_run_at:new Date(Date.now()+6*3600000).toISOString(),report:result}).eq('id',job.id);if(r.error)throw new Error('No se pudo cerrar la consulta de alternativas.');
   report.seen+=result.seen;report.linked+=result.linked;
  }catch(e){report.errors++;const attempts=job.attempts+1;await db.from('supplier_discovery_jobs').update({state:attempts>=4?'blocked':'retry',attempts,leased_until:null,next_run_at:new Date(Date.now()+Math.min(24,2**attempts)*3600000).toISOString(),last_error:e instanceof Error?e.message:'Error de consulta'}).eq('id',job.id);}
  report.checked++;
 }};
 try{await Promise.all([task(),task(),task()]);}
 finally{if(pending.length)await db.from('supplier_discovery_jobs').update({state:'ready',leased_until:null}).in('id',pending.map(j=>j.id));await db.from('supplier_sync_runs').update({status:report.errors?'partial':'success',completed_at:new Date().toISOString(),report}).eq('id',run.data.id);}
 return report;
}
