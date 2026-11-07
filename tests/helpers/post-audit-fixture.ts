import{readFileSync}from'node:fs';import{trackerFixture}from'./supplier-tracker-fixture';
const migration=readFileSync('supabase/migrations/20261106212229_supplier_post_audit_controls.sql','utf8');
export async function postAuditFixture(dataDir?:string){const f=await trackerFixture(true,dataDir);await f.db.exec(`alter table suppliers add freshness_hours integer default 24;
 alter table products add supplier_available boolean default false,add supplier_last_checked_at timestamptz,add supplier_stock_status text,add updated_at timestamptz;
 alter table product_variants add supplier_available boolean default false,add updated_at timestamptz;
 alter table supplier_offers add last_error text;
 alter table supplier_sync_queue add product_id uuid,add variant_id uuid,add source_url text,add next_run_at timestamptz default now(),add updated_at timestamptz;
 grant select on products to service_role;
 create table supplier_tracking_settings(id boolean primary key,config jsonb);insert into supplier_tracking_settings values(true,'{"enabled":true,"autoStock":true}');
 create function reconcile_supplier_catalog_sync_v1()returns void language plpgsql as $$begin end$$;
 create table supplier_catalog_sync_runs(id uuid primary key,finished_at timestamptz);create table supplier_catalog_sync_checks(job_id uuid,run_id uuid,status text);`);
 const claim=readFileSync('supabase/migrations/20261104204457_supplier_catalog_sync_progress.sql','utf8');await f.db.exec(claim.slice(claim.indexOf('create or replace function public.claim_supplier_jobs_v1'),claim.indexOf('create or replace function public.claim_supplier_jobs_v1')+claim.slice(claim.indexOf('create or replace function public.claim_supplier_jobs_v1')).indexOf('revoke all')));
 const obs=readFileSync('supabase/migrations/20261020120000_supplier_intelligence.sql','utf8');const start=obs.indexOf('create function public.record_supplier_observation_v1');await f.db.exec(obs.slice(start,obs.indexOf('$$;',obs.indexOf('as $$',start)+5)+3));
 await f.db.exec(migration);return f;}
