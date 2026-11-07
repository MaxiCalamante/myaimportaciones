import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { attachCatalogMembership, publicationFixture } from './helpers/assisted-publication-fixture';

test('assisted publication is atomic, idempotent, and uses approved expenses and exact offer evidence', async () => {
  const f = await publicationFixture();
  try {
    const {db,category,sourceId,now,validUntil}=f;
    const item=randomUUID(),url='https://www.totalherramientasoficial.com.py/produto/test-herramienta-123.html';
    const img='https://www.totalherramientasoficial.com.py/img/123/example.jpg';
    const d={externalId:'123',title:'Taladro de prueba TOTAL T12345 20V',brand:'TOTAL',model:'T12345',sku:'123',
      url,variantKey:'base',cost:50,currency:'USD',availability:'in_stock',quantity:3,imageUrl:img,images:[img],
      specifications:{Voltaje:'20 V'},taxBasis:'excluded'};
    await db.query(`insert into supplier_tracker_items(id,supplier_id,external_id,url,title,brand,sku,model,variant_key,
      origin_cost,currency,availability,last_success_at,availability_checked_at,cost_checked_at,evidence)
      values($1,$2,'123',$3,$4,'TOTAL','123','T12345','base',50,'USD','in_stock',now(),now(),now(),$5)`,
      [item,sourceId,url,d.title,{lastResult:d}]);
    await attachCatalogMembership(db,item,sourceId,'https://www.totalherramientasoficial.com.py/produtos/ferramentas/filter?d=1');
    const basis={status:'COSTO_VERIFICADO',origin:'50',currency:'USD',unitsPerUsd:'1',supplierUrl:url,
      fxSource:'Cotización de prueba aislada',fxAt:now,settlementBasis:'usd',settlementDocument:'Liquidación de prueba aislada',
      document:'Factura y gastos de prueba aislada',costsComplete:true,identityVerified:true,accountingConfirmed:true,accountingBasis:'gross_no_vat',
      carrier:{kind:'fixed',unitUsd:'6',confirmed:true,document:'Reparto del envío de prueba',validUntil},
      originTaxDocument:'IVA de prueba documentado',components:[{id:'iva',kind:'origin_tax',group:'acquisition',amountUsd:'5',document:'IVA en factura de prueba'}]};
    const input={title:d.title,categoryId:category,description:'Taladro de prueba con voltaje de 20 V según la ficha de origen de la prueba aislada.',
      identityConfirmed:true,complianceConfirmed:true,mediaAuthorized:true,evidence:'Registro documental de prueba aislada',basis};
    await db.exec('set role authenticated');
    const preview=async(value:unknown)=>(await db.query<{p:{revision:string;reasons:string[];prices:{retailMargin:number;wholesaleMargin:number;retailArs:number;totalCostUsd:number}}}>(
      'select tracker_preview_publication_v1($1,$2)p',[item,value])).rows[0].p;
    const publish=async(revision:string)=>(await db.query<{p:{id:string;existing:boolean;active:boolean;slug:string}}>(
      'select tracker_publish_opportunity_v1($1,$2,$3)p',[item,revision,'taladro-de-prueba-total-t12345-20v'])).rows[0].p;
    await db.exec("select set_config('test.admin','false',false)");
    await assert.rejects(preview(input),/Forbidden/);
    await assert.rejects(db.query('select tracker_opportunities_v1($1)',[{}]),/Forbidden/);
    await db.exec("select set_config('test.admin','true',false)");
    const incomplete=await preview({...input,basis:{...basis,components:[]}});
    assert.match(incomplete.reasons.join(' '),/IVA de origen/);
    await assert.rejects(publish(incomplete.revision),/IVA de origen/);
    const ready=await preview(input);
    assert.deepEqual(ready.reasons,[]);
    assert.equal(ready.prices.totalCostUsd,61);
    assert.ok(ready.prices.retailMargin>=30);
    assert.ok(ready.prices.wholesaleMargin>=18);
    const result=await publish(ready.revision);
    assert.equal(result.existing,false);
    assert.equal(result.active,true);
    assert.equal((await publish(ready.revision)).id,result.id);
    const found=(await db.query<{r:{total:number;items:{state:string}[]}}>(
      'select tracker_opportunities_v1($1)r',[{q:'T12345',status:'published'}])).rows[0].r;
    assert.equal(found.total,1);
    assert.equal(found.items[0].state,'published');
    await db.exec('set role anon');
    assert.equal((await db.query<{stock:number}>('select stock from products where id=$1',[result.id])).rows[0].stock,0);
    await assert.rejects(db.query('select * from supplier_catalog_publication_reviews'),/permission denied/);
    await db.exec('set role service_role');
    const payload={payment:'transferencia',items:[{id:result.id,price:ready.prices.retailArs,quantity:1,channel:'retail'}],
      subtotal:ready.prices.retailArs,discount:0,shipping:0};
    await db.query('select store_validate_profitability_v2($1,$2,null)',[payload,f.rateId]);
    await assert.rejects(db.query('select store_validate_profitability_v2($1,$2,null)',[
      {...payload,items:[{...payload.items[0],quantity:4}]},f.rateId]),/Cantidad disponible/);
    await assert.rejects(db.query('select store_validate_profitability_v2($1,$2,null)',[
      {...payload,shipping:1000},f.rateId]),/envío a confirmar/);
    await db.exec('reset role');
    const task=(await db.query<{id:string;lease_token:string}>(`insert into supplier_tracker_tasks
      (supplier_id,item_id,kind,url,state,lease_token,leased_until) values($1,$2,'monitor',$3,'running',gen_random_uuid(),now()+interval '2 minutes')
      returning id,lease_token`,[sourceId,item,url])).rows[0];
    await db.exec('set role service_role');
    await db.query('select record_supplier_observation_v1($1)',[{
      supplier_id:sourceId, product_id:result.id, external_id:d.externalId, variant_key:'base', title:d.title,
      brand:d.brand,model:d.model,source_url:url,origin_cost:50,currency:'USD',verification:'verified',availability:'out_of_stock',
      method:'product_page',observed_at:new Date().toISOString(),evidence:{sourceTitle:d.title,costScope:'primary_detail'},
    }]);
    await db.query('select tracker_record_monitor_v1($1,$2,$3)',[
      task.id,task.lease_token,{kind:'ok',...d,availability:'out_of_stock',quantity:0,normalizedUsd:50}]);
    assert.equal((await db.query<{supplier_available:boolean}>('select supplier_available from products where id=$1',[result.id])).rows[0].supplier_available,false);
    const kept=(await db.query<{evidence:{publicationReview:string}}>('select evidence from supplier_offers where product_id=$1',[result.id])).rows[0];
    assert.equal(kept.evidence.publicationReview,ready.revision);
    await assert.rejects(db.query('select store_validate_profitability_v2($1,$2,null)',[payload,f.rateId]),/Disponibilidad/);
  } finally { await f.db.close(); }
});

