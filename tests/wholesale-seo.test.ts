import test from "node:test";
import assert from "node:assert/strict";
import { WHOLESALE_CATEGORIES, WHOLESALE_PATHS, findWholesaleCategory, wholesaleMetadata, wholesaleServiceData } from "../src/lib/wholesale-content";

test("wholesale pages have distinct topics, self canonicals and no invented commercial prices", () => {
  assert.equal(WHOLESALE_PATHS.length, 6);
  assert.equal(new Set(WHOLESALE_PATHS).size, 6);
  const titles = new Set();
  for (const category of WHOLESALE_CATEGORIES) {
    const metadata = wholesaleMetadata(category);
    assert.equal(metadata.alternates?.canonical, `https://myaimportaciones.com/mayorista/${category.slug}`);
    assert.deepEqual(metadata.robots, { index: true, follow: true });
    assert.ok(!titles.has(category.title));
    titles.add(category.title);
    const service = wholesaleServiceData(category);
    assert.equal(service["@type"], "Service");
    assert.ok(!("offers" in service));
    assert.ok(category.buyingGuide.length >= 2 && category.checklist.length >= 4);
    assert.equal(findWholesaleCategory(category.slug), category);
  }
  assert.equal(findWholesaleCategory("inventado"), undefined);
  assert.equal(wholesaleMetadata().alternates?.canonical, "https://myaimportaciones.com/mayorista");
});
