import Papa from "papaparse";

export interface IntelligenceSupplier {
  id: string; name: string; website: string | null; official_key: string | null; query_mode: string;
  automation_authorized: boolean; freshness_hours: number; is_active: boolean;
  capabilities: { details?: string; reviewed_on?: string };
}
export interface SupplierOffer {
  id: string; supplier_id: string; product_id: string | null; variant_id: string | null;
  external_id: string; variant_key: string; title: string; brand: string; model: string; gtin: string | null;
  source_url: string; origin_cost: number | null; currency: "USD" | "ARS" | "PYG" | null;
  availability: "in_stock" | "out_of_stock" | "unknown"; verification: "pending" | "verified";
  cost_checked_at: string | null; availability_checked_at: string | null; last_success_at: string | null;
  last_attempt_at: string | null; last_error: string | null;
}
export type OfferObservation = Omit<SupplierOffer, "id" | "cost_checked_at" | "availability_checked_at" | "last_success_at" | "last_attempt_at" | "last_error"> & {
  method: "manual" | "csv" | "product_page"; observed_at: string;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function supplierSourceUrl(raw: string, supplier: Pick<IntelligenceSupplier, "website">) {
  const url = new URL(raw), site = new URL(supplier.website ?? "");
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hostname.replace(/^www\./, "") !== site.hostname.replace(/^www\./, "")) throw new Error("La fuente debe pertenecer al sitio HTTPS del proveedor seleccionado.");
  url.hash = "";
  return url.href;
}
export function parseObservation(raw: Record<string, unknown>, supplier: IntelligenceSupplier, method: OfferObservation["method"] = "manual", now = Date.now()): OfferObservation {
  const str = (key: string, max: number, required = false) => {
    const v = raw[key];
    if (v !== undefined && v !== null && typeof v !== "string") throw new Error(`Revisá ${key}.`);
    const s = String(v ?? "").trim(); if (s.length > max || (required && !s)) throw new Error(`Revisá ${key}.`); return s;
  };
  const product_id = str("product_id", 36) || null, variant_id = str("variant_id", 36) || null;
  if ((product_id && !uuid.test(product_id)) || (variant_id && (!uuid.test(variant_id) || !product_id))) throw new Error("Producto o variante inválidos.");
  const title = str("title", 500, true), variant_key = str("variant_key", 500, true).normalize("NFKC").replace(/\s+/g, " ").toLowerCase();
  if (supplier.official_key === "atacado-connect" && /\biphone\b/i.test(title) && /\b(cpo|outlet|refurbished|reacondicionado|usado|seminovo|ativo|activado)\b/i.test(`${title} ${variant_key}`)) throw new Error("Atacado Connect: sólo iPhone nuevo sellado; revisá condición y variante.");
  if (supplier.official_key === "atacado-connect" && /\biphone\b/i.test(title) && raw.verification === "verified" && !/\b(nuevo sellado|new sealed|novo lacrado|new_sealed)\b/i.test(`${title} ${variant_key}`)) throw new Error("Atacado Connect: documentá explícitamente la condición nuevo sellado antes de verificar.");
  const currency = str("currency", 3) as OfferObservation["currency"];
  const n = raw.origin_cost;
  const origin_cost = n === "" || n === undefined || n === null ? null : Number(n);
  if ((origin_cost !== null && (!Number.isFinite(origin_cost) || origin_cost <= 0 || origin_cost > 1e10)) || (currency && !["USD", "ARS", "PYG"].includes(currency)) || (origin_cost !== null && !currency)) throw new Error("Revisá costo y moneda original; usá punto decimal sin separadores de miles.");
  const availability = str("availability", 20, true) as OfferObservation["availability"];
  const verification = str("verification", 20, true) as OfferObservation["verification"];
  if (!["in_stock", "out_of_stock", "unknown"].includes(availability) || !["pending", "verified"].includes(verification)) throw new Error("Estado de evidencia inválido.");
  const observed_at = str("observed_at", 40, true), date = Date.parse(observed_at);
  if (!Number.isFinite(date) || date > now + 300000 || date < now - 10 * 366 * 86400000) throw new Error("Revisá la fecha real de la evidencia.");
  const gtin = str("gtin", 14) || null;
  if (gtin && !/^(\d{8}|\d{12,14})$/.test(gtin)) throw new Error("Revisá GTIN/EAN.");
  return { supplier_id: supplier.id, product_id, variant_id, external_id: str("external_id", 200, true), variant_key,
    title, brand: str("brand", 200), model: str("model", 200), gtin, source_url: supplierSourceUrl(str("source_url", 2000, true), supplier),
    origin_cost, currency: currency || null, availability, verification, observed_at: new Date(date).toISOString(), method };
}
export function parseOffersCsv(csv: string, supplier: IntelligenceSupplier): OfferObservation[] {
  if (csv.length > 500000) throw new Error("CSV demasiado grande; dividilo en lotes de hasta 200 filas.");
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: "greedy", transformHeader: h => h.trim() });
  if (parsed.errors.length || !parsed.data.length || parsed.data.length > 200) throw new Error("CSV inválido. Admitimos de 1 a 200 filas con encabezado.");
  const rows = parsed.data.map((r, index) => { try { return parseObservation(r, supplier, "csv"); } catch (e) { throw new Error(`Fila ${index + 2}: ${e instanceof Error ? e.message : "inválida"}`); } });
  const keys = rows.map(r => JSON.stringify([r.external_id, r.variant_key]));
  if (new Set(keys).size !== keys.length) throw new Error("El CSV repite identificador y variante; revisá duplicados.");
  return rows;
}
export function offerEvidence(offer: SupplierOffer, supplier: Pick<IntelligenceSupplier, "freshness_hours">, now = Date.now()) {
  const fresh = (stamp: string | null) => !!stamp && Number.isFinite(Date.parse(stamp)) && Date.parse(stamp) <= now + 300000 && now - Date.parse(stamp) <= supplier.freshness_hours * 3600000;
  const costFresh = fresh(offer.cost_checked_at), availabilityFresh = fresh(offer.availability_checked_at);
  return { costFresh, availabilityFresh,
    usable: offer.verification === "verified" && costFresh && availabilityFresh && offer.availability === "in_stock" && !offer.last_error && Number(offer.origin_cost) > 0,
    label: offer.last_error ? "Error de consulta; se conserva evidencia anterior" : offer.verification !== "verified" ? "Identidad pendiente" : !availabilityFresh ? "Disponibilidad vencida o sin verificar" : offer.availability === "in_stock" ? "Disponible bajo pedido" : offer.availability === "out_of_stock" ? "Sin disponibilidad verificada" : "Pendiente de confirmación" };
}
