import test from "node:test";
import assert from "node:assert/strict";
import { resolveVariantDimensions, variantPreview, productVariantHref } from "../src/lib/variant-preview";
import type { ProductVariant } from "../src/lib/types";

const variant = (id: string, options: Record<string, string>, active = true): ProductVariant => ({ id, productId: "product", title: Object.values(options).join(" / "), options, isActive: active, displayOrder: Number(id) || 0, retailPrice: 100, stock: 0, fulfillmentMode: "supplier", supplierAvailable: false });

test("preview is bounded, favors distinct primary options and excludes inactive rows", () => {
  const choices = [variant("1", { Color: "Azul", Capacidad: "128 GB" }), variant("2", { Color: "Azul", Capacidad: "256 GB" }), variant("3", { Color: "Negro", Capacidad: "128 GB" }), variant("4", { Color: "Rosa" }, false)];
  const preview = variantPreview(choices);
  assert.equal(preview.total, 3);
  assert.deepEqual(preview.items.map(item => item.id), ["1", "3"]);
  assert.equal(preview.remaining, 1);
  assert.equal(variantPreview(Array.from({ length: 500 }, (_, i) => variant(String(i), { Modelo: `Modelo ${i}` })), 1000).items.length, 4);
  assert.equal(variantPreview(choices, Number.NaN).items.length, 2);
});

test("legacy dimensions follow actual active variant rows rather than stale advertised versions", () => {
  const rows = [variant("1", { Edición: "Rosa" }), variant("2", { Edición: "Tous" }), variant("3", { Edición: "Candy" }, false)];
  assert.deepEqual(resolveVariantDimensions({ attributes: [{ name: "Versión", values: ["Rosa", "Candy"] }] }, rows), [{ name: "Edición", values: ["Rosa", "Tous"] }]);
  assert.deepEqual(resolveVariantDimensions([{ name: "Edición", values: ["Inventada"] }], []), []);
  assert.deepEqual(variantPreview([]), { total: 0, items: [], remaining: 0 });
});

test("variant links preserve the selected row and safely encode arbitrary identities", () => {
  assert.equal(productVariantHref("producto", "id-2"), "/producto/producto?variant=id-2");
  assert.equal(productVariantHref("producto"), "/producto/producto");
  assert.ok(!productVariantHref("</script>", "a&admin=1").includes("<"));
  assert.equal(new URL(productVariantHref("producto", "a&admin=1"), "https://myaimportaciones.com").searchParams.get("variant"), "a&admin=1");
});
