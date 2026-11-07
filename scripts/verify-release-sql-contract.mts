import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(process.argv[2] ?? '');
const backup = resolve(process.argv[3] ?? '');
const read = async (name: string) => JSON.parse(await readFile(resolve(root, `pre-migration-${name}.json`), 'utf8'));
const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select null::uuid$$;
    create function is_admin() returns boolean language sql as $$select coalesce(current_setting('test.admin',true),'false')='true'$$;
    create type account_role as enum ('admin','customer');
    create type customer_tier as enum ('retail','wholesale');
    create type order_status as enum ('pending','paid','preparing','shipped','delivered','cancelled');
    create type payment_method as enum ('transferencia','tarjeta','mercado_pago','efectivo','cuenta_corriente');`);
  const relations: Array<{name:string; columns:Array<{name:string;type:string;default:string|null;generated:string}>}> = await read('relations');
  for (const relation of relations) {
    const keys = ['products','product_variants','supplier_offers','orders','store_exchange_rates'].includes(relation.name) ? ', primary key(id)' : '';
    const columns = relation.columns.map(col => `${quote(col.name)} ${col.type}${col.generated ? ` generated always as (${col.default}) stored` : ''}`).join(',');
    await db.exec(`create table ${quote(relation.name)}(${columns}${keys})`);
  }
  for (const table of ['products','product_variants','orders','order_items','suppliers','supplier_offers']) {
    const data = await readFile(resolve(backup,`${table}.json`), 'utf8');
    await db.query(`insert into ${table} select * from jsonb_populate_recordset(null::${table},$1::jsonb)`, [data]);
  }
  await db.exec(`alter table store_money_settings add primary key(id);
    alter table catalog_supplier_scope_runs add primary key(backup_sha256);
    alter table catalog_supplier_identity_checks add primary key(offer_id);
    alter table product_usd_prices add unique nulls not distinct(product_id,variant_id);
    set check_function_bodies=off;`);
  for (const row of await read('functions') as Array<{definition:string}>) await db.exec(row.definition);
  await db.exec('set check_function_bodies=on');
  const digest = async () => (await db.query(`select
    (select md5(jsonb_agg(to_jsonb(o) order by id)::text) from orders o) orders,
    (select md5(jsonb_agg(to_jsonb(o) order by id)::text) from order_items o) items,
    (select md5(jsonb_agg(to_jsonb(p) order by id)::text) from products p) products,
    (select md5(jsonb_agg(to_jsonb(v) order by id)::text) from product_variants v) variants`)).rows[0];
  const before = await digest();
  const files = [
    '20261106154701_usd_base_pricing.sql',
    '20261106212229_supplier_post_audit_controls.sql',
    '20261106213029_usd_contribution_policy.sql',
    '20261106213412_usd_profitability_integration.sql',
  ];
  for (const name of files) {
    await db.exec(await readFile(`supabase/migrations/${name}`, 'utf8'));
    assert.deepEqual(await digest(), before, name);
    console.log(`PASS ${name} on captured production contracts; historical data unchanged`);
  }
  assert.equal((await db.query<{enforcement:string}>('select enforcement from store_profitability_policy')).rows[0].enforcement,'preview');
  await db.exec('set role anon');
  await assert.rejects(db.query('select store_profitability_workspace_v2()'), /permission denied/);
  await assert.rejects(db.query('select * from store_profitability_profiles'), /permission denied/);
  assert.equal((await db.query('select store_exchange_public_v1()')).rows.length,1);
  await db.exec('reset role');
} finally {
  await db.close();
}
