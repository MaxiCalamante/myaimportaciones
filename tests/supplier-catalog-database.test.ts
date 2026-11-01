import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';

const migration='supabase/migrations/20261101025502_supplier_catalog_import.sql';
const category='a1111111-1111-4111-8111-111111111111';
const authId='a2222222-2222-4222-8222-222222222222';
type Report={state:string;processed:number;counts:Record<string,number>};
type PreviewRow={offer_id:string;payload:Record<string,unknown>};

async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
  create function auth.uid()returns uuid language sql as $$select '${authId}'::uuid$$;
  create function is_admin()returns boolean language sql as $$select coalesce(current_setting('test.admin',true),'false')='true'$$;
  create table suppliers(id uuid primary key default gen_random_uuid(),name text,website text,notes text,is_active boolean default true,created_at timestamptz default now());
  create table categories(id uuid primary key,slug text,parent_id uuid);
  insert into categories(id,slug)values('${category}','herramientas');
  create table products(id uuid primary key default gen_random_uuid(),title text not null,slug text not null unique,description text,image_url text,image_urls text[] not null default '{}',
   brand text,model text,sku text,source_url text,category_id uuid not null references categories(id),retail_price numeric not null default 0,stock integer not null default 0,
   fulfillment_mode text,supplier_available boolean,supplier_last_checked_at timestamptz,supplier_stock_status text,is_active boolean default true,is_featured boolean default false,updated_at timestamptz);
  create table product_variants(id uuid primary key,product_id uuid references products(id),title text,sku text,options jsonb,supplier_available boolean,fulfillment_mode text,updated_at timestamptz);
  create table product_costs(product_id uuid primary key references products(id),origin_cost numeric not null check(origin_cost>0),currency text not null check(currency in('USD','ARS','PYG')),
   exchange_rate numeric not null check(exchange_rate>0),freight_per_unit numeric not null check(freight_per_unit>=0),other_landed_cost numeric not null check(other_landed_cost>=0),
   landed_cost numeric generated always as(origin_cost*exchange_rate+freight_per_unit+other_landed_cost)stored,
   variable_cost numeric not null check(variable_cost>=0),payment_fee_percent numeric not null check(payment_fee_percent>=0 and payment_fee_percent<100),minimum_contribution numeric not null check(minimum_contribution>=0),
   expenses_confirmed boolean not null default false,verified_at timestamptz not null,source_document text,supplier_url text,ml_url text,ml_price numeric,ml_checked_at timestamptz);
  create table catalog_pricing_rules(id uuid primary key default gen_random_uuid(),config jsonb not null,created_at timestamptz not null default now());
  insert into catalog_pricing_rules(config)values('{"minimumMarginPercent":20}');
  grant usage on schema auth to authenticated,service_role;grant select,update on products to authenticated;`);
 for(const name of ['20261020120000_supplier_intelligence','20261020170000_supplier_automation','20261020180000_supplier_automation_guards','20261020190000_supplier_worker_coordination','20261020200000_supplier_manual_references','20261020210000_supplier_crosslinks','20261020220000_supplier_link_stock_evidence']){
  await db.exec(readFileSync(`supabase/migrations/${name}.sql`,'utf8'));
 }
 await db.exec(readFileSync(migration,'utf8'));
 await db.exec("select set_config('test.admin','true',false)");
 const suppliers=(await db.query<{id:string}>('select id from suppliers order by official_key')).rows.map(x=>x.id);
 async function offer(title:string,variant='base',supplier=suppliers[0]){
  const id=randomUUID();
  await db.query(`insert into supplier_offers(id,supplier_id,external_id,variant_key,title,brand,model,source_url,origin_cost,currency,availability,verification,cost_checked_at,availability_checked_at)
   values($1,$2,$3,$4,$5,'Bosch',$5,'https://supplier.test/item',10,'USD','in_stock','pending',now(),now())`,[id,supplier,id,variant,title]);
  return id;
 }
 async function row(id:string,identity?:string,options:Partial<PreviewRow['payload']>={}):Promise<PreviewRow>{
  const snapshot=(await db.query<Record<string,unknown>>(`select id,supplier_id,external_id,variant_key,title,brand,model,gtin,source_url,origin_cost,currency,availability,verification,cost_checked_at,availability_checked_at,last_error,product_id,variant_id from supplier_offers where id=$1`,[id])).rows[0];
  // json serialization matches the source JSON used by PostgREST, including timestamp strings and JSON numbers.
  const source=(await db.query<{offer:Record<string,unknown>}>(`select to_jsonb(o)-array['evidence','updated_at','created_at','last_success_at','last_attempt_at'] offer from supplier_offers o where id=$1`,[id])).rows[0].offer;
  assert.deepEqual(Object.keys(source).sort(),Object.keys(snapshot).sort());
  const productId=randomUUID();
  return {offer_id:id,payload:{action:'new',offer:source,identity_key:identity??`bosch ${String(source.title).toLowerCase()} ${String(source.variant_key).toLowerCase()}`,
   product:{id:productId,title:source.title,slug:`draft-${id}`,category_id:category,retail_price:100,brand:'Bosch',model:source.title,description:''},
   cost:{origin_cost:10,currency:'USD',exchange_rate:1,freight_per_unit:2,other_landed_cost:1,variable_cost:1,payment_fee_percent:5,minimum_contribution:1,expenses_confirmed:false,verified_at:source.cost_checked_at,source_document:'Factura de proveedor comprobada'},...options}};
 }
 async function create(rows:PreviewRow[],request=randomUUID(),config:Record<string,unknown>={}){
  return (await db.query<{id:string}>('select create_catalog_import_job_v1($1,$2,$3)id',[request,config,rows])).rows[0].id;
 }
 async function control(job:string,action:string){await db.query('select control_catalog_import_job_v1($1,$2)',[job,action]);}
 async function process(job:string,limit=20):Promise<Report>{return(await db.query<{report:Report}>('select process_catalog_import_job_v1($1,$2)report',[job,limit])).rows[0].report;}
 async function item(job:string){return(await db.query<{state:string;product_id:string|null;error:string|null;attempts:number}>('select state,product_id,error,attempts from catalog_import_items where job_id=$1 order by position',[job])).rows;}
 return {db,suppliers,offer,row,create,control,process,item};
}

test('catalog previews are immutable, bounded, idempotent and invisible to public/customer callers',async()=>{
 const f=await fixture();const{db}=f;
 try{
  const oid=await f.offer('GBH 2-26 220V');const r=await f.row(oid);const request=randomUUID();
  await db.exec('set role authenticated');
  const job=await f.create([r],request,{automatic_publication:true});
  assert.equal(await f.create([r],request,{automatic_publication:true}),job);
  assert.equal((await db.query<{config:{automatic_publication:boolean}}>('select config from catalog_import_jobs where id=$1',[job])).rows[0].config.automatic_publication,false);
  assert.equal((await db.query('select * from products')).rows.length,0);
  await assert.rejects(f.create([{...r,payload:{...r.payload,reason:'changed'}}],request,{automatic_publication:true}),/Idempotency mismatch/);
  await assert.rejects(f.create([r,r]),/duplicate/);
  await assert.rejects(f.create([]),/1 to 5000/);
  await assert.rejects(f.create(Array.from({length:5001},()=>r)),/1 to 5000/);
  await assert.rejects(db.query("update catalog_import_jobs set state='queued' where id=$1",[job]),/permission denied/);
  await assert.rejects(db.query("update catalog_import_items set payload='{}' where job_id=$1",[job]),/permission denied/);
  await assert.rejects(db.query("delete from catalog_import_events where job_id=$1",[job]),/permission denied/);
  assert.equal((await f.process(job)).processed,0);
  await db.exec("select set_config('test.admin','false',false)");
  for(const table of ['catalog_import_jobs','catalog_import_items','catalog_product_reviews','catalog_import_events'])assert.equal((await db.query(`select * from ${table}`)).rows.length,0);
  await assert.rejects(f.create([r]),/Forbidden/);await assert.rejects(f.control(job,'confirm'),/Forbidden/);await assert.rejects(f.process(job),/Forbidden/);
  await assert.rejects(db.query('select review_catalog_product_v1($1,$2,$3)',[randomUUID(),{},'publish']),/Forbidden/);
  await db.exec('reset role;set role anon');
  await assert.rejects(db.query('select * from catalog_import_jobs'),/permission denied/);
  await assert.rejects(f.process(job),/permission denied/);
  await db.exec('reset role;set role service_role');
  await assert.rejects(f.create([r]),/permission denied/);await assert.rejects(f.control(job,'confirm'),/permission denied/);
  await assert.rejects(db.query('select review_catalog_product_v1($1,$2,$3)',[randomUUID(),{},'publish']),/permission denied/);
 }finally{await db.close();}
});

test('bounded worker imports inactive drafts, resumes, cancels, and returns durable results after a lost response',async()=>{
 const f=await fixture();const{db}=f;
 try{
  const rows=[];for(let n=0;n<23;n++)rows.push(await f.row(await f.offer(`Taladro ${n} 220V`)));
  const job=await f.create(rows);await f.control(job,'confirm');
  await assert.rejects(f.process(job,21),/maximum 20/);
  let report=await f.process(job);assert.equal(report.processed,20);assert.equal(report.counts.imported,20);assert.equal(report.counts.pending,3);
  await f.control(job,'pause');assert.equal((await f.process(job)).processed,0);await f.control(job,'resume');
  await db.exec('set role service_role');report=await f.process(job);assert.equal(report.state,'completed');assert.equal(report.counts.imported,23);
  assert.equal((await f.process(job)).processed,0);
  await db.exec('reset role');
  const products=(await db.query<{is_active:boolean;stock:number;fulfillment_mode:string;supplier_available:boolean;is_featured:boolean;image_url:null;image_urls:string[]}>('select is_active,stock,fulfillment_mode,supplier_available,is_featured,image_url,image_urls from products')).rows;
  assert.equal(products.length,23);for(const p of products)assert.deepEqual(p,{is_active:false,stock:0,fulfillment_mode:'supplier',supplier_available:false,is_featured:false,image_url:null,image_urls:[]});
  assert.equal((await db.query('select * from catalog_product_reviews')).rows.length,23);
  assert.equal((await db.query<{n:number}>('select count(*)::int n from product_costs where not expenses_confirmed')).rows[0].n,23);
  assert.equal((await db.query<{n:number}>("select count(*)::int n from supplier_offers where verification='pending'")).rows[0].n,23);
  const next=await f.create([await f.row(await f.offer('Cancelado 220V'))]);await f.control(next,'confirm');await f.control(next,'cancel');assert.equal((await f.process(next)).processed,0);await assert.rejects(f.control(next,'resume'),/cancelled/);
 }finally{await db.close();}
});

test('row savepoints roll back product, source link, costs and review; failed rows retry without touching successes',async()=>{
 const f=await fixture();const{db}=f;
 try{
  const good=await f.row(await f.offer('Bueno 220V'));const bad=await f.row(await f.offer('Costo roto 220V'));
  bad.payload.cost={...(bad.payload.cost as object),exchange_rate:-1};
  const job=await f.create([good,bad]);await f.control(job,'confirm');const report=await f.process(job);
  assert.equal(report.counts.imported,1);assert.equal(report.counts.failed,1);
  const items=await f.item(job);assert.equal(items[1].product_id,null);assert.match(items[1].error??'',/check constraint/);
  assert.equal((await db.query('select * from products')).rows.length,1);assert.equal((await db.query('select * from product_costs')).rows.length,1);assert.equal((await db.query('select * from catalog_product_reviews')).rows.length,1);
  assert.equal((await db.query<{product_id:null}>('select product_id from supplier_offers where id=$1',[bad.offer_id])).rows[0].product_id,null);
  // The immutable preview is intentionally invalid. A retry stays failed without mutating the successful row.
  await f.control(job,'retry_failed');await f.process(job);const retried=await f.item(job);assert.equal(retried[0].attempts,1);assert.equal(retried[1].attempts,2);
  const transient=await f.row(await f.offer('Falla transitoria 220V'));
  await db.exec("create function fail_catalog_cost_for_test() returns trigger language plpgsql as $$begin raise exception 'temporarily unavailable';end$$;create trigger fail_cost before insert on product_costs for each row execute function fail_catalog_cost_for_test()");
  const recover=await f.create([transient]);await f.control(recover,'confirm');assert.equal((await f.process(recover)).counts.failed,1);
  await db.exec('drop trigger fail_cost on product_costs');await f.control(recover,'retry_failed');assert.equal((await f.process(recover)).counts.imported,1);assert.equal((await f.item(recover))[0].attempts,2);
  assert.equal((await db.query('select * from products')).rows.length,2);
 }finally{await db.close();}
});

test('exact identities reuse one draft across suppliers, distinct variants remain separate, title collisions require review',async()=>{
 const f=await fixture();const{db}=f;
 try{
  const original=await f.row(await f.offer('GBH 2-26 220V','220v',f.suppliers[0]),'bosch gbh 2-26 220v new unit');
  const alternative=await f.row(await f.offer('Bosch rotary hammer GBH 2-26 220 V','220v',f.suppliers[1]),'bosch gbh 2-26 220v new unit');
  const otherVariant=await f.row(await f.offer('GBH 2-26 110V','110v',f.suppliers[2]),'bosch gbh 2-26 110v new unit');
  const first=await f.create([original]);await f.control(first,'confirm');await f.process(first);
  const second=await f.create([alternative,otherVariant]);await f.control(second,'confirm');assert.equal((await f.process(second)).counts.linked,1);
  const a=(await f.item(first))[0],b=await f.item(second);assert.equal(a.product_id,b[0].product_id);assert.notEqual(a.product_id,b[1].product_id);
  assert.equal((await db.query('select * from products')).rows.length,2);assert.equal((await db.query('select * from product_costs')).rows.length,2);
  const sameOffer=await f.create([original]);await f.control(sameOffer,'confirm');assert.equal((await f.process(sameOffer)).counts.linked,1);
  const collision=await f.row(await f.offer('GBH 2-26 220V'),'bosch unrelated kit 220v');const collisionJob=await f.create([collision]);await f.control(collisionJob,'confirm');assert.equal((await f.process(collisionJob)).counts.review,1);
  assert.match((await f.item(collisionJob))[0].error??'',/title or slug/);assert.equal((await db.query('select * from products')).rows.length,2);
  const slugCollision=await f.row(await f.offer('Another title 220V'));(slugCollision.payload.product as {slug:string}).slug=(original.payload.product as {slug:string}).slug;
  const slugJob=await f.create([slugCollision]);await f.control(slugJob,'confirm');assert.equal((await f.process(slugJob)).counts.review,1);
 }finally{await db.close();}
});

test('processing revalidates all source fields and commercial snapshots before catalog writes',async()=>{
 const f=await fixture();const{db}=f;
 try{
  const rows=[];for(const field of ['origin_cost','availability','title','variant_key','last_error']){
   const r=await f.row(await f.offer(`Cambio ${field} 220V`));rows.push(r);
   const values:Record<string,unknown>={origin_cost:11,availability:'out_of_stock',title:'changed',variant_key:'other',last_error:'timeout'};
   await db.query(`update supplier_offers set ${field}=$1 where id=$2`,[values[field],r.offer_id]);
  }
  const partial=await f.row(await f.offer('Snapshot incompleto 220V'));delete(partial.payload.offer as Record<string,unknown>).model;rows.push(partial);
  const job=await f.create(rows);await f.control(job,'confirm');assert.equal((await f.process(job)).counts.review,rows.length);assert.equal((await db.query('select * from products')).rows.length,0);
  const cfg=(await db.query<{id:string}>('select id from catalog_pricing_rules')).rows[0];
  const ruleRow=await f.row(await f.offer('Reglas cambiadas 220V'));const rules=await f.create([ruleRow],randomUUID(),{pricing_rule_id:cfg.id});
  await db.exec("insert into catalog_pricing_rules(config,created_at)values('{\"minimumMarginPercent\":25}',now()+interval '1 second')");await f.control(rules,'confirm');assert.equal((await f.process(rules)).counts.review,1);
  const policyRow=await f.row(await f.offer('Politica cambiada 220V'));const policies=await f.create([policyRow],randomUUID(),{import_policy_id:randomUUID()});await f.control(policies,'confirm');assert.equal((await f.process(policies)).counts.review,1);
  const trackingRow=await f.row(await f.offer('Configuracion cambiada 220V'));const tracking=await f.create([trackingRow],randomUUID(),{tracking_config:{old:true}});await f.control(tracking,'confirm');assert.equal((await f.process(tracking)).counts.review,1);
 }finally{await db.close();}
});

test('explicit links reuse transactional identity checks, require exact variants, preserve pending evidence and inventory',async()=>{
 const f=await fixture();const{db}=f;
 try{
  const product=randomUUID(),variant=randomUUID();
  await db.query("insert into products(id,title,slug,category_id,brand,model,stock,retail_price,is_active)values($1,'Bosch kit','existing',$2,'Bosch','Kit',7,888,true)",[product,category]);
  await db.query("insert into product_variants(id,product_id,title,options)values($1,$2,'220V','{\"Voltaje\":\"220V\"}')",[variant,product]);
  const oid=await f.offer('Bosch kit 220V');const productSnapshot={title:'Bosch kit',brand:'Bosch',model:'Kit'},variantSnapshot={title:'220V',options:{Voltaje:'220V'}};
  const target={productId:product,variantId:variant,productSnapshot,variantSnapshot};
  const r=await f.row(oid,undefined,{action:'link',target,link:{offerId:oid,...target,sourceTitle:'Bosch kit 220V',method:'exact_identity',reason:'Full identity',evidence:{}}});
  const job=await f.create([r]);await f.control(job,'confirm');assert.equal((await f.process(job)).counts.linked,1);
  assert.deepEqual((await db.query('select product_id,variant_id,verification from supplier_offers where id=$1',[oid])).rows[0],{product_id:product,variant_id:variant,verification:'pending'});
  assert.deepEqual((await db.query('select stock,retail_price,is_active from products where id=$1',[product])).rows[0],{stock:7,retail_price:'888',is_active:true});
  assert.equal((await db.query('select * from supplier_link_decisions')).rows.length,1);
  const changed=await f.row(await f.offer('Bosch kit 220V'),undefined,{action:'link',target:{...target,productSnapshot:{...productSnapshot,title:'Old title'}},link:{offerId:'',...target,productSnapshot:{...productSnapshot,title:'Old title'},sourceTitle:'Bosch kit 220V',method:'exact_identity'}});
  (changed.payload.link as {offerId:string}).offerId=changed.offer_id;
  const stale=await f.create([changed]);await f.control(stale,'confirm');assert.equal((await f.process(stale)).counts.failed,1);assert.match((await f.item(stale))[0].error??'',/Product identity changed/);
  const review=await f.row(await f.offer('Bosch kit 220V'),undefined,{action:'link',target,link:{...target,offerId:'',sourceTitle:'Bosch kit 220V',method:'admin_review',confirmed:false}});(review.payload.link as {offerId:string}).offerId=review.offer_id;
  const unconfirmed=await f.create([review]);await f.control(unconfirmed,'confirm');assert.equal((await f.process(unconfirmed)).counts.failed,1);assert.match((await f.item(unconfirmed))[0].error??'',/confirmation required/);
 }finally{await db.close();}
});

test('managed products publish only after explicit documentary approval, complete costs, fresh verified supply and current margin rules',async()=>{
 const f=await fixture();const{db}=f;
 try{
  const oid=await f.offer('Producto documental 220V');const r=await f.row(oid);const job=await f.create([r]);await f.control(job,'confirm');await f.process(job);
  const product=(await f.item(job))[0].product_id!;
  const review={identity_confirmed:true,costs_confirmed:true,media_authorized:true,compliance_confirmed:true,evidence:'Factura de origen, autorización de imágenes y revisión documental del producto exacto.'};
  const publish=()=>db.query('select review_catalog_product_v1($1,$2,$3)',[product,review,'publish']);
  await assert.rejects(db.query('update products set is_active=true where id=$1',[product]),/Documentary review/);
  await assert.rejects(publish(),/Meaningful description/);
  assert.equal((await db.query<{state:string}>('select state from catalog_product_reviews where product_id=$1',[product])).rows[0].state,'draft');
  await db.query("update products set description='Descripción documental completa del modelo, voltaje y contenido original autorizado.',image_url='https://images.test/authorized.jpg' where id=$1",[product]);
  await assert.rejects(publish(),/Complete fresh documented product costs/);
  await db.query('update product_costs set expenses_confirmed=true where product_id=$1',[product]);
  await assert.rejects(publish(),/Fresh verified available supplier offer/);
  await db.query("update supplier_offers set verification='verified' where id=$1",[oid]);
  await db.query("update supplier_offers set availability_checked_at=now()-interval '25 hours' where id=$1",[oid]);await assert.rejects(publish(),/Fresh verified/);
  await db.query('update supplier_offers set availability_checked_at=now() where id=$1',[oid]);
  await db.query("update product_costs set verified_at=now()-interval '25 hours' where product_id=$1",[product]);await assert.rejects(publish(),/Complete fresh/);await db.query('update product_costs set verified_at=now() where product_id=$1',[product]);
  await db.query('update products set retail_price=14 where id=$1',[product]);await assert.rejects(publish(),/Insufficient contribution/);await db.query('update products set retail_price=100 where id=$1',[product]);
  await db.exec("update catalog_pricing_rules set config='{}'");await assert.rejects(publish(),/Explicit current minimum margin/);
  await db.exec("update catalog_pricing_rules set config='{\"minimumMarginPercent\":20,\"categoryMargins\":{\"a1111111-1111-4111-8111-111111111111\":{\"minimum\":95}}}'");await assert.rejects(publish(),/Insufficient contribution/);
  await db.exec("update catalog_pricing_rules set config='{\"minimumMarginPercent\":20}'");
  await db.query("select review_catalog_product_v1($1,$2,'save')",[product,review]);assert.equal((await db.query<{is_active:boolean}>('select is_active from products where id=$1',[product])).rows[0].is_active,false);
  await db.exec('set role authenticated');await publish();
  assert.deepEqual((await db.query('select is_active,stock from products where id=$1',[product])).rows[0],{is_active:true,stock:0});
  await db.query("select review_catalog_product_v1($1,'{}','pause')",[product]);assert.equal((await db.query<{is_active:boolean}>('select is_active from products where id=$1',[product])).rows[0].is_active,false);
  await assert.rejects(db.query('update products set is_active=true where id=$1',[product]),/Documentary review/);
  await assert.rejects(db.query("update catalog_product_reviews set state='approved' where product_id=$1",[product]),/permission denied/);
  assert.ok((await db.query("select * from catalog_import_events where product_id=$1 and action='review_publish'",[product])).rows.length>0);
 }finally{await db.close();}
});
