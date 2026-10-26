import test from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORY_MARGIN_BENCHMARKS,
  getCategoryMarginBenchmark,
  calculateCommercialMargin,
  evaluateCommercialMargin,
  calculateLandedCostArs,
  calculateSuggestedRetailPrice,
} from "../src/lib/supplier-commercial";

test("supplier-commercial: getCategoryMarginBenchmark resolves correct benchmarks by category or keywords", () => {
  // Perfumería
  const perf = getCategoryMarginBenchmark("perfumeria");
  assert.equal(perf.benchmarkMargin, 50);
  assert.equal(getCategoryMarginBenchmark(undefined, "Lattafa Yara EDP 100 ml").slug, "perfumeria");

  // Cosmética coreana
  const cosm = getCategoryMarginBenchmark("cosmetica-coreana");
  assert.equal(cosm.benchmarkMargin, 45);
  assert.equal(getCategoryMarginBenchmark(undefined, "SKIN1004 Madagascar Centella").slug, "cosmetica-coreana");

  // Herramientas
  const tools = getCategoryMarginBenchmark("herramientas-equipamiento");
  assert.equal(tools.benchmarkMargin, 30);
  assert.equal(getCategoryMarginBenchmark(undefined, "Rotomartillo Total 20V").slug, "herramientas-equipamiento");

  // Electrónica
  const elec = getCategoryMarginBenchmark("electronica");
  assert.equal(elec.benchmarkMargin, 18);
  assert.equal(getCategoryMarginBenchmark(undefined, "Apple iPhone 16 128 GB").slug, "electronica");

  // General fallback
  const gen = getCategoryMarginBenchmark("otra-cosa", "Producto desconocido");
  assert.equal(gen.slug, "general");
  assert.equal(gen.benchmarkMargin, 25);
});

test("supplier-commercial: calculateCommercialMargin computes margin, markup and profit accurately", () => {
  // Costo $10.000, Venta $20.000 -> 50% margin, 100% markup, $10.000 profit
  const res1 = calculateCommercialMargin(20000, 10000);
  assert.equal(res1.marginPercent, 50);
  assert.equal(res1.markupPercent, 100);
  assert.equal(res1.profitArs, 10000);

  // Costo $80.000, Venta $100.000 -> 20% margin, 25% markup, $20.000 profit
  const res2 = calculateCommercialMargin(100000, 80000);
  assert.equal(res2.marginPercent, 20);
  assert.equal(res2.markupPercent, 25);
  assert.equal(res2.profitArs, 20000);

  // Invalid or zero values
  assert.deepEqual(calculateCommercialMargin(0, 1000), { marginPercent: 0, markupPercent: 0, profitArs: 0 });
});

test("supplier-commercial: evaluateCommercialMargin correctly classifies health against benchmark", () => {
  // Lattafa Yara: Costo landed $29.760, Venta $59.900 -> Margin ~50.3% -> Excelente
  const lattafa = evaluateCommercialMargin(59900, 29760, "perfumeria", "Lattafa Yara EDP");
  assert.equal(lattafa.status, "excelente");
  assert.equal(lattafa.isHealthy, true);
  assert.equal(lattafa.benchmarkMargin, 50);

  // Perfume con margen muy bajo (ej. Venta $35.000 para costo $30.000 -> ~14% < min 35%) -> Bajo
  const bajo = evaluateCommercialMargin(35000, 30000, "perfumeria");
  assert.equal(bajo.status, "bajo");
  assert.equal(bajo.isHealthy, false);

  // iPhone: Costo $1.200.000, Venta $1.450.000 -> ~17.2% margin -> Adecuado (min 12%, bench 18%)
  const iphone = evaluateCommercialMargin(1450000, 1200000, "electronica");
  assert.equal(iphone.status, "adecuado");
  assert.equal(iphone.isHealthy, true);
});

test("supplier-commercial: calculateLandedCostArs calculates base ARS, pasero fee and landed total", () => {
  // USD 15.50 at fx 1600 with 20% pasero:
  // Base ARS = 15.50 * 1600 = 24.800
  // Pasero Fee = 24.800 * 0.20 = 4.960
  // Total Landed = 24.800 + 4.960 = 29.760
  const landed = calculateLandedCostArs(15.50, 1600, 20);
  assert.equal(landed.costUsd, 15.50);
  assert.equal(landed.exchangeRate, 1600);
  assert.equal(landed.baseArs, 24800);
  assert.equal(landed.paseroFeeArs, 4960);
  assert.equal(landed.totalLandedArs, 29760);

  // Default parameters: fx 1600, pasero 20%
  const defaultCalc = calculateLandedCostArs(10);
  assert.equal(defaultCalc.baseArs, 16000);
  assert.equal(defaultCalc.paseroFeeArs, 3200);
  assert.equal(defaultCalc.totalLandedArs, 19200);

  // Edge cases (zero or negative)
  assert.equal(calculateLandedCostArs(0).totalLandedArs, 0);
  assert.equal(calculateLandedCostArs(-5).totalLandedArs, 0);
});

test("supplier-commercial: calculateSuggestedRetailPrice calculates competitive selling price with psychological endings", () => {
  // Perfumería: benchmark 50% margin. Cost landed = 29.760
  // Formula: retail = cost / (1 - margin) = 29.760 / 0.50 = 59.520
  // Rounded to psychological ending -> 59.900 (attractive price)
  const perfPrice = calculateSuggestedRetailPrice(29760, "perfumeria", "Lattafa Yara", { psychologicalEnding: true });
  assert.ok(perfPrice.suggestedPrice > 29760);
  assert.equal(perfPrice.benchmark.benchmarkMargin, 50);
  assert.equal(perfPrice.suggestedPrice % 100, 0); // Rounded cleanly
  // Margen resultante >= 49%
  assert.ok(perfPrice.estimatedMarginPercent >= 49);

  // Herramientas: benchmark 30% margin. Cost landed = 70.000
  // Retail raw = 70.000 / 0.70 = 100.000
  const toolPrice = calculateSuggestedRetailPrice(70000, "herramientas-equipamiento", "Taladro Total", { psychologicalEnding: true });
  assert.ok(toolPrice.suggestedPrice >= 99000);
  assert.ok(toolPrice.estimatedMarginPercent >= 28);
});
