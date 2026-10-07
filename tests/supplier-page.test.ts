import test from "node:test";
import assert from "node:assert/strict";
import { parsePrestashopAvailability } from "../src/lib/prestashop-availability";
import { fetchSupplierPage, readSupplierHtml, supplierUrl } from "../src/lib/supplier-url";

function product(quantity: number, amount = 7.5) {
  return `<div id="product-details" data-product="${JSON.stringify({ id_product: 11129, quantity, price_amount: amount }).replace(/"/g, "&quot;")}"></div>`;
}
test("primary product quantity determines stock independently of related products and currency text", () => {
  const available = parsePrestashopAvailability(`<span>$ 7,50</span>${product(54)}<aside>esgotado</aside>`, "Atacado USA");
  assert.equal(available.status, "in_stock");
  assert.equal(available.livePrice, 7.5);
  assert.equal(parsePrestashopAvailability(`${product(0)}<aside>Disponible</aside>`, "Star Company").status, "out_of_stock");
  assert.equal(parsePrestashopAvailability(`<span>$ 7,50</span>`, "Atacado USA").status, "error");
  assert.equal(parsePrestashopAvailability('<div id="product-details" data-product="{}"></div>', "Star Company").status, "error");
});
test("supplier fetch rejects untrusted hosts and redirects before contacting them", async (t) => {
  for (const url of ["https://127.0.0.1/", "https://atacadousa.com.py.evil.example/", "http://atacadousa.com.py/", "https://user@atacadousa.com.py/"]) assert.throws(() => supplierUrl(url));
  const mock = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 302, headers: { location: "https://127.0.0.1/" } }));
  await assert.rejects(fetchSupplierPage("https://atacadousa.com.py/product", "test"));
  assert.equal(mock.mock.callCount(), 1);
});
test("supplier HTML reader enforces response size", async () => {
  assert.equal(await readSupplierHtml(new Response("primary product")), "primary product");
  await assert.rejects(readSupplierHtml(new Response("x".repeat(3_000_001))), /tamaño/);
});
