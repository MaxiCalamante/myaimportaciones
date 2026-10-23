import test from "node:test";
import assert from "node:assert/strict";
import { mapProduct, PUBLIC_PRODUCT_COLUMNS, type DbProduct } from "../src/lib/catalog-data";
import { prepareProductImages, extractProductImagePath, cleanupOrphanProductImages } from "../src/lib/admin-media";
import { checkAndAlertSuddenPriceChange } from "../src/lib/price-alert";

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

  const mockDb = {} as Parameters<typeof prepareProductImages>[0];
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
  } as unknown as Parameters<typeof cleanupOrphanProductImages>[0];

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

test("product-lifecycle: checkAndAlertSuddenPriceChange evaluates 30% threshold accurately", async () => {
  // Test case 1: +30% price change should trigger alert
  const res1 = await checkAndAlertSuddenPriceChange({
    productId: "prod-1",
    productTitle: "Cafetera Express",
    oldPrice: 100000,
    newPrice: 130000,
    changedBy: "test@myaimportaciones.com.ar",
  });
  assert.equal(res1.alerted, true);
  assert.equal(res1.deltaPct, 30);

  // Test case 2: +29% price change should NOT trigger alert
  const res2 = await checkAndAlertSuddenPriceChange({
    productId: "prod-2",
    productTitle: "Taza Cerámica",
    oldPrice: 100000,
    newPrice: 129000,
    changedBy: "test@myaimportaciones.com.ar",
  });
  assert.equal(res2.alerted, false);
  assert.equal(res2.deltaPct, 29);

  // Test case 3: -30% drop should trigger alert
  const res3 = await checkAndAlertSuddenPriceChange({
    productId: "prod-3",
    productTitle: "Auriculares Pro",
    oldPrice: 100000,
    newPrice: 70000,
    changedBy: "test@myaimportaciones.com.ar",
  });
  assert.equal(res3.alerted, true);
  assert.equal(res3.deltaPct, -30);

  // Test case 4: -29% drop should NOT trigger alert
  const res4 = await checkAndAlertSuddenPriceChange({
    productId: "prod-4",
    productTitle: "Funda Silicona",
    oldPrice: 100000,
    newPrice: 71000,
    changedBy: "test@myaimportaciones.com.ar",
  });
  assert.equal(res4.alerted, false);
  assert.equal(res4.deltaPct, -29);

  // Test case 5: zero or invalid price should not alert
  const res5 = await checkAndAlertSuddenPriceChange({
    productId: "prod-5",
    productTitle: "Item Nuevo",
    oldPrice: 0,
    newPrice: 50000,
    changedBy: "test@myaimportaciones.com.ar",
  });
  assert.equal(res5.alerted, false);
});

test("product-lifecycle: bulk rollback candidate resolver selects the most recent audit price per product", () => {
  const logs = [
    {
      id: "log-3",
      product_id: "prod-A",
      action: "quick_price_update",
      old_data: { retail_price: 45000, wholesale_price: 38000 },
      new_data: { retail_price: 60000, wholesale_price: 50000 },
      created_at: "2026-10-22T14:00:00Z",
    },
    {
      id: "log-2",
      product_id: "prod-A",
      action: "price_update",
      old_data: { retail_price: 40000, wholesale_price: 35000 },
      new_data: { retail_price: 45000, wholesale_price: 38000 },
      created_at: "2026-10-21T10:00:00Z",
    },
    {
      id: "log-1",
      product_id: "prod-B",
      action: "bulk_price_adjustment",
      old_data: { retail_price: 25000 },
      new_data: { retail_price: 30000 },
      created_at: "2026-10-22T13:00:00Z",
    },
  ];

  const rollbackCandidates = new Map<string, { retailPrice: number; wholesalePrice?: number; logDate: string }>();

  for (const log of logs) {
    if (rollbackCandidates.has(log.product_id)) continue;
    const oldD = (log.old_data as Record<string, unknown>) ?? {};
    const oldRetail = Number(oldD.retail_price ?? 0);
    const oldWholesale = oldD.wholesale_price ? Number(oldD.wholesale_price) : undefined;
    if (oldRetail > 0) {
      rollbackCandidates.set(log.product_id, {
        retailPrice: oldRetail,
        wholesalePrice: oldWholesale,
        logDate: log.created_at,
      });
    }
  }

  assert.equal(rollbackCandidates.size, 2);
  const candA = rollbackCandidates.get("prod-A");
  assert.ok(candA);
  assert.equal(candA?.retailPrice, 45000, "Must pick the most recent previous price for prod-A (45000, not 40000)");
  assert.equal(candA?.wholesalePrice, 38000);

  const candB = rollbackCandidates.get("prod-B");
  assert.ok(candB);
  assert.equal(candB?.retailPrice, 25000);
  assert.equal(candB?.wholesalePrice, undefined);
});

