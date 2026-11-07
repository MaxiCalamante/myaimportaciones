/** Private read-only backup and deterministic before/after cleanup classification. */
import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {readAllPages} from '../src/lib/read-all-pages';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const phase=process.argv.includes('--after')?'after':'before';
const folder=resolve('scratch/suppliers-private/tracker-2026-11-06',phase);await mkdir(folder,{recursive:true});
const tables:Record<string,string[]>={suppliers:['id'],products:['id'],product_variants:['id'],product_costs:['product_id'],stock_logs:['id'],orders:['id'],order_items:['id'],supplier_offers:['id'],supplier_observations:['id'],supplier_sync_queue:['id'],supplier_discovery_jobs:['id'],supplier_link_decisions:['id'],supplier_price_decisions:['id'],supplier_market_references:['id'],supplier_source_health:['supplier_id'],supplier_source_slots:['supplier_id'],supplier_tracking_settings:['id'],supplier_config_history:['id'],supplier_proposals:['id'],import_simulations:['id'],import_purchases:['id'],order_supply_operations:['order_item_id'],supplier_margin_price_bases:['product_id'],supplier_margin_price_events:['id']};
const saved:Record<string,Array<Record<string,unknown>>>={},manifest:Array<{table:string;rows:number;sha256:string}>=[];
for(const [table,keys]of Object.entries(tables)){
 const rows=await readAllPages<Record<string,unknown>>((from,to)=>{let q=db.from(table).select('*');for(const key of keys)q=q.order(key);return q.range(from,to);});
 const json=JSON.stringify(rows);await writeFile(resolve(folder,`${table}.json`),json);saved[table]=rows;
 manifest.push({table,rows:rows.length,sha256:createHash('sha256').update(json).digest('hex')});console.log(`${phase}: ${table} ${rows.length}`);
}
const allowed=new Set(['atacadoconnect.com','atacadousa.com.py','starcompany-py.com','totalherramientasoficial.com.py']);
const host=(raw:unknown)=>{try{return new URL(String(raw)).hostname.replace(/^www\./,'');}catch{return '';}};
const suppliers:Array<Record<string,unknown>&{keep:boolean}>=saved.suppliers.map(s=>({...s,keep:allowed.has(host(s.website))}));
const keepIds=new Set(suppliers.filter(s=>s.keep).map(s=>s.id));
const products=saved.products.map(p=>{
 const offers=saved.supplier_offers.filter(o=>o.product_id===p.id),direct=[p.source_url,...saved.product_variants.filter(v=>v.product_id===p.id).map(v=>v.source_url)].filter(Boolean);
 const sourceHosts=new Set([...offers.map(o=>host(o.source_url)),...direct.map(host)]);
 const retained=offers.filter(o=>keepIds.has(o.supplier_id)&&o.verification==='verified');
 const hasRetained=retained.length>0||direct.some(u=>allowed.has(host(u)));
 const discarded=offers.some(o=>!keepIds.has(o.supplier_id))||direct.some(u=>host(u)&&suppliers.some(s=>!s.keep&&host(s.website)===host(u)));
 const ownStock=p.fulfillment_mode!=='supplier'||saved.product_variants.some(v=>v.product_id===p.id&&v.fulfillment_mode!=='supplier'&&Number(v.stock)>0);
 const action=hasRetained?'keep':discarded&&!ownStock?'archive': 'review';
 return {id:p.id,title:p.title,active:p.is_active,deleted:p.deleted_at,action,sourceHosts:[...sourceHosts],retainedOfferIds:retained.map(o=>o.id),ownStock};
});
const variants=saved.product_variants.filter(v=>v.fulfillment_mode==='supplier'&&saved.supplier_offers.some(o=>o.variant_id===v.id&&!keepIds.has(o.supplier_id))&&!saved.supplier_offers.some(o=>o.variant_id===v.id&&keepIds.has(o.supplier_id)&&o.verification==='verified')).map(v=>({id:v.id,productId:v.product_id,active:v.is_active}));
const report={at:new Date().toISOString(),phase,backupComplete:true,manifest,suppliers,products,variants,summary:{archiveVariants:variants.length,keepSuppliers:suppliers.filter(s=>s.keep).length,archiveSuppliers:suppliers.filter(s=>!s.keep).length,archiveProducts:products.filter(p=>p.action==='archive').length,archiveActive:products.filter(p=>p.action==='archive'&&p.active&&!p.deleted).length,keepProducts:products.filter(p=>p.action==='keep').length,reviewProducts:products.filter(p=>p.action==='review').length}};
await writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2));
const cell=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`;
await writeFile(resolve(folder,'products.csv'),'id,title,active,action,source_hosts\n'+products.map(p=>[p.id,p.title,p.active,p.action,p.sourceHosts.join(' | ')].map(cell).join(',')).join('\n'));
console.log(JSON.stringify({folder,...report.summary}));
