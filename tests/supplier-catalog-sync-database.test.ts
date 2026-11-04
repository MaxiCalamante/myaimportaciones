import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { CatalogSyncSnapshot } from "../src/app/admin/proveedores/catalog-sync-actions";

test("full catalog progress follows real queue results and classifies unsupported products", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create function is_admin() returns boolean language sql as
        $$select current_setting('test.admin',true) = 'yes'$$;
      create table products(id uuid primary key default gen_random_uuid(), title text, deleted_at timestamptz, fulfillment_mode text, has_variants boolean default false);
      create table product_variants(id uuid primary key default gen_random_uuid(), product_id uuid, is_active boolean, fulfillment_mode text);
      create table suppliers(id uuid primary key default gen_random_uuid(), is_active boolean, automation_authorized boolean, query_mode text);
      create table supplier_tracking_settings(id boolean primary key, config jsonb);
      create table supplier_offers(id uuid primary key default gen_random_uuid(), product_id uuid, variant_id uuid, supplier_id uuid, source_url text, verification text, variant_key text, availability text);
      create table supplier_sync_queue(id uuid primary key default gen_random_uuid(), product_id uuid, variant_id uuid, supplier_id uuid, offer_id uuid, source_url text,
        state text, attempts integer default 0, last_success_at timestamptz, last_error text, next_run_at timestamptz, leased_until timestamptz, updated_at timestamptz default now());
      create table dispatched(job text);
      create function enqueue_supplier_cloud_tick_v1(job_input text) returns bigint language sql as
        $$insert into dispatched(job) values(job_input); select 1::bigint$$;
      insert into supplier_tracking_settings values (true,'{"enabled":true}');
      insert into products(title,fulfillment_mode) values ('A - Con ficha','supplier'),('B - Error','supplier'),('C - Reintento pendiente','supplier'),('D - Sin enlace','supplier');
      insert into products(title,fulfillment_mode,has_variants) values ('E - Variantes','supplier',true);
      insert into products(title,fulfillment_mode) select 'F - Inventario ' || n,'own_stock' from generate_series(1,938) n;
      insert into products(title,fulfillment_mode,deleted_at) values ('Archivado','supplier',now());
      insert into suppliers(is_active,automation_authorized,query_mode) values (true,true,'product_page');
      insert into product_variants(product_id,is_active,fulfillment_mode)
        select p.id,true,'supplier' from products p cross join generate_series(1,2) where p.title='E - Variantes';
      insert into supplier_offers(product_id,supplier_id,source_url,verification,variant_key,availability)
        select p.id,s.id,'https://supplier.test/' || left(p.title,1),'verified','base','in_stock'
        from products p cross join suppliers s where left(p.title,1) in ('A','B','C') and p.deleted_at is null;
      insert into supplier_offers(product_id,variant_id,supplier_id,source_url,verification,variant_key,availability)
        select v.product_id,v.id,s.id,'https://supplier.test/E','verified','attribute:1','out_of_stock'
        from product_variants v cross join suppliers s order by v.id limit 1;
      insert into supplier_sync_queue(product_id,variant_id,supplier_id,offer_id,source_url,state,next_run_at)
        select product_id,variant_id,supplier_id,id,source_url,
          case when source_url like '%/C' then 'retry' else 'ready' end,
          now()+interval '4 hours' from supplier_offers;
    `);
    await db.exec(readFileSync("supabase/migrations/20261104204457_supplier_catalog_sync_progress.sql", "utf8"));
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select start_supplier_catalog_sync_v1()"), /Forbidden/);
    await assert.rejects(db.query("select read_supplier_catalog_sync_v1(1)"), /Forbidden/);
    await db.exec("select set_config('test.admin','yes',false)");
    const read = async (page = 1) => (await db.query<{ snapshot: CatalogSyncSnapshot }>(
      "select read_supplier_catalog_sync_v1($1) snapshot", [page],
    )).rows[0].snapshot;
    const started = await db.query<{ id: string }>("select start_supplier_catalog_sync_v1() id");
    assert.equal((await db.query<{ id: string }>("select start_supplier_catalog_sync_v1() id")).rows[0].id, started.rows[0].id);
    const first = await read();
    assert.equal(first.total, 943);
    assert.equal(first.processed, 940);
    assert.equal(first.own, 938);
    assert.equal(first.review, 2);
    assert.equal(first.queries, 0);
    assert.equal(first.finishedAt, null);
    assert.deepEqual(first.rows.slice(0, 5).map(p => p.status), ["pending", "pending", "review", "review", "pending"]);
    assert.equal((await read(38)).rows.at(-1)?.position, 943);

    await db.exec("reset role");
    assert.equal((await db.query("select * from dispatched")).rows.length, 1);
    await db.exec("set role service_role");
    assert.equal((await db.query("select id from claim_supplier_jobs_v1(10)")).rows.length, 3);
    await db.exec("reset role");
    await db.exec("update supplier_sync_queue set state='ready',last_success_at=now(),leased_until=null where source_url like '%/A'");
    await db.exec("set role authenticated");
    const middle = await read();
    assert.equal(middle.processed, 941);
    assert.equal(middle.checked, 1);
    assert.equal(middle.queries, 1);
    assert.equal(middle.recent[0].available, 1);

    await db.exec("reset role");
    await db.exec(`
      update supplier_sync_queue set state='retry',attempts=1,last_error='HTTP 404',leased_until=null,
        next_run_at=now()+interval '1 day' where source_url like '%/B';
      update supplier_sync_queue set state='ready',last_success_at=now(),leased_until=null where source_url like '%/E';
      set role authenticated;
    `);
    const final = await read();
    assert.equal(final.processed, 943);
    assert.equal(final.queries, 2);
    assert.equal(final.issues, 2);
    assert.ok(final.finishedAt);
    assert.equal(final.rows[1].message, "HTTP 404");
    assert.equal(final.rows[4].available, 0);
    assert.equal(final.rows[4].missing_variants, true);
  } finally {
    await db.close();
  }
});
