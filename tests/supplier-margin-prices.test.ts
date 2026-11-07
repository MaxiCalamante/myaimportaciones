import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { projectSupplierMargin, syncSupplierMarginPrice, type MarginBase } from '../src/lib/supplier-margin-prices';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ImportPolicy } from '../src/lib/import-costs';
import type { TrackingConfig } from '../src/lib/supplier-automation';

const today = new Date().toISOString().slice(0,10);
const policy: ImportPolicy = { effectiveFrom: today, confirmed: true, notes: '', generalPercent: 20, volumePercent: 15, thresholdUsd: 1000, volumeConfirmed: false, mixedConfirmed: false, thresholdBase: 'shipment', reducedBase: 'all_eligible', carrierArsPerUsd: 1000, carrierFxDate: today, iphoneUsd: 25, tvUsd: {}, productUsd: {} };
const config: TrackingConfig = { enabled: true, autoStock: true, autoPrices: false, localMarginPrices: true, acquisitionArsPerUsd: 1000, acquisitionFxMode: 'manual', fxConfirmedOn: today, fxValidityHours: 72, roundArs: 100, maxPriceChangePercent: 20, shippingPaidByMya: false, shippingArs: 0, targetMarginPercent: 20, marketDiscountPercent: 10, freshnessHours: 24, marketFreshnessHours: 24, notes: '' };
const base: MarginBase = { retail: 100000, wholesale: 90000, policyId: 'qa', cost: { product_id: 'qa', origin_cost: 50, currency: 'USD', exchange_rate: 1000, freight_per_unit: 1000, other_landed_cost: 14000, variable_cost: 5000, payment_fee_percent: 5, minimum_contribution: 0, expenses_confirmed: true, source_document: 'Costo documentado QA', supplier_url: 'https://qa.test/1', verified_at: new Date().toISOString() } };
test('margen: conserva contribución porcentual por canal, separa pasador y gastos fijos, sin redondeo acumulado', () => {
  const q = projectSupplierMargin(base,55,config,policy,'Anua serum 50 ml','Anua');
  assert.deepEqual(q,{landed:71000,retail:108600,wholesale:97800});
  const margin = (sale:number,landed:number) => (sale*.95-landed-5000)/sale;
  assert(margin(q.retail,q.landed)>=margin(base.retail,65000));
  assert(margin(q.wholesale,q.landed)>=margin(base.wholesale,65000));
  assert.deepEqual(projectSupplierMargin(base,55,config,policy,'Anua serum 50 ml','Anua'),q);
  assert.equal(projectSupplierMargin(base,55,{...config,acquisitionArsPerUsd:1100},policy,'Anua serum 50 ml','Anua').landed,76500);
  assert.throws(()=>projectSupplierMargin({...base,cost:{...base.cost,expenses_confirmed:false}},55,config,policy,'Anua serum 50 ml','Anua'),/documental/);
  assert.throws(()=>projectSupplierMargin(base,55,{...config,fxConfirmedOn:'2000-01-01'},policy,'Anua serum 50 ml','Anua'),/vencida/);
  assert.throws(()=>projectSupplierMargin(base,55,config,{...policy,carrierFxDate:'2000-01-01'},'Anua serum 50 ml','Anua'),/vigencia/);
  assert.throws(()=>projectSupplierMargin({...base,wholesale:40000},55,config,policy,'Anua serum 50 ml','Anua'),/positivo/);
  assert.throws(()=>projectSupplierMargin(base,55,config,policy,'TV 55 pulgadas',''),/tarifa/);
});