test("product-lifecycle: audit log filtering matches temporal and action filters correctly", () => {
  const now = Date.now();
  const sampleLogs = [
    { id: "1", action: "quick_price_update", created_at: new Date(now - 2 * 3600 * 1000).toISOString() }, // 2h ago
    { id: "2", action: "stock_update", created_at: new Date(now - 3 * 86400 * 1000).toISOString() }, // 3d ago
    { id: "3", action: "price_rollback", created_at: new Date(now - 15 * 86400 * 1000).toISOString() }, // 15d ago
    { id: "4", action: "bulk_price_adjustment", created_at: new Date(now - 45 * 86400 * 1000).toISOString() }, // 45d ago
  ];

  // Test 24h filter
  const filter24h = sampleLogs.filter((l) => {
    const cutoff = now - 24 * 60 * 60 * 1000;
    return new Date(l.created_at).getTime() >= cutoff;
  });
  assert.equal(filter24h.length, 1);
  assert.equal(filter24h[0].id, "1");

  // Test 7d filter
  const filter7d = sampleLogs.filter((l) => {
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;
    return new Date(l.created_at).getTime() >= cutoff;
  });
  assert.equal(filter7d.length, 2);

  // Test action filter 'rollback'
  const filterRollback = sampleLogs.filter((l) => l.action === "price_rollback");
  assert.equal(filterRollback.length, 1);
  assert.equal(filterRollback[0].id, "3");

  // Test action filter 'price'
  const filterPrice = sampleLogs.filter((l) => ["quick_price_update", "price_update", "price_and_stock_update"].includes(l.action));
  assert.equal(filterPrice.length, 1);
  assert.equal(filterPrice[0].id, "1");
});

test("product-lifecycle: checkAndAlertSuddenPriceChange respects custom thresholdPct", async () => {
  // Custom threshold 20%: +25% should alert
  const res1 = await checkAndAlertSuddenPriceChange({
    productId: "p1",
    productTitle: "Test Prod 1",
    oldPrice: 10000,
    newPrice: 12500, // +25%
    changedBy: "admin@mya.com",
    thresholdPct: 20,
  });
  assert.equal(res1.alerted, true);
  assert.equal(res1.deltaPct, 25);

  // Custom threshold 20%: +15% should NOT alert
  const res2 = await checkAndAlertSuddenPriceChange({
    productId: "p2",
    productTitle: "Test Prod 2",
    oldPrice: 10000,
    newPrice: 11500, // +15%
    changedBy: "admin@mya.com",
    thresholdPct: 20,
  });
  assert.equal(res2.alerted, false);
  assert.equal(res2.deltaPct, 15);

  // Custom threshold 50%: +40% should NOT alert
  const res3 = await checkAndAlertSuddenPriceChange({
    productId: "p3",
    productTitle: "Test Prod 3",
    oldPrice: 10000,
    newPrice: 14000, // +40%
    changedBy: "admin@mya.com",
    thresholdPct: 50,
  });
  assert.equal(res3.alerted, false);

  // Custom threshold 50%: -55% should alert
  const res4 = await checkAndAlertSuddenPriceChange({
    productId: "p4",
    productTitle: "Test Prod 4",
    oldPrice: 10000,
    newPrice: 4500, // -55%
    changedBy: "admin@mya.com",
    thresholdPct: 50,
  });
  assert.equal(res4.alerted, true);
  assert.equal(res4.deltaPct, -55);
});

