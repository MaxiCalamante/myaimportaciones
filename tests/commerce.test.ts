import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { priceOrder, type PricedItem } from "../src/lib/order-pricing";
import { calculateResale } from "../src/lib/resale-pricing";
import { verifyPaymentSignature } from "../src/lib/payment-signature";
import { calculateShipping, isProductImmediateStock } from "../src/lib/shipping";
const item: PricedItem = { id: "a", title: "Crema", quantity: 1, price: 54900, landedCost: 31000, variableCost: 2000, minimumContribution: 5000, beauty: true };
test("real purchase example and unprofitable market benchmark", () => {
  const i = { purchase: 21000, exchange: 1, freight: 10000, other: 0, variable: 0, feePercent: 0, minimum: 0, ml: 0 };
  assert.equal(calculateResale(i).landed, 31000);
  assert.equal(calculateResale(i).suggested, null);
  assert.equal(calculateResale({ ...i, ml: 30000 }).suggested, null);
  assert.equal(calculateResale({ ...i, ml: 60000 }).suggested, 54000);
  assert.equal(calculateResale({ ...i, feePercent: 10 }).floor, 34445);
});
test("promotions never stack and never consume cost floor", () => {
  const quote = priceOrder([{ ...item, quantity: 3 }], "transferencia", "MYA5", 5200, "7000");
  assert.equal(quote.discount, 16470); assert.equal(quote.total, 153430);
  assert.equal(priceOrder([{ ...item, landedCost: 53000, variableCost: 0, minimumContribution: 0 }], "transferencia", "", 0, "7000").discount, 1900);
  assert.equal(priceOrder([{ ...item, landedCost: null }], "transferencia", "MYA5", 0, "7000").discount, 0);
});
test("negative and fractional quantities and below-cost price are rejected", () => {
  for (const quantity of [-1, 0, 1.5, 101, NaN]) assert.throws(() => priceOrder([{ ...item, quantity }], "transferencia", "", 0, "7000"));
  assert.throws(() => priceOrder([{ ...item, price: 20000 }], "transferencia", "", 0, "7000"));
});
test("webhook signature binds ID and request and expires", () => {
  const ts = "1750000000", secret = "test-only", id = "123", request = "request";
  const digest = createHmac("sha256", secret).update(`id:${id};request-id:${request};ts:${ts};`).digest("hex");
  const signature = `ts=${ts},v1=${digest}`;
  assert.equal(verifyPaymentSignature(signature, request, id, secret, +ts * 1000), true);
  assert.equal(verifyPaymentSignature(signature, request, "124", secret, +ts * 1000), false);
  assert.equal(verifyPaymentSignature(signature, request, id, secret, +ts * 1000 + 700000), false);
  assert.equal(verifyPaymentSignature("v1=bad", request, id, secret), false);
});
test("stock requires verification and no uncosted free shipping", () => {
  assert.equal(isProductImmediateStock({ stock: 35, tags: ["en_stock"] }), false);
  assert.equal(isProductImmediateStock({ stock: 0, stockVerifiedAt: new Date().toISOString() }), false);
  assert.equal(calculateShipping("7000", 999999, true).freeShippingQualified, false);
});


test("catalog pagination includes all pages and rejects partial exports", async () => {
  const { readAllPages } = await import("../src/lib/read-all-pages");
  const source = Array.from({ length: 1203 }, (_, id) => ({ id }));
  const rows = await readAllPages(async (from, to) => ({ data: source.slice(from, to + 1), error: null }));
  assert.deepEqual(rows, source);
  await assert.rejects(readAllPages(async (from, to) => from === 0 ? { data: source.slice(from, to + 1), error: null } : { data: null, error: new Error("offline") }));
});
