import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { usdFixture } from './usd-fixture';

const migration = (name:string) => readFileSync('supabase/migrations/'+name+'.sql','utf8');
export async function attachCatalogMembership(db: Awaited<ReturnType<typeof usdFixture>>['db'],itemId:string,supplierId:string,url:string) {
  const source=(await db.query<{id:string}>(`insert into supplier_tracker_sources(supplier_id,url,label,kind,catalog_parent_id)
    select $1,$2,'Categoría QA','category',id from supplier_tracker_sources where supplier_id=$1 and catalog_root
    on conflict(supplier_id,url) do update set label=excluded.label returning id`,[supplierId,url])).rows[0].id;
  const run=(await db.query<{id:string}>(`insert into supplier_tracker_runs(source_id,supplier_id,state,finished_at)
    values($1,$2,'done',now()) returning id`,[source,supplierId])).rows[0].id;
  await db.query('insert into supplier_tracker_memberships(source_id,item_id,first_run_id,last_run_id) values($1,$2,$3,$3)',[source,itemId,run]);
}
export async function publicationFixture() {
  const f = await usdFixture();
  await f.db.exec(`
    alter table products add column supplier_stock_status text default 'unknown';
    alter table suppliers add column website text,add column official_key text,add column automation_authorized boolean default true;
    alter table supplier_offers alter column id set default gen_random_uuid(),
      add column external_id text,add column variant_key text,add column brand text,add column model text,add column gtin text,
      add column last_success_at timestamptz,add column last_attempt_at timestamptz,add column updated_at timestamptz default now(),
      add unique(supplier_id,external_id,variant_key);
    create table supplier_link_decisions(offer_id uuid,product_id uuid,variant_id uuid,status text,method text,reason text,evidence jsonb);
    create table supplier_observations(offer_id uuid,kind text,payload jsonb,observed_at timestamptz);
    create table supplier_proposals(offer_id uuid,kind text,before_value jsonb,after_value jsonb);
    create table supplier_source_slots(supplier_id uuid primary key,next_at timestamptz);
    create table supplier_sync_queue(id uuid primary key,supplier_id uuid,product_id uuid,variant_id uuid,state text,leased_until timestamptz,last_error text);
    create table supplier_discovery_jobs(id uuid primary key,supplier_id uuid,state text,leased_until timestamptz,last_error text);
    create schema cron;create table cron.job(jobid integer,jobname text);
    create function cron.unschedule(integer) returns boolean language sql as $$select true$$;
    create table import_cost_policies(id uuid primary key default gen_random_uuid(),config jsonb,created_at timestamptz default now());
    insert into import_cost_policies(config)values('{"confirmed":true}');
    create table catalog_pricing_rules(id uuid primary key default gen_random_uuid(),config jsonb,created_at timestamptz default now());
    insert into catalog_pricing_rules(config)values('{"minimumMarginPercent":20}');
    grant select on suppliers to authenticated;
    grant select on products,product_variants to anon;
    alter table products enable row level security;
    create policy isolated_active on products for select to anon using(is_active);
  `);
  await f.db.exec(migration('20261106163233_four_supplier_tracker'));
  const controls=migration('20261106212229_supplier_post_audit_controls');
  await f.db.exec(controls.slice(controls.indexOf('create or replace function public.tracker_validate_url_v1'),controls.indexOf('create or replace function public.refresh_supplier_availability_v1')));
  const observations=migration('20261020120000_supplier_intelligence');
  const observationStart=observations.indexOf('create function public.record_supplier_observation_v1');
  const observationEnd=observations.indexOf('revoke all on function public.record_supplier_observation_v1',observationStart);
  const automation=migration('20261020170000_supplier_automation');
  const upgradeStart=automation.lastIndexOf('do $$',automation.indexOf("definition:=replace(definition,'oid:=o.id;'"));
  const upgradeEnd=automation.indexOf('grant execute on function public.record_supplier_observation_v1',upgradeStart);
  await f.db.exec(observations.slice(observationStart,observationEnd));
  await f.db.exec(automation.slice(upgradeStart,upgradeEnd));
  const catalog=migration('20261101025502_supplier_catalog_import');
  const start=catalog.indexOf('create table public.catalog_import_jobs');
  const end=catalog.indexOf('create function public.create_catalog_import_job_v1',start);
  await f.db.exec(catalog.slice(start,end));
  await f.db.exec(catalog.slice(catalog.indexOf('create function public.guard_catalog_product_publication_v1'),catalog.indexOf('create function public.catalog_import_job_counts_v1')));
  await f.db.exec(migration('20261106213029_usd_contribution_policy'));
  await f.db.exec(migration('20261106213412_usd_profitability_integration'));
  await f.db.exec(migration('20261107040127_final_catalog_supplier_scope'));
  const category=(await f.db.query<{id:string}>('select id from categories limit 1')).rows[0].id;
  for(const [key,host] of [
    ['star-company','www.starcompany-py.com'],['atacado-usa','atacadousa.com.py'],
    ['atacado-connect','atacadoconnect.com'],['total','www.totalherramientasoficial.com.py'],
  ]) await f.db.query('insert into suppliers(id,name,official_key,website) values($1,$2,$2,$3)',[randomUUID(),key,'https://'+host+'/']);
  await f.db.exec(migration('20261107212258_supplier_catalog_discovery'));
  await f.db.exec(migration('20261107213252_supplier_opportunity_publication'));
  // Activate the public scope gate in this isolated database.
  await f.db.exec("insert into catalog_supplier_scope_runs values(repeat('0',64),now(),'{}','{}')");
  const now = new Date().toISOString(), validUntil = new Date(Date.now()+86400000).toISOString();
  const fee = (percentGross:string) => ({confirmed:true,rounding:'exact',document:'Tarifa de prueba aislada',validUntil,
    tiers:[{minUsd:'0',maxUsd:null,percentGross,percentNet:'0',fixedUsd:'0',fixedArs:'0'}]});
  await f.db.query('update store_profitability_policy set methods=$1',[{transferencia:fee('0'),mercado_pago:fee('6')}]);
  const sourceId = (await f.db.query<{id:string}>("select id from suppliers where official_key='total'")).rows[0].id;
  return {...f,category,sourceId,now,validUntil};
}
