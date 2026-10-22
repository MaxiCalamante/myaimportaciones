import test from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORY_MARGIN_BENCHMARKS,
  getCategoryMarginBenchmark,
  calculateCommercialMargin,
  evaluateCommercialMargin,
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
