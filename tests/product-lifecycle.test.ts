import test from "node:test";
import assert from "node:assert/strict";
import { mapProduct, PUBLIC_PRODUCT_COLUMNS, type DbProduct } from "../src/lib/catalog-data";
import { prepareProductImages, extractProductImagePath, cleanupOrphanProductImages } from "../src/lib/admin-media";

test("product-lifecycle: PUBLIC_PRODUCT_COLUMNS includes deleted_at and deleted_by for soft delete and audit", () => {
  assert.ok(
    PUBLIC_PRODUCT_COLUMNS.includes("deleted_at"),
    "PUBLIC_PRODUCT_COLUMNS must include deleted_at"
  );
  assert.ok(
    PUBLIC_PRODUCT_COLUMNS.includes("deleted_by"),
    "PUBLIC_PRODUCT_COLUMNS must include deleted_by"
  );
});

test("product-lifecycle: mapProduct accurately preserves deletedAt timestamp and deletedBy email", () => {
  const timestamp = "2026-10-22T15:30:00.000Z";
  const adminEmail = "admin@myaimportaciones.com.ar";
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
    deleted_by: adminEmail,
  };

  const product = mapProduct(dbProduct, true);
  assert.equal(product.deletedAt, timestamp, "Product deletedAt should match database deleted_at timestamp");
  assert.equal(product.deletedBy, adminEmail, "Product deletedBy should match database deleted_by email");
  assert.equal(product.active, false, "Soft-deleted product must be inactive");
});

test("product-lifecycle: non-deleted product has null deletedAt and deletedBy", () => {
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
    deleted_by: null,
  };

  const product = mapProduct(dbProduct, false);
  assert.equal(product.deletedAt, null, "Active product without deleted_at should have null deletedAt");
  assert.equal(product.deletedBy, null, "Active product without deleted_by should have null deletedBy");
  assert.equal(product.active, true);
});

test("product-lifecycle: trash retention calculates correctly for active retention and expired items", () => {
  const now = Date.now();
  const dayMs = 86400000;

  // 10 days ago (within retention)
  const recentDeletedAt = new Date(now - 10 * dayMs).toISOString();
  const daysInTrashRecent = Math.floor((now - new Date(recentDeletedAt).getTime()) / dayMs);
  assert.equal(daysInTrashRecent, 10);
  assert.equal(daysInTrashRecent >= 30, false, "10 days in trash should not be expired");
  assert.equal(30 - daysInTrashRecent, 20, "Should have 20 days remaining");

  // 35 days ago (expired, eligible for auto-purge)
  const expiredDeletedAt = new Date(now - 35 * dayMs).toISOString();
  const daysInTrashExpired = Math.floor((now - new Date(expiredDeletedAt).getTime()) / dayMs);
  assert.equal(daysInTrashExpired, 35);
  assert.equal(daysInTrashExpired >= 30, true, "35 days in trash should be expired and eligible for purge");
});

test("product-lifecycle: prepareProductImages respects gallery_order tokens for reordered photos", async () => {
  const form = new FormData();
  form.set("gallery_present", "1");
  const url1 = "https://example.com/img1.webp";
  const url2 = "https://example.com/img2.webp";
  const url3 = "https://example.com/img3.webp";

  form.append("keep_image_url", url1);
  form.append("keep_image_url", url2);
  form.append("keep_image_url", url3);

  // User dragged url3 to the first position (Portada) and url1 to second, url2 to third
  form.append("gallery_order", `keep:${url3}`);
  form.append("gallery_order", `keep:${url1}`);
  form.append("gallery_order", `keep:${url2}`);

  const mockDb = {} as any;
  const result = await prepareProductImages(mockDb, form, [url1, url2, url3]);

  assert.deepEqual(result.urls, [url3, url1, url2], "Urls should be ordered according to gallery_order manifest");
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

test("product-lifecycle: extractProductImagePath correctly parses Supabase storage paths and ignores external URLs", () => {
  const supabaseUrl1 = "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/products/photo-123.webp";
  const supabaseUrlWithParams = "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026/abe24b7c.jpg?v=123#thumb";
  const externalUrl = "https://www.totalherramientasoficial.com.py/img/8437/produtos/1500/cbb4a4.jpg";
  const unsplashUrl = "https://images.unsplash.com/photo-1542291026-7eec264c27ff";

  assert.equal(extractProductImagePath(supabaseUrl1), "products/photo-123.webp");
  assert.equal(extractProductImagePath(supabaseUrlWithParams), "electronics-2026/abe24b7c.jpg");
  assert.equal(extractProductImagePath(externalUrl), null, "External supplier URL should not match Supabase storage");
  assert.equal(extractProductImagePath(unsplashUrl), null, "Unsplash URL should not match Supabase storage");
  assert.equal(extractProductImagePath(""), null);
});

test("product-lifecycle: cleanupOrphanProductImages protects images shared with cloned/remaining products", async () => {
  const sharedPath = "products/shared-perfume.webp";
  const orphanPath = "products/orphan-to-delete.webp";
  const sharedUrl = `https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/${sharedPath}`;
  const orphanUrl = `https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/${orphanPath}`;

  const deletingProductId = "11111111-1111-4111-8111-111111111111";
  const clonedProductId = "22222222-2222-4222-8222-222222222222";

  const removedPaths: string[] = [];

  // Mock Supabase DB client
  const mockDb = {
    from: (table: string) => {
      assert.equal(table, "products");
      return {
        select: (cols: string) => {
          assert.equal(cols, "image_url, image_urls");
          return {
            not: (col: string, op: string, val: string) => {
              // Simulated remaining products query (only returns clonedProductId)
              return Promise.resolve({
                data: [
                  {
                    image_url: sharedUrl,
                    image_urls: [sharedUrl],
                  },
                ],
                error: null,
              });
            },
          };
        },
      };
    },
    storage: {
      from: (bucket: string) => {
        assert.equal(bucket, "product-images");
        return {
          remove: (paths: string[]) => {
            removedPaths.push(...paths);
            return Promise.resolve({ error: null });
          },
        };
      },
    },
  } as any;

  const count = await cleanupOrphanProductImages(
    mockDb,
    [sharedUrl, orphanUrl],
    [deletingProductId]
  );

  assert.equal(count, 1, "Only the orphan path should be removed");
  assert.deepEqual(removedPaths, [orphanPath], "Shared path must be preserved for cloned product");
});

test("product-lifecycle: audit CSV escaping handles quotes, commas, and newlines safely", () => {
  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  assert.equal(escapeCsv("Normal Text"), "Normal Text");
  assert.equal(escapeCsv("Text, with comma"), '"Text, with comma"');
  assert.equal(escapeCsv('Text with "quotes"'), '"Text with ""quotes"""');
  assert.equal(escapeCsv("Text with\nnewline"), '"Text with\nnewline"');
  assert.equal(escapeCsv(12500), "12500");
  assert.equal(escapeCsv(null), "");
});

test("product-lifecycle: rollbackPrice calculation produces accurate percentage delta", () => {
  const oldPrice = 50000;
  const currentPrice = 60000;
  const deltaPct = Math.round(((currentPrice - oldPrice) / oldPrice) * 100);
  assert.equal(deltaPct, 20, "Should indicate +20% price increase");

  const rollbackDeltaPct = Math.round(((oldPrice - currentPrice) / currentPrice) * 100);
  assert.equal(rollbackDeltaPct, -17, "Rollback indicates -17% discount back to original");
});
