import{createClient}from'@supabase/supabase-js';import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';import{resolve}from'node:path';
const folder=resolve('scratch/suppliers-private/tracker-2026-11-06/before');
const report=JSON.parse(await readFile(resolve(folder,'report.json'),'utf8'));
if(!report.backupComplete)throw Error('Falta respaldo completo.');
for(const entry of report.manifest){const raw=await readFile(resolve(folder,entry.table+'.json'));if(createHash('sha256').update(raw).digest('hex')!==entry.sha256)throw Error(`Respaldo alterado: ${entry.table}`);}
const offers=JSON.parse(await readFile(resolve(folder,'supplier_offers.json'),'utf8')),variants=JSON.parse(await readFile(resolve(folder,'product_variants.json'),'utf8'));
const keep=new Set(report.suppliers.filter((s:{keep:boolean})=>s.keep).map((s:{id:string})=>s.id));
const variantIds=variants.filter((v:{id:string;fulfillment_mode:string})=>v.fulfillment_mode==='supplier'&&offers.some((o:{variant_id:string;supplier_id:string})=>o.variant_id===v.id&&!keep.has(o.supplier_id))&&!offers.some((o:{variant_id:string;supplier_id:string;verification:string})=>o.variant_id===v.id&&keep.has(o.supplier_id)&&o.verification==='verified')).map((v:{id:string})=>v.id);
const products=report.products.filter((p:{action:string})=>p.action==='archive').map((p:{id:string})=>p.id);
const backupHash=createHash('sha256').update(JSON.stringify(report.manifest)).digest('hex');
if(!process.argv.includes('--apply')){console.log(JSON.stringify({mode:'dry-run',products:products.length,variants:variantIds.length,backupHash}));process.exit(0);}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const result=await db.rpc('apply_four_supplier_scope_v1',{expected_ids_input:products,expected_variants_input:variantIds,backup_hash_input:backupHash});if(result.error)throw Error(result.error.message);
await writeFile(resolve(folder,'cleanup-result.json'),JSON.stringify({at:new Date().toISOString(),backupHash,result:result.data},null,2));console.log(JSON.stringify(result.data));
