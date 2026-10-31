import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProductSearch, rankProductSearch, type SearchProduct } from "../src/lib/product-search";

const products: SearchProduct[] = [
  { id: "ampoule", title: "SKIN1004 Ampolla Centella 100 ml", brand: "SKIN1004", model: "Centella", tags: ["Sérum"] },
  { id: "shampoo", title: "Kérastase Shampoó Bain 250 ml", brand: "Kérastase" },
  { id: "tool", title: "Pistola de pintura Total", brand: "Total", model: "TT5006-2", sku: "TT5006-2" },
  { id: "drill", title: "Taladro inalámbrico Total", brand: "Total", model: "TD20" },
  { id: "phone", title: "Apple iPhone 16", brand: "Apple", product_variants: [
    { title: "Azul 256 GB", sku: "IPH16-BLUE", is_active: true, options: { color: "Azul", capacidad: "256 GB" } },
    { title: "Rosa 512 GB", is_active: false },
  ] },
];
const ids = (query: string) => rankProductSearch(products, query).map(p => p.id);

test("search ignores accents, casing and repeated spaces", () => {
  assert.equal(normalizeProductSearch("  KÉRASTASE  shampoó "), "kerastase shampoo");
  assert.deepEqual(ids("kerastase shampoo"), ["shampoo"]);
});
test("all words can match across brand, title and tags in any order", () => {
  assert.deepEqual(ids("centella skin1004 serum"), ["ampoule"]);
  assert.deepEqual(ids("pintura total"), ["tool"]);
  assert.deepEqual(ids("taladros total"), ["drill"]);
  assert.deepEqual(ids("centella total"), []);
});
test("separators and spaces do not hide exact model or SKU matches", () => {
  for (const query of ["TT5006-2", "tt 5006 2", "TT50062"]) assert.deepEqual(ids(query), ["tool"]);
  assert.equal(rankProductSearch([...products, { id: "accessory", title: "Accesorio para TT5006-2" }], "TT5006-2")[0].id, "tool");
  assert.deepEqual(ids("TT9999-2"), []);
  const differentVersion = { id: "other", title: "Pistola Total 220 V", model: "TT5006-1" };
  for (const query of ["TT5006-2", "TT 5006 2", "total TT5006-2"]) {
    assert.equal(rankProductSearch([differentVersion], query).length, 0);
  }
});
test("search includes only active variants and their real option values", () => {
  assert.deepEqual(ids("iphone azul 256"), ["phone"]);
  assert.deepEqual(ids("iphone rosa"), []);
  assert.deepEqual(ids("IPH16 BLUE"), ["phone"]);
});
test("exact titles rank ahead of accessory mentions and empty queries return nothing", () => {
  const matches = rankProductSearch([{ id: "a", title: "Funda para iPhone 16" }, { id: "b", title: "iPhone 16" }], "iphone 16");
  assert.deepEqual(matches.map(p => p.id), ["b", "a"]);
  assert.deepEqual(ids("%(),.*"), []);
  assert.deepEqual(ids("zzzzsynthetic"), []);
});
test("product text remains searchable beyond 100 characters", () => {
  assert.equal(rankProductSearch([{ id: "long", title: `${"Producto ".repeat(15)}Medicube` }], "medicube").length, 1);
});