test('margen: regla del dueño 100 USD + 20 USD = 120 USDT; no adopta ARS1600 ni duplica pasador incluido', () => {
  const c: TrackingConfig={...config,acquisitionFxMode:'usdt',usdtQuotedAt:new Date().toISOString(),localMarginCarrier:'goods_20pct_usdt'};
  const b: MarginBase={...base,cost:{...base.cost,other_landed_cost:10000}};
  const q=projectSupplierMargin(b,55,c,{...policy,carrierFxDate:'2000-01-01',carrierArsPerUsd:1600},'Anua serum 50 ml','Anua');
  assert.equal(q.landed,67000);
  const embedded: MarginBase={...base,cost:{...base.cost,origin_cost:60,other_landed_cost:0,source_document:'Flete pasador incluido en landed.'}};
  assert.equal(projectSupplierMargin(embedded,55,c,policy,'Anua serum 50 ml','Anua').landed,67000);
  assert.throws(()=>projectSupplierMargin(base,55,c,policy,'Anua serum 50 ml','Anua'),/Desglos/);
});

test('margen: una fuente o identidad cambiada después de guardar no habilita el ajuste de venta', async () => {
  const stamp=new Date().toISOString(), url='https://qa.test/123-anua.html', productId='11111111-1111-4111-8111-111111111111', offerId='22222222-2222-4222-8222-222222222222';
  const cost={...base.cost,product_id:productId,origin_cost:60,other_landed_cost:0,freight_per_unit:0,supplier_url:url,source_document:'Flete pasador incluido en landed.'};
  const tables:Record<string,unknown>={supplier_tracking_settings:{config:{...config,acquisitionFxMode:'usdt',usdtQuotedAt:stamp,localMarginCarrier:'goods_20pct_usdt'}},import_cost_policies:{id:'qa',config:policy},products:{id:productId,title:'Anua Serum 50 ml',brand:'Anua',model:'',sku:'',source_url:url,specifications:{},retail_price:100000,wholesale_price:90000,has_variants:false,fulfillment_mode:'supplier',is_active:true,deleted_at:null},product_costs:cost,supplier_margin_price_bases:null,supplier_offers:{id:offerId,product_id:productId,variant_id:null,title:'Anua Serum 50 ml',brand:'Anua',model:'',external_id:'123',variant_key:'attribute:0',source_url:url,origin_cost:55,currency:'USD',availability:'in_stock',verification:'verified',last_error:null,cost_checked_at:stamp,availability_checked_at:stamp,evidence:{sourceTitle:'Anua Serum 50 ml'}}};
  let writes=0;
  const db={from(name:string){const q={select(){return q;},eq(){return q;},order(){return q;},limit(){return q;},single(){return Promise.resolve({data:tables[name],error:null});},maybeSingle(){return q.single();}};return q;},async rpc(){writes++;return{data:{status:'applied',reason:'QA',retail:110000,wholesale:99000},error:null};}} as unknown as SupabaseClient;
  const expected={title:'Anua Serum 50 ml',originCost:55,at:stamp,url};
  assert.equal((await syncSupplierMarginPrice(db,productId,offerId,null,expected)).status,'applied');
  assert.equal(writes,1);
  assert.equal((await syncSupplierMarginPrice(db,productId,offerId,null,{...expected,originCost:54})).status,'blocked');
  (tables.supplier_offers as {evidence:unknown}).evidence={sourceTitle:'Otro producto 100 ml'};
  assert.equal((await syncSupplierMarginPrice(db,productId,offerId,null,expected)).status,'blocked');
  assert.equal(writes,1);
});

