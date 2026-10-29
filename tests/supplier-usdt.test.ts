import test from "node:test";
import assert from "node:assert/strict";
import { acquisitionFxFresh, parseUsdtQuote, projectFxPrice, refreshSupplierUsdtQuote } from "../src/lib/supplier-usdt";
import type { SupabaseClient } from "@supabase/supabase-js";

const now = Date.parse("2026-10-29T18:00:00Z");
const feed = { binance: { ask: 1653.1, totalAsk: 1654.3398, time: now / 1000 } };
const spot = { symbol: "USDTARS", askPrice: "1653.10" };
test("USDT uses the buy side with fees, validates independent spot evidence and freshness", () => {
  assert.equal(parseUsdtQuote(feed, spot, now).rateArs, 1654.34);
  for (const bad of [null, {}, { binance: { ...feed.binance, time: now / 1000 - 1000 } }, { binance: { ...feed.binance, totalAsk: 1500 } }]) assert.throws(() => parseUsdtQuote(bad, spot, now));
  assert.throws(() => parseUsdtQuote(feed, { ...spot, askPrice: "1400" }, now));
  assert.throws(() => parseUsdtQuote(feed, { ...spot, symbol: "BTCARS" }, now));
  assert.equal(acquisitionFxFresh({ acquisitionArsPerUsd: 1654.34, acquisitionFxMode: "usdt", usdtQuotedAt: "2026-10-28T17:59:59Z" }, now), false);
});

test("fixed FX base preserves registered margins without changing the carrier's ARS costs or compounding rounding", () => {
  const base = { product_id: "p", origin_usd: 30, base_fx: 1660, base_landed: 59400, base_retail: 84900, base_wholesale: 72200, last_retail: 84900, last_wholesale: 72200 };
  const first = projectFxPrice(base, 1700);
  assert.equal(first.landedArs, 60600); // Historical carrier cost remains 9600, rather than being dollarized again.
  assert.equal(first.retail, 86700);
  assert.deepEqual(projectFxPrice({ ...base, last_retail: first.retail }, 1660), { landedArs: 59400, retail: 84900, wholesale: 72200 });
  assert.throws(() => projectFxPrice({ ...base, base_landed: 100 }, 1700));
});

test("a failed quote never writes or refreshes the timestamp of historical evidence", async () => {
  let writes = 0;
  const db = { rpc: async () => { writes++; } } as unknown as SupabaseClient;
  await assert.rejects(refreshSupplierUsdtQuote(db, async () => new Response("error", { status: 503 })));
  assert.equal(writes, 0);
});
