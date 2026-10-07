import test from "node:test";
import assert from "node:assert/strict";
import { checkSupplierProductAvailability, runBatchSupplierStockSync } from "../src/lib/supplier-sync";
import type { SupabaseClient } from "@supabase/supabase-js";

test("supplier sync returns no_url status when product lacks url and sku", async () => {
  const result = await checkSupplierProductAvailability(null, null, null);
  assert.equal(result.available, false);
  assert.equal(result.status, "no_url");
});

test("supplier sync handles 404 response cleanly", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 404 });
  const fakeUrl = "https://atacadousa.com.py/missing";
  try {
  const result = await checkSupplierProductAvailability(fakeUrl);
  assert.equal(result.available, false);
  assert.equal(result.status, "not_found");
  } finally { globalThis.fetch = original; }
});

test("supplier sync does not infer stock from a generic successful page", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("<html><body>Producto</body></html>", { status: 200 }));
  const result = await checkSupplierProductAvailability("https://proveedor.example/producto");
  assert.equal(result.available, false);
  assert.equal(result.status, "error");
});

test("supplier sync requires a price signal on known supplier pages", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("<html><body>Producto</body></html>", { status: 200 }));
  const result = await checkSupplierProductAvailability("https://www.totalherramientasoficial.com.py/producto");
  assert.equal(result.available, false);
  assert.equal(result.status, "error");
});

test("batch stops before opening requests when its time budget is exhausted", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; throw new Error("Unexpected supplier request"); });
  const query = { select() { return this; }, eq() { return this; }, not() { return this; }, order() { return this; }, async limit() { return { data: [{ id: "a", title: "a", sku: "1", brand: "Total", source_url: "https://www.totalherramientasoficial.com.py/a" }], error: null }; } };
  const client = { from: () => query, rpc: () => { throw new Error("Unexpected write"); } } as unknown as SupabaseClient;
  const result = await runBatchSupplierStockSync({ client, timeBudgetMs: 0 });
  assert.equal(result.total, 1);
  assert.equal(result.checked, 0);
  assert.equal(calls, 0);
});
