import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {usdFixture} from './helpers/usd-fixture';

async function fixture(){
 const f=await usdFixture();
 for(const name of ['20261106213029_usd_contribution_policy','20261106213412_usd_profitability_integration','20261110190000_checkout_profitability_enforcement','20261111203705_enabled_payment_pricing','20261111204517_public_price_verification_flags'])await f.db.exec(readFileSync('supabase/migrations/'+name+'.sql','utf8'));
 const now=new Date().toISOString(),future=new Date(Date.now()+86400000).toISOString();
 const basis={status:'COSTO_VERIFICADO',settlementBasis:'usd',settlementDocument:'Verified USD settlement QA',document:'Verified complete cost QA',costsComplete:true,identityVerified:true,accountingConfirmed:true,accountingBasis:'gross_no_vat',currency:'USD',origin:'10',unitsPerUsd:'1',fxSource:'USD invoice QA',fxAt:now,checkedAt:now,components:[],carrier:{kind:'percent',percent:'0',confirmed:true,document:'Verified no carrier cost QA',validUntil:future}};
 await f.db.query('select save_store_profitability_profile_v2($1,null,$2,0,\'Verified unit cost for price flags\')',[f.id,basis]);
 const method=(fee:string)=>({confirmed:true,rounding:'exact',document:'Verified payment fee QA',validUntil:future,tiers:[{minUsd:'0',maxUsd:null,percentGross:fee,percentNet:'0',fixedUsd:'0',fixedArs:'0'}]});
 await f.db.query('update store_profitability_policy set methods=$1',[{transferencia:method('0'),mercado_pago:method('6')}]);
 const flags=async(ids=[f.id])=>{await f.db.exec('set role service_role');return(await f.db.query<{r:Array<{productId:string;variantId:string|null;retailVerified:boolean;wholesaleVerified:boolean}>}>('select store_public_price_verification_v1($1)r',[ids])).rows[0].r;};
 return{...f,basis,flags};
}
test('public verification requires fresh complete costs, independently validates each channel, and writes no commercial data',async()=>{
 const f=await fixture();try{
  const exists=(await f.db.query<{exists:boolean}>("select to_regprocedure('public.store_public_price_verification_v1(uuid[])')is not null as exists")).rows[0].exists;
  assert.equal(exists,true,'server-only price verification batch must exist');
  let rows=await f.flags();assert.equal(rows[0].retailVerified,true);assert.equal(rows[0].wholesaleVerified,true);
  assert.deepEqual(Object.keys(rows[0]).sort(),['productId','rateId','retailArs','retailVerified','variantId','wholesaleArs','wholesaleVerified']);
  await f.db.exec("reset role;update product_usd_prices set retail_usd=11,wholesale_usd=15");
  rows=await f.flags();assert.equal(rows[0].retailVerified,false);assert.equal(rows[0].wholesaleVerified,true);
  await f.db.exec("reset role;update store_profitability_profiles set basis=jsonb_set(basis,'{checkedAt}','\"2020-01-01T00:00:00Z\"')");
  rows=await f.flags();assert.equal(rows[0].retailVerified,false);assert.equal(rows[0].wholesaleVerified,false);
  assert.equal((await f.db.query<{stock:number}>('select stock from products')).rows[0].stock,10);
  assert.equal((await f.db.query<{n:number}>('select count(*)::int n from orders')).rows[0].n,0);
  assert.equal(Number((await f.db.query<{retail_usd:string}>('select retail_usd from product_usd_prices')).rows[0].retail_usd),11);
 }finally{await f.db.close();}
});
test('missing profiles and expired FX remain reference prices and no public role can call the private verification RPC',async()=>{
 const f=await fixture();try{
  await f.db.exec('delete from store_profitability_profiles');
  assert.equal((await f.flags())[0].retailVerified,false);
  await f.db.exec('reset role');
  await f.db.query('select save_store_profitability_profile_v2($1,null,$2,0,\'Restore verified cost for FX expiry test\')',[f.id,f.basis]);
  await f.db.exec("update store_exchange_rates set expires_at=now()-interval '1 second'");
  assert.equal((await f.flags())[0].retailVerified,false);
  await f.db.exec('reset role;set role anon');await assert.rejects(f.db.query('select store_public_price_verification_v1($1)',[[f.id]]),/permission|Forbidden/);
 }finally{await f.db.close();}
});
test('verification uses enabled methods, exact variants, and isolates a failing channel or identity',async()=>{
 const f=await fixture();try{
  await f.db.exec("update product_usd_prices set retail_usd=11.5;update products set payment_methods=array['transferencia','mercado_pago']::payment_method[]");
  assert.equal((await f.flags())[0].retailVerified,false,'MP fee makes this shared retail reference unsafe');
  await f.db.exec("reset role;update products set payment_methods=array['transferencia']::payment_method[]");
  assert.equal((await f.flags())[0].retailVerified,true,'disabled MP must not invalidate transfer-only pricing');
  const variant=randomUUID();await f.db.exec('reset role');
  await f.db.query("insert into product_variants(id,product_id,title,retail_price,stock,stock_verified_at)values($1,$2,'Exact variant',15000,2,now())",[variant,f.id]);
  await f.db.exec('update products set has_variants=true');
  await f.db.query("insert into product_usd_prices(product_id,variant_id,retail_usd,wholesale_usd,state)values($1,$2,15,11,'active')",[f.id,variant]);
  await f.db.query('select save_store_profitability_profile_v2($1,$2,$3,0,\'Exact variant profile for verification\')',[f.id,variant,f.basis]);
  const rows=await f.flags();const base=rows.find(r=>r.variantId===null)!,exact=rows.find(r=>r.variantId===variant)!;
  assert.equal(base.retailVerified,false,'a variant parent is not the purchasable identity');
  assert.equal(exact.retailVerified,true);assert.equal(exact.wholesaleVerified,false);
  await assert.rejects(f.flags(Array.from({length:101},()=>randomUUID())),/100 products/);
 }finally{await f.db.close();}
});
test('wholesale-only identities cannot receive retail verification even when retail margin is safe',async()=>{
 const f=await fixture();try{
  await f.db.exec('update products set is_wholesale_only=true');
  const flags=(await f.flags())[0];assert.equal(flags.retailVerified,false);assert.equal(flags.wholesaleVerified,true);
 }finally{await f.db.close();}
});
