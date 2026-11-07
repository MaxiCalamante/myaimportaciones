import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const folder = resolve(process.argv[2] ?? '');
const rawPlan = await readFile(resolve(folder, 'plan.json'), 'utf8');
const plan = JSON.parse(rawPlan);
const hash = (raw: string) => createHash('sha256').update(raw).digest('hex');
const digest = (await readFile(resolve(folder, 'plan.sha256'), 'utf8')).trim();
assert.equal(hash(rawPlan), digest);
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create function is_admin() returns boolean language sql as $$select false$$;
    create table suppliers(id uuid primary key, website text, official_key text, is_active boolean, automation_authorized boolean, archived_at timestamptz, freshness_hours integer);
    create table products(id uuid primary key, title text, brand text, model text, sku text, specifications jsonb, is_active boolean, supplier_available boolean, supplier_archived_at timestamptz, supplier_archive_reason text, deleted_at timestamptz, has_variants boolean, retail_price numeric, wholesale_price numeric, stock integer);
    create table product_variants(id uuid primary key, product_id uuid references products, title text, sku text, options jsonb, is_active boolean, supplier_available boolean, supplier_archived_at timestamptz, retail_price numeric, wholesale_price numeric, stock integer);
    create table supplier_offers(id uuid primary key, supplier_id uuid references suppliers, product_id uuid references products, variant_id uuid references product_variants, title text, source_url text, external_id text, variant_key text, model text, brand text, gtin text, verification text, archived_at timestamptz, evidence jsonb, last_error text, last_success_at timestamptz, cost_checked_at timestamptz, availability_checked_at timestamptz);
    create table supplier_link_decisions(id uuid primary key, offer_id uuid references supplier_offers, product_id uuid, variant_id uuid, status text, method text, evidence jsonb);
    create table supplier_sync_queue(id uuid primary key, product_id uuid, variant_id uuid, state text, leased_until timestamptz, last_error text);
    create table orders(id uuid primary key, total_amount numeric, status text, payment_id text, paid_at timestamptz);
    create table order_items(id uuid primary key, order_id uuid references orders, product_id uuid references products, variant_id uuid references product_variants, unit_price numeric, quantity integer);
    alter table products enable row level security;
    alter table product_variants enable row level security;
    grant select on products, product_variants to anon;
    create policy active_products on products for select to anon using (is_active);
    create policy active_variants on product_variants for select to anon using (is_active);
    create function tracker_validate_url_v1(uuid,text) returns void language sql as $$select null::void$$;
    create function store_checkout_prices_v1(items_input jsonb,payment_input text,rate_input uuid) returns jsonb language plpgsql as $$begin if jsonb_typeof(items_input) is null then raise exception 'No items'; end if; return '[]'; end$$;
    create function supplier_checkout_basis_v1(uuid,uuid,numeric,numeric) returns jsonb language plpgsql as $$begin return (select '{}'::jsonb from supplier_offers so where false and so.verification='verified' and so.availability='in_stock'); end$$;
    create function wholesale_quote_basis_impl_v1(uuid,uuid,integer,text,boolean) returns jsonb language plpgsql as $$begin return (select '{}'::jsonb from supplier_offers so where false and so.verification='verified' and so.availability='in_stock'); end$$;
  `);
  const historicalMigration = await readFile('supabase/migrations/20261106163233_four_supplier_tracker.sql', 'utf8');
  const start = historicalMigration.indexOf('create function public.four_supplier_key_v1');
  assert.ok(start >= 0);
  await db.exec(historicalMigration.slice(start, historicalMigration.indexOf('$$;', historicalMigration.indexOf('$$', start) + 2) + 3));

  for (const [table, record] of Object.entries(plan.manifest)) {
    const raw = await readFile(resolve(folder, `${table}.json`), 'utf8');
    const expected = record as { sha256: string; rows: number };
    assert.equal(hash(raw), expected.sha256, table);
    assert.equal(JSON.parse(raw).length, expected.rows, table);
  }
  for (const table of ['suppliers','products','product_variants','supplier_offers','supplier_link_decisions','supplier_sync_queue','orders','order_items']) {
    const raw = await readFile(resolve(folder, `${table}.json`), 'utf8');
    await db.query(`insert into ${table} select * from jsonb_populate_recordset(null::${table}, $1::jsonb)`, [raw]);
  }
  const immutable = async () => (await db.query(`select
    (select jsonb_agg(to_jsonb(o) order by id) from orders o) orders,
    (select jsonb_agg(to_jsonb(i) order by id) from order_items i) items,
    (select jsonb_agg(jsonb_build_array(id,stock,retail_price,wholesale_price) order by id) from products) products,
    (select jsonb_agg(jsonb_build_array(id,stock,retail_price,wholesale_price) order by id) from product_variants) variants`)).rows[0];
  const before = await immutable();
  await db.exec(await readFile('supabase/migrations/20261107040127_final_catalog_supplier_scope.sql', 'utf8'));
  await assert.rejects(db.query('select apply_final_catalog_scope_v1($1,$2)', [{ ...plan, products: plan.products.slice(1) }, digest]), /Catalog changed/);
  const applied = await db.query<{result:Record<string,number>}>('select apply_final_catalog_scope_v1($1,$2) result', [plan,digest]);
  assert.deepEqual(await db.query('select apply_final_catalog_scope_v1($1,$2) result', [plan,digest]).then(x => x.rows), applied.rows);
  assert.deepEqual(await immutable(), before);
  const kept = (await db.query<{id:string}>(`select p.id from products p where p.is_active and not p.has_variants and not exists(select 1 from product_variants v where v.product_id=p.id) limit 1`)).rows[0];
  assert.ok(kept);
  await db.query('select catalog_check_new_sale_v1($1,null)', [kept.id]);
  await assert.rejects(db.query('select catalog_check_new_sale_v1($1,null)', [plan.products[0]]), /Product unavailable/);
  const order = (await db.query<{id:string}>('select id from orders limit 1')).rows[0];
  await assert.rejects(db.query('insert into order_items(id,order_id,product_id,unit_price,quantity) values($1,$2,$3,1,1)', [randomUUID(),order.id,plan.products[0]]), /Product unavailable/);
  await db.exec('set role anon');
  assert.equal((await db.query('select id from products where id=$1', [plan.products[0]])).rows.length, 0);
  assert.equal((await db.query('select id from products where id=$1', [kept.id])).rows.length, 1);
  await assert.rejects(db.query('select * from catalog_supplier_identity_checks'), /permission denied/);
  await assert.rejects(db.query('select apply_final_catalog_scope_v1($1,$2)', [plan,digest]), /permission denied/);
  await db.exec('reset role');
  // Exercise restoring the archived flags from the transactional journal without touching order or monetary fields.
  await db.exec(`update products p set is_active=b.is_active, deleted_at=b.deleted_at, supplier_archived_at=b.supplier_archived_at,
    supplier_archive_reason=b.supplier_archive_reason, supplier_available=b.supplier_available, has_variants=b.has_variants
    from catalog_supplier_scope_runs r, jsonb_populate_recordset(null::products, r.before_state->'products') b where p.id=b.id`);
  assert.equal((await db.query<{n:number}>('select count(*)::int n from products where is_active and deleted_at is null')).rows[0].n,
    plan.summary.retiringPublished + plan.summary.retainedPublished);
  assert.deepEqual(await immutable(), before);
  console.log(JSON.stringify({ ...applied.rows[0], privateBackupVerified: true, restoredProductFlags: true, historicalOrdersAndStockUnchanged: true }));
} finally {
  await db.close();
}
