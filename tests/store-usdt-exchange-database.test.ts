import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {usdFixture} from './helpers/usd-fixture';

async function fixture(){
 const f=await usdFixture();
 await f.db.exec('alter table supplier_tracking_settings add column updated_at timestamptz;');
 const supplierMigration=readFileSync('supabase/migrations/20261029180902_supplier_usdt_pricing.sql','utf8');
 await f.db.exec(supplierMigration.slice(0,supplierMigration.indexOf('create function public.enroll_supplier_fx_prices_v1'))+'commit;');
 await f.db.exec(readFileSync('supabase/migrations/20261111203736_store_commercial_usdt.sql','utf8'));
 return f;
}
async function selectUsdt(f:Awaited<ReturnType<typeof fixture>>){
 await f.db.query('select save_store_money_settings_v1($1,$2)',[{kind:'usdt',refreshSeconds:900,maxAgeSeconds:259200,quoteSeconds:900,adjustment:0,roundArs:1,maxChange:20,retailMargin:30,wholesaleMargin:20,minimumMargin:10},'Seleccionar cotización comercial USDT QA']);
}
async function claim(f:Awaited<ReturnType<typeof fixture>>){
 await f.db.exec('set role service_role');
 return(await f.db.query<{r:{token:string}}> ('select claim_store_exchange_refresh_v1(true)r')).rows[0].r.token;
}

test('commercial USDT is admin configurable, linked to verified evidence, bounded to source expiry and shared with backend ARS projection',async()=>{
 const f=await fixture();try{
  await selectUsdt(f);
  const token=await claim(f),stamp=new Date().toISOString();
  const qid=(await f.db.query<{id:string}>('select record_supplier_usdt_quote_v1($1)id',[{rateArs:1660.55,source:'criptoya-binance-totalAsk',quotedAt:stamp,evidence:{ask:1660,primaryAsk:1660,purchaseParity:'1 USD proveedor = 1 USDT'}}])).rows[0].id;
  await f.db.query('select finish_store_exchange_refresh_v1($1,1660.55,$2,null)',[token,stamp]);
  await f.db.exec('reset role');
  const rate=(await f.db.query<{source:string;supplier_fx_quote_id:string;life:number}>('select source,supplier_fx_quote_id,extract(epoch from(expires_at-source_at))::int life from store_exchange_current_v1()')).rows[0];
  assert.deepEqual(rate,{source:'usdt',supplier_fx_quote_id:qid,life:86400});
  assert.equal((await f.db.query<{retail_usd:string}>('select retail_usd from product_usd_prices')).rows[0].retail_usd,'40.000000');
  const projected=(await f.db.query<{r:Array<{retailUsd:string;retailArs:number}>}>('select store_usd_prices_v1($1)r',[[f.id]])).rows[0].r;
  assert.equal(projected[0].retailArs,66422);assert.equal(projected[0].retailUsd,'40.000000');
  await f.db.exec('set role anon');
  const snapshot=(await f.db.query<{r:{source:string;rate:string;kind:string;status:string}}> ('select store_exchange_public_v1()r')).rows[0].r;
  assert.equal(snapshot.source,'usdt');assert.equal(snapshot.kind,'usdt');assert.equal(snapshot.rate,'1660.550000');assert.equal(snapshot.status,'valid');
  assert.ok(!JSON.stringify(snapshot).includes(qid));
  await assert.rejects(f.db.query('select * from supplier_fx_quotes'),/permission denied/);
 }finally{await f.db.close();}
});

test('commercial USDT rejects unverified and stale evidence and retains last good rate on provider error',async()=>{
 const f=await fixture();try{
  await selectUsdt(f);
  const token=await claim(f),stamp=new Date().toISOString();
  await assert.rejects(f.db.query('select finish_store_exchange_refresh_v1($1,1660.55,$2,null)',[token,stamp]),/USDT/);
  await f.db.exec('reset role');
  await f.db.query("insert into supplier_fx_quotes(rate_ars,source,quoted_at,evidence)values(1660.55,'criptoya-binance-totalAsk',now()-interval '25 hours','{}')");
  const stale=(await f.db.query<{stamp:string}>('select quoted_at::text stamp from supplier_fx_quotes')).rows[0].stamp;
  await f.db.exec('set role service_role');
  await assert.rejects(f.db.query('select finish_store_exchange_refresh_v1($1,1660.55,$2,null)',[token,stale]),/USDT/);
  const qid=(await f.db.query<{id:string}>('select record_supplier_usdt_quote_v1($1)id',[{rateArs:1660.55,source:'criptoya-binance-totalAsk',quotedAt:stamp,evidence:{ask:1660,primaryAsk:1660,purchaseParity:'1 USD proveedor = 1 USDT'}}])).rows[0].id;
  await f.db.query('select finish_store_exchange_refresh_v1($1,1660.55,$2,null)',[token,stamp]);
  const next=await claim(f);
  await f.db.query("select finish_store_exchange_refresh_v1($1,null,null,'Fuente USDT no disponible')",[next]);
  await f.db.exec('reset role');
  assert.equal((await f.db.query<{supplier_fx_quote_id:string}>('select supplier_fx_quote_id from store_exchange_current_v1()')).rows[0].supplier_fx_quote_id,qid);
  assert.equal((await f.db.query<{last_error:string}>('select last_error from store_money_settings')).rows[0].last_error,'Fuente USDT no disponible');
  await f.db.query("select store_manual_rate_v1(1700,2,'Contingencia documentada y aprobada QA')");
  assert.equal((await f.db.query<{source:string}>('select source from store_exchange_current_v1()')).rows[0].source,'manual');
  await f.db.exec('set role service_role');
  assert.deepEqual((await f.db.query<{r:unknown}>('select claim_store_exchange_refresh_v1(false)r')).rows[0].r,{});
 }finally{await f.db.close();}
});

test('owner activation script atomically selects the current verified acquisition quote without changing the configured adjustment or USD base',async()=>{
 const f=await fixture();try{
  await f.db.exec("insert into supplier_tracking_settings(id,config)values(true,'{\"acquisitionFxMode\":\"usdt\"}');update store_money_settings set adjustment=1.5");
  await f.db.exec('set role service_role');
  await f.db.query('select record_supplier_usdt_quote_v1($1)',[{rateArs:1660.55,source:'criptoya-binance-totalAsk',quotedAt:new Date().toISOString(),evidence:{ask:1660,primaryAsk:1660,purchaseParity:'1 USD proveedor = 1 USDT'}}]);
  await f.db.exec('reset role');
  await f.db.exec(readFileSync('scripts/sql/activate-commercial-usdt.sql','utf8'));
  const snapshot=(await f.db.query<{r:{kind:string;rate:string;rawRate:string;adjustment:string}}> ('select store_exchange_public_v1()r')).rows[0].r;
  assert.equal(snapshot.kind,'usdt');assert.equal(snapshot.rawRate,'1660.550000');assert.equal(snapshot.rate,'1685.458250');assert.equal(snapshot.adjustment,'1.5000');
  assert.equal((await f.db.query<{retail_usd:string}>('select retail_usd from product_usd_prices')).rows[0].retail_usd,'40.000000');
 }finally{await f.db.close();}
});
