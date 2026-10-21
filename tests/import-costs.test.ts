import test from "node:test";
import assert from "node:assert/strict";
import { allocate, calculateImport, classifyImport, validatePolicy, type ImportInput, type ImportLine, type ImportPolicy } from "../src/lib/import-costs";

const policy: ImportPolicy = { effectiveFrom: "2026-10-16", confirmed: true, notes: "Fixture de prueba; no es cotización actual", generalPercent: 20, volumePercent: 15, thresholdUsd: 1000, volumeConfirmed: true, mixedConfirmed: false, thresholdBase: "shipment", reducedBase: "all_eligible", carrierArsPerUsd: 1600, carrierFxDate: "2026-10-20", iphoneUsd: 25, tvUsd: { "32":35,"43":50,"50":60,"60":75,"70":85,"80":100,"100":125 }, productUsd: {} };
const line = (patch: Partial<ImportLine> = {}): ImportLine => ({ id: "a", title: "Artículo de prueba", quantity: 1, origin: 100, currency: "USD", acquisitionArsPerUnit: 1600, originUnitsPerUsd: 1, kind: "general", sourceConfirmed: true, sourceReference: "Documento ficticio de prueba", observedAt: "2026-10-20T12:00:00-03:00", ...patch });
const input = (lines = [line()], patch: Partial<ImportInput> = {}): ImportInput => ({ lines, expenses: [], expensesConfirmed: true, targetMargin: 25, ...patch });
const calc = (i = input(), p = policy) => calculateImport(i, p, "2026-10-20");
test("USD 100: pasador 20 y costo parcial ARS 192000, adquisición y pasador separados", () => {
  const r = calc(); assert.equal(r.carrierUsd, 20); assert.equal(r.totalArs, 192000); assert.equal(r.approvable, true);
  assert.equal(calc(input([line({ acquisitionArsPerUnit: 1500 })])).totalArs, 182000);
});
for (const [origin, expected] of [[999,199.8],[1000,200],[1000.01,150],[1500,225]]) test(`Umbral estricto USD ${origin}`, () => assert.equal(calc(input([line({ origin })])).carrierUsd, expected));
test("volumen pendiente no aplica reducción silenciosa", () => {
  const r = calc(input([line({ origin: 1500 })]), { ...policy, volumeConfirmed: false });
  assert.equal(r.carrierUsd, 300); assert.equal(r.approvable, false); assert.match(r.warnings.join(), /umbral/);
});
test("iPhone sustituye porcentual: 500+25 por unidad", () => {
  const r = calc(input([line({ origin: 500, kind: "iphone", quantity: 3 })])); assert.equal(r.carrierUsd, 75); assert.equal(r.totalArs, 2520000);
  assert.equal(calc(input([line({ origin: 500, kind: "iphone", quantity: 3 })]),{...policy,volumeConfirmed:false}).approvable,true);
});
for (const [inches, usd] of Object.entries(policy.tvUsd)) test(`TV ${inches}: tres unidades sin porcentual`, () => assert.equal(calc(input([line({ origin: 300, kind: "tv", inches: Number(inches), quantity: 3 })])).carrierUsd, usd * 3));
test("TV 55 no interpola y no muestra total consolidado completo", () => {
  const r = calc(input([line({ kind: "tv", inches: 55 })])); assert.equal(r.carrierUsd, null); assert.equal(r.totalArs, null); assert.equal(r.approvable, false); assert.match(r.warnings.join(), /55/);
});
test("mixto no reduce hasta confirmar, base elegible y total configurables", () => {
  const i = input([line({ origin: 600 }), line({ id: "b", title: "iPhone 16", origin: 500, kind: "iphone" })]);
  assert.equal(calc(i).carrierUsd, 145);
  assert.equal(calc(i, { ...policy, mixedConfirmed: true }).carrierUsd, 115);
  assert.equal(calc(i, { ...policy, mixedConfirmed: true, thresholdBase: "eligible" }).carrierUsd, 145);
});
test("reducción sólo excedente prorratea base y respeta exclusiones", () => assert.equal(calc(input([line({ origin: 1500 })]), { ...policy, reducedBase: "excess" }).carrierUsd, 275));
test("prioridad cotización envío > artículo > producto > categoría", () => {
  const l = line({ productId: "product", kind: "iphone", specialUsd: 12, specialConfirmed: true, quantity: 2 });
  const p = { ...policy, productUsd: { product: 15 } };
  assert.equal(calc(input([l]), p).carrierUsd, 24);
  assert.equal(calc(input([{ ...l, specialUsd: undefined }]), p).carrierUsd, 30);
  assert.equal(calc(input([l], { shipmentSpecialUsd: 5, shipmentSpecialConfirmed: true }), p).carrierUsd, 5);
  assert.throws(() => calc(input([{ ...l, specialConfirmed: false }])), /Confirmá/);
});
test("PYG/ARS se convierten con unidades explícitas sin mezclar monedas", () => {
  const pyg = calc(input([line({ currency: "PYG", origin: 750000, acquisitionArsPerUnit: .2, originUnitsPerUsd: 7500 })]));
  assert.equal(pyg.goodsUsd, 100); assert.equal(pyg.totalArs, 182000);
  assert.throws(() => calc(input([line({ currency: "ARS" })])), /ARS/);
  assert.throws(() => calc(input([line({ originUnitsPerUsd: 2 })])), /USD/);
  assert.equal(calc(input([line({ currency: "ARS", origin: 160000, acquisitionArsPerUnit: 1, originUnitsPerUsd: 1600 })])).totalArs, 192000);
});
test("prorrateo conserva centavos con empates y nunca replica gasto", () => {
  assert.deepEqual(allocate(100, [1,1,1]), [33.34,33.33,33.33]);
  for (let n = 1; n < 75; n++) assert.equal(Math.round(allocate(123.45, Array.from({length:n}, (_,i) => i + 1)).reduce((a,b) => a+b,0) * 100), 12345);
  const r = calc(input([line(), line({ id: "b", quantity: 2 })], { expenses: [{ label: "Transporte", amountArs: 100, method: "quantity" }] }));
  assert.equal(r.lines.reduce((s,l) => s+l.sharedArs,0), 100); assert.equal(r.totalArs, 576100);
});
test("peso y volumen requieren datos de todos; manual exige suma exacta", () => {
  assert.throws(() => calc(input([line()], { expenses: [{ label: "Flete", amountArs: 5, method: "weight" }] })), /peso/);
  assert.throws(() => calc(input([line()], { expenses: [{ label: "Flete", amountArs: 5, method: "manual", manual: {a:4} }] })), /coincidir/);
  const r = calc(input([line({weight:1, volume:2}),line({id:"b",weight:3,volume:6})], { expenses: [{label:"Flete",amountArs:100,method:"weight"}] }));
  assert.deepEqual(r.lines.map(l => l.sharedArs), [25,75]);
});
test("margen sobre venta y recargo sobre costo son distintos; pérdida visible", () => {
  const r = calc(input([line({ saleArs: 240000 })])).lines[0]; assert.equal(r.profit, 48000); assert.equal(r.margin, 20); assert.equal(r.markup, 25); assert.equal(r.suggestedArs, 256000);
  assert.ok(calc(input([line({saleArs:100000})])).lines[0].profit! < 0);
});
test("histórico, gastos omitidos, fuente pendiente y vigencia futura bloquean aprobación", () => {
  for (const p of [{ ...policy, carrierFxDate:"2026-10-16" },{ ...policy, effectiveFrom:"2027-01-01" },{ ...policy,confirmed:false }]) assert.equal(calc(input(),p).approvable,false);
  assert.equal(calc(input([line({sourceConfirmed:false})])).approvable,false);
  assert.equal(calc(input(undefined,{expensesConfirmed:false})).approvable,false);
});
test("clasificación no extiende excepción a Apple ni accesorios", () => {
  for (const title of ["iPhone 16 Pro Max 256GB","iPhone SE 2022","iPhone Air 256GB"]) assert.equal(classifyImport(title,"Apple"),"iphone");
  for (const title of ["Apple iPad 11","Apple TV 4K","Funda iPhone 16","Cargador iPhone 16","Case para iPhone 15","Batería iPhone 16"]) assert.equal(classifyImport(title,"Apple"),"general");
  assert.equal(classifyImport('TV Samsung 50 pulgadas'),"tv"); assert.equal(classifyImport('Soporte TV 50 pulgadas'),"general");
});
test("rechaza NaN, negativos, cantidades fraccionales, duplicados y margen 100", () => {
  for (const patch of [{origin:NaN},{origin:-1},{quantity:1.5},{acquisitionArsPerUnit:0}]) assert.throws(() => calc(input([line(patch)])));
  assert.throws(() => calc(input([line(),line()]))); assert.throws(() => calc(input(undefined,{targetMargin:100})));
  assert.throws(() => validatePolicy({...policy, volumePercent:25}));
});