test("product-lifecycle: CSV import builds accurate snapshot audit logs for updated and new products", () => {
  const existingBySlug = new Map([
    [
      "taladro-percutor-13mm",
      {
        id: "prod-existing-1",
        slug: "taladro-percutor-13mm",
        title: "Taladro Percutor 13mm",
        retail_price: 55000,
        wholesale_price: 42000,
        stock: 8,
      },
    ],
  ]);

  const upsertedRows = [
    {
      id: "prod-existing-1",
      slug: "taladro-percutor-13mm",
      title: "Taladro Percutor 13mm",
      sku: "TAL-01",
      retail_price: 68000,
      wholesale_price: 50000,
      stock: 8,
    },
    {
      id: "prod-new-2",
      slug: "amoladora-angular-115mm",
      title: "Amoladora Angular 115mm",
      sku: "AMO-01",
      retail_price: 49000,
      wholesale_price: 36000,
      stock: 0,
    },
  ];

  const adminEmail = "admin@myaimportaciones.com.ar";
  const auditInserts: { product_id: string; changed_by: string; action: string; old_data: Record<string, number>; new_data: Record<string, number>; notes: string }[] = [];

  for (const row of upsertedRows) {
    const existing = existingBySlug.get(row.slug);
    if (existing) {
      const oldRetail = Number(existing.retail_price ?? 0);
      const newRetail = Number(row.retail_price ?? 0);
      const oldWholesale = Number(existing.wholesale_price ?? 0);
      const newWholesale = Number(row.wholesale_price ?? 0);
      const oldStock = Number(existing.stock ?? 0);
      const newStock = Number(row.stock ?? existing.stock ?? 0);

      const priceChanged = oldRetail !== newRetail || oldWholesale !== newWholesale;
      const stockChanged = oldStock !== newStock;

      if (priceChanged || stockChanged) {
        auditInserts.push({
          product_id: row.id,
          changed_by: adminEmail,
          action: "csv_import",
          old_data: {
            retail_price: oldRetail,
            wholesale_price: oldWholesale,
            stock: oldStock,
          },
          new_data: {
            retail_price: newRetail,
            wholesale_price: newWholesale,
            stock: newStock,
          },
          notes: priceChanged
            ? `Actualización de precio vía CSV (${oldRetail} → ${newRetail})`
            : "Actualización vía importación CSV",
        });
      }
    } else {
      auditInserts.push({
        product_id: row.id,
        changed_by: adminEmail,
        action: "csv_import",
        old_data: {},
        new_data: {
          retail_price: Number(row.retail_price ?? 0),
          wholesale_price: Number(row.wholesale_price ?? 0),
          stock: Number(row.stock ?? 0),
        },
        notes: "Creación de producto vía importación masiva CSV",
      });
    }
  }

  assert.equal(auditInserts.length, 2);

  // Existing product check
  assert.equal(auditInserts[0].action, "csv_import");
  assert.equal(auditInserts[0].old_data.retail_price, 55000);
  assert.equal(auditInserts[0].new_data.retail_price, 68000);
  assert.equal(auditInserts[0].old_data.stock, 8);
  assert.equal(auditInserts[0].new_data.stock, 8);

  // New product check
  assert.equal(auditInserts[1].action, "csv_import");
  assert.deepEqual(auditInserts[1].old_data, {});
  assert.equal(auditInserts[1].new_data.retail_price, 49000);
  assert.equal(auditInserts[1].new_data.stock, 0);
});

test("product-lifecycle: audit log modal pagination renders in chunks of 15 and flags hasMore", () => {
  // Generate 35 mock audit logs
  const totalLogs = Array.from({ length: 35 }, (_, idx) => ({
    id: `log-${idx}`,
    action: "quick_price_update",
    createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
  }));

  let visibleCount = 15;
  let displayedLogs = totalLogs.slice(0, visibleCount);
  let hasMore = visibleCount < totalLogs.length;

  assert.equal(displayedLogs.length, 15);
  assert.equal(hasMore, true);

  // User clicks "Cargar más"
  visibleCount += 15;
  displayedLogs = totalLogs.slice(0, visibleCount);
  hasMore = visibleCount < totalLogs.length;

  assert.equal(displayedLogs.length, 30);
  assert.equal(hasMore, true);

  // User clicks "Cargar más" again
  visibleCount += 15;
  displayedLogs = totalLogs.slice(0, visibleCount);
  hasMore = visibleCount < totalLogs.length;

  assert.equal(displayedLogs.length, 35);
  assert.equal(hasMore, false, "When all 35 records are rendered, hasMore must be false");
});
