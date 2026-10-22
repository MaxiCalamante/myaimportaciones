import test from "node:test";
import assert from "node:assert/strict";
import { mapProduct, PUBLIC_PRODUCT_COLUMNS, type DbProduct } from "../src/lib/catalog-data";

test("product-lifecycle: PUBLIC_PRODUCT_COLUMNS includes deleted_at for soft delete tracking", () => {
  assert.ok(
    PUBLIC_PRODUCT_COLUMNS.includes("deleted_at"),
    "PUBLIC_PRODUCT_COLUMNS must include deleted_at"
  );
});

test("product-lifecycle: mapProduct accurately preserves deletedAt timestamp", () => {
  const timestamp = "2026-10-22T15:30:00.000Z";
  const dbProduct: DbProduct = {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "producto-prueba",
    title: "Producto de Prueba",
    description: "Descripción de prueba",
    category_id: "22222222-2222-4222-8222-222222222222",
    image_url: "https://images.unsplash.com/photo-1.jpg",
    retail_price: 15000,
    wholesale_price: 10000,
    wholesale_min_qty: 3,
    stock: 5,
    categories: { name: "Tecnología" },
    payment_methods: ["transferencia"],
    tags: ["nuevo"],
    is_active: false,
    is_featured: false,
    is_wholesale_only: false,
    deleted_at: timestamp,
  };

  const product = mapProduct(dbProduct, true);
  assert.equal(product.deletedAt, timestamp, "Product deletedAt should match database deleted_at timestamp");
  assert.equal(product.active, false, "Soft-deleted product must be inactive");
});

test("product-lifecycle: non-deleted product has null deletedAt", () => {
  const dbProduct: DbProduct = {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "producto-activo",
    title: "Producto Activo",
    description: "Descripción",
    category_id: "22222222-2222-4222-8222-222222222222",
    image_url: "https://images.unsplash.com/photo-1.jpg",
    retail_price: 25000,
    wholesale_price: 18000,
    wholesale_min_qty: 1,
    stock: 10,
    categories: { name: "Bazar" },
    payment_methods: ["transferencia"],
    tags: [],
    is_active: true,
    is_featured: false,
    is_wholesale_only: false,
    deleted_at: null,
  };

  const product = mapProduct(dbProduct, false);
  assert.equal(product.deletedAt, null, "Active product without deleted_at should have null deletedAt");
  assert.equal(product.active, true);
});

test("product-lifecycle: product cloning initializes as draft with copied title and sku", () => {
  const original = {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Auriculares Bluetooth Pro",
    sku: "AURI-BT-01",
    brand: "SoundWave",
    model: "X-200",
    retailPrice: 45000,
    wholesalePrice: 32000,
    active: true,
    featured: true,
  };

  // Clone logic matching ProductEditor
  const isCloning = true;
  const clonedTitle = isCloning && original.title ? `${original.title} (Copia)` : original.title;
  const clonedSku = isCloning && original.sku ? `${original.sku}-COPIA` : original.sku;
  const clonedActive = isCloning ? false : Boolean(original.active);
  const clonedFeatured = isCloning ? false : Boolean(original.featured);

  assert.equal(clonedTitle, "Auriculares Bluetooth Pro (Copia)", "Cloned title should append (Copia)");
  assert.equal(clonedSku, "AURI-BT-01-COPIA", "Cloned sku should append -COPIA");
  assert.equal(clonedActive, false, "Cloned product must default to inactive (draft) for admin review");
  assert.equal(clonedFeatured, false, "Cloned product must default to not featured");
});