test('margen en PostgreSQL: privado, transaccional, idempotente, sin inventario ni sobrescritura de edición manual', async () => {
  const db = new PGlite();
  const pid='11111111-1111-4111-8111-111111111111',oid='22222222-2222-4222-8222-222222222222',pol='33333333-3333-4333-8333-333333333333';
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create table products(id uuid primary key,title text,brand text,is_active boolean default true,deleted_at timestamptz,has_variants boolean default false,fulfillment_mode text default 'supplier',retail_price numeric,wholesale_price numeric,stock integer default 7,updated_at timestamptz);
      create table supplier_offers(id uuid primary key,product_id uuid,variant_id uuid,verification text,currency text,origin_cost numeric,availability text,last_error text,cost_checked_at timestamptz,availability_checked_at timestamptz,evidence jsonb,source_url text,title text);
      create table product_variants(id uuid primary key,product_id uuid);
      create table product_costs(product_id uuid primary key,supplier_url text,expenses_confirmed boolean,currency text,origin_cost numeric);
      create table supplier_tracking_settings(id boolean primary key,config jsonb);
      create table import_cost_policies(id uuid primary key,config jsonb,created_at timestamptz default now());`);
    await db.exec(readFileSync('supabase/migrations/20261105170000_supplier_margin_prices.sql','utf8'));
    await db.exec(readFileSync('supabase/migrations/20261105173000_supplier_margin_review_baseline.sql','utf8'));
    await db.query('insert into products(id,title,brand,retail_price,wholesale_price) values($1,$2,$3,100000,80000)',[pid,'QA Serum 50 ml','QA']);
    await db.query(`insert into supplier_offers values($1,$2,null,'verified','USD',55,'in_stock',null,now(),now(),'{}','https://qa.test/1','QA Serum 50 ml')`,[oid,pid]);
    await db.query(`insert into product_costs values($1,'https://qa.test/1',true,'USD',50)`,[pid]);
    await db.query('insert into supplier_tracking_settings values(true,$1)',[config]);
    await db.query('insert into import_cost_policies(id,config) values($1,$2)',[pol,policy]);
    const cost=(await db.query<{cost:object}>('select to_jsonb(c) cost from product_costs c')).rows[0].cost;
    const offer=(await db.query<{offer:object}>(`select jsonb_build_object('source_url',source_url,'origin_cost',origin_cost,'cost_checked_at',cost_checked_at,'availability_checked_at',availability_checked_at,'sourceTitle',title) offer from supplier_offers`)).rows[0].offer;
    const payload={productId:pid,offerId:oid,identity:{title:'QA Serum 50 ml',brand:'QA'},cost,config,policyId:pol,policyConfig:policy,base:{retail:100000,wholesale:80000,cost,policyId:pol,policyConfig:policy},quote:{retail:110000,wholesale:88000,landed:66000},offer};
    const apply=async(p:unknown=payload)=>(await db.query<{result:{status:string}}>('select apply_supplier_margin_price_v1($1) result',[p])).rows[0].result;
    for (const role of ['anon','authenticated']) {
      await db.exec('set role '+role);
      await assert.rejects(apply(),/permission denied/);
      await assert.rejects(db.query('select * from supplier_margin_price_bases'),/permission denied/);
      await assert.rejects(db.query('select * from supplier_margin_price_events'),/permission denied/);
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    assert.equal((await apply({...payload,identity:{title:'Otro producto',brand:'QA'}})).status,'blocked');
    assert.equal((await apply({...payload,quote:{...payload.quote,retail:130000}})).status,'review');
    await db.exec('reset role');
    assert.equal((await db.query('select * from supplier_margin_price_bases')).rows.length,1);
    assert.equal((await db.query('select * from supplier_margin_price_events')).rows.length,0);
    await db.exec('set role service_role');
    assert.equal((await apply()).status,'applied');
    assert.equal((await apply()).status,'unchanged');
    await db.exec('reset role');
    assert.deepEqual((await db.query('select retail_price,wholesale_price,stock from products')).rows[0],{retail_price:'110000',wholesale_price:'88000',stock:7});
    assert.equal((await db.query('select * from supplier_margin_price_events')).rows.length,1);
    assert.deepEqual((await db.query<{cost:object}>('select to_jsonb(c) cost from product_costs c')).rows[0].cost,cost);
    await db.exec('update products set retail_price=111000;set role service_role');
    assert.equal((await apply()).status,'blocked');
    await db.exec(`reset role;update products set retail_price=110000;update supplier_offers set availability='out_of_stock';set role service_role`);
    assert.equal((await apply()).status,'blocked');
    await db.exec(`reset role;update supplier_offers set availability='in_stock',cost_checked_at=now()-interval '16 minutes';set role service_role`);
    assert.equal((await apply()).status,'blocked');
  } finally { await db.close(); }
});
