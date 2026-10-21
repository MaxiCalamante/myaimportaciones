/** Pure, shared costing engine. Commercial values live in versioned DB policies, never here. */
export interface ImportPolicy {
  effectiveFrom: string; confirmed: boolean; notes: string;
  generalPercent: number; volumePercent: number; thresholdUsd: number;
  volumeConfirmed: boolean; mixedConfirmed: boolean;
  thresholdBase: "shipment" | "eligible"; reducedBase: "all_eligible" | "excess";
  carrierArsPerUsd: number; carrierFxDate: string;
  iphoneUsd: number; tvUsd: Record<string, number>; productUsd: Record<string, number>;
}
export interface ImportLine {
  id: string; title: string; quantity: number; productId?: string; offerId?: string;
  currency: "USD" | "ARS" | "PYG"; origin: number;
  acquisitionArsPerUnit: number; originUnitsPerUsd: number;
  kind: "general" | "iphone" | "tv"; inches?: number;
  specialUsd?: number; specialConfirmed?: boolean;
  saleArs?: number; weight?: number; volume?: number;
  sourceConfirmed: boolean; sourceReference?: string; observedAt?: string;
}
export interface SharedExpense {
  label: string; amountArs: number;
  method: "value" | "quantity" | "weight" | "volume" | "manual";
  manual?: Record<string, number>;
}
export interface ImportInput {
  lines: ImportLine[]; expenses: SharedExpense[]; expensesConfirmed: boolean;
  targetMargin: number; shipmentSpecialUsd?: number; shipmentSpecialConfirmed?: boolean;
}
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
function number(n: number, label: string, positive = false) {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1e12 || (positive && n === 0)) throw new Error(`Revisá ${label}.`);
}
export function validatePolicy(p: ImportPolicy): ImportPolicy {
  if (!p || !/^\d{4}-\d{2}-\d{2}$/.test(p.effectiveFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(p.carrierFxDate)) throw new Error("Revisá las fechas de vigencia y cotización.");
  for (const k of ["confirmed", "volumeConfirmed", "mixedConfirmed"] as const) if (typeof p[k] !== "boolean") throw new Error("Falta estado de confirmación.");
  for (const k of ["generalPercent", "volumePercent", "thresholdUsd", "carrierArsPerUsd", "iphoneUsd"] as const) number(p[k], k);
  if (p.generalPercent > 100 || p.volumePercent > p.generalPercent || p.carrierArsPerUsd <= 0 || !["shipment", "eligible"].includes(p.thresholdBase) || !["all_eligible", "excess"].includes(p.reducedBase)) throw new Error("Revisá porcentajes, bases y cotización.");
  for (const map of [p.tvUsd, p.productUsd]) {
    if (!map || typeof map !== "object" || Array.isArray(map) || Object.keys(map).length > 1000) throw new Error("Revisá las tarifas particulares.");
    for (const [key, value] of Object.entries(map)) { if (!key || key.length > 100) throw new Error("Identificador de tarifa inválido."); number(value, "tarifa"); }
  }
  if (typeof p.notes !== "string" || p.notes.length > 5000) throw new Error("Revisá las observaciones.");
  return p;
}
/** Largest-remainder allocation in ARS cents; exact conservation, deterministic ties. */
export function allocate(amount: number, weights: number[]): number[] {
  number(amount, "gasto"); weights.forEach(w => number(w, "base de distribución"));
  const total = weights.reduce((a, b) => a + b, 0), cents = Math.round(amount * 100);
  if (!weights.length || (total <= 0 && cents > 0)) throw new Error("Faltan bases para distribuir los gastos.");
  if (!cents) return weights.map(() => 0);
  const exact = weights.map(w => cents * w / total), parts = exact.map(Math.floor);
  const order = exact.map((n, i) => ({ i, remainder: n - parts[i] })).sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  for (let i = 0, rest = cents - parts.reduce((a, b) => a + b, 0); i < rest; i++) parts[order[i].i]++;
  return parts.map(n => n / 100);
}
export function classifyImport(title: string, brand = ""): ImportLine["kind"] {
  const t = title.toLowerCase();
  if (/\biphone\s*(?:\d|se\b|air\b)/i.test(t) && !/\b(funda|case|capa|protector|cargador|cable|pel[ií]cula|repuesto|bater[ií]a|carcasa)\b/i.test(t) && (!brand || /^apple$/i.test(brand))) return "iphone";
  if (/\b(tv|televisor|television|televisão)\b/i.test(t) && !/\b(soporte|control|suporte|cable|apple tv)\b/i.test(t)) return "tv";
  return "general";
}
export function calculateImport(input: ImportInput, policy: ImportPolicy, asOf = new Date().toISOString().slice(0, 10)) {
  validatePolicy(policy);
  if (!input || !Array.isArray(input.lines) || !input.lines.length || input.lines.length > 200 || !Array.isArray(input.expenses) || input.expenses.length > 50) throw new Error("Armá una compra de 1 a 200 artículos.");
  number(input.targetMargin, "margen objetivo");
  if (input.targetMargin >= 100 || new Set(input.lines.map(l => l.id)).size !== input.lines.length) throw new Error("Margen o identificadores inválidos.");
  const warnings: string[] = [];
  if (!policy.confirmed) warnings.push("Tarifas pendientes de confirmación.");
  if (policy.effectiveFrom > asOf) warnings.push("Las tarifas aún no están vigentes.");
  if (policy.carrierFxDate !== asOf) warnings.push(`Cotización del pasador informada el ${policy.carrierFxDate}; confirmar para esta operación.`);
  if (input.expensesConfirmed !== true) warnings.push("Transporte a Tandil, tributos, seguro y otros gastos pendientes de confirmar; el costo es parcial.");
  const rows = input.lines.map(l => {
    if (!l.id || typeof l.title !== "string" || !l.title.trim() || l.title.length > 500 || !Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 10000 || !["USD", "ARS", "PYG"].includes(l.currency) || !["general", "iphone", "tv"].includes(l.kind)) throw new Error("Revisá identidad, cantidad y clasificación.");
    number(l.origin, "costo", true); number(l.acquisitionArsPerUnit, "cambio de adquisición", true); number(l.originUnitsPerUsd, "unidades de moneda por USD", true);
    if ((l.currency === "ARS" && l.acquisitionArsPerUnit !== 1) || (l.currency === "USD" && l.originUnitsPerUsd !== 1)) throw new Error("ARS requiere cambio de adquisición 1; USD requiere unidades por dólar 1.");
    for (const v of [l.saleArs, l.weight, l.volume, l.inches, l.specialUsd]) if (v !== undefined) number(v, "importe o medida");
    if (l.sourceConfirmed !== true) warnings.push(`${l.title}: costo o identidad sin confirmar.`);
    if (!l.sourceReference?.trim() || !l.observedAt || !Number.isFinite(Date.parse(l.observedAt))) warnings.push(`${l.title}: falta referencia de origen o fecha de evidencia.`);
    if (l.sourceReference && l.sourceReference.length > 2000) throw new Error("Referencia de origen demasiado larga.");
    return { ...l, goodsUsd: money(l.origin / l.originUnitsPerUsd * l.quantity), goodsArs: money(l.origin * l.acquisitionArsPerUnit * l.quantity) };
  });
  const goodsUsd = money(rows.reduce((s, l) => s + l.goodsUsd, 0));
  const eligible = rows.filter(l => l.kind === "general" && l.specialUsd === undefined && policy.productUsd[l.productId ?? ""] === undefined);
  const eligibleUsd = money(eligible.reduce((s, l) => s + l.goodsUsd, 0));
  const base = policy.thresholdBase === "shipment" ? goodsUsd : eligibleUsd;
  const over = eligible.length > 0 && input.shipmentSpecialUsd === undefined && base > policy.thresholdUsd;
  const mixed = eligible.length > 0 && eligible.length !== rows.length;
  const reduced = over && policy.volumeConfirmed && (!mixed || policy.mixedConfirmed);
  if (over && !policy.volumeConfirmed) warnings.push("Interpretación del umbral de volumen pendiente: se conserva la tarifa general.");
  if (over && mixed && !policy.mixedConfirmed) warnings.push("Pedido mixto: reducción por volumen pendiente de confirmación; se conserva la tarifa general en artículos generales.");
  if (input.shipmentSpecialUsd !== undefined) {
    number(input.shipmentSpecialUsd, "cotización de envío");
    if (!input.shipmentSpecialConfirmed) throw new Error("Confirmá la cotización especial del envío.");
  }
  const shipmentParts = input.shipmentSpecialUsd === undefined ? null : allocate(input.shipmentSpecialUsd, rows.map(l => l.goodsUsd));
  const charged = rows.map((l, index) => {
    let carrierUsd: number | null = null, rule = "";
    if (shipmentParts) { carrierUsd = shipmentParts[index]; rule = "Cotización especial del envío (prorrateada por valor)"; }
    else if (l.specialUsd !== undefined) {
      if (!l.specialConfirmed) throw new Error("Confirmá la cotización particular del producto.");
      carrierUsd = money(l.specialUsd * l.quantity); rule = "Cotización particular por unidad";
    } else if (policy.productUsd[l.productId ?? ""] !== undefined) { carrierUsd = money(policy.productUsd[l.productId!] * l.quantity); rule = "Tarifa particular por producto"; }
    else if (l.kind === "iphone") { carrierUsd = money(policy.iphoneUsd * l.quantity); rule = "iPhone por unidad"; }
    else if (l.kind === "tv") {
      const rate = policy.tvUsd[String(l.inches)];
      if (rate === undefined) warnings.push(`${l.title}: falta tarifa para TV de ${l.inches ?? "tamaño desconocido"} pulgadas.`);
      else carrierUsd = money(rate * l.quantity);
      rule = "TV por unidad";
    } else {
      const rate = reduced ? policy.volumePercent : policy.generalPercent;
      if (reduced && policy.reducedBase === "excess") {
        const excessShare = base > 0 ? Math.max(0, base - policy.thresholdUsd) / base : 0;
        carrierUsd = money(l.goodsUsd * (policy.generalPercent * (1 - excessShare) + rate * excessShare) / 100);
        rule = "Volumen: reducción sólo sobre excedente prorrateado";
      } else { carrierUsd = money(l.goodsUsd * rate / 100); rule = `General ${rate}%`; }
    }
    return { ...l, rule, carrierUsd, carrierArs: carrierUsd === null ? null : money(carrierUsd * policy.carrierArsPerUsd), sharedArs: 0 };
  });
  for (const expense of input.expenses) {
    number(expense.amountArs, "gasto compartido");
    if (!expense.label?.trim() || expense.label.length > 200 || !["value", "quantity", "weight", "volume", "manual"].includes(expense.method)) throw new Error("Revisá gasto y criterio de distribución.");
    let parts: number[];
    if (expense.method === "manual") {
      if (Object.keys(expense.manual ?? {}).some(id => !rows.some(l => l.id === id))) throw new Error("Asignación a artículo inexistente.");
      parts = rows.map(l => expense.manual?.[l.id] ?? 0); parts.forEach(n => number(n, "asignación manual"));
      if (parts.some(n => money(n) !== n) || Math.round(parts.reduce((s, n) => s + n, 0) * 100) !== Math.round(expense.amountArs * 100)) throw new Error("Las asignaciones deben coincidir con el gasto total en centavos.");
    } else {
      const method = expense.method;
      const weights = rows.map(l => method === "value" ? l.goodsArs : method === "quantity" ? l.quantity : (l[method] ?? 0) * l.quantity);
      if (["weight", "volume"].includes(expense.method) && expense.amountArs > 0 && weights.some(w => w <= 0)) throw new Error("Ingresá peso o volumen de todos los artículos.");
      parts = allocate(expense.amountArs, weights);
    }
    charged.forEach((l, i) => { l.sharedArs = money(l.sharedArs + parts[i]); });
  }
  const lines = charged.map(l => {
    const landedArs = l.carrierArs === null ? null : money(l.goodsArs + l.carrierArs + l.sharedArs);
    const unitArs = landedArs === null ? null : landedArs / l.quantity;
    const revenue = l.saleArs === undefined ? null : money(l.saleArs * l.quantity);
    const profit = revenue === null || landedArs === null ? null : money(revenue - landedArs);
    return { ...l, landedArs, unitArs, suggestedArs: unitArs === null ? null : Math.ceil(unitArs / (1 - input.targetMargin / 100)), revenue, profit,
      margin: profit === null || !revenue ? null : profit / revenue * 100,
      markup: profit === null || !landedArs ? null : profit / landedArs * 100 };
  });
  const complete = lines.every(l => l.landedArs !== null);
  return { lines, warnings: [...new Set(warnings)], complete, goodsUsd,
    goodsArs: money(lines.reduce((s, l) => s + l.goodsArs, 0)),
    carrierUsd: complete ? money(lines.reduce((s, l) => s + l.carrierUsd!, 0)) : null,
    totalArs: complete ? money(lines.reduce((s, l) => s + l.landedArs!, 0)) : null,
    approvable: complete && warnings.length === 0 };
}
