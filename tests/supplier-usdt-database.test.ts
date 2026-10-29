import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("USDT prices require approval, live unchanged USD evidence, matching snapshots and private permissions", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
      create function auth.uid() returns uuid language sql as $$select null::uuid$$;
      create function public.is_admin() returns boolean language sql as $$select current_setting('test.admin',true)='true'$$;
      create table products(id uuid primary key,is_active boolean default true,deleted_at timestamptz,fulfillment_mode text default 'supplier',retail_price numeric,wholesale_price numeric,stock integer default 7,updated_at timestamptz);
      create table product_costs(product_id uuid primary key,currency text,origin_cost numeric,exchange_rate numeric,landed_cost numeric);
      create table product_variants(id uuid primary key,product_id uuid);
      create table supplier_offers(id uuid primary key default gen_random_uuid(),product_id uuid,variant_id uuid,verification text,currency text,origin_cost numeric,availability text,last_error text,cost_checked_at timestamptz,availability_checked_at timestamptz,evidence jsonb);
      create table supplier_market_references(id uuid primary key default gen_random_uuid(),product_id uuid,variant_id uuid,identity_verified boolean,last_error text,checked_at timestamptz,price_ars numeric);
      create table supplier_price_decisions(id uuid primary key default gen_random_uuid(),product_id uuid,offer_id uuid,reference_id uuid,old_price numeric,new_price numeric,landed_ars numeric,status text,reason text,basis jsonb,created_at timestamptz default now());
      create table supplier_tracking_settings(id boolean primary key,config jsonb,updated_at timestamptz);
      insert into supplier_tracking_settings values(true,'{"enabled":true,"autoPrices":true,"acquisitionFxMode":"usdt","roundArs":100,"targetMarginPercent":20,"marketDiscountPercent":10,"maxPriceChangePercent":20}',now());
      grant usage on schema auth to service_role,authenticated;
      grant select on products,product_costs,supplier_tracking_settings,supplier_price_decisions to service_role;
      grant update on supplier_tracking_settings to service_role;
    `);
    await db.exec(readFileSync("supabase/migrations/20261029180902_supplier_usdt_pricing.sql", "utf8"));
    const id = "11111111-1111-4111-8111-111111111111";
    await db.query("insert into products(id,retail_price,wholesale_price)values($1,100000,80000);", [id]);
    await db.query("insert into product_costs values($1,'USD',30,1600,57600)", [id]);
    await db.query("insert into supplier_offers(product_id,verification,currency,origin_cost,availability,cost_checked_at,availability_checked_at) values($1,'verified','USD',30,'in_stock',now(),now())", [id]);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select record_supplier_usdt_quote_v1('{}')"), /permission denied/);
      await assert.rejects(db.query("select apply_supplier_fx_price_v1($1,null)", [id]), /permission denied/);
    }
    await db.exec("reset role;set role service_role");
    const quote = { rateArs: 1660, source: "criptoya-binance-totalAsk", quotedAt: new Date().toISOString(), evidence: { ask: 1659, primaryAsk: 1659 } };
    const qid = (await db.query<{ id: string }>("select record_supplier_usdt_quote_v1($1) id", [quote])).rows[0].id;
    const apply = async () => (await db.query<{ state: string }>("select apply_supplier_fx_price_v1($1,$2) state", [id, qid])).rows[0].state;
    assert.equal(await apply(), "disabled");
    await db.exec("reset role;set role authenticated;select set_config('test.admin','false',false)");
    const expected = { quoteId: qid, prices: { [id]: { retail: 100000, wholesale: 80000, cost:{origin_cost:30,currency:'USD',exchange_rate:1600,landed_cost:57600} } } };
    await assert.rejects(db.query("select enroll_supplier_fx_prices_v1($1,true,$2)", [[id], expected]), /Forbidden/);
    assert.equal((await db.query("select * from supplier_fx_quotes")).rows.length, 0);
    await db.exec("select set_config('test.admin','true',false)");
    await assert.rejects(db.query("select enroll_supplier_fx_prices_v1($1,false,$2)", [[id], expected]), /Forbidden/);
    await db.query("select enroll_supplier_fx_prices_v1($1,true,$2)", [[id], expected]);
    await db.exec("reset role;set role service_role");
    assert.equal(await apply(), "applied");
    assert.deepEqual((await db.query("select retail_price,wholesale_price,stock from products")).rows[0], { retail_price: "103200", wholesale_price: "82500", stock: 7 });
    assert.equal(await apply(), "unchanged");
    assert.equal((await db.query<{exchange_rate:string}>("select exchange_rate from product_costs")).rows[0].exchange_rate, "1600");
    await db.exec("reset role;update products set retail_price=104000;set role service_role");
    assert.equal(await apply(), "blocked"); // Manual edits never get silently overwritten.
    await db.exec("reset role;update products set retail_price=103200;update supplier_offers set cost_checked_at=now()-interval '25 hours';set role service_role");
    assert.equal(await apply(), "blocked");
    await assert.rejects(db.query("select record_supplier_usdt_quote_v1($1)", [{ ...quote, rateArs: 1800, evidence: { ask: 1800, primaryAsk: 1800 } }]), /5 percent/);
    await db.exec("reset role;set role anon");
    await assert.rejects(db.query("select * from supplier_fx_quotes"), /permission denied/);
    await assert.rejects(db.query("select * from supplier_fx_price_bases"), /permission denied/);
  } finally { await db.close(); }
});
