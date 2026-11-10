import test from "node:test";
import assert from "node:assert/strict";
import { isPubliclyEligible } from "../src/lib/commerce-policy";
import { catalogExclusion } from "../src/lib/supplier-tracker/catalog";
import type { FoundProduct } from "../src/lib/supplier-tracker/adapters/shared";

test("isPubliclyEligible: aprueba únicamente productos comerciales en estado AVAILABLE", () => {
  const availableProduct = {
    commercialStatus: "AVAILABLE",
    active: true,
    fulfillmentMode: "supplier",
    supplierAvailable: true,
    stock: 0,
    sourceUrl: "https://atacadousa.com.py/cosmeticos/pdrn.html",
    retailUsd: "25.90",
    totalCostUsd: 18.00,
  };
  assert.equal(isPubliclyEligible(availableProduct), true);

  // Oculto por falta de stock (Día 0)
  assert.equal(isPubliclyEligible({ ...availableProduct, commercialStatus: "OUT_OF_STOCK" }), false);

  // Oculto por requerir revisión
  assert.equal(isPubliclyEligible({ ...availableProduct, commercialStatus: "REVIEW_REQUIRED" }), false);

  // Oculto por baja lógica / archivado
  assert.equal(isPubliclyEligible({ ...availableProduct, commercialStatus: "ARCHIVED" }), false);

  // Oculto manualmente
  assert.equal(isPubliclyEligible({ ...availableProduct, commercialStatus: "HIDDEN" }), false);

  // Soft-deleted siempre es false
  assert.equal(isPubliclyEligible({ ...availableProduct, deletedAt: new Date().toISOString() }), false);
});

test("isPubliclyEligible: bloquea productos con márgenes negativos (pérdida comercial)", () => {
  const negativeRetailMargin = {
    commercialStatus: "AVAILABLE",
    active: true,
    fulfillmentMode: "supplier",
    supplierAvailable: true,
    stock: 0,
    sourceUrl: "https://atacadousa.com.py/item.html",
    retailUsd: "15.00",
    totalCostUsd: 18.00, // Costo superior al precio de venta
  };
  assert.equal(isPubliclyEligible(negativeRetailMargin), false);

  const negativeWholesaleMargin = {
    commercialStatus: "AVAILABLE",
    active: true,
    fulfillmentMode: "supplier",
    supplierAvailable: true,
    stock: 0,
    sourceUrl: "https://atacadousa.com.py/item.html",
    retailUsd: "25.00",
    wholesaleUsd: "16.00",
    totalCostUsd: 18.00, // Costo superior al precio mayorista
  };
  // En canal minorista es elegible
  assert.equal(isPubliclyEligible(negativeWholesaleMargin, { wholesale: false }), true);
  // En canal mayorista se bloquea inmediatamente
  assert.equal(isPubliclyEligible(negativeWholesaleMargin, { wholesale: true }), false);
});

test("isPubliclyEligible: bloquea productos sin URL de proveedor con stock propio en cero", () => {
  const missingSourceUrl = {
    commercialStatus: "AVAILABLE",
    active: true,
    fulfillmentMode: "supplier",
    supplierAvailable: true,
    stock: 0,
    sourceUrl: "",
    retailUsd: "45.00",
    totalCostUsd: 30.00,
  };
  assert.equal(isPubliclyEligible(missingSourceUrl), false);

  // Pero si tiene stock físico propio confirmado, es elegible
  assert.equal(isPubliclyEligible({ ...missingSourceUrl, fulfillmentMode: "own_stock", stock: 5 }), true);
});

test("isPubliclyEligible: respeta la vista administrativa con bypass autorizado", () => {
  const blockedProduct = {
    commercialStatus: "REVIEW_REQUIRED",
    active: false,
    retailUsd: "10.00",
    totalCostUsd: 20.00,
  };
  assert.equal(isPubliclyEligible(blockedProduct, { admin: false }), false);
  assert.equal(isPubliclyEligible(blockedProduct, { admin: true }), true);
});

test("catalogExclusion: descarta consumibles menores pero preserva herramientas y sets", () => {
  const looseScrews = {
    externalId: "1",
    url: "https://www.totalherramientasoficial.com.py/tornillo-drywall",
    title: "TOTAL TORNILLO WJDS4205121 DRYWALL 4.2X51MM 200PCS",
    cost: 2.2,
    currency: "USD",
    availability: "in_stock",
    variantKey: "source",
    warnings: [],
  } as unknown as FoundProduct;
  assert.ok(catalogExclusion("total", looseScrews));

  const looseWashers: FoundProduct = {
    ...looseScrews,
    title: "TOTAL ARANDELAS PLANAS 6MM 100PCS",
  };
  assert.ok(catalogExclusion("total", looseWashers));

  const motorBrushes: FoundProduct = {
    ...looseScrews,
    title: "WADFOW CARBONES PARA MOTOR 2PCS WCB01",
  };
  assert.ok(catalogExclusion("total", motorBrushes));

  // Herramientas que contienen palabras de ferretería pero SON herramientas valiosas:
  const benchVise: FoundProduct = {
    ...looseScrews,
    title: "TOTAL TORNILLO DE BANCO THT6146 4\" 6.7KG",
  };
  assert.equal(catalogExclusion("total", benchVise), null);

  const boltCutter: FoundProduct = {
    ...looseScrews,
    title: "TOTAL CORTADOR DE TORNILLOS THT113186 18\"",
  };
  assert.equal(catalogExclusion("total", boltCutter), null);

  const extractor: FoundProduct = {
    ...looseScrews,
    title: "WADFOW EXTRACTOR DE PERNOS Y TORNILLOS 6PCS WART1D06",
  };
  assert.equal(catalogExclusion("total", extractor), null);

  const clawHammer: FoundProduct = {
    ...looseScrews,
    title: "TOTAL MARTILLO CLAVO GALPONERO TAT73166 16OZ",
  };
  assert.equal(catalogExclusion("total", clawHammer), null);

  const completeKit: FoundProduct = {
    ...looseScrews,
    title: "TOTAL SET KIT DE TUBOS Y PUNTAS EN CAJA 142 PIEZAS",
  };
  assert.equal(catalogExclusion("total", completeKit), null);
});

test("Regla de los 7 días: modelo conceptual de transición Día 0 -> Día 7", () => {
  const now = Date.now();
  const day0Timestamp = new Date(now).toISOString();
  const day3Timestamp = new Date(now - 3 * 86400000).toISOString();
  const day8Timestamp = new Date(now - 8 * 86400000).toISOString();

  function evaluateLifecycleDay(since: string | null): "AVAILABLE" | "OUT_OF_STOCK" | "ARCHIVED" {
    if (!since) return "AVAILABLE";
    const elapsedDays = (now - Date.parse(since)) / 86400000;
    if (elapsedDays >= 7) return "ARCHIVED";
    return "OUT_OF_STOCK";
  }

  assert.equal(evaluateLifecycleDay(null), "AVAILABLE");
  assert.equal(evaluateLifecycleDay(day0Timestamp), "OUT_OF_STOCK");
  assert.equal(evaluateLifecycleDay(day3Timestamp), "OUT_OF_STOCK");
  assert.equal(evaluateLifecycleDay(day8Timestamp), "ARCHIVED");
});
