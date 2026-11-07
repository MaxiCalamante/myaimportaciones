/** Live source listing and detail -> isolated SQL preview and publication. No remote writes. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { attachCatalogMembership, publicationFixture } from '../tests/helpers/assisted-publication-fixture';
import { supplierAdapter } from '../src/lib/supplier-tracker/adapters';
import { fetchTrackerHtml } from '../src/lib/supplier-tracker/network';
import { catalogExclusion, conflictingListingTitle } from '../src/lib/supplier-tracker/catalog';
import { normalizeSourceCost } from '../src/lib/supplier-tracker/worker';
import { cleanWholesaleTitle } from '../src/lib/supplier-opportunities';
import { slugifyProduct } from '../src/lib/admin-product';

const samples = [
  {key:'star-company',category:'https://www.starcompany-py.com/categoria-premium/121',pick:0},
  {key:'atacado-usa',category:'https://atacadousa.com.py/categoria/perfumes',pick:1},
  {key:'atacado-connect',category:'https://atacadoconnect.com/categoria/informatica',pick:1},
  {key:'total',category:'https://www.totalherramientasoficial.com.py/produtos/ferramentas/filter?d=1',pick:0},
];
const folder=resolve('scratch/suppliers-private/mass-publication');
await mkdir(folder,{recursive:true});
const replay=process.argv.includes('--captured') ? (JSON.parse(await readFile(resolve(folder,'report.json'),'utf8')).samples as
  {key:string;source:string;externalId:string;listingTitle:string;listingUrl?:string;sku:string;observedAt:string}[]) : null;
const f = await publicationFixture();
try {
  const captured = await Promise.allSettled(samples.map(async sample => {
    const adapter=supplierAdapter(sample.key);
    if(replay){
      const prior=replay.find(row=>row.key===sample.key);
      assert.ok(prior?.source);
      const detail=adapter.detail(await readFile(resolve(folder,sample.key+'.html'),'utf8'),prior.source);
      assert.ok(detail);
      assert.equal(detail.externalId,prior.externalId);
      const card={url:prior.listingUrl??prior.source,externalId:prior.externalId,title:prior.listingTitle,sku:prior.sku};
      return {sample,card,detail,observedAt:prior.observedAt};
    }
    const listing=adapter.listing(await fetchTrackerHtml(sample.category,adapter.key),sample.category,sample.category);
    const card=listing.products.filter(p=>!catalogExclusion(adapter.key,p))[sample.pick];
    if(!card)throw Error('No se encontró ficha elegible');
    await new Promise(resolve=>setTimeout(resolve,10_000));
    const url=card.nativeUrl??card.url,html=await fetchTrackerHtml(url,adapter.key),detail=adapter.detail(html,url);
    assert.ok(detail);
    assert.equal(detail.externalId,card.externalId);
    await writeFile(resolve(folder,sample.key+'.html'),html);
    return {sample,card,detail,observedAt:new Date().toISOString()};
  }));
  const reports: unknown[]=[];
  for (const [index,response] of captured.entries()) {
    if (response.status==='rejected') {
      reports.push({key:samples[index].key,error:String(response.reason)});
      process.exitCode=1;
      continue;
    }
    const {sample,card,detail,observedAt}=response.value;
    const item=randomUUID(), {db,category,now,validUntil}=f;
    const source=(await db.query<{id:string}>('select id from suppliers where official_key=$1',[sample.key])).rows[0];
    await db.query(`insert into supplier_tracker_items(id,supplier_id,external_id,url,title,sku,evidence)
      values($1,$2,$3,$4,$5,$6,$7)`,[item,source.id,card.externalId,card.url,card.title,card.sku,{listingData:card}]);
    await attachCatalogMembership(db,item,source.id,sample.category);
    const task=(await db.query<{id:string;lease_token:string}>(`insert into supplier_tracker_tasks
      (supplier_id,item_id,kind,url,state,lease_token,leased_until) values($1,$2,'monitor',$3,'running',gen_random_uuid(),now()+interval '2 minutes') returning id,lease_token`,
      [source.id,item,detail.url])).rows[0];
    await db.exec('set role service_role');
    const listingConflict=conflictingListingTitle(supplierAdapter(sample.key).key,card.title,detail.title);
    await db.query('select tracker_record_monitor_v1($1,$2,$3)',[task.id,task.lease_token,{kind:'ok',...detail,listingConflict,...normalizeSourceCost(detail,{})}]);
    await db.exec('set role authenticated');
    const base={title:cleanWholesaleTitle(detail.title),categoryId:category,description:detail.description,
      mediaAuthorized:false,identityConfirmed:false,complianceConfirmed:false,evidence:'',basis:null};
    const preview=async(input:unknown)=>(await db.query<{p:{revision:string;reasons:string[];prices:Record<string,unknown>|null}}>(
      'select tracker_preview_publication_v1($1,$2)p',[item,input])).rows[0].p;
    const real=await preview(base);
    assert.ok(real.reasons.length,'Se esperaba bloqueo comercial sin documentación verificada');
    const testOnlyBasis={
      status:'COSTO_VERIFICADO',origin:String(detail.cost),currency:detail.currency,unitsPerUsd:'1',supplierUrl:detail.url,
      fxSource:'QA aislado: fuente de venta USD',fxAt:now,settlementBasis:'usd',settlementDocument:'Condiciones ficticias del escenario de prueba',
      document:'Documentación económica de prueba aislada',costsComplete:true,identityVerified:true,accountingConfirmed:true,accountingBasis:'gross_no_vat',
      carrier:{kind:'fixed',unitUsd:'6',confirmed:true,document:'Reparto de lote de prueba',validUntil},
      originTaxDocument:'IVA del escenario de prueba',components:sample.key==='total'?[{id:'iva',kind:'origin_tax',group:'acquisition',amountUsd:'5',document:'IVA del escenario de prueba'}]:[],
    };
    const input={...base,description:detail.description.length>=50?detail.description:
      'Ficha QA aislada de la referencia observada. Denominación publicada por el proveedor: '+detail.title,
      mediaAuthorized:true,identityConfirmed:true,complianceConfirmed:true,evidence:'Escenario aislado de validación, evidencia comercial de prueba',
      sourceConflictEvidence:listingConflict?'Confirmación aislada de la presentación usada sólo para QA':null,basis:testOnlyBasis};
    const simulated=await preview(input);
    const outcome:Record<string,unknown>={key:sample.key,observedAt,source:detail.url,externalId:detail.externalId,
      listingUrl:card.url,listingTitle:card.title,detailTitle:detail.title,brand:detail.brand,model:detail.model,sku:detail.sku,listingConflict,
      originCost:detail.cost,currency:detail.currency,quantity:detail.quantity,availability:detail.availability,taxBasis:detail.taxBasis,
      galleryCount:detail.images?.length??0,descriptionLength:detail.description.length,specificationCount:Object.keys(detail.specifications??{}).length,
      realPublicationBlockers:real.reasons,controlledScenarioBlockers:simulated.reasons};
    if(!simulated.reasons.length){
      const slug=slugifyProduct(input.title).replace(/-$/,'');
      const publish=async()=>(await db.query<{p:{id:string;slug:string;existing:boolean;active:boolean}}>(
        'select tracker_publish_opportunity_v1($1,$2,$3)p',[item,simulated.revision,slug])).rows[0].p;
      const product=await publish();
      assert.equal(product.active,true);
      assert.equal((await publish()).id,product.id);
      await db.exec('set role anon');
      const visible=await db.query<{slug:string;stock:number}>('select slug,stock from products where id=$1',[product.id]);
      assert.equal(visible.rows[0]?.slug,product.slug);
      assert.equal(visible.rows[0]?.stock,0);
      outcome.controlledPublication={...product,visibleAsAnon:true,prices:simulated.prices};
      if(sample.key==='atacado-connect'){
        await db.exec('reset role');
        const offer=(await db.query<{id:string}>('select offer_id id from supplier_tracker_items where id=$1',[item])).rows[0].id;
        const price=async()=>Number((await db.query<{retail_usd:string}>('select retail_usd from product_usd_prices where product_id=$1',[product.id])).rows[0].retail_usd);
        const update=async(origin:number)=>{
          await db.exec('reset role');
          await db.query('update supplier_offers set origin_cost=$1,cost_checked_at=now() where id=$2',[origin,offer]);
          await db.exec('set role service_role');
          return (await db.query<{r:{status:string}}>('select tracker_reprice_offer_v1($1)r',[offer])).rows[0].r.status;
        };
        const before=await price();
        assert.equal(await update(detail.cost!+5),'proposal');
        assert.equal(await price(),before);
        await db.exec("reset role;update store_profitability_policy set enforcement='enforce'");
        assert.equal(await update(detail.cost!+5),'applied');
        const increased=await price();
        assert.ok(increased>before);
        assert.equal(await update(detail.cost!-5),'applied');
        const decreased=await price();
        assert.ok(decreased<before);
        const legacy=(await db.query<{origin_cost:string}>('select origin_cost from product_costs where product_id=$1',[product.id])).rows[0];
        assert.equal(Number(legacy.origin_cost),detail.cost!-5);
        outcome.controlledRepricing={previewPreserved:true,before,increased,decreased,legacyCostUpdated:true};
        await db.exec("reset role;update store_profitability_policy set enforcement='preview'");
      }
    }
    await db.exec('reset role');
    reports.push(outcome);
  }
  const report={at:new Date().toISOString(),capturedReplay:!!replay,environment:'PostgreSQL aislado con fichas HTTP reales. Tarifas y permisos comerciales sólo de prueba.',samples:reports};
  await writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(reports.map(x=>{const r=x as Record<string,unknown>;return {key:r.key,error:r.error,externalId:r.externalId,availability:r.availability,
    realPublicationBlockers:r.realPublicationBlockers,controlledScenarioBlockers:r.controlledScenarioBlockers,published:!!r.controlledPublication};})));
} finally { await f.db.close(); }
