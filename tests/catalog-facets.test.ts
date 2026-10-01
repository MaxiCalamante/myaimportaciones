import test from "node:test";
import assert from "node:assert/strict";
import { deriveCatalogFacets } from "../src/lib/catalog-facets";
import type { Category } from "../src/lib/types";

const category = (id: string, parentId: string | null = null, wholesaleOnly = false): Category => ({ id, name: id, slug: id, parentId, wholesaleOnly, description: "", imageUrl: "", displayOrder: 0 });
const categories = [category("tools"), category("drills", "tools"), category("saws", "tools"), category("cosmetics"), category("serums", "cosmetics"), category("empty", "tools"), category("private", null, true)];
const products = [{ category_id: "drills", brand: "Total" }, { category_id: "saws", brand: "Total" }, { category_id: "saws", brand: "Wadfow" }, { category_id: "serums", brand: "Medicube" }];

test("catalog navigation keeps populated parents and omits empty or excluded categories", () => {
  const facets = deriveCatalogFacets(categories, [...products, { category_id: "private", brand: "Private" }, { category_id: "unknown", brand: "Hidden" }]);
  assert.deepEqual(facets.categories.map(c => c.id), ["tools", "drills", "saws", "cosmetics", "serums"]);
  assert.deepEqual(facets.brands.map(b => b.brand), ["Medicube", "Total", "Wadfow"]);
});

test("brand filters follow the selected category without mixing cosmetics and tools", () => {
  const facets = deriveCatalogFacets(categories, products);
  assert.deepEqual(facets.brandsByCategory.tools, [{ brand: "Total", count: 2 }, { brand: "Wadfow", count: 1 }]);
  assert.deepEqual(facets.brandsByCategory.drills, [{ brand: "Total", count: 1 }]);
  assert.deepEqual(facets.brandsByCategory.cosmetics, [{ brand: "Medicube", count: 1 }]);
  assert.equal(facets.brandsByCategory.empty, undefined);
});

test("an unbranded public product still makes its category navigable", () => {
  const facets = deriveCatalogFacets(categories, [{ category_id: "tools", brand: null }]);
  assert.deepEqual(facets.categories.map(c => c.id), ["tools"]);
  assert.deepEqual(facets.brands, []);
});
