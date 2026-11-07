import test from'node:test';import assert from'node:assert/strict';import{randomUUID}from'node:crypto';
import{trackerFixture as fixture}from'./helpers/supplier-tracker-fixture';
test('discovery persists real next pages, prevents cycles and duplicates across reruns; candidates stay private and unpublished',async()=>{
 const f=await fixture();try{const source=await f.source();const run=await f.start(source);let tasks=await f.claim();await f.page(tasks[0],'1',['https://atacadousa.com.py/categoria/cosmeticos?p=2']);tasks=await f.claim();await f.page(tasks[0],'2',['https://atacadousa.com.py/categoria/cosmeticos']);
 assert.equal((await f.db.query<{n:number}>('select count(*)::int n from supplier_tracker_items')).rows[0].n,2);assert.equal((await f.db.query<{state:string}>('select state from supplier_tracker_runs where id=$1',[run])).rows[0].state,'done');
 await f.db.exec('reset role');assert.equal((await f.db.query<{n:number}>('select count(*)::int n from products')).rows[0].n,0);
 await f.start(source);tasks=await f.claim();await f.page(tasks[0],'1',['https://atacadousa.com.py/categoria/cosmeticos?p=2']);tasks=await f.claim();await f.page(tasks[0],'2');assert.equal((await f.db.query<{n:number}>('select count(*)::int n from supplier_tracker_items')).rows[0].n,2);
 await f.db.exec('reset role;set role anon');await assert.rejects(f.db.exec('select *from supplier_tracker_items'),/permission/);await assert.rejects(f.db.query('select tracker_workspace_v1()'),/permission/);
 }finally{await f.db.close();}});
test('category ownership, locks, expired leases and exclusions cannot be bypassed',async()=>{
 const f=await fixture();try{const source=await f.source();await f.start(source);const task=(await f.claim())[0];assert.equal((await f.claim()).length,0);
 await assert.rejects(f.db.query('select tracker_record_page_v1($1,$2,$3)',[task.id,randomUUID(),{products:[],pages:[],contentHash:'a'.repeat(64)}]),/lease/);
 await assert.rejects(f.page(task,'1',['https://atacadousa.com.py/categoria/perfumes?p=2']),/category/);
 await assert.rejects(f.page(task,'1',['https://127.0.0.1/private']),/authorized/);
 await f.db.exec('reset role');await f.db.query("update supplier_tracker_tasks set leased_until=now()-interval '1 second'where id=$1",[task.id]);await f.db.exec('set role service_role');await assert.rejects(f.page(task,'1'),/lease/);
 }finally{await f.db.close();}});
test('cleanup archives only exclusive discarded sources, preserves shared products, orders and physical inventory, and is idempotent',async()=>{
 const f=await fixture();try{const p=randomUUID(),shared=randomUUID(),own=randomUUID(),v=randomUUID();await f.db.query("insert into products(id,title,source_url,stock)values($1,'Exclusive','https://neoimport.net/item',0),($2,'Shared',null,0),($3,'Own',null,7)",[p,shared,own]);await f.db.query("update products set fulfillment_mode='own_stock'where id=$1",[own]);await f.db.query('insert into product_variants(id,product_id)values($1,$2)',[v,shared]);
 await f.db.exec('alter table supplier_offers disable trigger archived_supplier_offer_guard');
 for(const[pid,sid,vid]of [[p,f.ids[4],null],[shared,f.ids[4],v],[shared,f.ids[0],null],[own,f.ids[4],null]])await f.db.query("insert into supplier_offers(id,supplier_id,product_id,variant_id,verification)values($1,$2,$3,$4,'verified')",[randomUUID(),sid,pid,vid]);
 await f.db.exec('alter table supplier_offers enable trigger archived_supplier_offer_guard');
 const orders=(await f.db.query('select *from orders')).rows;await f.db.exec('set role service_role');
 await assert.rejects(f.db.query('select apply_four_supplier_scope_v1($1,$2,$3)',[[], 'b'.repeat(64),[v]]),/scope changed/);
 const r=(await f.db.query<{r:{archivedSuppliers:number;archivedProducts:number}}> ('select apply_four_supplier_scope_v1($1,$2,$3)r',[[p],'b'.repeat(64),[v]])).rows[0].r;assert.equal(r.archivedSuppliers,1);assert.equal(r.archivedProducts,1);
 assert.deepEqual((await f.db.query<{r:unknown}>('select apply_four_supplier_scope_v1($1,$2,$3)r',[[p],'b'.repeat(64),[v]])).rows[0].r,r);
 await f.db.exec('reset role');assert.deepEqual((await f.db.query('select *from orders')).rows,orders);const rows=(await f.db.query<{id:string;is_active:boolean;stock:number}>('select id,is_active,stock from products')).rows;assert.equal(rows.find(x=>x.id===shared)?.is_active,true);assert.equal(rows.find(x=>x.id===own)?.stock,7);assert.equal((await f.db.query<{is_active:boolean}>('select is_active from product_variants where id=$1',[v])).rows[0].is_active,false);
 await assert.rejects(f.db.query('update suppliers set is_active=true where id=$1',[f.ids[4]]),/four approved/);
 }finally{await f.db.close();}});
