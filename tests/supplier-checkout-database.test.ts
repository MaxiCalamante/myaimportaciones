import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;`);
  const schema = readFileSync("supabase/schema.sql", "utf8");
  await db.exec(schema.slice(schema.indexOf("do $$"), schema.indexOf("create or replace function public.handle_new_user")));
  await db.exec(`create function public.is_admin() returns boolean language sql stable as $$select coalesce(current_setting('test.admin',true),'false')='true'$$;`);
  for (const name of ["20260921134833_retail_integrity.sql", "20260921185112_catalog_identity.sql", "20260922140934_supplier_fulfillment.sql", "20261019150000_product_variants_system.sql", "20261022133000_product_soft_delete_and_recycle_bin.sql"]) {
    await db.exec(readFileSync(`supabase/migrations/${name}`, "utf8"));
  }
  await db.exec(`alter table products add column supplier_last_checked_at timestamptz;
    create table suppliers(id uuid primary key,name text,is_active boolean default true,freshness_hours integer default 24);
    create table supplier_offers(id uuid primary key,supplier_id uuid references suppliers(id),product_id uuid references products(id),variant_id uuid references product_variants(id),external_id text,variant_key text,title text,source_url text,origin_cost numeric,currency text,availability text,verification text,cost_checked_at timestamptz,availability_checked_at timestamptz,last_error text);
    grant select on products,product_variants,product_costs,suppliers,supplier_offers to service_role;
    grant all on orders,order_items to service_role;
    grant select on profiles to authenticated;
    grant usage on schema auth to service_role,authenticated;`);
  for (const name of readdirSync("supabase/migrations").filter(name => name.endsWith("_supplier_checkout_operations.sql"))) {
    await db.exec(readFileSync(`supabase/migrations/${name}`, "utf8"));
  }
  const category = randomUUID(), product = randomUUID(), own = randomUUID(), supplier = randomUUID(), offer = randomUUID(), variant = randomUUID();
  await db.query("insert into categories(id,name,slug)values($1,'Test','test')", [category]);
  await db.query("insert into products(id,category_id,title,slug,retail_price,stock,fulfillment_mode,supplier_available)values($1,$2,'Supplier','supplier',1000,0,'supplier',true)", [product,category]);
  await db.query("insert into products(id,category_id,title,slug,retail_price,stock,stock_verified_at)values($1,$2,'Own stock','own',1000,3,now())", [own,category]);
  await db.query("insert into suppliers(id,name)values($1,'Supplier')", [supplier]);
  await db.query("insert into supplier_offers(id,supplier_id,product_id,external_id,variant_key,title,source_url,origin_cost,currency,availability,verification,cost_checked_at,availability_checked_at)values($1,$2,$3,'exact','base','Supplier','https://supplier.example.test/item',500,'ARS','in_stock','verified',now(),now())", [offer,supplier,product]);
  await db.query("insert into product_costs(product_id,origin_cost,currency,exchange_rate,freight_per_unit,variable_cost,payment_fee_percent,minimum_contribution,expenses_confirmed,supplier_url)values($1,500,'ARS',1,100,10,5,100,true,'https://supplier.example.test/item')", [product]);
  const payload = { request_id: randomUUID(), request_hash: "hash", payment: "mercado_pago", name: "Test Customer", email: "buyer@example.test", items: [{ id: product, quantity: 1, price: 1000 }], subtotal: 1000, discount: 0, shipping: 0, total: 1000 };
  const create = async (p: object = payload) => (await db.query<{o:{id:string}}>("select create_retail_order_v2($1::jsonb)o", [JSON.stringify(p)])).rows[0].o;
  const service = () => db.exec("set role service_role");
  const owner = () => db.exec("reset role");
  return { db, product, own, supplier, offer, variant, payload, create, service, owner };
}

test("supplier checkout rejects stale/error/inactive/mismatched offer evidence atomically", async () => {
  const f = await fixture(); try {
    for (const mutation of [
      "update supplier_offers set availability_checked_at=now()-interval '25 hours'",
      "update supplier_offers set cost_checked_at=now()-interval '25 hours'",
      "update supplier_offers set last_error='timeout'",
      "update supplier_offers set verification='pending'",
      "update supplier_offers set availability='unknown'",
      "update supplier_offers set origin_cost=600",
      "update suppliers set is_active=false",
      "update suppliers set freshness_hours=1;update supplier_offers set availability_checked_at=now()-interval '2 hours'",
    ]) {
      await f.db.exec("begin"); await f.db.exec(mutation); await f.service();
      await assert.rejects(f.create(), /Supplier|supplier|cost|evidence/);
      await f.db.exec("rollback");
    }
    assert.equal((await f.db.query<{n:number}>("select count(*)::int n from orders")).rows[0].n, 0);
    await f.db.query("insert into product_variants(id,product_id,title,retail_price,fulfillment_mode,supplier_available)values($1,$2,'Exact variant',1000,'supplier',true)", [f.variant,f.product]);
    await f.db.query("update products set has_variants=true where id=$1", [f.product]);
    await f.service();
    await assert.rejects(f.create({...f.payload,items:[{id:f.product,variant_id:f.variant,quantity:1,price:1000}]}), /Supplier|supplier|evidence/);
    await assert.rejects(f.create(), /variant/i);
    await f.owner(); await f.db.query("update supplier_offers set variant_id=$1",[f.variant]); await f.service();
    const order = await f.create({...f.payload,items:[{id:f.product,variant_id:f.variant,quantity:1,price:1000}]});
    assert.ok(order.id);
  } finally { await f.db.close(); }
});

test("supplier checkout requires complete current costs and preserves the contribution after discounts", async () => {
  const f = await fixture(); try {
    for (const mutation of ["delete from product_costs", "update product_costs set expenses_confirmed=false", "update product_costs set verified_at=now()-interval '31 days'", "update product_costs set minimum_contribution=400"]) {
      await f.db.exec("begin"); await f.db.exec(mutation); await f.service();
      await assert.rejects(f.create(), /cost|contribution/i); await f.db.exec("rollback");
    }
    await f.service();
    await assert.rejects(f.create({...f.payload,discount:300,total:700}), /contribution/i);
    const order = await f.create({...f.payload,discount:100,total:900});
    const snapshot = (await f.db.query<{basis:{landed_cost:number;unit_price:number;discount_per_unit:number;offer:{id:string}}}>("select basis from order_supply_snapshots where order_id=$1", [order.id])).rows[0].basis;
    assert.equal(snapshot.landed_cost,600); assert.equal(snapshot.unit_price,1000); assert.equal(snapshot.discount_per_unit,100); assert.equal(snapshot.offer.id,f.offer);
    await f.owner(); await f.db.exec("update product_costs set origin_cost=900;update supplier_offers set origin_cost=900,last_error='later outage';update products set retail_price=2000"); await f.service();
    assert.equal((await f.create({...f.payload,discount:100,total:900})).id,order.id,"retries use the immutable accepted order despite later supplier changes");
    assert.equal((await f.db.query<{basis:unknown}>("select basis from order_supply_snapshots where order_id=$1",[order.id])).rows[0].basis && (await f.db.query<{basis:{landed_cost:number}}>("select basis from order_supply_snapshots where order_id=$1",[order.id])).rows[0].basis.landed_cost,600);
    await assert.rejects(f.db.query("update order_supply_snapshots set basis='{}'"), /immutable|permission/i);
    await f.owner(); await f.db.exec("set role authenticated");
    assert.equal((await f.db.query("select * from order_supply_snapshots")).rows.length,0,"customers cannot read cost evidence");
    await assert.rejects(f.db.query("select supplier_checkout_quote_v1($1::jsonb,'mercado_pago')",[JSON.stringify(f.payload.items)]), /permission|Forbidden/i);
  } finally { await f.db.close(); }
});

test("own stock, duplicate payments, refunds, late payments and transfer validation remain compatible", async () => {
  const f=await fixture();try {
    await f.service();
    const own=await f.create({...f.payload,request_id:randomUUID(),items:[{id:f.own,quantity:1,price:1000}]});
    await f.db.query("select reconcile_retail_payment_v2($1,'payment-1',1000,'approved')",[own.id]);
    await f.db.query("select reconcile_retail_payment_v2($1,'payment-1',1000,'approved')",[own.id]);
    assert.equal((await f.db.query<{stock:number}>("select stock from products where id=$1",[f.own])).rows[0].stock,2);
    await f.db.query("select reconcile_retail_payment_v2($1,'payment-2',1000,'approved')",[own.id]);
    await f.owner();await f.db.exec("set role authenticated;select set_config('test.admin','true',false)");
    await assert.rejects(f.db.query("select set_retail_order_status_v2($1,'preparing')",[own.id]),/review/i);
    await f.owner();await f.service();
    const refunded=await f.create({...f.payload,request_id:randomUUID()});
    await f.db.query("select reconcile_retail_payment_v2($1,'refund-payment',1000,'approved')",[refunded.id]);
    await f.db.query("select reconcile_retail_payment_v2($1,'refund-payment',1000,'refunded')",[refunded.id]);
    await f.owner();await f.db.exec("set role authenticated");
    await assert.rejects(f.db.query("select set_retail_order_status_v2($1,'preparing')",[refunded.id]),/review/i);
    await f.owner();await f.service();
    const transfer=await f.create({...f.payload,request_id:randomUUID(),payment:'transferencia'});
    await f.owner();await f.db.exec("set role authenticated");await f.db.query("select set_retail_order_status_v2($1,'paid')",[transfer.id]);
    assert.equal((await f.db.query<{status:string}>("select status from orders where id=$1",[transfer.id])).rows[0].status,'paid');
    await f.owner();await f.service();
    const late=await f.create({...f.payload,request_id:randomUUID()});await f.db.query("update orders set reservation_expires_at=now()-interval '1 minute' where id=$1",[late.id]);await f.db.query("select expire_retail_reservations_v2()");
    await f.db.query("select reconcile_retail_payment_v2($1,'late',1000,'approved')",[late.id]);
    assert.deepEqual((await f.db.query("select status::text,payment_review from orders where id=$1",[late.id])).rows[0],{status:'cancelled',payment_review:true});
  }finally{await f.db.close();}
});

test("logistics updates are private, versioned, idempotent and never mark payment as paid",async()=>{
  const f=await fixture();try{
    await f.service();const order=await f.create();
    const item=(await f.db.query<{id:string}>("select id from order_items where order_id=$1",[order.id])).rows[0].id;
    const request=randomUUID();
    const update=(version:number,payload:object,requestId=request)=>f.db.query<{v:{version:number;status:string}}>("select set_order_supply_operation_v1($1,$2,$3,$4::jsonb)v",[item,version,requestId,JSON.stringify(payload)]);
    await f.owner();await f.db.exec("set role authenticated");
    await assert.rejects(update(0,{status:'supplier_confirmed'}),/Forbidden/i);
    await f.db.exec("select set_config('test.admin','true',false)");
    const payload={status:'supplier_confirmed',supplier_id:f.supplier,responsible:'Compras MYA',estimated_cost:600,actual_cost:null,tracking_code:'',notes:'Proveedor confirmó la variante exacta.'};
    const confirmed=(await update(0,payload)).rows[0].v;
    assert.equal(confirmed.version,1);assert.equal((await update(0,payload)).rows[0].v.version,1);
    await assert.rejects(update(0,{...payload,notes:'changed'}),/Idempotency/i);
    await assert.rejects(update(0,payload,randomUUID()),/changed|version/i);
    await assert.rejects(update(1,{...payload,status:'purchased'},randomUUID()),/paid|payment/i);
    assert.equal((await f.db.query<{status:string}>("select status from orders where id=$1",[order.id])).rows[0].status,'pending');
    await f.owner();await f.service();await f.db.query("select reconcile_retail_payment_v2($1,'op-paid',1000,'approved')",[order.id]);
    await f.owner();await f.db.exec("set role authenticated");
    const purchased=(await update(1,{...payload,status:'purchased',actual_cost:620},randomUUID())).rows[0].v;
    assert.equal(purchased.version,2);
    assert.equal((await f.db.query("select * from order_supply_operation_history")).rows.length,2);
    await assert.rejects(f.db.query("update order_supply_operations set actual_cost=1"),/permission/i);
    await f.db.exec("select set_config('test.admin','false',false)");assert.equal((await f.db.query("select * from order_supply_operations")).rows.length,0);
  }finally{await f.db.close();}
});
