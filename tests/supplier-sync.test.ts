import test from "node:test";
import assert from "node:assert/strict";
import { checkSupplierProductAvailability } from "../src/lib/supplier-sync";

test("supplier sync returns no_url status when product lacks url and sku", async () => {
  const result = await checkSupplierProductAvailability(null, null, null);
  assert.equal(result.available, false);
  assert.equal(result.status, "no_url");
});

test("supplier sync handles 404 response cleanly", async () => {
  const fakeUrl = "https://httpstat.us/404";
  const result = await checkSupplierProductAvailability(fakeUrl);
  assert.equal(result.available, false);
  assert.equal(result.status, "not_found");
});
