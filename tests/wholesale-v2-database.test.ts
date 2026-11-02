import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {DRAFT_WHOLESALE_POLICY} from '../src/lib/wholesale-v2';
const migration=readFileSync('supabase/migrations/20261102153626_wholesale_v2_policy_quotes.sql','utf8');
const pid='11111111-1111-4111-8111-111111111111',vid='22222222-2222-4222-8222-222222222222',sid='33333333-3333-4333-8333-333333333333';
const policy={...DRAFT_WHOLESALE_POLICY,confirmed:true,minimumMarginPercent:20,targetMarginPercent:30,paymentFees:{mercado_pago:10,transferencia:0},riskPercent:0,fixedUnitArs:0,transferDiscountPercent:3,maxPriceChangePercent:100};
async function fixture(){
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create function auth.uid()returns uuid language sql as $$select '44444444-4444-4444-8444-444444444444'::uuid$$;
 create function is_admin()returns boolean language sql as $$select coalesce(current_setting('test.admin',true),'false')='true'$$;
 create table products(id uuid primary key,title text,category_id uuid,brand text,description text,image_url text,image_urls text[] default '{}',is_active boolean default true,deleted_at timestamptz,has_variants boolean default false,retail_price numeric,wholesale_price numeric,stock integer default 0,stock_verified_at timestamptz,fulfillment_mode text default 'supplier',supplier_available boolean default true,updated_at timestamptz);
 create table product_variants(id uuid primary key,product_id uuid references products,is_active boolean default true,retail_price numeric,wholesale_price numeric,stock integer default 0,stock_verified_at timestamptz,fulfillment_mode text default 'supplier',supplier_available boolean default true,updated_at timestamptz);
 create table suppliers(id uuid primary key,is_active boolean default true,freshness_hours integer default 24);
 create table supplier_offers(id uuid primary key default gen_random_uuid(),product_id uuid,variant_id uuid,supplier_id uuid,verification text,availability text,last_error text,origin_cost numeric,currency text,source_url text,cost_checked_at timestamptz,availability_checked_at timestamptz,evidence jsonb default '{}');
 create table product_costs(product_id uuid primary key,origin_cost numeric,currency text,exchange_rate numeric,freight_per_unit numeric,other_landed_cost numeric,landed_cost numeric generated always as(origin_cost*exchange_rate+freight_per_unit+other_landed_cost)stored,variable_cost numeric,payment_fee_percent numeric,minimum_contribution numeric,supplier_url text,source_document text,expenses_confirmed boolean default false,verified_at timestamptz);
 create table supplier_tracking_settings(id boolean primary key,config jsonb);
 insert into supplier_tracking_settings values(true,jsonb_build_object('acquisitionArsPerUsd',1000,'acquisitionFxMode','usdt','usdtQuotedAt',now()));
 insert into suppliers(id)values('${sid}');
 insert into products(id,title,brand,description,image_url,retail_price,wholesale_price)values('${pid}','Equipo QA 50 ml','QA','Descripción comprobada del fabricante para el equipo QA de prueba exacto.','https://example.test/qa.jpg',100000,30000);
 insert into product_variants(id,product_id,retail_price,wholesale_price)values('${vid}','${pid}',100000,30000);
 insert into product_costs values('${pid}',10,'USD',1000,1000,1000,default,500,5,100,'https://supplier.test/qa','Factura y gastos completos verificados',true,now());
 insert into supplier_offers(product_id,supplier_id,verification,availability,origin_cost,currency,source_url,cost_checked_at,availability_checked_at)values('${pid}','${sid}','verified','in_stock',10,'USD','https://supplier.test/qa',now(),now());
 grant usage on schema auth to authenticated,service_role;grant select,update on products,product_variants to service_role;grant select on suppliers,supplier_offers,product_costs,supplier_tracking_settings to service_role;`);
 await db.exec(migration);await db.exec("select set_config('test.admin','true',false)");
 const save=async(config=policy)=>(await db.query<{id:string}>('select save_wholesale_policy_v1($1)id',[config])).rows[0].id;
 const control=async(variant:string|null=null,extra:object={})=>db.query('select save_wholesale_control_v1($1,$2,$3)',[pid,variant,{enabled:true,identityConfirmed:true,eligibilityConfirmed:true,mediaAuthorized:true,complianceConfirmed:true,evidence:'Identidad, costos, material y documentación revisados.',...extra}]);
 const quote=async(quantity=1,payment='mercado_pago',variant:string|null=null)=>(await db.query<{b:Record<string,unknown>}>('select wholesale_quote_basis_v1($1,$2,$3,$4)b',[pid,variant,quantity,payment])).rows[0].b;
 return{db,save,control,quote};
}
test('public projection exposes prices and minimums without private finance or cost access',async()=>{
 const f=await fixture(),{db}=f;try{
  await f.save();await f.control();await db.exec('set role anon');
  const p=(await db.query<{p:object}>('select wholesale_public_policy_v1()p')).rows[0].p;assert.deepEqual(p,{minAmountArs:100000,minUnits:5});
  const r=(await db.query<{r:Array<Record<string,unknown>>}>('select wholesale_public_offers_v1($1)r',[[{productId:pid}]])).rows[0].r[0];
  assert.equal(r.status,'ready');assert.equal(r.unitPrice,20900);
  assert.deepEqual(Object.keys(r).sort(),['productId','variantId','unitPrice','status','reason','tiers','validUntil','policyId'].sort());
  assert.doesNotMatch(JSON.stringify(r),/supplier|origin_cost|landed_cost|minimum_margin|fee_percent|source_url/);
  for(const table of ['wholesale_v2_policies','wholesale_product_controls','wholesale_variant_costs','wholesale_price_events','product_costs'])await assert.rejects(db.query(`select * from ${table}`),/permission denied/);
  await assert.rejects(f.quote(),/permission denied/);await assert.rejects(f.save(),/permission denied/);
  await db.exec('reset role;set role authenticated');await db.exec("select set_config('test.admin','false',false)");
  assert.equal((await db.query('select * from wholesale_v2_policies')).rows.length,0);await assert.rejects(f.save(),/Forbidden/);
 }finally{await db.close();}
});
test('missing policy, unconfirmed expenses, expired source and variants never become firm prices',async()=>{
 const f=await fixture(),{db}=f;try{
  await f.control();assert.equal((await f.quote()).status,'review');await f.save();
  await db.exec('update product_costs set expenses_confirmed=false');assert.equal((await f.quote()).unit_price,null);
  await db.exec("update product_costs set expenses_confirmed=true;update supplier_offers set availability_checked_at=now()-interval '2 days'");assert.equal((await f.quote()).status,'review');
  await db.exec('update supplier_offers set availability_checked_at=now()');assert.equal((await f.quote()).status,'ready');
  await db.exec('update products set has_variants=true');await f.control(vid);const variant=await f.quote(1,'mercado_pago',vid);assert.equal(variant.status,'review');assert.match(String(variant.reason),/Costo completo/);
  assert.equal((await f.quote()).status,'review');
 }finally{await db.close();}
});
test('fees, tiers and transfer discount retain minimum margin; frozen loss-making price is blocked',async()=>{
 const f=await fixture(),{db}=f;try{
  await f.save({...policy,quantityMargins:[{minQty:12,targetMarginPercent:20}]});await f.control();
  const mp=await f.quote(),transfer=await f.quote(1,'transferencia'),tier=await f.quote(12);
  assert.equal(mp.unit_price,20900);assert.ok(Number(transfer.unit_price)<Number(mp.unit_price));assert.equal(tier.unit_price,17900);
  await f.control(null,{freeze:true,fixedPrice:12000});const frozen=await f.quote();assert.equal(frozen.status,'review');assert.equal(frozen.unit_price,null);
  await f.control(null,{fixedPrice:25000});assert.equal((await f.quote()).status,'ready');
  await assert.rejects(f.save({...policy,quantityMargins:[{minQty:12,targetMarginPercent:10}]}),/below minimum/);
  await db.exec("update supplier_tracking_settings set config=jsonb_set(config,'{acquisitionArsPerUsd}','10000')");assert.equal((await f.quote()).status,'review');
 }finally{await db.close();}
});
test('hosted refresh is disabled until approved and never modifies retail, inventory or publication',async()=>{
 const f=await fixture(),{db}=f;try{
  await f.save();await f.control();await db.exec('set role service_role');
  assert.deepEqual((await db.query<{r:object}>('select refresh_wholesale_prices_v1()r')).rows[0].r,{enabled:false,checked:0,applied:0});
  await db.exec('reset role');await f.save({...policy,autoUpdate:true});await f.control();await db.exec('set role service_role');
  const refreshed=(await db.query<{r:{applied:number}}>('select refresh_wholesale_prices_v1()r')).rows[0].r;assert.equal(refreshed.applied,1);
  const product=(await db.query('select retail_price,wholesale_price,stock,is_active from products')).rows[0];assert.deepEqual(product,{retail_price:'100000',wholesale_price:'20900',stock:0,is_active:true});
 }finally{await db.close();}
});
