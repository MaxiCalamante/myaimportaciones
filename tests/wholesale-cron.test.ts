import test from "node:test";
import assert from "node:assert/strict";
import { runWholesalePriceRefresh } from "../src/lib/wholesale-v2-worker";
import type { SupabaseClient } from "@supabase/supabase-js";

test("runWholesalePriceRefresh handles uninstalled RPC gracefully", async () => {
  const fakeDb = {
    rpc: async (name: string) => {
      assert.equal(name, "refresh_wholesale_prices_v1");
      return { data: null, error: { code: "PGRST202", message: "function not found" } };
    },
  } as unknown as SupabaseClient;

  const res = await runWholesalePriceRefresh(fakeDb, 50);
  assert.deepEqual(res, { installed: false, enabled: false, checked: 0, applied: 0 });
});

test("runWholesalePriceRefresh throws generic error when RPC fails with unexpected error", async () => {
  const fakeDb = {
    rpc: async () => {
      return { data: null, error: { code: "P0001", message: "Something failed" } };
    },
  } as unknown as SupabaseClient;

  await assert.rejects(
    () => runWholesalePriceRefresh(fakeDb, 50),
    /No se pudieron revisar los precios mayoristas/
  );
});

test("runWholesalePriceRefresh returns result when RPC succeeds", async () => {
  const fakeDb = {
    rpc: async (name: string, args: { limit_input: number }) => {
      assert.equal(name, "refresh_wholesale_prices_v1");
      assert.equal(args.limit_input, 100);
      return { data: { enabled: true, checked: 100, applied: 12 }, error: null };
    },
  } as unknown as SupabaseClient;

  const res = await runWholesalePriceRefresh(fakeDb, 100);
  assert.deepEqual(res, { installed: true, enabled: true, checked: 100, applied: 12 });
});
