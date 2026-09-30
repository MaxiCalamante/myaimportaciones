import test from "node:test";
import assert from "node:assert/strict";
import { parseProductForm, parseSpecifications, productImageUrl, validateImageContent } from "../src/lib/admin-product";
import { mapProduct, type DbProduct } from "../src/lib/catalog-data";
import { parseSupplier } from "../src/lib/suppliers";
import { prepareProductImages } from "../src/lib/admin-media";
import type { SupabaseClient } from "@supabase/supabase-js";

function form() {
  const f = new FormData();
  f.set("title", "Producto real"); f.set("category_id", "11111111-1111-1111-1111-111111111111");
  f.set("fulfillment_mode", "supplier"); f.set("retail_price", "12000");
  return f;
}
test("product drafts do not invent availability, wholesale price or stock verification", () => {
  const f = form(); f.set("retail_price", "");
  const draft = parseProductForm(f, true);
  assert.equal(draft.fields.is_active, false); assert.equal(draft.fields.supplier_available, false);
  assert.equal(draft.fields.wholesale_price, 0); assert.equal(draft.stock, 0);
  f.set("is_active", "on"); assert.throws(() => parseProductForm(f, true), /precio/);
});
test("server rejects corrupt amounts, physical stock and invalid specifications", () => {
  for (const price of ["NaN", "-1", "Infinity", "10000000000"]) { const f = form(); f.set("retail_price", price); assert.throws(() => parseProductForm(f, true)); }
  const f = form(); f.set("stock", "3"); assert.throws(() => parseProductForm(f, true), /stock físico/);
  f.set("fulfillment_mode", "own_stock"); assert.throws(() => parseProductForm(f, true), /conteo/);
  f.set("stock_confirmed", "on"); assert.equal(parseProductForm(f, true).stock, 3);
  f.set("stock", "1.5"); assert.throws(() => parseProductForm(f, true));
  assert.throws(() => parseSpecifications('["not a specification"]'));
  assert.throws(() => parseSpecifications('{"__proto__":"bad"}'));
  f.set("stock", "0"); f.set("specifications", "Contenido: 50 ml"); f.set("weight_kg", "0.25");
  assert.deepEqual(parseProductForm(f, false).fields.specifications, { Contenido: "50 ml", peso_kg: "0.25" });
  f.set("specifications", ""); f.set("weight_kg", ""); assert.deepEqual(parseProductForm(f, false).fields.specifications, {});
});
test("media rejects unsafe URLs and forged image types before uploading", async () => {
  for (const url of ["javascript:alert(1)", "//evil.test/x.jpg", "https://evil.test/x.jpg", "https://user:pass@cdn.shopify.com/x.jpg"]) assert.throws(() => productImageUrl(url));
  assert.equal(productImageUrl("https://cdn.shopify.com/x.jpg"), "https://cdn.shopify.com/x.jpg");
  await assert.rejects(validateImageContent(new File(["<script>bad</script>"], "fake.jpg", { type: "image/jpeg" })), /imagen válida/);
  let uploads = 0;
  const db = { storage: { from: () => ({ upload: async () => { uploads++; return { error: null }; } }) } } as unknown as SupabaseClient;
  const f = form(); f.set("gallery_present", "true"); f.append("keep_image_url", "https://cdn.shopify.com/other.jpg");
  await assert.rejects(prepareProductImages(db, f, ["https://cdn.shopify.com/original.jpg"]), /galería cambió/);
  f.delete("keep_image_url"); f.append("images", new File(["bad"], "fake.jpg", { type: "image/jpeg" }));
  await assert.rejects(prepareProductImages(db, f)); assert.equal(uploads, 0);
});
test("public mapping strips costs and supplier sources, admin mapping preserves original editable text", () => {
  const row = { id: "1", slug: "item", title: "MEDICUBE MEDICUBE Item", category_id: "1", categories: { name: "Rubro" }, source_url: "https://supplier.test/item", supplier_live_price: 50, supplier_stock_status: "checked", retail_price: 100, description: "100% Original Garantizado", stock: 0, fulfillment_mode: "supplier", supplier_available: true } as DbProduct;
  const publicProduct = mapProduct(row), adminProduct = mapProduct(row, true);
  assert.equal("sourceUrl" in publicProduct, false); assert.equal("supplierLivePrice" in publicProduct, false); assert.equal("supplierStockStatus" in publicProduct, false);
  assert.equal(adminProduct.sourceUrl, row.source_url); assert.equal(adminProduct.title, row.title); assert.equal(adminProduct.description, row.description);
});
test("supplier contacts reject unsafe links and normalize international phones", () => {
  const f = new FormData(); f.set("name", "Proveedor real"); f.set("phone", "+54 9 249 123-4567"); f.set("is_active", "on");
  assert.equal(parseSupplier(f).values.phone, "5492491234567");
  f.set("website", "javascript:alert(1)"); assert.throws(() => parseSupplier(f));
  f.set("website", "https://supplier.test"); f.set("email", "wrong"); assert.throws(() => parseSupplier(f), /email/);
});
