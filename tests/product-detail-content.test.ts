import test from "node:test";
import assert from "node:assert/strict";
import { productDescriptionParagraphs, productDetailSummary } from "../src/lib/product-detail-content";

test("product descriptions retain safety instructions and normalize imported line breaks", () => {
  assert.deepEqual(productDescriptionParagraphs("Gato de 2 toneladas.\\nUsar caballetes.\n\nConsultar entrega."), ["Gato de 2 toneladas.", "Usar caballetes.", "Consultar entrega."]);
});

test("purchase summary uses actual product specifications, ordered by capacity and working heights", () => {
  const result = productDetailSummary({ description: "Gato de taller.", specifications: { "Altura máxima": "340 mm", "Caballetes": "No incluidos", "_seo_title": "interno", "Capacidad máxima": "2 toneladas", "Altura mínima": "140 mm" } });
  assert.deepEqual(result.highlights, [["Capacidad máxima", "2 toneladas"], ["Altura mínima", "140 mm"], ["Altura máxima", "340 mm"]]);
  assert.equal(result.intro, "Gato de taller.");
  assert.deepEqual(productDetailSummary({ description: "", specifications: {} }), { intro: "", highlights: [] });
});
