import test from "node:test";
import assert from "node:assert/strict";
import { parseTotalAvailability } from "../src/lib/total-availability";

const product = (id: string, availability: string, price = 118404, priceCurrency = "Gs") =>
  `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", productID: id, offers: { availability, price, priceCurrency } })}</script>`;

test("Total checks primary SKU stock without interpreting guaranies as dollars or exposing an unreviewed quote", () => {
  const result = parseTotalAvailability(product("553278", "in stock") + product("related", "out of stock") + "produto esgotado", "553278");
  assert.equal(result.status, "in_stock");
  assert.equal(result.available, true);
  assert.equal(result.livePrice, null);
  assert.equal(result.currency, null);
  assert.equal(parseTotalAvailability(product("553278", "https://schema.org/InStock", 18, "USD"), "553278").livePrice, null);
});

test("Total primary product stock wins over a recommended available product", () => {
  const result = parseTotalAvailability(product("553278", "https://schema.org/OutOfStock") + product("related", "in stock"), "553278");
  assert.equal(result.status, "out_of_stock");
  assert.equal(result.available, false);
});

test("Total does not infer stock from a search match, unrelated price or missing stock metadata", () => {
  for (const html of [product("related", "in stock"), product("553278", ""), '<button data-item_codigo="553278" data-item_preco="50">Comprar</button>', '<script type="application/ld+json">invalid</script>']) {
    assert.equal(parseTotalAvailability(html, "553278").status, "error");
  }
});
