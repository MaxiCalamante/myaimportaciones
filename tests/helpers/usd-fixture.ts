import{PGlite}from'@electric-sql/pglite';import{readFileSync}from'node:fs';import{randomUUID}from'node:crypto';
export async function usdFixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid()returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;`);
 const schema=readFileSync('supabase/schema.sql','utf8');await db.exec(schema.slice(schema.indexOf('do $$'),schema.indexOf('create or replace function public.handle_new_user')));
 await db.exec(`create function is_admin()returns boolean language sql as $$select coalesce(current_setting('test.admin',true),'false')='true'$$;`);
 for(const name of ['20260921134833_retail_integrity.sql','20260921185112_catalog_identity.sql','20260922140934_supplier_fulfillment.sql','20261019150000_product_variants_system.sql','20261022133000_product_soft_delete_and_recycle_bin.sql'])await db.exec(readFileSync(`supabase/migrations/${name}`,'utf8'));
 await db.exec(`alter table products add column supplier_last_checked_at timestamptz;create table suppliers(id uuid primary key,name text,is_active boolean default true,freshness_hours integer default 24);
 create table supplier_offers(id uuid primary key,supplier_id uuid references suppliers,product_id uuid references products,variant_id uuid references product_variants,title text,source_url text,origin_cost numeric,currency text,availability text,verification text,cost_checked_at timestamptz,availability_checked_at timestamptz,last_error text,evidence jsonb default '{}');
 create table supplier_tracking_settings(id boolean primary key,config jsonb);
 grant select on products,product_variants,product_costs,suppliers,supplier_offers to service_role;
 grant all on orders,order_items to service_role;grant usage on schema auth to service_role,authenticated;`);
 for(const name of ['20261101025508_supplier_checkout_operations.sql','20261102153626_wholesale_v2_policy_quotes.sql','20261102153820_wholesale_v2_checkout.sql','20261106154701_usd_base_pricing.sql'])await db.exec(readFileSync(`supabase/migrations/${name}`,'utf8'));
 const id=randomUUID(),category=randomUUID();
 await db.query('insert into categories(id,name,slug)values($1,\'Test\',\'test\')',[category]);
 await db.query("insert into products(id,category_id,title,slug,retail_price,wholesale_price,stock,stock_verified_at)values($1,$2,'QA','qa',58000,40000,10,now())",[id,category]);
 await db.query("insert into product_costs(product_id,origin_cost,currency,exchange_rate,freight_per_unit,other_landed_cost,variable_cost,payment_fee_percent,minimum_contribution,expenses_confirmed,verified_at)values($1,10,'USD',1400,0,0,0,0,1,true,now())",[id]);
 await db.exec("update store_money_settings set minimum_margin=10,retail_margin=30,wholesale_margin=20;select set_config('test.admin','true',false)");
 const rate=async(value=1450)=>{await db.exec('set role service_role');const c=(await db.query<{r:{token:string}}>('select claim_store_exchange_refresh_v1(true)r')).rows[0].r;
 await db.query('select finish_store_exchange_refresh_v1($1,$2,now(),null)',[c.token,value]);await db.exec('reset role');return(await db.query<{id:string}>('select id from store_exchange_rates order by fetched_at desc,id desc limit 1')).rows[0].id;};
 const rateId=await rate();
 await db.query("select migrate_product_usd_v1($1,null,$2,$3,true)",[id,rateId,{currency:'ARS',retail:58000,wholesale:40000}]);
 const payload={payment:'transferencia',items:[{id,quantity:1,price:58000,channel:'retail'}],subtotal:58000,discount:0,shipping:0,total:58000,shipping_option:'pickup',promotion:''};
 const customer={request_id:randomUUID(),request_hash:'hash',name:'QA Test',email:'qa@example.test',phone:'123',address:'pickup',notes:''};
 async function quote(){await db.exec('set role service_role');const prices=(await db.query<{r:unknown}>('select store_checkout_prices_v1($1,\'transferencia\',$2)r',[[{productId:id,quantity:1,channel:'retail'}],rateId])).rows[0].r;
 const q=(await db.query<{id:string}>('insert into store_checkout_quotes(fingerprint,rate_id,payload,prices,expires_at)values(\'fingerprint\',$1,$2,$3,now()+interval \'15 minutes\')returning id',[rateId,payload,prices])).rows[0].id;return q;}
 return{db,id,rateId,rate,quote,payload,customer,create:async(q:string,c=customer)=>(await db.query<{r:{id:string;total_amount:number;exchange_snapshot:{rate:string}}}>('select create_store_order_v1($1,\'fingerprint\',$2)r',[q,c])).rows[0].r};
}
