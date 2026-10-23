import test from "node:test";
import assert from "node:assert/strict";
import { getProductReviews } from "../src/lib/product-reviews";

for (const product of [
  { title: "Lattafa Khamrah", categoryName: "Perfumería", brand: "Lattafa" },
  { title: "Anua Toner", categoryName: "Cosmética facial", brand: "Anua" },
  { title: "Total Taladro", categoryName: "Herramientas", brand: "Total" },
  { title: "Apple iPhone", categoryName: "Electrónica", brand: "Apple" },
  { title: "Producto sin categoría" },
]) {
  test(`reviews never fabricate verified purchases or ratings for ${product.title}`, () => {
    const result = getProductReviews(product);
    assert.deepEqual(result.reviews, []);
    assert.equal(result.summary.totalReviews, 0);
    assert.equal(result.summary.averageRating, 0);
    assert.equal(result.summary.recommendationPercentage, 0);
    assert.equal(Object.values(result.summary.ratingDistribution).reduce((sum, count) => sum + count, 0), 0);
  });
}
