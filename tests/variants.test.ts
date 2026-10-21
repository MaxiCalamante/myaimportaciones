import test from "node:test";
import assert from "node:assert/strict";
import { generateCombinations, parseOptionsConfig } from "../src/lib/admin-variants";
import { parseProductForm } from "../src/lib/admin-product";
import { mapProduct } from "../src/lib/catalog-data";
import { reconcileCart } from "../src/lib/cart-reconcile";
import { productStructuredData } from "../src/lib/seo";
import { getColorSwatch, COLOR_SWATCH_MAP } from "../src/lib/variant-swatches";
import type { CartLine, Product, ProductOptionDimension } from "../src/lib/types";

test("admin-variants: parseOptionsConfig parses, trims, deduplicates, and validates dimensions", () => {
  const raw = [
    { name: "  Aroma ", values: [" Bare Vanilla ", "Coconut Passion", "Bare Vanilla"] },
    { name: " Presentación ", values: ["250 ml", "  "] },
  ];
  const parsed = parseOptionsConfig(raw);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, "Aroma");
  assert.deepEqual(parsed[0].values, ["Bare Vanilla", "Coconut Passion"]);
  assert.equal(parsed[1].name, "Presentación");
  assert.deepEqual(parsed[1].values, ["250 ml"]);
});

test("admin-variants: generateCombinations builds Cartesian product up to 3 dimensions", () => {
  const dims1: ProductOptionDimension[] = [
    { name: "Fragancia", values: ["Bare Vanilla", "Pure Seduction", "Amber Romance"] }
  ];
  const combos1 = generateCombinations(dims1);
  assert.equal(combos1.length, 3);
  assert.equal(combos1[0].title, "Bare Vanilla");
  assert.deepEqual(combos1[0].options, { Fragancia: "Bare Vanilla" });

  const dims2: ProductOptionDimension[] = [
    { name: "Color", values: ["Negro", "Blanco"] },
    { name: "Talle", values: ["S", "M", "L"] }
  ];
  const combos2 = generateCombinations(dims2);
  assert.equal(combos2.length, 6);
  assert.equal(combos2[0].title, "Negro / S");
  assert.deepEqual(combos2[0].options, { Color: "Negro", Talle: "S" });
  assert.equal(combos2[5].title, "Blanco / L");
  assert.deepEqual(combos2[5].options, { Color: "Blanco", Talle: "L" });

  const dims3: ProductOptionDimension[] = [
    { name: "Dim1", values: ["A", "B"] },
    { name: "Dim2", values: ["1", "2"] },
    { name: "Dim3", values: ["X", "Y"] }
  ];
  const combos3 = generateCombinations(dims3);
  assert.equal(combos3.length, 8);
});

test("admin-product: parseProductForm parses simple vs variant product modes", () => {
  const formSimple = new FormData();
  formSimple.set("title", "Perfume Simple");
  formSimple.set("category_id", "a0000000-0000-0000-0000-000000000001");
  formSimple.set("retail_price", "25000");
  formSimple.set("stock", "10");
  formSimple.set("has_variants", "false");

  const parsedSimple = parseProductForm(formSimple);
  assert.equal(parsedSimple.hasVariants, false);
  assert.deepEqual(parsedSimple.fields.options_config, []);
  assert.deepEqual(parsedSimple.variants, []);

  const formVariants = new FormData();
  formVariants.set("title", "Victoria's Secret Mist");
  formVariants.set("category_id", "a0000000-0000-0000-0000-000000000001");
  formVariants.set("has_variants", "true");
  formVariants.set("options_config", JSON.stringify([
    { name: "Aroma", values: ["Bare Vanilla", "Coconut Passion"] }
  ]));
  formVariants.set("variants_json", JSON.stringify([
    {
      title: "Bare Vanilla",
      options: { Aroma: "Bare Vanilla" },
      retailPrice: 42000,
      stock: 5,
      sku: "VS-BV-250",
      fulfillmentMode: "own_stock",
      isActive: true,
      displayOrder: 0
    },
    {
      title: "Coconut Passion",
      options: { Aroma: "Coconut Passion" },
      retailPrice: 45000,
      stock: 8,
      sku: "VS-CP-250",
      fulfillmentMode: "own_stock",
      isActive: true,
      displayOrder: 1
    }
  ]));

  const parsedVariants = parseProductForm(formVariants);
  assert.equal(parsedVariants.hasVariants, true);
  assert.equal(parsedVariants.fields.options_config.length, 1);
  assert.equal(parsedVariants.variants.length, 2);
  assert.equal(parsedVariants.variants[0].retailPrice, 42000);
  assert.equal(parsedVariants.variants[1].retailPrice, 45000);
});

