/** Live public HTTP -> persistent LOCAL PostgreSQL queues. No Supabase credentials. */
import{mkdir,writeFile,readFile}from'node:fs/promises';import{resolve}from'node:path';import{postAuditFixture}from'../tests/helpers/post-audit-fixture';
import{supplierAdapter}from'../src/lib/supplier-tracker/adapters';import{fetchTrackerHtml}from'../src/lib/supplier-tracker/network';import{pageFingerprint,normalizeSourceCost}from'../src/lib/supplier-tracker/worker';
const output=resolve('scratch/suppliers-private/post-audit-2026-11-06/live-'+Date.now());await mkdir(output,{recursive:true});
const sources=[{key:'atacado-usa',index:0,url:'https://atacadousa.com.py/categoria/cosmeticos'},{key:'star-company',index:1,url:'https://www.starcompany-py.com/categoria-premium/100'},{key:'total',index:2,url:'https://www.totalherramientasoficial.com.py/produtos/kit-de-ferramentas/filter?d=77'},{key:'atacado-connect',index:3,url:'https://atacadoconnect.com/categoria/games'}];
const results=await Promise.allSettled(sources.map(async source=>{const folder=resolve(output,source.key);await mkdir(folder,{recursive:true});const f=await postAuditFixture(resolve(folder,'postgres'));const adapter=supplierAdapter(source.key),pages:Array<{url:string;file:string;data:unknown}>=[];const report:Record<string,unknown>={source,at:new Date().toISOString(),environment:'persistent local PostgreSQL, live HTTP; no production mutations'};
 try{const id=(await f.db.query<{id:string}>('select tracker_save_source_v1($1)id',[{supplierId:f.ids[source.index],url:source.url,kind:'category',label:'Verificación local',discoverySeconds:86400,monitorSeconds:21600,maxPages:500,maxItems:10000,exclusions:[],autoImport:false}])).rows[0].id;const run=await f.start(id);const deadline=Date.now()+8*60000;
 while(Date.now()<deadline){await f.db.exec("reset role;update supplier_tracker_tasks set next_run_at=now()+interval '1 day'where kind='monitor'");const tasks=await f.claim();if(!tasks.length)break;
  for(const task of tasks){const t=(await f.db.query<{url:string;kind:string}>('select url,kind from supplier_tracker_tasks where id=$1',[task.id])).rows[0];if(t.kind!=='discover')continue;
   if(pages.length)await new Promise(r=>setTimeout(r,10000));const html=await fetchTrackerHtml(t.url,adapter.key),listing=adapter.listing(html,t.url,source.url);const file=resolve(folder,'page-'+(pages.length+1)+'.html');await writeFile(file,html);
   const data={products:listing.products.map(p=>({...p,...normalizeSourceCost(p,{})})),pages:listing.pages,contentHash:await pageFingerprint(listing.products)};await f.db.query('select tracker_record_page_v1($1,$2,$3)',[task.id,task.lease_token,data]);pages.push({url:t.url,file,data});
   console.log(JSON.stringify({supplier:source.key,page:pages.length,identities:listing.products.length}));
  }
 }
 report.run=(await f.db.query('select *from supplier_tracker_runs where id=$1',[run])).rows[0];report.pages=pages.map(({url,file})=>({url,file}));report.persistedItems=(await f.db.query<{n:number}>('select count(*)::int n from supplier_tracker_items')).rows[0].n;
 // Re-run discovery from captured live responses. This proves queue persistence
 // and deduplication, separately from a second network traversal.
 if((report.run as {state:string}).state==='done'){
  const nextRun=await f.start(id);let replayed=0;while(replayed<pages.length){await f.db.exec("reset role;update supplier_tracker_tasks set next_run_at=now()+interval '1 day'where kind='monitor'");const tasks=await f.claim();if(!tasks.length)break;for(const task of tasks){const t=(await f.db.query<{url:string;kind:string}>('select url,kind from supplier_tracker_tasks where id=$1',[task.id])).rows[0];if(t.kind!=='discover')continue;const captured=pages.find(p=>p.url===t.url);if(!captured)throw Error('Replay requested an uncaptured URL');await readFile(captured.file);await f.db.query('select tracker_record_page_v1($1,$2,$3)',[task.id,task.lease_token,captured.data]);replayed++;}}
  report.replay=(await f.db.query('select *from supplier_tracker_runs where id=$1',[nextRun])).rows[0];
 }
 }catch(error){report.error=error instanceof Error?error.message:String(error);report.completed=false;process.exitCode=1;}
 finally{await writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2));await f.db.close();}return report;
}));await writeFile(resolve(output,'report.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({output,results:results.map(r=>r.status==='fulfilled'?r.value:r.reason)},null,2));
