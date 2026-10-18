import test from "node:test";
import assert from "node:assert/strict";
import { catalogSeo, productMetadata, productStructuredData, jsonLd } from "../src/lib/seo";
import { merchantFeed, verifiedGtin } from "../src/lib/merchant-feed";
import { resolveSiteOrigin } from "../src/lib/site-origin";
import { parseProductForm } from "../src/lib/admin-product";
import type { Product, Category } from "../src/lib/types";
import { canonicalRedirect } from "../src/lib/site-redirect";
import { canonicalProductSlug } from "../src/lib/seo-product-aliases";

const product = { id: "real-id", slug: "producto-50-ml", title: "Marca Producto 50 ml", description: "Presentación de 50 ml. Incluye un frasco.", categoryName: "Cuidado facial", categoryId: "c", imageUrl: "/foto.webp", imageUrls: [], retailPrice: 12300, active: true, wholesaleOnly: false, brand: "Marca", model: "Una familia comercial", sku: "SKU-1", stock: 0, fulfillmentMode: "supplier", supplierAvailable: true, specifications: {}, tags: [] } as unknown as Product;
const category = { id: "c", slug: "cuidado", name: "Cuidado facial", description: "Presentaciones para tu rutina." } as Category;

test("hosted aliases and unsafe origins cannot replace MYA's canonical identity", () => {
  for (const host of [undefined, "https://www.myaimportaciones.com", "https://myaimportaciones.vercel.app", "https://preview.vercel.app", "javascript:bad", "https://evil.test"]) assert.equal(resolveSiteOrigin(host), "https://myaimportaciones.com");
  assert.equal(resolveSiteOrigin("http://localhost:3114/path"), "http://localhost:3114");
});
test("domain migration preserves public paths and queries without redirecting POST webhooks or old reset sessions", () => {
  assert.equal(canonicalRedirect(new URL("https://myaimportaciones.vercel.app/catalogo?brand=SKIN1004&page=2"), "GET")?.href, "https://myaimportaciones.com/catalogo?brand=SKIN1004&page=2");
  for (const route of ["/auth/callback?code=test", "/api/mercadopago/webhook", "/restablecer-clave", "/cuenta", "/checkout"]) assert.equal(canonicalRedirect(new URL("https://myaimportaciones.vercel.app" + route), "GET"), null);
  assert.equal(canonicalRedirect(new URL("https://myaimportaciones.vercel.app/checkout"), "POST"), null);
  assert.equal(canonicalRedirect(new URL("https://preview.vercel.app/catalogo"), "GET"), null);
});
test("brand, category and pagination have distinct self canonicals; search and combinations are noindex", () => {
  for (const params of [{}, { category: "cuidado" }, { brand: "Marca" }, { brand: "Marca", page: "2" }]) assert.equal(catalogSeo(params, [category], ["Marca"]).index, true);
  assert.equal(catalogSeo({ brand: "Marca", page: "2" }, [category], ["Marca"]).path, "/catalogo?brand=Marca&page=2");
  for (const params of [{ q: "serum" }, { category: "cuidado", brand: "Marca" }, { sort: "price_asc" }, { min: "200" }, { family: "Familia" }, { brand: "Inventada" }, { category: "vacía" }]) assert.equal(catalogSeo(params, [category], ["Marca"]).index, false);
});
test("product schema shares real price and supplier availability and never invents shipping, returns, MPN or expiry", () => {
  const schema = productStructuredData(product);
  assert.equal(schema.offers?.price, 12300); assert.equal(schema.offers?.availability, "https://schema.org/InStock");
  assert.equal(productStructuredData({ ...product, supplierAvailable: false }).offers?.availability, "https://schema.org/OutOfStock");
  for (const key of ["shippingDetails", "hasMerchantReturnPolicy", "priceValidUntil", "aggregateRating", "mpn"]) assert.ok(!JSON.stringify(schema).includes(key));
  assert.equal(schema.image[0], "https://myaimportaciones.com/foto.webp");
});
test("metadata is individual, escapes JSON-LD and permits saved editorial overrides without changing canonical", () => {
  const metadata = productMetadata({ ...product, specifications: { _seo_title: "Marca Producto 50 ml", _seo_description: "Presentación de 50 ml, con un frasco." } });
  assert.equal(metadata.description, "Presentación de 50 ml, con un frasco.");
  assert.equal(metadata.alternates?.canonical, "https://myaimportaciones.com/producto/producto-50-ml");
  assert.ok(!jsonLd({ name: "</script><script>" }).includes("<"));
});
test("canonical duplicates fall back to their own URL if the preferred variant is removed or changes identity", () => {
  const target = { ...product, slug: "preferido" };
  assert.equal(canonicalProductSlug(product, target), "preferido");
  assert.equal(canonicalProductSlug(product), product.slug);
  assert.equal(canonicalProductSlug(product, { ...target, active: false }), product.slug);
  assert.equal(canonicalProductSlug(product, { ...target, model: "otra presentación" }), product.slug);
  assert.equal(canonicalProductSlug(product, { ...target, specifications: { "Condición": "Reacondicionado" } }), product.slug);
  assert.equal(productStructuredData({ ...product, specifications: { EAN: "4006381333931" } }).gtin13, "4006381333931");
});
test("feed is gated by checkout and never fabricates identifiers, manufacturer brand or stock", () => {
  const xml = merchantFeed([product, { ...product, id: "other", brand: undefined, supplierAvailable: false }], true);
  assert.equal((xml.match(/<item>/g) || []).length, 2);
  assert.match(xml, /<g:availability>in_stock/); assert.match(xml, /<g:availability>out_of_stock/);
  assert.match(xml, /12300.00 ARS/); assert.ok(!xml.includes("identifier_exists")); assert.ok(!xml.includes("g:mpn"));
  assert.equal((merchantFeed([product], false).match(/<item>/g) || []).length, 0);
  assert.equal(verifiedGtin("4006381333931"), "4006381333931"); assert.equal(verifiedGtin("4006381333932"), undefined);
  assert.match(merchantFeed([{ ...product, specifications: { "Condición": "Reacondicionado CPO", MPN: "REAL-123" } }], true), /<g:condition>refurbished/);
});
test("admin SEO fields persist in existing product specifications, clear to automatic and reject HTML", () => {
  const form = new FormData(); form.set("title", product.title); form.set("category_id", "11111111-1111-1111-1111-111111111111"); form.set("seo_title", "Título editorial"); form.set("seo_description", "Descripción editorial del producto real.");
  const saved = parseProductForm(form, false); assert.equal(saved.fields.specifications._seo_title, "Título editorial");
  form.set("specifications", "_seo_title: anterior"); form.set("seo_title", ""); assert.equal(parseProductForm(form, false).fields.specifications._seo_title, undefined);
  form.set("seo_title", "<script>"); assert.throws(() => parseProductForm(form, false), /texto simple/);
});
