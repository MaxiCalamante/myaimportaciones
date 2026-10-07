import test from "node:test";
import assert from "node:assert/strict";
import { reconcileCart } from "../src/lib/cart-reconcile";
import type { Product } from "../src/lib/types";

const product: Product = { id: "a", slug: "a", title: "Producto", description: "", categoryId: "c", categoryName: "", imageUrl: "", retailPrice: 100, wholesalePrice: 0, wholesaleMinQuantity: 1, stock: 0, paymentMethods: ["transferencia"], tags: [], featured: false, wholesaleOnly: false, fulfillmentMode: "supplier", supplierAvailable: true };
test("saved carts use current prices, remove unavailable products, and respect verified physical stock", () => {
  const lines = [{ product, channel: "retail" as const, quantity: 5 }, { product: { ...product, id: "removed" }, channel: "retail" as const, quantity: 1 }];
  const current = { ...product, retailPrice: 120, fulfillmentMode: "own_stock" as const, stock: 2, stockVerifiedAt: "2026-10-07T00:00:00Z" };
  assert.deepEqual(reconcileCart(lines, [current]), [{ product: current, channel: "retail", quantity: 2 }]);
  assert.deepEqual(reconcileCart(lines, [{ ...product, supplierAvailable: false }]), []);
  assert.equal(lines[0].product.retailPrice, 100);
});