test('catalog jobs resume leases, reconcile distinct identities and signal incomplete coverage',async () => {
  const f=await publicationFixture();
  try {
    const db=f.db;
    const root=(await db.query<{id:string;url:string}>('select id,url from supplier_tracker_sources where catalog_root and supplier_id=$1',[f.sourceId])).rows[0];
    await db.exec('set role authenticated');
    const request=async()=>(await db.query<{r:string[]}>('select tracker_start_catalog_v1($1,null)r',[f.sourceId])).rows[0].r[0];
    const run=await request();
    assert.equal(await request(),run);
    await db.exec("reset role;set role service_role;select tracker_schedule_sources_v1()");
    type Lease={id:string;lease_token:string;run_id:string;url:string};
    const claim=async()=>(await db.query<Lease>('select * from tracker_claim_tasks_v1(4)')).rows.find(t=>t.run_id===run)!;
    const record=(t:Lease,data:unknown)=>db.query('select tracker_record_catalog_page_v1($1,$2,$3)',[t.id,t.lease_token,data]);
    const unlock=async()=>db.exec("reset role;update supplier_source_slots set next_at=now()-interval '1 second';set role service_role");
    const first=await claim();
    assert.equal(first.url,root.url);
    const source=root.url+'produtos/ferramentas/filter?d=1';
    await record(first,{products:[],pages:[],categories:[{url:source,title:'Ferramentas'}],excludedIds:[],contentHash:'0'.repeat(64)});
    await unlock();
    const expired=await claim();
    await db.exec("reset role;update supplier_tracker_tasks set leased_until=now()-interval '1 second' where id='"+expired.id+"'");
    await unlock();
    const reclaimed=await claim();
    assert.equal(reclaimed.id,expired.id);
    assert.notEqual(reclaimed.lease_token,expired.lease_token);
    const product={externalId:'123',url:root.url+'produto/herramienta-123.html',title:'Total herramienta de prueba',cost:19,currency:'USD'};
    const second=source+'&pagina=2';
    const page={products:[product],pages:[second],categories:[],excludedIds:[],contentHash:'1'.repeat(64),expectedTotal:2};
    await assert.rejects(record(expired,page),/Stale lease/);
    await record(reclaimed,page);
    await unlock();
    const last=await claim();
    assert.equal(last.url,second);
    await record(last,{...page,pages:[source]});
    const report=(await db.query<{state:string;items:number;pages:number;report:{repeatedPages:number}}>(
      'select state,items,pages,report from supplier_tracker_runs where id=$1',[run])).rows[0];
    assert.equal(report.state,'partial');
    assert.equal(report.items,1);
    assert.equal(report.pages,2);
    assert.equal(report.report.repeatedPages,1);
    assert.equal((await db.query<{n:number}>('select count(*)::int n from supplier_tracker_items')).rows[0].n,1);
    assert.equal((await db.query<{n:number}>('select count(*)::int n from supplier_tracker_tasks where run_id=$1',[run])).rows[0].n,3);
  } finally { await f.db.close(); }
});

test('search and pagination return a bounded payload with 30000 references',async () => {
  const f=await publicationFixture();
  try {
    await f.db.query(`insert into supplier_tracker_items(supplier_id,external_id,url,title,sku,model,currency,origin_cost)
      select $1,n::text,'https://www.totalherramientasoficial.com.py/produto/qa-'||n||'.html',
        'Taladro de prueba '||n,'S'||n,'MODEL-'||n,'USD',n from generate_series(1,30000) n`,[f.sourceId]);
    await f.db.exec('analyze supplier_tracker_items;set role authenticated');
    const samples:number[]=[];
    const read=async(filters:unknown)=>{
      const start=performance.now();
      const result=(await f.db.query<{r:{total:number;items:{sku:string}[]}}>('select tracker_opportunities_v1($1)r',[filters])).rows[0].r;
      samples.push(Math.round(performance.now()-start));
      return result;
    };
    assert.equal((await read({q:'S29999'})).items[0]?.sku,'S29999');
    const page=await read({page:600});
    assert.equal(page.total,30000);
    assert.equal(page.items.length,24);
    assert.ok(JSON.stringify(page).length<50000);
    assert.equal((await read({currency:'USD',minOrigin:'29995',sort:'price'})).total,6);
    console.log('Catálogo de 30000 filas: búsqueda, página 600 y filtro en',samples,'ms (PostgreSQL aislado).');
  } finally { await f.db.close(); }
});
