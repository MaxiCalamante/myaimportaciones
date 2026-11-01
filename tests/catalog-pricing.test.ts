import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { calculateImport, type ImportPolicy } from "../src/lib/import-costs";
import { quoteCatalogPrice, validateCatalogPricingRule, type CatalogPricingRule } from "../src/lib/catalog-pricing";

const rule: CatalogPricingRule = {
  targetMarginPercent: 20, minimumMarginPercent: 10, wholesaleMarginPercent: 15,
  paymentFeePercent: 0, fixedUnitArs: 0, roundArs: .01,
  expensesConfirmed: true, categoryMargins: {}, notes: "Parámetros de prueba, no tarifas comerciales.",
};
const close = (actual: number | null, expected: number) => assert.ok(actual !== null && Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test("catalog pricing: 20% de margen exige 25% de recargo, sin confundir contribución con ganancia neta", () => {
  const q = quoteCatalogPrice(80, rule, "general");
  assert.equal(q.price, 100); assert.equal(q.contributionArs, 20);
  close(q.marginPercent, 20); close(q.markupPercent, 25);
  assert.equal(q.complete, true); assert.deepEqual(q.warnings, []);
});

test("catalog pricing: cobra comisión sobre venta y gasto fijo por unidad", () => {
  const q = quoteCatalogPrice(70, { ...rule, targetMarginPercent: 10, wholesaleMarginPercent: 10, paymentFeePercent: 10, fixedUnitArs: 10 }, "general");
  assert.equal(q.price, 100); close(q.contributionArs, 10); close(q.marginPercent, 10);
  // Recargo de contribución sobre la base unitaria landed + fijo; la comisión depende de la venta.
  close(q.markupPercent, 12.5);
});

test("catalog pricing: canal mayorista y categoría usan sus márgenes explícitos", () => {
  assert.equal(quoteCatalogPrice(85, rule, "general", "wholesale").price, 100);
  const configured = { ...rule, categoryMargins: { herramientas: { target: 25, minimum: 15, wholesale: 20 } } };
  assert.equal(quoteCatalogPrice(80, configured, "herramientas").price, 106.67);
  assert.equal(quoteCatalogPrice(80, configured, "herramientas", "wholesale").price, 100);
  assert.equal(quoteCatalogPrice(80, configured, "otra").price, 100);
  assert.equal(quoteCatalogPrice(80, rule, "toString").price, 100);
});

test("catalog pricing: redondea siempre hacia arriba sin saltar un múltiplo exacto por error binario", () => {
  assert.equal(quoteCatalogPrice(80.01, { ...rule, roundArs: 100 }, "general").price, 200);
  assert.equal(quoteCatalogPrice(80, { ...rule, roundArs: 100 }, "general").price, 100);
  const zeroMargin = { ...rule, targetMarginPercent: 0, minimumMarginPercent: 0, wholesaleMarginPercent: 0 };
  assert.equal(quoteCatalogPrice(.07, zeroMargin, "general").price, .07);
  assert.equal(quoteCatalogPrice(.07000000000000002, zeroMargin, "general").price, .08);
  assert.equal(quoteCatalogPrice(1.00001, { ...zeroMargin, roundArs: .05 }, "general").price, 1.05);
});

test("catalog pricing: costo o gastos desconocidos no generan precio publicable", () => {
  for (const cost of [null, undefined, 0, -1, NaN, Infinity, 1e13, "80"]) {
    const q = quoteCatalogPrice(cost as number | null, rule, "general");
    assert.equal(q.price, null); assert.equal(q.contributionArs, null);
    assert.equal(q.marginPercent, null); assert.equal(q.markupPercent, null);
    assert.equal(q.complete, false); assert.ok(q.warnings.length > 0);
  }
  const incomplete = quoteCatalogPrice(80, { ...rule, expensesConfirmed: false }, "general");
  assert.equal(incomplete.price, null); assert.equal(incomplete.complete, false);
  assert.match(incomplete.warnings.join(), /gastos/i);
  assert.equal(quoteCatalogPrice(80, undefined as unknown as CatalogPricingRule, "general").complete, false);
});

test("catalog pricing: rechaza reglas ausentes, porcentajes imposibles y costos no finitos sin valores implícitos", () => {
  const invalid: unknown[] = [null, {}, [], { ...rule, paymentFeePercent: "0" }, { ...rule, fixedUnitArs: NaN },
    { ...rule, targetMarginPercent: 100 }, { ...rule, minimumMarginPercent: -1 },
    { ...rule, wholesaleMarginPercent: 5 }, { ...rule, minimumMarginPercent: 25 },
    { ...rule, paymentFeePercent: 80 }, { ...rule, fixedUnitArs: -1 },
    { ...rule, roundArs: 0 }, { ...rule, roundArs: .001 }, { ...rule, roundArs: Infinity },
    { ...rule, expensesConfirmed: undefined }, { ...rule, notes: undefined },
    { ...rule, categoryMargins: null }, { ...rule, categoryMargins: [] },
    { ...rule, categoryMargins: { herramientas: { target: 20, minimum: 15 } } },
    { ...rule, categoryMargins: { herramientas: { target: 5, minimum: 10, wholesale: 15 } } },
    { ...rule, categoryMargins: JSON.parse('{"__proto__":{"target":20,"minimum":10,"wholesale":15}}') },
  ];
  for (const config of invalid) {
    assert.throws(() => validateCatalogPricingRule(config));
    const q = quoteCatalogPrice(80, config as CatalogPricingRule, "general");
    assert.equal(q.complete, false); assert.equal(q.price, null);
  }
  assert.deepEqual(validateCatalogPricingRule(rule), rule);
  const tooLarge = quoteCatalogPrice(1e12, { ...rule, targetMarginPercent: 99, minimumMarginPercent: 0 }, "general");
  assert.equal(tooLarge.price, null); assert.equal(tooLarge.complete, false);
  assert.equal(quoteCatalogPrice(80, rule, "general", "otro" as "retail").complete, false);
});

test("catalog pricing: reutiliza costo y reparto de import-costs sin duplicar gastos compartidos", () => {
  const policy: ImportPolicy = { effectiveFrom: "2026-11-01", confirmed: true, notes: "Prueba", generalPercent: 0,
    volumePercent: 0, thresholdUsd: 1000, volumeConfirmed: false, mixedConfirmed: false,
    thresholdBase: "shipment", reducedBase: "all_eligible", carrierArsPerUsd: 1, carrierFxDate: "2026-11-01",
    iphoneUsd: 0, tvUsd: {}, productUsd: {} };
  const result = calculateImport({
    lines: [{ id: "a", title: "Kit prueba", currency: "ARS", origin: 40, acquisitionArsPerUnit: 1,
      originUnitsPerUsd: 1, quantity: 2, kind: "general", sourceConfirmed: true,
      sourceReference: "https://example.test/kit", observedAt: "2026-11-01T00:00:00Z" }],
    expenses: [{ label: "Compartido confirmado", amountArs: 80, method: "quantity" }],
    expensesConfirmed: true, targetMargin: 20,
  }, policy, "2026-11-01");
  assert.equal(result.approvable, true); assert.equal(result.lines[0].unitArs, 80);
  assert.equal(quoteCatalogPrice(result.lines[0].unitArs, rule, "general").price, 100);
});

test("catalog pricing rules: versiones privadas append-only; ningún valor comercial sembrado", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
      create function auth.uid() returns uuid language sql as $$ select '11111111-1111-4111-8111-111111111111'::uuid $$;
      create function public.is_admin() returns boolean language sql as $$ select coalesce(current_setting('test.admin',true),'false')='true' $$;
      grant usage on schema auth to authenticated,service_role;`);
    await db.exec(readFileSync("supabase/migrations/20261101025557_catalog_pricing_rules.sql", "utf8"));
    assert.equal((await db.query("select * from catalog_pricing_rules")).rows.length, 0);
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from catalog_pricing_rules"), /permission denied/);
    await assert.rejects(db.query("insert into catalog_pricing_rules(config) values($1)", [rule]), /permission denied/);
    await db.exec("reset role; set role authenticated; select set_config('test.admin','false',false)");
    assert.equal((await db.query("select * from catalog_pricing_rules")).rows.length, 0);
    await assert.rejects(db.query("insert into catalog_pricing_rules(config) values($1)", [rule]), /row-level security/);
    await db.exec("select set_config('test.admin','true',false)");
    await db.query("insert into catalog_pricing_rules(config) values($1),($2)", [rule, { ...rule, targetMarginPercent: 25 }]);
    const versions = (await db.query<{ actor: string; config: CatalogPricingRule }>("select actor,config from catalog_pricing_rules order by created_at,id")).rows;
    assert.equal(versions.length, 2); assert.equal(versions[0].actor, "11111111-1111-4111-8111-111111111111");
    await assert.rejects(db.query("insert into catalog_pricing_rules(config,actor) values($1,'22222222-2222-4222-8222-222222222222')", [rule]), /row-level security/);
    await assert.rejects(db.query("update catalog_pricing_rules set config='{}'"), /permission denied/);
    await assert.rejects(db.query("delete from catalog_pricing_rules"), /permission denied/);
    await assert.rejects(db.query("truncate catalog_pricing_rules"), /permission denied/);
    await assert.rejects(db.query("insert into catalog_pricing_rules(config) values('[]')"), /check constraint/);
    await db.exec("reset role; set role service_role");
    assert.equal((await db.query("select * from catalog_pricing_rules")).rows.length, 2);
    await db.query("insert into catalog_pricing_rules(config) values($1)", [rule]);
  } finally { await db.close(); }
});