test('monitor retains last evidence on unknown stock, records price changes, and confirms removal only after spaced persistent 404s',async()=>{
 const f=await fixture();try{const source=await f.source();await f.start(source);await f.page((await f.claim())[0],'1');await f.db.exec('reset role');const i=(await f.db.query<{id:string}>('select id from supplier_tracker_items')).rows[0];await f.db.query('select tracker_control_v1(\'item\',$1,\'sync\')',[i.id]);let task=(await f.claim())[0];
 const record=async(result:object)=>f.db.query('select tracker_record_monitor_v1($1,$2,$3)',[task.id,task.lease_token,result]);
 await record({kind:'ok',externalId:'1',title:'QA',cost:12,currency:'USD',normalizedUsd:12,availability:'in_stock',quantity:2});
 await f.db.exec('reset role');const previous=(await f.db.query<{availability_checked_at:string}>('select availability_checked_at from supplier_tracker_items')).rows[0].availability_checked_at;
 await f.db.query('select tracker_control_v1(\'item\',$1,\'sync\')',[i.id]);task=(await f.claim())[0];await record({kind:'ok',externalId:'1',title:'QA',cost:13,currency:'USD',normalizedUsd:13,availability:'out_of_stock',quantity:0});
 assert.equal((await f.db.query<{n:number}>("select count(*)::int n from supplier_tracker_events where kind='out_of_stock'")).rows[0].n,1);
 await f.db.exec('reset role');await f.db.query("select tracker_control_v1('item',$1,'sync')",[i.id]);task=(await f.claim())[0];await record({kind:'ok',externalId:'1',title:'QA',cost:13,currency:'USD',normalizedUsd:13,availability:'unknown',quantity:null});
 assert.equal((await f.db.query<{availability:string}>('select availability from supplier_tracker_items')).rows[0].availability,'out_of_stock');assert.ok(previous);
 await f.db.exec('reset role');await f.db.exec("update supplier_tracker_items set missing_count=2,first_missing_at=now()-interval '25 hours',last_missing_at=now()-interval '2 hours'");await f.db.query('select tracker_control_v1(\'item\',$1,\'sync\')',[i.id]);task=(await f.claim())[0];await record({kind:'not_found',error:'404'});assert.equal((await f.db.query<{status:string;availability:string}>('select status,availability from supplier_tracker_items')).rows[0].status,'retired');assert.equal((await f.db.query<{availability:string}>('select availability from supplier_tracker_items')).rows[0].availability,'out_of_stock');
 }finally{await f.db.close();}});

test('cloud schedule extends authenticated tickets and rejects stale/paused commercial work before writing',async()=>{
 const f=await fixture(true);try{
 await f.db.query("select enqueue_supplier_cloud_tick_v1('catalog')");assert.equal((await f.db.query<{job:string}>('select job from supplier_cloud_ticks')).rows[0].job,'catalog');
 const source=await f.source();await f.start(source);await f.page((await f.claim())[0],'1');await f.db.exec('reset role');const i=(await f.db.query<{id:string}>('select id from supplier_tracker_items')).rows[0];await f.db.query("select tracker_control_v1('item',$1,'sync')",[i.id]);const task=(await f.claim())[0];
 await assert.rejects(f.db.query('select tracker_commit_observation_v1($1,$2,$3)',[task.id,randomUUID(),{}]),/lease/);
 await f.db.exec('reset role');await f.db.query("select tracker_control_v1('item',$1,'pause')",[i.id]);await f.db.exec('set role service_role');await assert.rejects(f.db.query('select tracker_commit_observation_v1($1,$2,$3)',[task.id,task.lease_token,{}]),/lease|paused/);
 await f.db.exec("reset role;select set_config('test.admin','false',false);set role authenticated");await assert.rejects(f.db.query('select tracker_request_tick_v1()'),/Forbidden/);await assert.rejects(f.db.query('select tracker_history_v1()'),/Forbidden/);await assert.rejects(f.db.query('select tracker_auto_candidates_v1($1)',[source]),/permission/);
 }finally{await f.db.close();}
});
test('a loss-making automatic USD refresh rolls back its commercial mutation and records a private alert',async()=>{
 const f=await fixture();try{
 await f.db.exec("alter table products add column sale numeric default 50;create table product_usd_prices(product_id uuid,variant_id uuid,wholesale_usd numeric)");const p=randomUUID(),o=randomUUID();await f.db.query("insert into products(id,title)values($1,'USD')",[p]);await f.db.query("insert into supplier_offers(id,supplier_id,product_id,verification)values($1,$2,$3,'verified')",[o,f.ids[0],p]);
 await f.db.exec(`create function store_refresh_supplier_usd_v1(uuid)returns jsonb language plpgsql as $$begin update products set sale=10;return '{"status":"applied"}'::jsonb;end$$;
 create function store_price_ars_v1(uuid,uuid,text,numeric)returns numeric language sql as $$select 10::numeric$$;
 create function store_usd_floor_v1(uuid,uuid,numeric)returns void language plpgsql as $$begin raise exception 'Loss';end$$;set role service_role;`);
 const r=(await f.db.query<{r:{status:string}}>('select tracker_reprice_offer_v1($1)r',[o])).rows[0].r;assert.equal(r.status,'blocked');await f.db.exec('reset role');assert.equal(Number((await f.db.query<{sale:string}>('select sale from products')).rows[0].sale),50);assert.equal((await f.db.query<{kind:string}>("select kind from supplier_tracker_events where kind='commercial_alert'")).rows.length,1);
 }finally{await f.db.close();}
});

