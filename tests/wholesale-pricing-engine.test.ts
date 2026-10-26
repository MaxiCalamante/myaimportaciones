import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyWholesaleRubro,
  calculateProductWholesalePricing,
} from "../src/lib/wholesale-pricing-engine";

test("classifyWholesaleRubro: incluye rubros mayoristas legítimos", () => {
  const cosmetic = classifyWholesaleRubro("Medicube PDRN Hydrating Gel Cleanser 200 ml", "limpieza-facial-exfoliantes", "Medicube", 79600);
  assert.equal(cosmetic.isEligible, true);
  assert.equal(cosmetic.rubro, "cosmetica");

  const hair = classifyWholesaleRubro("Karseell Mascarilla Capilar Maca Power 500 ml", "mascarillas-tratamientos-capilares", "Karseell", 48000);
  assert.equal(hair.isEligible, true);
  assert.equal(hair.rubro, "capilar");

  const perfume = classifyWholesaleRubro("Lattafa Yara Eau de Parfum 100 ml", "perfumes-arabes", "Lattafa", 65000);
  assert.equal(perfume.isEligible, true);
  assert.equal(perfume.rubro, "perfumeria");

  const tool = classifyWholesaleRubro("Total Taladro Rotomartillo 800W TH308266", "taladros-rotomartillos", "Total Tools", 145000);
  assert.equal(tool.isEligible, true);
  assert.equal(tool.rubro, "herramientas");

  const cheapAudio = classifyWholesaleRubro("Auriculares In-Ear Bluetooth MYA TWS", "electronica", "MYA", 28000);
  assert.equal(cheapAudio.isEligible, true);
  assert.equal(cheapAudio.rubro, "electro_barata");
});

test("classifyWholesaleRubro: excluye estrictamente alta gama, iPhones, MacBooks y notebooks", () => {
  const iphone = classifyWholesaleRubro("Apple iPhone 18 Pro Max · 256 GB · Borgoña", "smartphones", "Apple", 3800000);
  assert.equal(iphone.isEligible, false);
  assert.equal(iphone.rubro, "ineligible");

  const macbook = classifyWholesaleRubro("Apple MacBook Pro M5 14,2″ 24 GB / 1 TB", "notebooks", "Apple", 4200000);
  assert.equal(macbook.isEligible, false);
  assert.equal(macbook.rubro, "ineligible");

  const galaxy = classifyWholesaleRubro("Samsung Galaxy S25 Ultra 512GB", "smartphones", "Samsung", 2400000);
  assert.equal(galaxy.isEligible, false);
  assert.equal(galaxy.rubro, "ineligible");

  const tablet = classifyWholesaleRubro("Apple iPad Pro 11 M4 256GB", "tablets", "Apple", 1800000);
  assert.equal(tablet.isEligible, false);
  assert.equal(tablet.rubro, "ineligible");

  const expensivePc = classifyWholesaleRubro("PC Gamer Desktop Ryzen 7 RTX 4070", "computadoras-de-escritorio", "Custom", 1950000);
  assert.equal(expensivePc.isEligible, false);
  assert.equal(expensivePc.rubro, "ineligible");
});

test("calculateProductWholesalePricing: fija precio win-win en cosmética contra precio de Mercado Libre", () => {
  // Medicube Gel: Costo Landed: 28.704, Retail MYA: 79.600, ML Ref: 88.463
  // Techo es 79.600 (el menor entre tienda y ML).
  const result = calculateProductWholesalePricing({
    productId: "med-1",
    title: "Medicube PDRN Hydrating Gel Cleanser 200 ml",
    categorySlug: "limpieza-facial-exfoliantes",
    categoryName: "Limpieza facial",
    brand: "Medicube",
    retailPrice: 79600,
    landedCostArs: 28704,
    mlPrice: 88463,
  });

  assert.equal(result.isEligible, true);
  assert.equal(result.rubro, "cosmetica");
  assert.equal(result.minQuantity, 4);
  assert.ok(result.suggestedWholesalePrice !== null);

  // El revendedor compra al por mayor con ~28% de margen frente al PVP de 79.600:
  // 79.600 * 0.72 = ~57.300
  assert.ok(result.suggestedWholesalePrice <= 60000 && result.suggestedWholesalePrice >= 55000);
  // MYA gana más del 30% limpio
  assert.ok(result.myaProfitArs > 25000);
  assert.ok(result.myaMarginPercent >= 40);
  // El revendedor gana al menos un 25% de margen
  assert.ok(result.resellerMarginPercent >= 25);
  assert.ok(result.resellerProfitArs > 18000);
});

test("calculateProductWholesalePricing: respeta el precio más bajo de Mercado Libre como techo cuando ML es más barato", () => {
  // Retail MYA: 100.000, pero ML está en 80.000 -> El techo para el revendedor es 80.000
  // Costo: 35.000
  const result = calculateProductWholesalePricing({
    productId: "cosrx-1",
    title: "COSRX Snail Mucin 96 Essence 100 ml",
    categorySlug: "serums-ampollas-faciales",
    categoryName: "Sérums",
    brand: "COSRX",
    retailPrice: 100000,
    landedCostArs: 35000,
    mlPrice: 80000,
  });

  assert.equal(result.isEligible, true);
  assert.equal(result.resaleCeilingArs, 80000);
  assert.ok(result.suggestedWholesalePrice !== null);
  // El precio mayorista debe permitir revender a $80.000 (precio de ML) ganando dinero:
  // 80.000 * 0.72 = ~57.600
  assert.ok(result.suggestedWholesalePrice < 80000);
  assert.ok(result.resellerProfitArs > 15000);
  assert.ok(result.myaProfitArs > 15000);
});

test("calculateProductWholesalePricing: rechaza productos con margen insuficiente", () => {
  // Producto donde el costo landed es 90.000 y el retail es 95.000 (margen total < 10%)
  const result = calculateProductWholesalePricing({
    productId: "tight-1",
    title: "Crema Facial Económica 50 ml",
    categorySlug: "cremas-e-hidratantes",
    categoryName: "Cremas",
    brand: "Generic",
    retailPrice: 95000,
    landedCostArs: 90000,
  });

  assert.equal(result.isEligible, false);
  assert.equal(result.suggestedWholesalePrice, null);
  assert.ok(result.ineligibilityReason?.includes("insuficiente"));
});

test("calculateProductWholesalePricing: calcula correctamente herramientas Total con lote mínimo reducido", () => {
  const result = calculateProductWholesalePricing({
    productId: "tool-1",
    title: "Total Amoladora Angular 750W 115mm TG1071156",
    categorySlug: "amoladoras-pulidoras",
    categoryName: "Amoladoras",
    brand: "Total",
    retailPrice: 65900,
    landedCostArs: 36000,
  });

  assert.equal(result.isEligible, true);
  assert.equal(result.rubro, "herramientas");
  assert.ok(result.minQuantity <= 3);
  // Revendedor tiene ~20% de margen
  assert.ok(result.resellerMarginPercent >= 18);
  assert.ok(result.myaMarginPercent >= 18);
});
