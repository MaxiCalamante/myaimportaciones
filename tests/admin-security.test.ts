import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("supplier RLS and catalog column grants protect private data for guests and customers", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$; grant usage on schema auth to authenticated;
      create schema storage; create table storage.buckets(id text primary key,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid,bucket_id text); insert into storage.buckets(id) values('product-images');`);
    let schema = readFileSync("supabase/schema.sql", "utf8");
    schema = schema.slice(schema.indexOf("do $$"), schema.indexOf("create or replace function public.handle_new_user"));
    await db.exec(schema);
    await db.exec(`create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
      create function public.is_admin() returns boolean language sql security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
      grant all on products to authenticated; grant select on products to anon;`);
    await db.exec(readFileSync("supabase/migrations/20260921134833_retail_integrity.sql", "utf8"));
    await db.exec(readFileSync("supabase/migrations/20260921185112_catalog_identity.sql", "utf8"));
    await db.exec(readFileSync("supabase/migrations/20260922140934_supplier_fulfillment.sql", "utf8"));
    await db.exec(readFileSync("supabase/migrations/20260928150000_supplier_stock_sync.sql", "utf8"));
    await db.exec(`alter table products enable row level security; create policy public_read on products for select using(is_active); create policy admin_write on products for all using(is_admin()) with check(is_admin());
      insert into auth.users values('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
      insert into profiles(id,role) values('11111111-1111-1111-1111-111111111111','admin'),('22222222-2222-2222-2222-222222222222','customer');
      insert into categories(id,name,slug) values('33333333-3333-3333-3333-333333333333','Rubro','rubro');
      insert into products(category_id,title,slug,source_url,supplier_live_price) values('33333333-3333-3333-3333-333333333333','Producto','producto','https://private.test',25);`);
    await db.exec(readFileSync("supabase/migrations/20260930200323_admin_suppliers_and_catalog_security.sql", "utf8"));
    await db.exec("set role anon");
    assert.equal((await db.query("select title from products")).rows.length, 1);
    await assert.rejects(db.query("select source_url from products"), /permission denied/);
    await assert.rejects(db.query("select admin_catalog_page()"), /permission denied/);
    await assert.rejects(db.query("select * from suppliers"), /permission denied/);
    await db.exec("reset role; set role authenticated; select set_config('test.uid','22222222-2222-2222-2222-222222222222',false)");
    assert.equal((await db.query("select * from suppliers")).rows.length, 0);
    await assert.rejects(db.query("insert into suppliers(name) values('No autorizado')"), /row-level security/);
    await assert.rejects(db.query("select supplier_live_price from products"), /permission denied/);
    await assert.rejects(db.query("select admin_catalog_page()"), /Forbidden/);
    await assert.rejects(db.query("select update_product_supplier_sync_v1((select id from products limit 1),true,'in_stock',1)"), /Forbidden/);
    await db.exec("select set_config('test.uid','11111111-1111-1111-1111-111111111111',false)");
    await db.query("insert into suppliers(name,phone) values('Proveedor real','5492491234567')");
    assert.equal((await db.query("select * from suppliers")).rows.length, 1);
    const rows = (await db.query<{ rows: { source_url: string }[] }>("select admin_catalog_page() as rows")).rows[0].rows;
    assert.equal(rows[0].source_url, "https://private.test");
    // Normal admin writes with public returning fields continue working after column revocation.
    await db.query("update products set source_url='https://new.test' where slug='producto' returning id");
    await assert.rejects(db.query("select admin_catalog_page(0,1001)"), /Invalid page/);
  } finally { await db.close(); }
});
