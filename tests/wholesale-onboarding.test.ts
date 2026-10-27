import test from "node:test";
import assert from "node:assert/strict";
import { mapProduct } from "../src/lib/catalog-data";
import { validateWholesaleOrder, WHOLESALE_MIN_AMOUNT, WHOLESALE_MIN_UNITS } from "../src/lib/wholesale-policy";
import { renderTransactionalEmail } from "../src/lib/email-templates";

test("mapProduct: expone wholesalePrice solo para canales o perfiles mayoristas", () => {
  const sampleProduct = {
    id: "prod-test-1",
    title: "Medicube Collagen Jelly Cream 110 ml",
    slug: "medicube-collagen-jelly-cream",
    category_id: "cat-1",
    brand: "Medicube",
    model: null,
    sku: "MED-CJ-110",
    description: "Crema de colágeno coreana",
    specifications: {},
    retail_price: 64900,
    wholesale_price: 36000,
    wholesale_min_qty: 3,
    stock: 12,
    stock_verified_at: "2026-10-20T10:00:00Z",
    supplier_available: true,
    fulfillment_mode: "physical_first",
    tags: ["k-beauty", "skincare"],
    categories: { id: "cat-1", name: "Cuidado Facial", slug: "cuidado-facial" },
    product_images: [{ id: "img-1", image_url: "/medicube.jpg", is_primary: true, display_order: 1 }],
    product_variants: [],
  };

  const dbInput = sampleProduct as unknown as Parameters<typeof mapProduct>[0];

  // 1. Visitante público estándar (retail) -> wholesalePrice debe ser 0 para proteger márgenes privados
  const retailProduct = mapProduct(dbInput, false, false);
  assert.equal(retailProduct.retailPrice, 64900);
  assert.equal(retailProduct.wholesalePrice, 0);

  // 2. Cliente con rol mayorista aprobado (wholesale = true) -> wholesalePrice se desbloquea
  const wholesaleProduct = mapProduct(dbInput, false, true);
  assert.equal(wholesaleProduct.retailPrice, 64900);
  assert.equal(wholesaleProduct.wholesalePrice, 36000);
  assert.equal(wholesaleProduct.wholesaleMinQuantity, 3);

  // 3. Administrador de la tienda (admin = true) -> wholesalePrice se visualiza siempre
  const adminProduct = mapProduct(dbInput, true, false);
  assert.equal(adminProduct.wholesalePrice, 36000);
});

test("mapProduct: calcula ahorro porcentual exacto para el comprador mayorista", () => {
  const sampleProduct = {
    id: "prod-test-2",
    title: "Celimax The Real Retinol 0.1 Shot Tightening Booster 30 ml",
    slug: "celimax-retinol-shot",
    category_id: "cat-1",
    brand: "Celimax",
    model: null,
    sku: "CEL-RET-30",
    description: "Retinol booster",
    specifications: {},
    retail_price: 49500,
    wholesale_price: 27500,
    wholesale_min_qty: 4,
    stock: 8,
    stock_verified_at: "2026-10-20T10:00:00Z",
    supplier_available: true,
    fulfillment_mode: "physical_first",
    tags: [],
    categories: { id: "cat-1", name: "Cuidado Facial", slug: "cuidado-facial" },
    product_images: [],
    product_variants: [],
  };

  const dbInput = sampleProduct as unknown as Parameters<typeof mapProduct>[0];
  const product = mapProduct(dbInput, false, true);
  const retail = product.retailPrice;
  const wholesale = product.wholesalePrice;
  const savingsPercent = Math.round(((retail - wholesale) / retail) * 100);

  assert.equal(savingsPercent, 44);
  assert.ok(wholesale < retail, "El precio mayorista debe ser inferior al PVP minorista");
});

test("validateWholesaleOrder: valida compra mínima combinable ($100.000 o 5 unidades)", () => {
  // Carrito sin productos mayoristas (retail puro)
  const retailOnly = validateWholesaleOrder([
    { channel: "retail", price: 50000, quantity: 1 },
  ]);
  assert.equal(retailOnly.hasWholesale, false);
  assert.equal(retailOnly.meetsMinimum, true);

  // Carrito mayorista que NO alcanza $100.000 ni 5 unidades (2 unidades x $30.000 = $60.000)
  const insufficient = validateWholesaleOrder([
    { channel: "wholesale", price: 30000, quantity: 2 },
  ]);
  assert.equal(insufficient.hasWholesale, true);
  assert.equal(insufficient.meetsMinimum, false);
  assert.equal(insufficient.totalAmount, 60000);
  assert.equal(insufficient.totalUnits, 2);
  assert.equal(insufficient.missingAmount, 40000);
  assert.equal(insufficient.missingUnits, 3);
  assert.ok(insufficient.errorMessage?.includes("100.000"));

  // Carrito mayorista que alcanza las 5 unidades aunque no llegue a $100.000 (5 unidades x $10.000 = $50.000)
  const meetsByUnits = validateWholesaleOrder([
    { channel: "wholesale", price: 10000, quantity: 5 },
  ]);
  assert.equal(meetsByUnits.meetsMinimum, true);
  assert.equal(meetsByUnits.totalUnits, 5);

  // Carrito mayorista que alcanza $100.000 aunque tenga menos de 5 unidades (3 unidades x $40.000 = $120.000)
  const meetsByAmount = validateWholesaleOrder([
    { channel: "wholesale", price: 40000, quantity: 3 },
  ]);
  assert.equal(meetsByAmount.meetsMinimum, true);
  assert.equal(meetsByAmount.totalAmount, 120000);
});

test("email-templates: wholesale_approved incluye bienvenida personalizada, mínimo combinable y enlace", () => {
  const origin = "https://myaimportaciones.com";
  const result = renderTransactionalEmail(
    "wholesale_approved",
    "customer",
    {
      shipping_name: "Estética Glamour",
      customer_email: "contacto@glamour.com",
    },
    origin
  );

  assert.match(result.subject, /cuenta mayorista/i);
  assert.match(result.html, /Estética Glamour/);
  assert.match(result.html, /100\.000/);
  assert.match(result.html, /https:\/\/myaimportaciones\.com\/mayorista/);
  assert.match(result.html, /Ver catálogo mayorista/);
});
