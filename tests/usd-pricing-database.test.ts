import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DRAFT_WHOLESALE_POLICY} from '../src/lib/wholesale-v2';
import{usdFixture as fixture}from'./helpers/usd-fixture';
test('USD migration backs up ARS, preserves old columns, projects exact new ARS and protects legacy edits',async()=>{
 const f=await fixture();try{
  const p=(await f.db.query<{original_prices:{currency:string};retail_usd:string}>('select * from product_usd_prices')).rows[0];assert.equal(p.retail_usd,'40.000000');assert.equal(p.original_prices.currency,'ARS');
  assert.equal((await f.db.query<{retail_price:string}>('select retail_price from products')).rows[0].retail_price,'58000.00');
  await f.rate(1500);const rows=(await f.db.query<{r:Array<{retailArs:number;retailUsd:string}>}>('select store_usd_prices_v1($1)r',[[f.id]])).rows[0].r;assert.equal(rows[0].retailArs,60000);assert.equal(rows[0].retailUsd,'40.000000');
  await assert.rejects(f.db.exec('update products set retail_price=1'),/usa USD/);
  await f.db.exec('set role anon');await assert.rejects(f.db.exec('select cost_basis from product_usd_prices'),/permission/);assert.equal((await f.db.query('select store_exchange_public_v1()')).rows.length,1);
 }finally{await f.db.close();}
});
test('accepted quote freezes FX, saves USD and ARS, reserves once, and historical orders remain unchanged',async()=>{
 const f=await fixture();try{
  f.payload.payment='mercado_pago';const q=await f.quote();await f.db.exec('reset role');await f.rate(1500);await f.db.exec('set role service_role');
  const o=await f.create(q);assert.equal(Number(o.total_amount),58000);assert.equal(o.exchange_snapshot.rate,'1450.000000');
  assert.equal((await f.create(q)).id,o.id);
  const item=(await f.db.query<{unit_price:string;base_unit_usd:string}>('select unit_price,base_unit_usd from order_items where order_id=$1',[o.id])).rows[0];assert.equal(Number(item.unit_price),58000);assert.equal(Number(item.base_unit_usd),40);
  const stock=(await f.db.query<{stock:number}>('select stock from products')).rows[0].stock;assert.equal(stock,9);
  await f.db.query("select reconcile_retail_payment_v2($1,'test-payment',58000,'approved')",[o.id]);
  await f.db.query("select reconcile_retail_payment_v2($1,'test-payment',58000,'approved')",[o.id]);assert.equal((await f.db.query<{stock:number}>('select stock from products')).rows[0].stock,9);
 }finally{await f.db.close();}
});
test('expired and tampered quotes, changed USD revisions, missing costs and margin violations block payment',async()=>{
 const f=await fixture();try{
  const q=await f.quote();await assert.rejects(f.db.query("select create_store_order_v1($1,'wrong',$2)",[q,f.customer]),/vencida|modificada/);
  await f.db.exec('reset role');await f.db.query("update store_checkout_quotes set expires_at=now()-interval '1 second' where id=$1",[q]);await f.db.exec('set role service_role');await assert.rejects(f.create(q),/vencida/);
  await f.db.exec('reset role');await f.db.exec('update product_costs set expenses_confirmed=false');await assert.rejects(f.quote(),/costs/);
  await f.db.exec('reset role');await f.db.exec('update product_costs set expenses_confirmed=true,origin_cost=100');await assert.rejects(f.quote(),/margin/);
  assert.equal((await f.db.query<{n:number}>('select count(*)::int n from orders')).rows[0].n,0);
 }finally{await f.db.close();}
});
test('rate cache leases, manual emergency, stale source and settings changes are explicit and protected',async()=>{
 const f=await fixture();try{
  await f.db.exec('set role service_role');
  assert.deepEqual((await f.db.query<{r:object}>('select claim_store_exchange_refresh_v1(false)r')).rows[0].r,{});
  await f.db.exec('reset role');
  const q=await f.quote();await f.db.exec('reset role');
  await f.db.query("select store_manual_rate_v1(1500,2,'Emergencia documentada QA')");
  let pub=(await f.db.query<{r:{source:string;status:string;rate:string}}>('select store_exchange_public_v1()r')).rows[0].r;assert.equal(pub.source,'manual');assert.equal(pub.status,'valid');
  await f.db.exec("update store_exchange_rates set expires_at=now()-interval '1 second'");pub=(await f.db.query<{r:typeof pub}>('select store_exchange_public_v1()r')).rows[0].r;assert.equal(pub.status,'stale');assert.equal(pub.rate,'1500.000000');
  await f.db.exec('set role service_role');
  await assert.rejects(f.db.query('select store_checkout_prices_v1($1,\'transferencia\',$2)',[[{productId:f.id,quantity:1,channel:'retail'}],f.rateId]),/expired/);
  await f.db.exec('reset role');await f.db.exec('update store_money_settings set version=version+1');await f.db.exec('set role service_role');await assert.rejects(f.create(q),/configuración/);
  await f.db.exec('reset role;set role anon');await assert.rejects(f.db.query("select store_manual_rate_v1(1,2,'Unauthorized change')"),/permission/);
 }finally{await f.db.close();}
});
test('automatic USD prices use documented acquisition and carrier FX separately and preserve manual channel overrides',async()=>{
 const f=await fixture();try{
  const stamp=new Date().toISOString(),supplier=randomUUID(),offer=randomUUID();
  const b={confirmed:true,currency:'USD',origin:10,unitsPerUsd:1,fxEvidence:'Factura proveedor USD',fxAt:stamp,acquisitionArs:1400,acquisitionAt:stamp,carrierPercent:20,carrierFixedUsd:0,carrierArs:1600,carrierAt:stamp,extraUsd:0,extraArs:0,feePercent:0,variableArs:0,minimumContribution:1,supplierUrl:'https://qa.test/exact',document:'Factura y gastos de importación de la presentación exacta'};
  await f.db.exec('update store_money_settings set max_change=100');
  await f.db.query('select save_product_usd_v1($1,null,$2,$3)',[f.id,{revision:1,retailUsd:'40',wholesaleUsd:'15.50',retailSource:'automatic',wholesaleSource:'manual',retailMargin:30,wholesaleMargin:10,costBasis:b},'Configurar costo USD y canales QA']);
  await f.db.query("insert into suppliers(id,name)values($1,'QA')",[supplier]);
  await f.db.query("insert into supplier_offers(id,supplier_id,product_id,origin_cost,currency,source_url,verification,availability,cost_checked_at,availability_checked_at)values($1,$2,$3,11,'USD','https://qa.test/exact','verified','in_stock',now(),now())",[offer,supplier,f.id]);
  await f.db.exec('set role service_role');
  assert.equal((await f.db.query<{r:{status:string}}>('select store_refresh_supplier_usd_v1($1)r',[offer])).rows[0].r.status,'applied');
  const p=(await f.db.query<{retail_usd:string;wholesale_usd:string;total_cost_usd:string}>('select * from product_usd_prices')).rows[0];assert.equal(p.retail_usd,'19.310000');assert.equal(p.wholesale_usd,'15.500000');assert.equal(p.total_cost_usd,'13.514286');
  assert.equal((await f.db.query<{stock:number}>('select stock from products')).rows[0].stock,10);
  await f.db.exec('reset role');await f.db.exec("update supplier_offers set currency='PYG'");await f.db.exec('set role service_role');assert.equal((await f.db.query<{r:{status:string}}>('select store_refresh_supplier_usd_v1($1)r',[offer])).rows[0].r.status,'review');
  await assert.rejects(f.db.query('select store_cost_usd_v1($1)',[{...b,currency:'PYG',unitsPerUsd:7000,fxEvidence:''}]),/permission/);
  await f.db.exec('reset role');await assert.rejects(f.db.query('select store_cost_usd_v1($1)',[{...b,currency:'PYG',unitsPerUsd:7000,fxEvidence:''}]),/evidence/);
 }finally{await f.db.close();}
});
test('public wholesale keeps eligibility, quantity tiers, payment benefit, minimums and independent USD prices',async()=>{
 const f=await fixture();try{
  const policy={...DRAFT_WHOLESALE_POLICY,confirmed:true,minimumMarginPercent:10,targetMarginPercent:30,paymentFees:{mercado_pago:0,transferencia:0},riskPercent:0,fixedUnitArs:0,transferDiscountPercent:3,maxPriceChangePercent:100,quantityMargins:[{minQty:5,targetMarginPercent:20}]};
  await f.db.exec("update products set description='Descripción documentada para la presentación exacta del producto de prueba.',image_url='https://qa.test/image.jpg';update product_costs set source_document='Factura QA y gastos confirmados';insert into supplier_tracking_settings values(true,jsonb_build_object('acquisitionArsPerUsd',1400,'acquisitionFxMode','usdt','usdtQuotedAt',now()))");
  await f.db.query('select save_wholesale_policy_v1($1)',[policy]);
  await f.db.query('select save_wholesale_control_v1($1,null,$2)',[f.id,{enabled:true,identityConfirmed:true,eligibilityConfirmed:true,mediaAuthorized:true,complianceConfirmed:true,evidence:'Identidad, costos y documentación revisados para QA.'}]);
  await f.db.exec('set role service_role');
  const prices=(await f.db.query<{r:Array<{price:number;basis:{status:string;unit_price:number}}>}>('select store_checkout_prices_v1($1,\'transferencia\',$2)r',[[{productId:f.id,quantity:5,channel:'wholesale'}],f.rateId])).rows[0].r;
  assert.equal(prices[0].basis.status,'ready');assert.equal(prices[0].price,34000);
  const payload={...f.payload,items:[{id:f.id,quantity:5,price:34000,channel:'wholesale'}],subtotal:170000,total:170000};
  const q=(await f.db.query<{id:string}>("insert into store_checkout_quotes(fingerprint,rate_id,payload,prices,expires_at)values('fingerprint',$1,$2,$3,now()+interval '15 minutes')returning id",[f.rateId,payload,prices])).rows[0].id;
  assert.equal(Number((await f.create(q)).total_amount),170000);
  await f.db.exec('reset role;set role anon');
  const offers=(await f.db.query<{r:Array<Record<string,unknown>>}>('select wholesale_public_offers_v1($1)r',[[{productId:f.id,quantity:1}]])).rows[0].r;assert.equal(offers[0].status,'ready');assert.ok(!JSON.stringify(offers).includes('cost_basis'));
 }finally{await f.db.close();}
});