test('individual URLs enqueue a monitor without ambiguous IDs and preserve the existing source on a second start',async()=>{
 const f=await fixture();try{const config={supplierId:f.ids[0],url:'https://atacadousa.com.py/produto/123',kind:'product',autoImport:false,exclusions:[],discoverySeconds:86400,monitorSeconds:21600};const source=(await f.db.query<{id:string}>('select tracker_save_source_v1($1)id',[config])).rows[0].id;await f.start(source);await f.start(source);await f.db.exec('reset role');assert.equal((await f.db.query<{n:number}>("select count(*)::int n from supplier_tracker_tasks where kind='monitor'")).rows[0].n,1);assert.equal((await f.db.query<{n:number}>('select count(*)::int n from supplier_tracker_items')).rows[0].n,1);
 }finally{await f.db.close();}
});

test('ambiguous MYA links preserve private primary observations and remain reviewable without changing commercial offers',async()=>{
 const f=await fixture();try{const source=await f.source();await f.start(source);await f.page((await f.claim())[0],'1');await f.db.exec('reset role');const item=(await f.db.query<{id:string}>('select id from supplier_tracker_items')).rows[0];await f.db.query("select tracker_control_v1('item',$1,'sync')",[item.id]);const task=(await f.claim())[0];await f.db.query('select tracker_record_monitor_v1($1,$2,$3)',[task.id,task.lease_token,{kind:'ok',externalId:'1',title:'QA 50 ml',cost:15,currency:'USD',normalizedUsd:15,availability:'in_stock',quantity:3,commercialReview:'La identidad comercial requiere revisión del vínculo exacto'}]);await f.db.exec('reset role');const row=(await f.db.query<{status:string;availability:string;origin_cost:string;quantity:number}>('select status,availability,origin_cost,quantity from supplier_tracker_items')).rows[0];assert.equal(row.status,'review');assert.equal(row.availability,'in_stock');assert.equal(Number(row.origin_cost),15);assert.equal(row.quantity,3);assert.equal((await f.db.query<{n:number}>("select count(*)::int n from supplier_tracker_events where kind='identity_review'")).rows[0].n,1);assert.equal((await f.db.query<{n:number}>('select count(*)::int n from supplier_offers')).rows[0].n,0);
 }finally{await f.db.close();}
});

test('automatic draft imports require explicit opt-in, stay private and fence duplicate queue requests transactionally',async()=>{
 const f=await fixture(true);try{
 await f.db.exec(`create table catalog_import_jobs(id uuid primary key default gen_random_uuid(),request_key uuid,state text,config jsonb);
 create table catalog_pricing_rules(id uuid,created_at timestamptz);create table import_cost_policies(id uuid,created_at timestamptz);create table supplier_tracking_settings(id boolean,config jsonb);`);
 const source=await f.source();await f.start(source);await f.page((await f.claim())[0],'1');await f.db.exec('reset role');const item=(await f.db.query<{id:string}>('select id from supplier_tracker_items')).rows[0];const offer=randomUUID();await f.db.query("insert into supplier_offers(id,supplier_id,external_id,source_url,verification)values($1,$2,'1','https://atacadousa.com.py/produto/1','pending')",[offer,f.ids[0]]);await f.db.query('update supplier_tracker_items set offer_id=$1 where id=$2',[offer,item.id]);
 const rows=[{offer_id:offer,payload:{action:'new',product:{category_id:f.category}}}];await f.db.exec('set role service_role');await assert.rejects(f.db.query('select tracker_queue_drafts_v1($1,$2,$3)',[source,[item.id],rows]),/disabled/);await f.db.exec('reset role');await f.db.query('update supplier_tracker_sources set auto_import=true,import_category_id=$1 where id=$2',[f.category,source]);await f.db.exec('set role service_role');assert.equal((await f.db.query('select *from tracker_auto_candidates_v1($1)',[source])).rows.length,1);await f.db.query('select tracker_queue_drafts_v1($1,$2,$3)',[source,[item.id],rows]);await assert.rejects(f.db.query('select tracker_queue_drafts_v1($1,$2,$3)',[source,[item.id],rows]),/already queued/);assert.equal((await f.db.query('select *from tracker_auto_candidates_v1($1)',[source])).rows.length,0);
 await f.db.exec('reset role');const cfg=(await f.db.query<{config:{automatic_publication:boolean}}> ('select config from catalog_import_jobs')).rows[0].config;assert.equal(cfg.automatic_publication,false);assert.equal((await f.db.query('select *from products')).rows.length,0);
 }finally{await f.db.close();}
});
