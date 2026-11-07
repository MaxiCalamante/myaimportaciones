import type{SupabaseClient}from'@supabase/supabase-js';
import{supplierAdapter,sourceUrl,categoryIdentity,type FoundProduct}from'./adapters/index';
import{fetchTrackerHtml,TrackerHttpError}from'./network';
import{arsToUsd}from'../money';
import{parseObservation,type IntelligenceSupplier,type SupplierOffer}from'../supplier-intelligence';
import{matchSupplierProduct,matchTargets,type MatchProduct,type MatchVariant}from'../supplier-matching';
class IdentityReview extends Error{}
interface Task{id:string;supplier_id:string;source_id:string|null;run_id:string|null;item_id:string|null;kind:'discover'|'monitor';url:string;lease_token:string}
interface Source{id:string;url:string;exclusions:string[];normalization:{currency?:string;unitsPerUsd?:string;source?:string;quotedAt?:string};auto_import:boolean;import_category_id:string|null}
export function normalizeSourceCost(p:Pick<FoundProduct,'cost'|'currency'>,fx:Source['normalization'],now=Date.now()):{normalizedUsd:string|null;normalization:unknown}{
 if(!(Number(p.cost)>0)||!p.currency)return{normalizedUsd:null,normalization:null};
 if(p.currency==='USD')return{normalizedUsd:arsToUsd(String(p.cost),'1'),normalization:{currency:'USD',unitsPerUsd:'1',source:'Moneda explícita de la publicación'}};
 if(fx.currency!==p.currency||!fx.unitsPerUsd||!(Number(fx.unitsPerUsd)>0)||!fx.source||fx.source.length<10||!fx.quotedAt||Date.parse(fx.quotedAt)>now+300000||now-Date.parse(fx.quotedAt)>86400000||!Number.isFinite(Date.parse(fx.quotedAt)))return{normalizedUsd:null,normalization:null};
 return{normalizedUsd:arsToUsd(String(p.cost),fx.unitsPerUsd),normalization:fx};
}
export async function pageFingerprint(products:Array<{externalId:string}>){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(products.map(p=>p.externalId).sort().join('\n')));return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function recordOffer(db:SupabaseClient,supplier:IntelligenceSupplier,p:FoundProduct,itemId:string,task:Task){
 // A listing, a budget button or an unlabelled '$' never certifies a commercial offer.
 if(!p.cost||!p.currency||p.availability==='unknown'||p.variantKey==='source')return;
 const prior=await db.from('supplier_offers').select('*').eq('supplier_id',supplier.id).eq('external_id',p.externalId).eq('variant_key',p.variantKey).maybeSingle();if(prior.error)throw Error('No se pudo verificar la oferta exacta anterior.');
 const o=prior.data as SupplierOffer|null;
 let expected:Record<string,unknown>|null=null;
 if(o?.product_id){
  const [product,variants]=await Promise.all([db.from('products').select('id,title,brand,model,sku,specifications,source_url,has_variants').eq('id',o.product_id).single(),db.from('product_variants').select('id,product_id,title,sku,options').eq('product_id',o.product_id)]);
  if(product.error||variants.error)throw Error('No se pudo revalidar la identidad comercial.');
  const match=matchSupplierProduct({title:p.title,brand:p.brand,model:p.model,gtin:p.gtin,external_id:p.externalId,source_url:p.url,variant_key:p.variantKey,supplierKey:supplier.official_key??''},matchTargets([product.data as MatchProduct],variants.data as MatchVariant[]));
  if(match.status!=='exact'||match.target?.productId!==o.product_id||(match.target?.variantId??null)!==(o.variant_id??null))throw new IdentityReview('La identidad comercial cambió o es ambigua; revisar el vínculo MYA. Se conserva la oferta comercial anterior.');
  expected={product:product.data,variant:o.variant_id?variants.data.find(v=>v.id===o.variant_id)??null:null};
 }
 const observedAt=new Date().toISOString();
 const observation=parseObservation({external_id:p.externalId,variant_key:p.variantKey,title:o?.title??p.title,brand:o?.brand??p.brand,model:o?.model??p.model,gtin:p.gtin,product_id:o?.product_id??null,variant_id:o?.variant_id??null,source_url:o?.source_url??p.url,origin_cost:p.cost,currency:p.currency,availability:p.availability,verification:o?.verification??'pending',observed_at:observedAt},supplier,'product_page');
 const saved=await db.rpc('tracker_commit_observation_v1',{task_input:task.id,token_input:task.lease_token,observation_input:{...observation,evidence:{sourceTitle:p.title,observedUrl:p.url,availabilityBasis:'explicit',costScope:p.warnings.some(w=>/IVA|cargos aplicables/i.test(w))?'supplier_quote_inclusions_unconfirmed':'primary_detail',trackerItemId:itemId}},expected_input:expected});if(saved.error)throw Error(saved.error.message);
}
export async function processTrackerTask(db:SupabaseClient,t:Task,fetcher:typeof fetch=fetch){
 let http:number|undefined;
 try{
  const supplierResult=await db.from('suppliers').select('*').eq('id',t.supplier_id).single();if(supplierResult.error)throw Error('Proveedor no disponible.');const supplier=supplierResult.data as IntelligenceSupplier;
  if(!supplier.is_active||!supplier.automation_authorized)throw Error('Proveedor pausado o sin autorización.');
  const adapter=supplierAdapter(supplier.official_key??''),key=adapter.key;
  let source:Source|null=null;if(t.source_id){const r=await db.from('supplier_tracker_sources').select('*').eq('id',t.source_id).single();if(r.error)throw Error('Fuente no disponible.');source=r.data;}
  let html:string;
  try{html=await fetchTrackerHtml(t.url,key,fetcher);}catch(e){if(e instanceof TrackerHttpError&&e.status===404&&t.kind==='monitor'){
    const recorded=await db.rpc('tracker_record_monitor_v1',{task_input:t.id,token_input:t.lease_token,result_input:{kind:'not_found',error:e.message}});if(recorded.error)throw Error(recorded.error.message);return{ok:true,missing:true};}throw e;}
  if(t.kind==='discover'){
   if(!source||!adapter.category(t.url)||categoryIdentity(t.url,key)!==categoryIdentity(source.url,key))throw Error('Página fuera de la categoría seleccionada.');
   const page=adapter.listing(html,t.url,source.url),products=[...new Map(page.products.filter(p=>!source!.exclusions.some(u=>p.url===u||p.url.startsWith(u+'/'))).map(p=>[p.externalId,p])).values()];
   if(!products.length&&!/nenhum produto|no products found|sin productos|nenhum resultado/i.test(html))throw Error('La página no expone productos verificables; extracción pendiente.');
   const pages=page.pages.filter(url=>!source!.exclusions.includes(url)).map(u=>sourceUrl(u,t.url,key));
   const saved=await db.rpc('tracker_record_page_v1',{task_input:t.id,token_input:t.lease_token,page_input:{products:products.map(p=>({...p,...normalizeSourceCost(p,source!.normalization)})),pages,contentHash:await pageFingerprint(products)}});if(saved.error)throw Error(saved.error.message);
   return{ok:true,...saved.data};
  }
  const p=adapter.detail(html,t.url);if(!p||!p.title||!adapter.product(t.url))throw Error('La ficha no confirma una identidad primaria; revisión de extracción.');
  let commercialReview:string|null=null;try{await recordOffer(db,supplier,p,t.item_id!,t);}catch(error){if(error instanceof IdentityReview)commercialReview=error.message;else throw error;}
  const result=await db.rpc('tracker_record_monitor_v1',{task_input:t.id,token_input:t.lease_token,result_input:{kind:'ok',...p,commercialReview,...normalizeSourceCost(p,source?.normalization??{})}});if(result.error)throw Error(result.error.message);
  return{ok:true,...result.data};
 }catch(e){const message=e instanceof Error?e.message:'Error de seguimiento';if(e instanceof TrackerHttpError)http=e.status;
  const failed=await db.rpc('tracker_fail_task_v1',{task_input:t.id,token_input:t.lease_token,error_input:message,http_input:http??null});
  return{ok:false,error:message,...(failed.error?{recordingError:failed.error.message}:{})};
 }
}
export async function runSupplierTracker(db:SupabaseClient,options:{budgetMs?:number;maxTasks?:number;fetcher?:typeof fetch;onProgress?:(result:unknown)=>void}={}){
 const start=Date.now(),budget=Math.min(options.budgetMs??45000,75000),limit=options.maxTasks??12;
 const schedule=await db.rpc('tracker_schedule_sources_v1');if(schedule.error){if(['PGRST202','42883'].includes(schedule.error.code))return{installed:false,checked:0};throw Error('No se pudo programar el rastreador.');}
 let checked=0,errors=0;
 while(checked<limit&&Date.now()-start<budget-15000){
  const claim=await db.rpc('tracker_claim_tasks_v1',{limit_input:Math.min(4,limit-checked)});if(claim.error)throw Error('No se pudo reclamar el lote del rastreador.');
  const tasks=claim.data as Task[];if(!tasks.length){if(!checked||Date.now()-start>budget-25000)break;await new Promise(r=>setTimeout(r,10000));continue;}
  const results=await Promise.allSettled(tasks.map(t=>processTrackerTask(db,t,options.fetcher)));
  for(const result of results){checked++;const value=result.status==='fulfilled'?result.value:{ok:false,error:String(result.reason)};if(!value.ok)errors++;options.onProgress?.(value);}
 }
 return{installed:true,checked,errors,durationMs:Date.now()-start};
}
