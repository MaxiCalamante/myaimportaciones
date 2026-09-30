import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { PUBLIC_PRODUCT_COLUMNS } from "../src/lib/catalog-data.ts";
import { defaultCarouselSlides } from "../src/lib/carousel.ts";

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(base && key, "Supabase configuration required");
assert.equal(new URL(base).hostname, "gqcdurxndbeeugjfworx.supabase.co");
const checks = [];
async function request(path, method = "GET", payload = {}) {
  const response = await fetch(`${base}/rest/v1/${path}`, {
    method, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    ...(method === "POST" ? { body: JSON.stringify(payload) } : {}),
  });
  checks.push({ path, method, status: response.status });
  return response;
}
const publicCatalog = await request(`products?select=${PUBLIC_PRODUCT_COLUMNS}&limit=1`);
assert.equal(publicCatalog.status, 200);
assert.deepEqual(await publicCatalog.json(), []);
for (const path of ["products?select=source_url&limit=1", "products?select=supplier_live_price&limit=1", "suppliers?select=id&limit=1", "storefront_carousel?select=slides&limit=1"]) {
  const response = await request(path);
  assert.ok([401, 403].includes(response.status), `${path}: private read permitted`);
}
const carousel = await request("rpc/public_carousel_slides", "POST");
assert.equal(carousel.status, 200);
assert.deepEqual(await carousel.json(), defaultCarouselSlides);
for (const path of ["rpc/admin_catalog_page", "rpc/update_product_supplier_sync_v1"]) {
  const response = await request(path, "POST", path.endsWith("sync_v1") ? { product_id_input: "00000000-0000-4000-8000-000000000000", available_input: false, status_input: "permission_check" } : {});
  assert.ok([401, 403].includes(response.status), `${path}: private RPC exposed`);
}
await mkdir("docs/launch-validation", { recursive: true });
await writeFile("docs/launch-validation/supabase-release-results.json", JSON.stringify({ date: "2026-09-30", project: "gqcdurxndbeeugjfworx", checks, remoteCatalogWrites: false, storageUploadTest: false, realAdminBrowserSession: false }, null, 2));
console.log(JSON.stringify({ passed: checks.length, privateColumnsBlocked: true, originalCarouselPersisted: true }));
