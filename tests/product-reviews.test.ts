import test from "node:test";
import assert from "node:assert/strict";
import { getProductReviews } from "../src/lib/product-reviews";

test("product-reviews: returns appropriate reviews for perfume products", () => {
  const result = getProductReviews({
    title: "Lattafa Khamrah Eau de Parfum 100 ml",
    categoryName: "Perfumería",
    brand: "Lattafa",
  });

  assert.ok(result.reviews.length >= 3);
  assert.equal(result.summary.averageRating, 4.9);
  assert.ok(result.summary.totalReviews >= 18);
  assert.ok(result.summary.recommendationPercentage >= 95);
  // Check perfume specific context
  const texts = result.reviews.map(r => r.comment + " " + r.title).join(" ");
  assert.match(texts, /aroma|perfume|estela|holograma/i);
});

test("product-reviews: returns appropriate reviews for K-Beauty cosmetics", () => {
  const result = getProductReviews({
    title: "Anua Heartleaf 77% Soothing Toner 250 ml",
    categoryName: "Cosmética facial y corporal",
    brand: "Anua",
  });

  assert.ok(result.reviews.length >= 3);
  assert.equal(result.summary.averageRating, 4.9);
  const texts = result.reviews.map(r => r.comment + " " + r.title).join(" ");
  assert.match(texts, /piel|rojeces|corea|glow|sensible/i);
});

test("product-reviews: returns appropriate reviews for tools", () => {
  const result = getProductReviews({
    title: "Total Rotomartillo Inalámbrico SDS Plus 20V",
    categoryName: "Herramientas y equipamiento",
    brand: "Total",
  });

  assert.ok(result.reviews.length >= 3);
  const texts = result.reviews.map(r => r.comment + " " + r.title).join(" ");
  assert.match(texts, /bater[ií]as|brushless|potencia|p20s|obra/i);
});

test("product-reviews: returns appropriate reviews for electronics", () => {
  const result = getProductReviews({
    title: "Apple iPhone 16 128 GB",
    categoryName: "Electrónica",
    brand: "Apple",
  });

  assert.ok(result.reviews.length >= 3);
  const texts = result.reviews.map(r => r.comment + " " + r.title).join(" ");
  assert.match(texts, /sellado|garant[ií]a|apple|serie/i);
});
