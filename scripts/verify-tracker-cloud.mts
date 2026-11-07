import{createClient}from'@supabase/supabase-js';import{readFile,writeFile,mkdir}from'node:fs/promises';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const report=JSON.parse(await readFile('scratch/suppliers-private/tracker-2026-11-06/probes/report.json','utf8'));
const sources=[];
for(const p of report){
 if(!p.first||!p.detail)throw Error('La muestra no confirma una ficha primaria.');
 const supplier=await db.from('suppliers').select('id').eq('official_key',p.key).eq('is_active',true).single();if(supplier.error)throw Error(supplier.error.message);
 const source=await db.rpc('tracker_save_source_v1',{config_input:{supplierId:supplier.data.id,url:p.first.url,label:'Validación ficha '+p.key,kind:'product',discoverySeconds:86400,monitorSeconds:21600,exclusions:[],autoImport:false,normalization:{}}});if(source.error)throw Error(source.error.message);
 const started=await db.rpc('tracker_start_source_v1',{source_input:source.data});if(started.error)throw Error(started.error.message);
 sources.push({supplier:p.key,id:source.data,url:p.first.url});
}
const usa=await db.from('suppliers').select('id').eq('official_key','atacado-usa').single();if(usa.error)throw Error('No se encontró USA');
const candidate=await db.from('supplier_tracker_items').select('url').eq('supplier_id',usa.data.id).order('external_id').limit(1).single();if(candidate.error)throw Error('No se encontró candidato USA');
const usaSource=await db.rpc('tracker_save_source_v1',{config_input:{supplierId:usa.data.id,url:candidate.data.url,label:'Validación ficha atacado-usa',kind:'product',discoverySeconds:86400,monitorSeconds:21600,exclusions:[],autoImport:false,normalization:{}}});if(usaSource.error)throw Error(usaSource.error.message);
const usaStart=await db.rpc('tracker_start_source_v1',{source_input:usaSource.data});if(usaStart.error)throw Error(usaStart.error.message);sources.push({supplier:'atacado-usa',id:usaSource.data,url:candidate.data.url});
await mkdir('scratch/suppliers-private/tracker-2026-11-06/live',{recursive:true});
await writeFile('scratch/suppliers-private/tracker-2026-11-06/live/cloud-sources.json',JSON.stringify(sources,null,2));
console.log(JSON.stringify({enqueued:sources.length,publication:false,automaticImports:false}));
