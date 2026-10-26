import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMercadoLibreSearchUrl,
  calculateCompetitivePricing,
} from "../src/lib/mercadolibre-pricing";
import { evaluateWithMarketBenchmark } from "../src/lib/supplier-commercial";

test("buildMercadoLibreSearchUrl construye enlaces de búsqueda limpios para Mercado Libre Argentina", () => {
  const url1 = buildMercadoLibreSearchUrl("PERF FEM CHLOE L'EAU DE PARFUM 50ML", "Chloe");
  assert.ok(url1.startsWith("https://listado.mercadolibre.com.ar/"));
  assert.ok(url1.includes("chloe"));
  assert.ok(url1.includes("parfum"));
  assert.ok(url1.endsWith("_NoIndex_True"));

  const url2 = buildMercadoLibreSearchUrl("Total Taladro Rotomartillo 800W", "Total", "TH308266");
  assert.ok(url2.includes("taladro-rotomartillo"));
});

test("calculateCompetitivePricing: caso SUBIR PRECIO cuando MYA está regalada vs ML", () => {
  // Costo Landed: $40.000. ML vende a: $100.000. MYA vende a: $60.000.
  // Target: 8% por debajo de ML = $92.000 (con terminación .900 -> $91.900)
  // MYA puede subir de $60.000 a $91.900, ganando +$31.900 extra sin dejar de ser más barato que ML.
  const res = calculateCompetitivePricing(60000, 40000, 100000, "perfumeria", "Lattafa Yara 100ml");

  assert.equal(res.action, "raise_price");
  assert.equal(res.targetPrice, 91900);
  assert.equal(res.potentialGainArs, 31900);
  assert.ok(res.actionLabel.includes("Subir a $91.900"));
});

test("calculateCompetitivePricing: caso BAJAR PRECIO cuando MYA es más cara que ML y tiene margen", () => {
  // Costo Landed: $30.000. ML vende a: $50.000. MYA vende a: $55.000.
  // Target: 8% por debajo de ML = $46.000 (con terminación .900 -> $45.900).
  // Costo floor para 15% margen: $30.000 / 0.85 = $35.294. Como $45.900 > $35.294, podemos bajar.
  const res = calculateCompetitivePricing(55000, 30000, 50000, "cosmetica-coreana", "Medicube PDRN Serum");

  assert.equal(res.action, "lower_price");
  assert.equal(res.targetPrice, 45900);
  assert.ok(res.potentialGainArs > 0);
  assert.ok(res.actionLabel.includes("Bajar a $45.900"));
});

test("calculateCompetitivePricing: caso COSTO RESTRINGIDO cuando ML vende por debajo de nuestro piso seguro", () => {
  // Costo Landed: $48.000. ML vende a: $50.000. MYA vende a: $55.000.
  // Target sería $45.900, pero nuestro costo es $48.000 (perderíamos dinero si bajamos tanto).
  const res = calculateCompetitivePricing(55000, 48000, 50000, "cosmetica-coreana", "Medicube PDRN Serum");

  assert.equal(res.action, "cost_constrained");
  assert.ok(res.actionLabel.includes("Alerta: Costo alto"));
});

test("calculateCompetitivePricing: caso PRECIO ÓPTIMO cuando ya estamos en el sweet spot (~8% abajo de ML)", () => {
  // ML vende a: $100.000. MYA vende a: $91.900.
  const res = calculateCompetitivePricing(91900, 45000, 100000, "perfumeria", "Lattafa Yara 100ml");

  assert.equal(res.action, "optimal");
  assert.ok(res.actionLabel.includes("Competitivo vs ML"));
});

test("calculateCompetitivePricing: caso SIN REFERENCIA ML", () => {
  const res = calculateCompetitivePricing(65000, 35000, null, "perfumeria");

  assert.equal(res.action, "missing_benchmark");
  assert.equal(res.targetPrice, 65000);
});

test("evaluateWithMarketBenchmark: integración comercial multivariable", () => {
  // Con ML disponible y margen saludable
  const comp = evaluateWithMarketBenchmark(40000, 60000, 100000, "perfumeria", "Fragancia");
  assert.equal(comp.strategy, "market_competitive");
  assert.equal(comp.suggestedPrice, 91900);

  // Sin ML disponible (cost-plus clásico)
  const noMl = evaluateWithMarketBenchmark(40000, 60000, null, "perfumeria", "Fragancia");
  assert.equal(noMl.strategy, "cost_plus");
  assert.ok(noMl.suggestedPrice > 0);
});
