/** Selling rules are versioned separately from import tariffs; no commercial defaults live here. */
export interface CatalogPricingRule {
  targetMarginPercent: number;
  minimumMarginPercent: number;
  wholesaleMarginPercent: number;
  paymentFeePercent: number;
  fixedUnitArs: number;
  roundArs: number;
  expensesConfirmed: boolean;
  categoryMargins: Record<string, { target: number; minimum: number; wholesale: number }>;
  notes: string;
}

export interface CatalogPriceQuote {
  price: number | null;
  contributionArs: number | null;
  marginPercent: number | null;
  markupPercent: number | null;
  complete: boolean;
  warnings: string[];
}

// Technical limits bound arithmetic and payload size; these are not suggested business values.
const MAX_AMOUNT = 1e12;
const forbiddenKeys = new Set(["__proto__", "prototype", "constructor"]);
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object"
  && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const has = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

function percent(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value >= 100) {
    throw new Error(`Revisá ${label}: debe ser un porcentaje entre 0 y menos de 100.`);
  }
}

function margins(target: unknown, minimum: unknown, wholesale: unknown, fee: number) {
  percent(target, "margen objetivo"); percent(minimum, "margen mínimo"); percent(wholesale, "margen mayorista");
  if (target < minimum || wholesale < minimum) throw new Error("El objetivo y el margen mayorista deben respetar el margen mínimo.");
  if (target + fee >= 100 || wholesale + fee >= 100) throw new Error("El margen y la comisión sobre venta deben sumar menos de 100%.");
}

/** Validate a complete explicit configuration. Missing values never become zero or historic rates. */
export function validateCatalogPricingRule(input: unknown): CatalogPricingRule {
  if (!isRecord(input)) throw new Error("Falta configurar la regla comercial del catálogo.");
  for (const key of ["targetMarginPercent", "minimumMarginPercent", "wholesaleMarginPercent", "paymentFeePercent",
    "fixedUnitArs", "roundArs", "expensesConfirmed", "categoryMargins", "notes"]) {
    if (!has(input, key)) throw new Error(`Falta configurar ${key}.`);
  }
  percent(input.paymentFeePercent, "comisión de cobro");
  margins(input.targetMarginPercent, input.minimumMarginPercent, input.wholesaleMarginPercent, input.paymentFeePercent);
  if (typeof input.fixedUnitArs !== "number" || !Number.isFinite(input.fixedUnitArs) || input.fixedUnitArs < 0 || input.fixedUnitArs > MAX_AMOUNT) {
    throw new Error("Revisá el gasto fijo por unidad.");
  }
  if (typeof input.roundArs !== "number" || !Number.isFinite(input.roundArs) || input.roundArs < .01
    || input.roundArs > MAX_AMOUNT || Math.round(input.roundArs * 100) / 100 !== input.roundArs) {
    throw new Error("El redondeo debe ser un importe positivo en centavos de ARS.");
  }
  if (typeof input.expensesConfirmed !== "boolean") throw new Error("Falta indicar si los gastos están confirmados.");
  if (typeof input.notes !== "string" || input.notes.length > 5000) throw new Error("Revisá las observaciones de la regla.");
  if (!isRecord(input.categoryMargins) || Object.keys(input.categoryMargins).length > 1000) throw new Error("Revisá los márgenes por categoría.");
  for (const [key, value] of Object.entries(input.categoryMargins)) {
    if (!key.trim() || key.length > 100 || forbiddenKeys.has(key) || !isRecord(value)
      || !["target", "minimum", "wholesale"].every(field => has(value, field))) throw new Error("Revisá la configuración de la categoría.");
    margins(value.target, value.minimum, value.wholesale, input.paymentFeePercent);
  }
  return input as unknown as CatalogPricingRule;
}

type Fraction = { numerator: bigint; denominator: bigint };
const ONE = BigInt(1), HUNDRED = BigInt(100);

