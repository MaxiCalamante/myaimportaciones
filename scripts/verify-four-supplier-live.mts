/** Explicit manual end-to-end verification. No publication, purchases or local scheduler. */
import{createClient}from'@supabase/supabase-js';import{mkdir,writeFile}from'node:fs/promises';import{resolve}from'node:path';
import{runSupplierTracker}from'../src/lib/supplier-tracker/worker';import{supplierAdapter}from'../src/lib/supplier-tracker/adapters';import{categoryIdentity,sourceUrl}from'../src/lib/supplier-tracker/adapters/shared';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const raw=process.argv.find(a=>a.startsWith('--url='))?.slice(6)??'https://atacadousa.com.py/categoria/cosmeticos';
const key=process.argv.find(a=>a.startsWith('--supplier='))?.slice(11)??'atacado-usa';const adapter=supplierAdapter(key),url=adapter.category(raw)?categoryIdentity(raw,adapter.key):sourceUrl(raw,raw,adapter.key);
if(!adapter.category(url))throw Error('La prueba requiere una categoría pública del adaptador.');
const supplier=await db.from('suppliers').select('id').eq('official_key',key).eq('is_active',true).single();if(supplier.error)throw Error('Proveedor retenido no disponible.');
const source=await db.rpc('tracker_save_source_v1',{config_input:{supplierId:supplier.data.id,url,label:'Prueba E2E '+key,kind:'category',discoverySeconds:86400,monitorSeconds:21600,maxPages:5000,maxItems:100000,exclusions:[],autoImport:false,normalization:{}}});if(source.error)throw Error(source.error.message);
const folder=resolve('scratch/suppliers-private/tracker-2026-11-06/live');await mkdir(folder,{recursive:true});
const reports:Array<Record<string,unknown>>=[];
for(let pass=1;pass<=(process.argv.includes('--twice')?2:1);pass++){
 const run=await db.rpc('tracker_start_source_v1',{source_input:source.data});if(run.error)throw Error(run.error.message);const deadline=Date.now()+20*60000;
 while(Date.now()<deadline){
  const report=await runSupplierTracker(db,{budgetMs:45000,maxTasks:8,onProgress:r=>console.log(JSON.stringify({pass,progress:r}))});
  const state=await db.from('supplier_tracker_runs').select('*').eq('id',run.data).single();if(state.error)throw Error(state.error.message);
  console.log(JSON.stringify({pass,pages:state.data.pages,items:state.data.items,new:state.data.new_items,state:state.data.state,worker:report}));
  if(['done','partial','error','paused'].includes(state.data.state)){reports.push(state.data);break;}
  await new Promise(r=>setTimeout(r,10000));
 }
 if(reports.length!==pass)throw Error('La prueba alcanzó su límite de 20 minutos; las tareas quedan persistidas.');
 if(reports[pass-1].state!=='done')throw Error('Recorrido incompleto: revisar incidencias, no declarar cobertura completa.');
}
if(reports.length===2&&reports[1].new_items!==0)throw Error('La segunda ejecución encontró novedades o duplicados: comparar identidades antes de concluir.');
await writeFile(resolve(folder,`${key}-runs.json`),JSON.stringify({at:new Date().toISOString(),url,sourceId:source.data,runs:reports},null,2));console.log(JSON.stringify({ok:true,url,sourceId:source.data,runs:reports}));
