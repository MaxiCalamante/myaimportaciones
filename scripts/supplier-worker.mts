/** Local companion for dynamic public catalogues, with a daily deployed worker as fallback. */
import {createRequire}from'node:module';
import{mkdir,writeFile}from'node:fs/promises';
import{resolve}from'node:path';
import{createClient}from'@supabase/supabase-js';
import{chromium}from'@playwright/test';
import{runSupplierAutomation,publicReadRules,repriceProduct,type TrackingConfig}from'../src/lib/supplier-automation';
import{persistSupplierCard,readCrosslinkCatalog,reconcileSupplierOffers,runSupplierDiscovery,seedSupplierDiscovery}from'../src/lib/supplier-crosslinks';
import type{IntelligenceSupplier}from'../src/lib/supplier-intelligence';
import type{ImportPolicy}from'../src/lib/import-costs';
import{refreshMarketReferences}from'../src/lib/supplier-market';
import{boundedWorkerFetch}from'../src/lib/worker-fetch';
import{readAllPages}from'../src/lib/read-all-pages';
Reflect.set(globalThis,Symbol.for('mya.supplier.runtime-ready'),true);
console.log(JSON.stringify({phase:'runtime-ready',at:new Date().toISOString()}));
const require=createRequire(import.meta.url);require('@next/env').loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const {collectPublicCatalog}=await import('./lib/supplier-browser.mjs');
const destination=resolve('scratch/suppliers-private');await mkdir(destination,{recursive:true});
if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Configuración privada de MYA no disponible.');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:boundedWorkerFetch()}});
console.log(JSON.stringify({phase:'database-connecting',at:new Date().toISOString()}));
const settings=await db.from('supplier_tracking_settings').select('config').eq('id',true).single();if(settings.error)throw new Error('Falta instalar seguimiento de proveedores.');
const config=settings.data.config as TrackingConfig;
if(!config.enabled){console.log('Seguimiento pausado desde MYA.');process.exit(0);}
const started=new Date().toISOString();
const cycleDeadline=Date.now()+12*60000;
const remaining=()=>Math.max(0,cycleDeadline-Date.now());
console.log(JSON.stringify({phase:'settings-read',at:started}));
const workerRun=await db.from('supplier_sync_runs').insert({worker:'local-public-catalog'}).select('id').single();if(workerRun.error)throw new Error('No se pudo registrar el procesador local.');
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
const report:{sources:Record<string,{seen:number;status:string;error?:string}>;tracking?:Awaited<ReturnType<typeof runSupplierAutomation>>;prices?:number;crosslinks?:unknown;discovery?:Awaited<ReturnType<typeof runSupplierDiscovery>>;deferred:string[]}={sources:{},deferred:[]};
try{
 const suppliersResult=await db.from('suppliers').select('*').eq('is_active',true).eq('automation_authorized',true);if(suppliersResult.error)throw new Error('No se pudo leer el registro.');
 const suppliers=suppliersResult.data as IntelligenceSupplier[];
 const catalog=await readCrosslinkCatalog(db);await seedSupplierDiscovery(db,catalog);report.crosslinks=await reconcileSupplierOffers(db,catalog);
 console.log(JSON.stringify({phase:'catalog-linked',at:new Date().toISOString(),report:report.crosslinks}));
 const searches=await db.from('supplier_search_requests').select('*').eq('state','queued').order('created_at').limit(3);if(searches.error)throw new Error('No se pudo leer búsquedas.');
 const requested=searches.data??[];
 const queries=requested.length?requested.map(r=>String(r.query)):[''];
 if(!process.argv.includes('--tracking-only')){
  browser=await chromium.launch({headless:true,timeout:45000});
  // Product-specific discovery has priority over repeating already observed home pages.
  report.discovery=await runSupplierDiscovery(db,catalog,(supplier,query,startUrl,beforeSearch)=>collectPublicCatalog(browser!,supplier,query,10000,startUrl,beforeSearch),{limit:18,timeBudgetMs:180000});
  console.log(JSON.stringify({phase:'discovery',at:new Date().toISOString(),report:report.discovery}));
  const healthResult=await db.from('supplier_source_health').select('supplier_id,last_attempt_at');if(healthResult.error)throw new Error('No se pudo verificar la fecha de los catálogos.');
  for(const supplier of suppliers.filter(s=>['public_browser','product_page'].includes(s.query_mode))){
   const previous=healthResult.data?.find(h=>h.supplier_id===supplier.id)?.last_attempt_at;
   if(!requested.length&&previous&&Date.now()-Date.parse(previous)<6*3600000)continue;
   if(remaining()<4*60000){report.deferred.push('Catálogos restantes continúan en el próximo ciclo; se reserva tiempo para fichas vinculadas.');break;}
   const key=supplier.official_key!;let seen=0;
   try{
    const rules=await publicReadRules(supplier.website!);
    for(const query of queries){
     const slot=await db.rpc('reserve_supplier_source_slot_v1',{supplier_input:supplier.id,delay_input:rules.delay});if(slot.error)throw new Error('No se pudo coordinar la fuente.');if(slot.data)await new Promise(r=>setTimeout(r,Number(slot.data)));
     const collected=await collectPublicCatalog(browser,supplier,query,rules.delay);
     if(!collected.records.length&&!query)throw new Error('La vista pública no devolvió productos verificables; no implica catálogo agotado.');
     for(const card of collected.records){
      if(/\b(cpo|outlet|refurbished|reacondicionado|usado|seminovo|ativo|activado)\b/i.test(card.title)&&supplier.official_key==='atacado-connect'&&/iphone/i.test(card.title))continue;
      await persistSupplierCard(db,supplier,card,catalog);seen++;
     }
    }
    report.sources[key]={seen,status:'connected'};
    const health=await db.from('supplier_source_health').update({last_attempt_at:started,last_success_at:new Date().toISOString(),status:'connected',message:'Catálogo público renderizado; cantidad de stock no inferida.',products_seen:seen,updated_at:new Date().toISOString()}).eq('supplier_id',supplier.id);if(health.error)throw new Error(health.error.message);
   }catch(e){const error=e instanceof Error?e.message:'Error de catálogo';report.sources[key]={seen,status:'restricted',error};await db.from('supplier_source_health').update({last_attempt_at:started,status:'restricted',message:error,updated_at:new Date().toISOString()}).eq('supplier_id',supplier.id);}
  }
  for(const search of requested)await db.from('supplier_search_requests').update({state:Object.values(report.sources).some(s=>s.status!=='connected')?'partial':'done',completed_at:new Date().toISOString(),report:report.sources}).eq('id',search.id);
 }
 await browser?.close();browser=undefined;
 if(remaining()>60000)report.tracking=await runSupplierAutomation(db,{worker:'local-linked-products',limit:process.argv.includes('--quick')?6:60,timeBudgetMs:Math.min(8*60000,remaining()-60000)});
 else report.deferred.push('Fichas vinculadas continúan en el próximo ciclo por presupuesto de tiempo.');
 if(remaining()>60000)await refreshMarketReferences(db,process.argv.includes('--quick')||remaining()<150000?2:8);
 const latestPolicy=await db.from('import_cost_policies').select('config').order('created_at',{ascending:false}).limit(1).single();
 if(latestPolicy.error)throw new Error('No se pudieron verificar las tarifas vigentes.');
 if(latestPolicy.data&&config.autoPrices&&remaining()>20000){
  let applied=0;
  // Missing comparables cannot produce a price. Do not spend the cycle revisiting every known absence.
  const references=await readAllPages<{product_id:string}>((from,to)=>db.from('supplier_market_references').select('product_id').is('variant_id',null).eq('identity_verified',true).is('last_error',null).gte('checked_at',new Date(Date.now()-48*3600000).toISOString()).order('id').range(from,to));
  const freshReferences=new Set(references.map(r=>r.product_id));
  if(freshReferences.size){
   const candidates=await readAllPages<{product_id:string}>((from,to)=>db.from('supplier_offers').select('product_id').not('product_id','is',null).is('variant_id',null).eq('verification','verified').eq('availability','in_stock').gte('cost_checked_at',new Date(Date.now()-86400000).toISOString()).order('id').range(from,to));
   for(const id of new Set(candidates.map(o=>o.product_id).filter(id=>freshReferences.has(id)))){
    if(remaining()<20000){report.deferred.push('Revisión de precios continúa en el próximo ciclo.');break;}
    const status=await repriceProduct(db,id,config,latestPolicy.data.config as ImportPolicy);if(status==='applied')applied++;
   }
  }
  report.prices=applied;
 }
 const partial=report.deferred.length>0||Boolean(report.tracking?.errors)||Boolean(report.discovery?.errors)||Object.values(report.sources).some(s=>s.status!=='connected');
 const closed=await db.from('supplier_sync_runs').update({status:partial?'partial':'success',completed_at:new Date().toISOString(),report}).eq('id',workerRun.data.id).select('id').single();
 if(closed.error)throw new Error('No se pudo confirmar el cierre del ciclo en la base de datos.');
 await writeFile(resolve(destination,'latest-worker-report.json'),JSON.stringify({started,completed:new Date().toISOString(),report},null,2));
 console.log(JSON.stringify({started,completed:new Date().toISOString(),report}));
}catch(e){const failure={...report,error:e instanceof Error?e.message:'Error'};const closed=await db.from('supplier_sync_runs').update({status:'error',completed_at:new Date().toISOString(),report:failure}).eq('id',workerRun.data.id);await writeFile(resolve(destination,'latest-worker-error.json'),JSON.stringify({started,completed:new Date().toISOString(),runId:workerRun.data.id,closeConfirmed:!closed.error,report:failure},null,2));throw e;}
finally{await browser?.close();}