test("catalog-data: mapProduct computes variant prices and aggregated stock accurately", () => {
  const dbProduct = {
    id: "prod-vs",
    title: "Victoria's Secret Body Mist 250ml",
    slug: "victorias-secret-body-mist-250ml",
    category_id: "cat-beauty",
    categories: { name: "Perfumería", slug: "perfumeria" },
    image_url: "/vs-main.webp",
    image_urls: ["/vs-main.webp"],
    retail_price: 0,
    wholesale_price: 0,
    wholesale_min_qty: 1,
    stock: 0,
    stock_verified_at: "2026-10-19T00:00:00Z",
    has_variants: true,
    options_config: [{ name: "Aroma", values: ["Bare Vanilla", "Coconut Passion"] }],
    product_variants: [
      {
        id: "var-1",
        product_id: "prod-vs",
        title: "Bare Vanilla",
        sku: "VS-BV",
        retail_price: 42000,
        stock: 4,
        stock_verified_at: "2026-10-19T00:00:00Z",
        fulfillment_mode: "own_stock",
        supplier_available: false,
        image_url: "/vs-bv.webp",
        is_active: true,
        options: { Aroma: "Bare Vanilla" },
        display_order: 0,
        created_at: "2026-10-19T00:00:00Z",
        updated_at: "2026-10-19T00:00:00Z",
      },
      {
        id: "var-2",
        product_id: "prod-vs",
        title: "Coconut Passion",
        sku: "VS-CP",
        retail_price: 48000,
        stock: 6,
        stock_verified_at: "2026-10-19T00:00:00Z",
        fulfillment_mode: "own_stock",
        supplier_available: false,
        image_url: "/vs-cp.webp",
        is_active: true,
        options: { Aroma: "Coconut Passion" },
        display_order: 1,
        created_at: "2026-10-19T00:00:00Z",
        updated_at: "2026-10-19T00:00:00Z",
      }
    ]
  };

  const product = mapProduct(dbProduct as unknown as Parameters<typeof mapProduct>[0]);
  assert.equal(product.hasVariants, true);
  assert.equal(product.minPrice, 42000);
  assert.equal(product.maxPrice, 48000);
  assert.equal(product.retailPrice, 42000);
  assert.equal(product.stock, 10);
  assert.ok(product.stockVerifiedAt);
  assert.equal(product.variants?.length, 2);
});

test("cart-reconcile: manages separate lines per variant and updates current price/stock", () => {
  const baseProduct: Product = {
    id: "prod-1",
    slug: "amoladora-total",
    title: "Amoladora Total 115mm",
    description: "Amoladora angular potente para corte y desbaste.",
    categoryName: "Herramientas",
    categoryId: "cat-tools",
    imageUrl: "/tool.webp",
    imageUrls: [],
    retailPrice: 50000,
    wholesalePrice: 0,
    wholesaleMinQuantity: 1,
    stock: 5,
    stockVerifiedAt: "2026-10-19T00:00:00Z",
    paymentMethods: ["transferencia"],
    tags: [],
    featured: false,
    wholesaleOnly: false,
    fulfillmentMode: "own_stock",
    supplierAvailable: false,
    active: true,
    hasVariants: true,
    optionsConfig: [{ name: "Potencia", values: ["750 W", "1010 W"] }],
    variants: [
      {
        id: "var-750w",
        productId: "prod-1",
        title: "750 W",
        retailPrice: 52000,
        stock: 3,
        stockVerifiedAt: "2026-10-19T00:00:00Z",
        fulfillmentMode: "own_stock",
        supplierAvailable: false,
        isActive: true,
        options: { Potencia: "750 W" },
        displayOrder: 0
      },
      {
        id: "var-1010w",
        productId: "prod-1",
        title: "1010 W",
        retailPrice: 68000,
        stock: 0,
        stockVerifiedAt: "2026-10-19T00:00:00Z",
        fulfillmentMode: "own_stock",
        supplierAvailable: false,
        isActive: true,
        options: { Potencia: "1010 W" },
        displayOrder: 1
      }
    ]
  };

  const lines: CartLine[] = [
    {
      product: baseProduct,
      quantity: 5,
      channel: "retail",
      variantId: "var-750w",
      variantTitle: "750 W",
      variantPrice: 50000, // old price in local storage
    },
    {
      product: baseProduct,
      quantity: 2,
      channel: "retail",
      variantId: "var-1010w", // stock is 0 in DB
      variantTitle: "1010 W",
      variantPrice: 65000,
    }
  ];

  const reconciled = reconcileCart(lines, [baseProduct]);

  // Out of stock variant is dropped
  assert.equal(reconciled.length, 1);
  assert.equal(reconciled[0].variantId, "var-750w");
  // Quantity capped at 3 (variant stock)
  assert.equal(reconciled[0].quantity, 3);
  // Price updated to current 52000
  assert.equal(reconciled[0].variantPrice, 52000);
});

