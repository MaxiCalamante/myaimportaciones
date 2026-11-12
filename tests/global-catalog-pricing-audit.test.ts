import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {usdFixture} from './helpers/usd-fixture';

async function fixture(enforcement='enforce'){
 const f=await usdFixture();
 await f.db.exec(`alter table products add supplier_archived_at timestamptz,add supplier_archive_reason text,add commercial_status text not null default 'AVAILABLE',add out_of_stock_since timestamptz;
 alter table product_variants add supplier_archived_at timestamptz,add commercial_status text not null default 'AVAILABLE',add out_of_stock_since timestamptz;
 alter table suppliers add website text default 'https://qa.test';
 create function four_supplier_key_v1(text)returns text language sql immutable as $$select case when $1 like 'https://qa.test%' then 'qa' end$$;
 create table product_supplier_preferences(product_id uuid,variant_id uuid,offer_id uuid);`);
 for(const name of ['20261106213029_usd_contribution_policy.sql','20261106213412_usd_profitability_integration.sql','20261110123000_wholesale_public_offers_resilience.sql','20261110190000_checkout_profitability_enforcement.sql','20261111203705_enabled_payment_pricing.sql'])await f.db.exec(readFileSync('supabase/migrations/'+name,'utf8'));
 const strictDefinition=(await f.db.query<{definition:string}>("select pg_get_functiondef('create_store_order_v1(uuid,text,jsonb)'::regprocedure) definition")).rows[0].definition;
 await f.db.exec(readFileSync('supabase/migrations/20261111203756_global_catalog_pricing_audit.sql','utf8'));
 const supplier=randomUUID(),offer=randomUUID();
 await f.db.query("insert into suppliers(id,name)values($1,'Exact QA')",[supplier]);
 await f.db.query("insert into supplier_offers(id,supplier_id,product_id,origin_cost,currency,source_url,verification,availability,cost_checked_at,availability_checked_at)values($1,$2,$3,10,'USD','https://qa.test/exact','verified','in_stock',now(),now())",[offer,supplier,f.id]);
 const basis={status:'COSTO_VERIFICADO',settlementBasis:'usd',settlementDocument:'Pago USD documentado QA',document:'Factura y gastos confirmados QA',costsComplete:true,identityVerified:true,accountingConfirmed:true,accountingBasis:'gross_no_vat',currency:'USD',origin:'10',unitsPerUsd:'1',fxSource:'Factura USD QA',fxAt:new Date().toISOString(),checkedAt:new Date().toISOString(),components:[],carrier:{kind:'percent',percent:'20',confirmed:true,document:'Cotización QA 20%',validUntil:new Date(Date.now()+86400000).toISOString()},offerId:offer,supplierUrl:'https://qa.test/exact'};
 await f.db.query("select save_store_profitability_profile_v2($1,null,$2,0,'Registro exacto de prueba')",[f.id,basis]);
 const method={confirmed:true,rounding:'exact',document:'Tarifa QA documentada',validUntil:new Date(Date.now()+86400000).toISOString(),tiers:[{minUsd:'0',maxUsd:null,percentGross:'0',percentNet:'0',fixedUsd:'0',fixedArs:'0'}]};
 await f.db.query("select save_store_profitability_policy_v2($1,'Política controlada de prueba')",[{retailTarget:'30',wholesaleTarget:'18',minimumMargin:'10',usdStep:'.01',costMaxAgeSeconds:86400,methods:{transferencia:method,mercado_pago:method}}]);
 await f.db.query('update store_profitability_policy set enforcement=$1',[enforcement]);
 await f.db.exec("update store_money_settings set max_change=100;update product_usd_prices set retail_source='automatic',wholesale_source='automatic',wholesale_usd=null;set role service_role");
 type Report={runId:string;policyEnforcement:string;applyPolicyEnforcement:string|null;products:{total:number;corrected:number;unchanged:number;pending:number;archived:number;eligible:number;newlyArchived:number};variants:{total:number;pending:number;archived:number}};
 const audit=async(mode='simulate',runId:string|null=null,archive=false)=>(await f.db.query<{r:Report}>('select store_audit_catalog_v1($1,$2,$3)r',[mode,runId,archive])).rows[0].r;
 return {...f,audit,offer,strictDefinition};
}
test('simulation is recoverable and rolls back engine writes; apply generates missing wholesale and is idempotent',async()=>{
 const f=await fixture();try{
  const before=(await f.db.query('select *from product_usd_prices')).rows;
  const profileBefore=(await f.db.query('select *from store_profitability_profiles')).rows;
  const simulated=await f.audit();assert.equal(simulated.products.eligible,1);assert.equal(simulated.products.corrected,0);
  assert.deepEqual((await f.db.query('select *from product_usd_prices')).rows,before);
  assert.deepEqual((await f.db.query('select *from store_profitability_profiles')).rows,profileBefore);
  const item=(await f.db.query<{before_state:{productCosts:unknown};proposal:{proposal:{wholesaleUsd:string}}}>('select before_state,proposal from store_catalog_audit_items')).rows[0];
  assert.ok(item.before_state.productCosts);assert.ok(Number(item.proposal.proposal.wholesaleUsd)>0);
  const applied=await f.audit('apply',simulated.runId);assert.equal(applied.products.corrected,1);
  assert.deepEqual(await f.audit('apply',simulated.runId),applied);
  assert.equal((await f.db.query<{wholesale_source:string}>('select wholesale_source from product_usd_prices')).rows[0].wholesale_source,'automatic');
  assert.equal((await f.db.query<{stock:number}>('select stock from products')).rows[0].stock,10);
  assert.equal((await f.db.query<{n:number}>('select count(*)::int n from orders')).rows[0].n,0);
  assert.match(f.strictDefinition,/prof_result[\s\S]*allowed/);
  assert.equal((await f.db.query<{definition:string}>("select pg_get_functiondef('create_store_order_v1(uuid,text,jsonb)'::regprocedure) definition")).rows[0].definition,f.strictDefinition);
 }finally{await f.db.close();}
});
test('source revisions invalidate a proposal; real manual wholesale remains unchanged',async()=>{
 const f=await fixture();try{
  await f.db.exec("reset role;update product_usd_prices set wholesale_usd=20,wholesale_source='manual';set role service_role");
  let simulated=await f.audit();await f.db.exec('reset role');await f.db.query('update supplier_offers set origin_cost=11 where id=$1',[f.offer]);await f.db.exec('set role service_role');
  let applied=await f.audit('apply',simulated.runId);assert.equal(applied.products.pending,1);assert.equal(applied.products.corrected,0);
  simulated=await f.audit();applied=await f.audit('apply',simulated.runId);assert.equal(applied.products.corrected,1);
  assert.equal(Number((await f.db.query<{wholesale_usd:string}>('select wholesale_usd from product_usd_prices')).rows[0].wholesale_usd),20);
  await f.db.exec("reset role;update product_usd_prices set wholesale_usd=null,wholesale_source='manual',retail_usd=50,retail_source='manual',revision=revision+1;set role service_role");
  simulated=await f.audit();applied=await f.audit('apply',simulated.runId);assert.equal(applied.products.unchanged,1);
  assert.deepEqual((await f.db.query('select retail_usd,retail_source,wholesale_usd,wholesale_source from product_usd_prices')).rows[0],{retail_usd:'50.000000',retail_source:'manual',wholesale_usd:null,wholesale_source:'manual'});
 }finally{await f.db.close();}
});
test('full catalogue exceeds REST caps, archives invalid providers recoverably and keeps approved-domain URLs pending',async()=>{
 const f=await fixture();try{
  await f.db.exec(`reset role;insert into products(id,category_id,title,slug,retail_price,wholesale_price,stock,deleted_at)
   select gen_random_uuid(),(select category_id from products limit 1),'Archived '||n,'archived-'||n,10,10,0,now()from generate_series(1,1001)n;`);
  const p=randomUUID();await f.db.query("insert into products(id,category_id,title,slug,retail_price,wholesale_price,stock,source_url)values($1,(select category_id from products limit 1),'Missing','missing-qa',10,10,0,'https://unknown.test/product')",[p]);
  await f.db.query("insert into product_variants(id,product_id,title,sku,retail_price,wholesale_price)values($1,$2,'Variant QA','variant-qa',10,10)",[randomUUID(),p]);
  const noSource=randomUUID();await f.db.query("insert into products(id,category_id,title,slug,retail_price,wholesale_price,stock)values($1,(select category_id from products limit 1),'No source','no-source-qa',10,10,0)",[noSource]);
  await f.db.query("insert into product_variants(id,product_id,title,sku,retail_price,wholesale_price)values($1,$2,'No source variant','no-source-variant-qa',10,10)",[randomUUID(),noSource]);
  const approvedUrl=randomUUID();await f.db.query("insert into products(id,category_id,title,slug,retail_price,wholesale_price,stock,source_url)values($1,(select category_id from products limit 1),'Approved URL','approved-url-qa',10,10,0,'https://qa.test/product')",[approvedUrl]);
  await f.db.query("insert into product_variants(id,product_id,title,sku,retail_price,wholesale_price)values($1,$2,'Approved variant','approved-variant-qa',10,10)",[randomUUID(),approvedUrl]);
  await f.db.exec("insert into products(id,category_id,title,slug,retail_price,wholesale_price,stock,commercial_status)select gen_random_uuid(),category_id,'Lifecycle archive','lifecycle-archive',10,10,0,'ARCHIVED'from products limit 1;set role service_role");
  const simulated=await f.audit('simulate',null,true);assert.equal(simulated.products.total,1006);assert.equal(simulated.products.archived,1002);assert.equal(simulated.variants.total,3);assert.equal(simulated.variants.pending,3);
  const applied=await f.audit('apply',simulated.runId);assert.equal(applied.products.archived,1004);assert.equal(applied.products.newlyArchived,2);assert.equal(applied.products.pending,1);assert.equal(applied.variants.archived,2);
  assert.equal((await f.db.query<{commercial_status:string}>('select commercial_status from products where id=$1',[p])).rows[0].commercial_status,'ARCHIVED');
  assert.equal((await f.db.query<{n:number}>("select count(*)::int n from product_variants where product_id=$1 and commercial_status='ARCHIVED'",[p])).rows[0].n,1);
  assert.equal(applied.products.total,applied.products.corrected+applied.products.unchanged+applied.products.pending+applied.products.archived);
 }finally{await f.db.close();}
});
test('preview simulation changes no prices or policy and only deliberate enforce transition allows apply',async()=>{
 const f=await fixture('preview');try{
  const before=(await f.db.query('select *from product_usd_prices')).rows;
  const simulated=await f.audit();assert.equal(simulated.policyEnforcement,'preview');assert.equal(simulated.products.eligible,1);
  assert.deepEqual((await f.db.query('select *from product_usd_prices')).rows,before);
  await assert.rejects(f.audit('apply',simulated.runId),/must already enforce/);
  assert.equal((await f.db.query<{enforcement:string}>('select enforcement from store_profitability_policy')).rows[0].enforcement,'preview');
  await f.db.query("select set_store_profitability_enforcement_v1('enforce')");
  const applied=await f.audit('apply',simulated.runId);assert.equal(applied.products.corrected,1);assert.equal(applied.policyEnforcement,'preview');assert.equal(applied.applyPolicyEnforcement,'enforce');
  const policies=(await f.db.query<{policy_snapshot:{enforcement:string};apply_policy_snapshot:{enforcement:string}}>('select policy_snapshot,apply_policy_snapshot from store_catalog_audit_runs')).rows[0];
  assert.equal(policies.policy_snapshot.enforcement,'preview');assert.equal(policies.apply_policy_snapshot.enforcement,'enforce');
 }finally{await f.db.close();}
});
test('only service can audit and policies cannot change between simulation and apply',async()=>{
 const f=await fixture();try{
  const simulated=await f.audit();await f.db.exec('reset role;update store_profitability_policy set version=version+1;set role service_role');
  await assert.rejects(f.audit('apply',simulated.runId),/policy or settings changed/);
  const latest=await f.audit();await f.db.exec("reset role;insert into products(id,category_id,title,slug,retail_price,wholesale_price,stock)select gen_random_uuid(),category_id,'New identity','new-identity',10,10,0 from products limit 1;set role service_role");
  await assert.rejects(f.audit('apply',latest.runId),/membership changed/);
  const wrongOffer=randomUUID();await f.db.exec('reset role');
  await f.db.query("insert into supplier_offers(id,supplier_id,product_id,source_url)select $1,(select supplier_id from supplier_offers limit 1),id,'https://qa.test/other'from products where slug='new-identity'",[wrongOffer]);
  await f.db.query('update store_profitability_profiles set source_offer_id=$1 where product_id=$2',[wrongOffer,f.id]);await f.db.exec('set role service_role');
  const corrupt=await f.audit();const item=(await f.db.query<{eligible:boolean;reason:string}>('select eligible,reason from store_catalog_audit_items where run_id=$1 and product_id=$2',[corrupt.runId,f.id])).rows[0];
  assert.equal(item.eligible,false);assert.match(item.reason,/exact product and variant/);
  await f.db.exec('set role authenticated');await assert.rejects(f.audit(),/permission denied/);await assert.rejects(f.db.query('select *from store_catalog_audit_items'),/permission denied/);
 }finally{await f.db.close();}
});
