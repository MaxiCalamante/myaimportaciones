import test from "node:test";
import assert from "node:assert/strict";
import { WHOLESALE_CATEGORIES, WHOLESALE_PATHS, findWholesaleCategory, wholesaleMetadata, wholesaleServiceData } from "../src/lib/wholesale-content";

test("wholesale pages have distinct topics, self canonicals and no invented commercial prices", () => {
  assert.equal(WHOLESALE_PATHS.length, 7);
  assert.equal(new Set(WHOLESALE_PATHS).size, 7);
  const titles = new Set();
  for (const category of WHOLESALE_CATEGORIES) {
    const metadata = wholesaleMetadata(category);
    assert.equal(metadata.alternates?.canonical, `https://myaimportaciones.com/mayorista/${category.slug}`);
    assert.deepEqual(metadata.robots, { index: true, follow: true });
    const image = new URL((metadata.openGraph?.images as { url: string }[])[0].url);
    assert.equal(image.searchParams.get("cat"), `${category.name} por mayor`);
    assert.match(image.searchParams.get("desc")!, /Envíos a toda Argentina/);
    assert.equal(image.searchParams.has("precio"), false);
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

test("Medicube has a wholesale landing without replacing any wholesale category", () => {
  for (const slug of ["cosmetica-coreana", "perfumeria", "cuidado-capilar", "herramientas", "electronica", "medicube"]) {
    const category = findWholesaleCategory(slug)!;
    assert.ok(category);
    assert.match(category.description, /5 productos o \$100\.000/);
    assert.match(category.description, /toda Argentina/);
  }
  assert.equal(findWholesaleCategory("medicube")?.brand, "Medicube");
  // The existing category redirect still points to the general skincare page.
  assert.equal(WHOLESALE_CATEGORIES.find(item => item.categorySlug === "cosmetica-coreana")?.slug, "cosmetica-coreana");
});
