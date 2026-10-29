// Supabase Edge runtime. Shared business rules are packaged from src/lib, never copied by hand.
import {createClient} from '@supabase/supabase-js';
import {runSupplierAutomation,repriceProduct,type TrackingConfig} from '../../../src/lib/supplier-automation';
import {readCrosslinkCatalog,runSupplierDiscovery,seedSupplierDiscovery} from '../../../src/lib/supplier-crosslinks';
import {refreshMarketReferences} from '../../../src/lib/supplier-market';
import {readAllPages} from '../../../src/lib/read-all-pages';
import {boundedWorkerFetch} from '../../../src/lib/worker-fetch';
import type {ImportPolicy} from '../../../src/lib/import-costs';
import {refreshSupplierUsdtQuote,runSupplierFxPrices} from '../../../src/lib/supplier-usdt';

declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void};
declare const EdgeRuntime:{waitUntil(promise:Promise<unknown>):void};
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:boundedWorkerFetch()}});
const response=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});

async function run(job:string){
 const started=Date.now();
 const initial=await db.from('supplier_sync_runs').insert({worker:`supabase-${job}`}).select('id').single();
 if(initial.error)throw new Error('No se pudo registrar el ciclo en la nube.');
 let report:Record<string,unknown>={};
 try{
  if(job==='sync')report=await runSupplierAutomation(db,{worker:'supabase-linked-products',limit:18,timeBudgetMs:70000});
  else if(job==='details'){
   const catalog=await readCrosslinkCatalog(db);
   report=await runSupplierDiscovery(db,catalog,async()=>{throw new Error('Esta tarea solo procesa fichas primarias; no ejecuta navegadores locales.');},{detailsOnly:true,worker:'supabase-cross-supplier-details',limit:6,timeBudgetMs:65000});
  }else if(job==='plan'){
   const catalog=await readCrosslinkCatalog(db);report={planned:await seedSupplierDiscovery(db,catalog)};
  }else if(job==='market'){
   report={market:await refreshMarketReferences(db,2),prices:0};
   const settings=await db.from('supplier_tracking_settings').select('config').eq('id',true).single();
   if(settings.error)throw new Error('No se pudo leer la configuración comercial.');
   const config=settings.data.config as TrackingConfig;
   if(config.acquisitionFxMode==='usdt'){
    try{report.fx=await refreshSupplierUsdtQuote(db);report.fxPrices=await runSupplierFxPrices(db);}
    catch(e){report.fx={error:e instanceof Error?e.message:'No se pudo actualizar USDT'};}
   }
   if(config.enabled&&config.autoPrices){
    const policy=await db.from('import_cost_policies').select('config').order('created_at',{ascending:false}).limit(1).single();if(policy.error)throw new Error('No se pudo verificar tarifas.');
    const references=await readAllPages<{product_id:string}>((from,to)=>db.from('supplier_market_references').select('product_id').is('variant_id',null).eq('identity_verified',true).is('last_error',null).gte('checked_at',new Date(Date.now()-config.marketFreshnessHours*3600000).toISOString()).order('id').range(from,to));
    let applied=0,checked=0;
    for(const id of new Set(references.map(r=>r.product_id))){
     if(Date.now()-started>95000)break;
     if(await repriceProduct(db,id,config,policy.data.config as ImportPolicy)==='applied')applied++;
     checked++;
    }
    report={...report,prices:applied,pricesChecked:checked};
   }
  }else throw new Error('Tarea desconocida.');
  const marketErrors=(report.market as {errors?:number}|undefined)?.errors??0;
  const closed=await db.from('supplier_sync_runs').update({status:Number(report.errors)>0||marketErrors>0||(report.fx as {error?:string}|undefined)?.error?'partial':'success',completed_at:new Date().toISOString(),report}).eq('id',initial.data.id).select('id').single();
  if(closed.error)throw new Error('No se pudo confirmar el cierre del ciclo.');
 }catch(e){
  await db.from('supplier_sync_runs').update({status:'error',completed_at:new Date().toISOString(),report:{...report,error:e instanceof Error?e.message:'Error del procesador'}}).eq('id',initial.data.id);
  console.error(JSON.stringify({worker:`supabase-${job}`,runId:initial.data.id,error:e instanceof Error?e.message:'Error'}));
 }finally{
  await db.from('supplier_cloud_leases').delete().eq('job',job);
 }
}

Deno.serve(async request=>{
 if(request.method!=='POST')return response(405,{error:'Method not allowed'});
 if(Number(request.headers.get('content-length')??0)>1024)return response(413,{error:'Invalid request'});
 let ticket:unknown;
 try{const raw=await request.text();if(raw.length>1024)return response(413,{error:'Invalid request'});ticket=JSON.parse(raw).ticket;}catch{return response(400,{error:'Invalid request'});}
 if(typeof ticket!=='string'||!/^[0-9a-f]{64}$/.test(ticket))return response(401,{error:'Unauthorized'});
 const grant=await db.rpc('consume_supplier_cloud_tick_v1',{ticket_input:ticket});
 if(grant.error)return response(503,{error:'Authorization unavailable'});
 if(!grant.data)return response(401,{error:'Unauthorized'});
 if(!grant.data.run)return response(202,{accepted:true,busy:true});
 EdgeRuntime.waitUntil(run(grant.data.job));
 return response(202,{accepted:true});
});