/** Interpret the supplied decimal exactly, including unit costs produced by quantity allocation. */
function fraction(value: number): Fraction {
  const [coefficient, exponent = "0"] = value.toString().toLowerCase().split("e");
  const [whole, decimals = ""] = coefficient.split(".");
  const scale = decimals.length - Number(exponent);
  const numerator = BigInt(whole + decimals);
  return scale >= 0
    ? { numerator, denominator: BigInt(10) ** BigInt(scale) }
    : { numerator: numerator * BigInt(10) ** BigInt(-scale), denominator: ONE };
}

function add(a: Fraction, b: Fraction): Fraction {
  return { numerator: a.numerator * b.denominator + b.numerator * a.denominator, denominator: a.denominator * b.denominator };
}

/** Exact decimal ceiling prevents both downward rounding and a spurious extra rounding step. */
function priceRoundedUp(landed: number, rule: CatalogPricingRule, margin: number): number | null {
  const cost = add(fraction(landed), fraction(rule.fixedUnitArs));
  const deductions = add(fraction(rule.paymentFeePercent), fraction(margin));
  const remaining = HUNDRED * deductions.denominator - deductions.numerator;
  const incrementCents = BigInt(Math.round(rule.roundArs * 100));
  if (remaining <= BigInt(0)) return null;
  const numerator = cost.numerator * HUNDRED * HUNDRED * deductions.denominator;
  const denominator = cost.denominator * remaining * incrementCents;
  const increments = (numerator + denominator - ONE) / denominator;
  const cents = increments * incrementCents;
  if (cents > BigInt(MAX_AMOUNT * 100)) return null;
  return Number(cents) / 100;
}

/**
 * landedArs is the per-unit result of calculateImport, with shared expenses already allocated there.
 * fixedUnitArs is an additional selling expense per unit, never a shipment total.
 * Contribution deducts the fee on sale and both unit costs. Margin uses sale as its denominator;
 * contribution markup uses landed + fixed as its cost basis. Neither is net business profit.
 * Completeness here only certifies these pricing inputs; callers must also require current import evidence.
 */
export function quoteCatalogPrice(
  landedArs: number | null,
  rule: CatalogPricingRule,
  categoryId: string,
  channel: "retail" | "wholesale" = "retail",
): CatalogPriceQuote {
  const incomplete = (warnings: string[]): CatalogPriceQuote => ({ price: null, contributionArs: null,
    marginPercent: null, markupPercent: null, complete: false, warnings });
  try { validateCatalogPricingRule(rule); }
  catch (error) { return incomplete([error instanceof Error ? error.message : "Revisá la regla comercial."]); }
  const warnings: string[] = [];
  if (typeof landedArs !== "number" || !Number.isFinite(landedArs) || landedArs <= 0 || landedArs > MAX_AMOUNT) warnings.push("Falta un costo de importación unitario válido y completo.");
  if (!rule.expensesConfirmed) warnings.push("Los gastos comerciales y de importación deben estar confirmados antes de calcular un precio publicable.");
  if (typeof categoryId !== "string" || categoryId.length > 100 || !["retail", "wholesale"].includes(channel)) warnings.push("Revisá la categoría y el canal de venta.");
  if (warnings.length) return incomplete(warnings);
  const override = has(rule.categoryMargins, categoryId) ? rule.categoryMargins[categoryId] : undefined;
  const margin = channel === "wholesale" ? override?.wholesale ?? rule.wholesaleMarginPercent : override?.target ?? rule.targetMarginPercent;
  const price = priceRoundedUp(landedArs!, rule, margin);
  if (price === null || !Number.isFinite(price) || price <= 0) return incomplete(["El precio calculado supera el límite admitido; revisá costos, comisión y márgenes."]);
  const cost = landedArs! + rule.fixedUnitArs;
  const contributionArs = price - price * rule.paymentFeePercent / 100 - cost;
  return { price, contributionArs, marginPercent: contributionArs / price * 100,
    markupPercent: contributionArs / cost * 100, complete: true, warnings: [] };
}