test("seo: productStructuredData outputs AggregateOffer with variant price ranges", () => {
  const variantProduct: Product = {
    id: "p-vs",
    slug: "body-mist-vs",
    title: "Victoria's Secret Mist",
    description: "Mist corporal original.",
    categoryName: "Belleza",
    categoryId: "cat-b",
    imageUrl: "/main.webp",
    imageUrls: ["/main.webp"],
    retailPrice: 40000,
    wholesalePrice: 0,
    wholesaleMinQuantity: 1,
    stock: 10,
    stockVerifiedAt: "2026-10-19T00:00:00Z",
    paymentMethods: ["transferencia"],
    tags: [],
    featured: false,
    wholesaleOnly: false,
    fulfillmentMode: "own_stock",
    supplierAvailable: false,
    active: true,
    hasVariants: true,
    minPrice: 40000,
    maxPrice: 46000,
    variants: [
      {
        id: "v1",
        productId: "p-vs",
        title: "Bare Vanilla",
        sku: "VS-BV",
        retailPrice: 40000,
        stock: 5,
        stockVerifiedAt: "2026-10-19T00:00:00Z",
        fulfillmentMode: "own_stock",
        supplierAvailable: false,
        isActive: true,
        options: { Fragancia: "Bare Vanilla" },
        displayOrder: 0
      },
      {
        id: "v2",
        productId: "p-vs",
        title: "Pure Seduction",
        sku: "VS-PS",
        retailPrice: 46000,
        stock: 5,
        stockVerifiedAt: "2026-10-19T00:00:00Z",
        fulfillmentMode: "own_stock",
        supplierAvailable: false,
        isActive: true,
        options: { Fragancia: "Pure Seduction" },
        displayOrder: 1
      }
    ]
  };

  const schema = productStructuredData(variantProduct);
  assert.equal(schema["@type"], "Product");
  assert.equal(schema.name, "Victoria's Secret Mist");
  const offers = schema.offers as {
    "@type": string;
    lowPrice: number;
    highPrice: number;
    offerCount: number;
    offers: Array<{ sku?: string }>;
  };
  assert.equal(offers?.["@type"], "AggregateOffer");
  assert.equal(offers?.lowPrice, 40000);
  assert.equal(offers?.highPrice, 46000);
  assert.equal(offers?.offerCount, 2);
  assert.equal(offers?.offers?.length, 2);
  assert.equal(offers?.offers[0].sku, "VS-BV");
  assert.equal(offers?.offers[1].sku, "VS-PS");
});

test("variant-swatches: getColorSwatch resolves accurate color swatches for devices and cosmetics", () => {
  const ultramar = getColorSwatch("Azul ultramar");
  assert.ok(ultramar);
  assert.equal(ultramar.bg, "#1d4ed8");

  const orange = getColorSwatch("Naranja cósmico");
  assert.ok(orange);
  assert.equal(orange.bg, "#f97316");

  const salvia = getColorSwatch("Verde salvia");
  assert.ok(salvia);
  assert.equal(salvia.bg, "#84cc16");

  const midnight = getColorSwatch("Medianoche");
  assert.ok(midnight);
  assert.equal(midnight.bg, "#0f172a");

  const unknown = getColorSwatch("Edición Especial Galaxia Desconocida");
  assert.equal(unknown, null);
});

test("variant-selector: matches multi-dimensional selection to exact variant record", () => {
  const iphone16Variants = [
    { id: "v1", title: "Azul ultramar · 128 GB", options: { Color: "Azul ultramar", Capacidad: "128 GB" }, retailPrice: 1503500, sku: "IPH16-128-BLU" },
    { id: "v2", title: "Blanco · 128 GB", options: { Color: "Blanco", Capacidad: "128 GB" }, retailPrice: 1532500, sku: "IPH16-128-WHT" },
    { id: "v3", title: "Negro · 128 GB", options: { Color: "Negro", Capacidad: "128 GB" }, retailPrice: 1532500, sku: "IPH16-128-BLK" },
    { id: "v4", title: "Negro · 256 GB", options: { Color: "Negro", Capacidad: "256 GB" }, retailPrice: 1650000, sku: "IPH16-256-BLK" },
  ];

  const selectVariant = (selectedOptions: Record<string, string>) => {
    return iphone16Variants.find(v => {
      return Object.entries(selectedOptions).every(([k, val]) => v.options[k as keyof typeof v.options] === val);
    }) || null;
  };

  // Case 1: Selecting Azul ultramar + 128 GB
  const match1 = selectVariant({ Color: "Azul ultramar", Capacidad: "128 GB" });
  assert.ok(match1);
  assert.equal(match1.id, "v1");
  assert.equal(match1.retailPrice, 1503500);
  assert.equal(match1.sku, "IPH16-128-BLU");

  // Case 2: Switching to Negro + 256 GB
  const match2 = selectVariant({ Color: "Negro", Capacidad: "256 GB" });
  assert.ok(match2);
  assert.equal(match2.id, "v4");
  assert.equal(match2.retailPrice, 1650000);

  // Case 3: Invalid combination
  const match3 = selectVariant({ Color: "Azul ultramar", Capacidad: "256 GB" });
  assert.equal(match3, null);
});
