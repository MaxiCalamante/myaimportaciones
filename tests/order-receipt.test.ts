import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { findOrderReceipt } from "../src/lib/order-receipt";

const receipt = { id: "11111111-1111-4111-8111-111111111111", tracking_code: "ORD-TEST", shipping_name: "Synthetic buyer", shipping_address: "Private address" };

function fixture() {
  const requests: URL[] = [];
  let attempts = 0;
  const db = createClient("https://receipt.example.test", "test-key", {
    global: { fetch: async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      const matches = (url.searchParams.get("id") === `eq.${receipt.id}` || url.searchParams.get("tracking_code") === `eq.${receipt.tracking_code}`) && url.searchParams.get("customer_email") === "eq.buyer@example.test";
      return new Response(JSON.stringify(matches ? receipt : null), { status: 200, headers: { "Content-Type": "application/json" } });
    } },
  });
  return { db, requests, consume: async () => { attempts++; }, get attempts() { return attempts; } };
}

test("receipt requires the purchase email for both public codes and UUIDs, with exact matching", async () => {
  const f = fixture();
  for (const id of [receipt.id, " ord-test "]) {
    assert.equal(await findOrderReceipt(f.db, id, "other@example.test", f.consume), null);
    assert.equal((await findOrderReceipt(f.db, id, " BUYER@example.test ", f.consume))?.shipping_name, receipt.shipping_name);
  }
  assert.equal(await findOrderReceipt(f.db, "ORD-%", "buyer@example.test", f.consume), null);
  assert.equal(f.attempts, 5);
  assert.ok(f.requests.every(url => url.searchParams.has("customer_email")));
  assert.ok(f.requests.every(url => !url.searchParams.get("select")?.includes("order_notes")));
});

test("receipt rejects missing or malformed identity before querying orders", async () => {
  const f = fixture();
  for (const email of [undefined, null, "", "not-email", {}, "x".repeat(255)]) {
    assert.equal(await findOrderReceipt(f.db, receipt.id, email, f.consume), null);
  }
  for (const id of [undefined, null, "", " ", {}, "x".repeat(81)]) {
    assert.equal(await findOrderReceipt(f.db, id, "buyer@example.test", f.consume), null);
  }
  assert.equal(f.attempts, 0);
  assert.equal(f.requests.length, 0);
});

test("receipt fails closed when attempt limits or database reads fail", async () => {
  const f = fixture();
  assert.equal(await findOrderReceipt(f.db, receipt.id, "buyer@example.test", async () => { throw new Error("rate limit"); }), null);
  assert.equal(f.requests.length, 0);
  const unavailable = createClient("https://receipt.example.test", "test-key", { global: { fetch: async () => new Response('{"message":"unavailable"}', { status: 503 }) } });
  assert.equal(await findOrderReceipt(unavailable, receipt.id, "buyer@example.test", f.consume), null);
});
