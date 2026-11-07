import{PGlite}from'@electric-sql/pglite';import{readFileSync}from'node:fs';import{randomUUID}from'node:crypto';
const migration=readFileSync('supabase/migrations/20261106163233_four_supplier_tracker.sql','utf8');
export async function trackerFixture(cloud=false,dataDir?:string){const db=new PGlite(dataDir);await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid()returns uuid language sql as $$select null::uuid$$;
 create function is_admin()returns boolean language sql as $$select coalesce(current_setting('test.admin',true),'false')='true'$$;
 create table suppliers(id uuid primary key,name text,website text,official_key text,is_active boolean default true,automation_authorized boolean default true);
 create table categories(id uuid primary key,name text);
 create table products(id uuid primary key,title text,fulfillment_mode text default 'supplier',source_url text,stock integer default 0,is_active boolean default true,deleted_at timestamptz);
 create table product_variants(id uuid primary key,product_id uuid references products,fulfillment_mode text default 'supplier',stock integer default 0,is_active boolean default true);
 create table supplier_offers(id uuid primary key,supplier_id uuid references suppliers,product_id uuid references products,variant_id uuid references product_variants,external_id text,verification text,source_url text,origin_cost numeric,availability text,cost_checked_at timestamptz,availability_checked_at timestamptz);
 create table supplier_source_slots(supplier_id uuid primary key references suppliers,next_at timestamptz);
 create table supplier_sync_queue(id uuid primary key,supplier_id uuid,state text,leased_until timestamptz,last_error text);
 create table supplier_discovery_jobs(id uuid primary key,supplier_id uuid,state text,leased_until timestamptz,last_error text);
 create table orders(id uuid primary key,total numeric);insert into orders values(gen_random_uuid(),100);
 create schema cron;create table cron.job(jobid integer,jobname text);create function cron.unschedule(integer)returns boolean language sql as $$select true$$;
 `);const ids=[randomUUID(),randomUUID(),randomUUID(),randomUUID(),randomUUID()];for(const[i,key]of ['atacado-usa','star-company','total','atacado-connect','neo-import'].entries())await db.query('insert into suppliers values($1,$2,$3,$2)',[ids[i],key,`https://${['atacadousa.com.py','www.starcompany-py.com','www.totalherramientasoficial.com.py','atacadoconnect.com','neoimport.net'][i]}/`]);
 await db.exec(migration);await db.exec(readFileSync('supabase/migrations/20261106171927_supplier_tracker_recommendations.sql','utf8'));await db.exec(readFileSync('supabase/migrations/20261106172921_supplier_tracker_monitor_evidence.sql','utf8'));await db.exec(readFileSync('supabase/migrations/20261106204442_supplier_tracker_identity_review.sql','utf8'));if(cloud){await db.exec(`
 create table supplier_cloud_ticks(job text constraint supplier_cloud_ticks_job_check check(job in('sync','details','market','plan')));
 create function enqueue_supplier_cloud_tick_v1(job_input text)returns void language plpgsql as $$begin if job_input not in('sync','details','market','plan')then raise exception 'Invalid';end if;insert into supplier_cloud_ticks values(job_input);end$$;
 create function cron.schedule(text,text,text)returns bigint language sql as $$select 1::bigint$$;
 create function supplier_checkout_basis_v1(product_input uuid,variant_input uuid,price_input numeric,discount_input numeric)returns jsonb language plpgsql as $$declare s suppliers;o supplier_offers;begin select * into s from suppliers where id=o.supplier_id;return null;end$$;
 create table catalog_import_items(id uuid default gen_random_uuid(),job_id uuid,offer_id uuid,position integer,payload jsonb);
 `);await db.exec(readFileSync('supabase/migrations/20261106170028_supplier_tracker_cloud_schedule.sql','utf8'));}await db.exec("select set_config('test.admin','true',false)");const category=randomUUID();await db.query("insert into categories values($1,'QA')",[category]);
 const source=async()=>{await db.exec('reset role');return(await db.query<{id:string}>('select tracker_save_source_v1($1)id',[{supplierId:ids[0],url:'https://atacadousa.com.py/categoria/cosmeticos',kind:'category',label:'QA',discoverySeconds:86400,monitorSeconds:21600,exclusions:[],autoImport:false}])).rows[0].id;};
 const start=async(id:string)=>{await db.exec('set role service_role');return(await db.query<{id:string}>('select tracker_start_source_v1($1)id',[id])).rows[0].id;};
 const claim=async()=>{await db.exec("reset role;update supplier_source_slots set next_at=now()-interval '1 second';set role service_role");return(await db.query<{id:string;lease_token:string}>('select *from tracker_claim_tasks_v1(4)')).rows;};
 const page=async(t:{id:string;lease_token:string},suffix:string,pages:string[]=[])=>db.query('select tracker_record_page_v1($1,$2,$3)',[t.id,t.lease_token,{products:[{externalId:suffix,title:'QA '+suffix,url:'https://atacadousa.com.py/produto/'+suffix,cost:10,currency:'USD',normalizedUsd:'10',availability:'unknown'}],pages,contentHash:suffix.padStart(64,'0')}]);
 return{db,ids,category,source,start,claim,page};}
