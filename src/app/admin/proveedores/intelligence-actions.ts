"use server";

import { getAdminClient } from "@/lib/admin-auth";
import { parseObservation, parseOffersCsv, offerEvidence, type IntelligenceSupplier, type SupplierOffer } from "@/lib/supplier-intelligence";
import { calculateImport, validatePolicy, type ImportInput, type ImportPolicy } from "@/lib/import-costs";
import { revalidatePath } from "next/cache";
import { validId } from "@/lib/admin-product";
import { probeRegisteredOffer } from "@/lib/supplier-offer-adapters";
import { isDeepStrictEqual } from "node:util";

function refresh() { revalidatePath("/admin/proveedores/inteligencia"); }
async function supplierById(db: Awaited<ReturnType<typeof getAdminClient>>, id: string) {
  validId(id);
  const { data, error } = await db.from("suppliers").select("*").eq("id", id).eq("is_active", true).single();
  if (error || !data) throw new Error("Proveedor inexistente o inactivo.");
  return data as IntelligenceSupplier;
}
export async function previewOffersAction(supplierId: string, csv: string) {
  const db = await getAdminClient();
  return parseOffersCsv(csv, await supplierById(db, supplierId));
}
export async function importOffersAction(supplierId: string, csv: string, confirmed: boolean) {
  const db = await getAdminClient();
  if (confirmed !== true) throw new Error("Revisá y aprobá la vista previa antes de importar.");
  const rows = parseOffersCsv(csv, await supplierById(db, supplierId));
  const { error } = await db.rpc("import_supplier_observations_v1", { rows_input: rows });
  if (error) throw new Error(`No se importó el lote: ${error.message}`);
  refresh(); return { count: rows.length };
}
export async function saveOfferAction(supplierId: string, raw: Record<string, unknown>, confirmed: boolean) {
  const db = await getAdminClient();
  if (confirmed !== true) throw new Error("Confirmá la fuente y variante de la oferta.");
  const row = parseObservation(raw, await supplierById(db, supplierId));
  const { error } = await db.rpc("record_supplier_observation_v1", { p: row });
  if (error) throw new Error(`No se guardó la oferta: ${error.message}`);
  refresh();
}
export async function saveImportPolicyAction(config: ImportPolicy, confirmed: boolean) {
  const db = await getAdminClient();
  if (confirmed !== true) throw new Error("Confirmá el cambio de tarifas.");
  validatePolicy(config);
  const { error } = await db.from("import_cost_policies").insert({ config });
  if (error) throw new Error("No se pudo guardar la nueva versión de tarifas.");
  refresh();
}
async function evaluate(db: Awaited<ReturnType<typeof getAdminClient>>, input: ImportInput, policyId: string) {
  validId(policyId);
  const { data: policy, error } = await db.from("import_cost_policies").select("config").eq("id", policyId).single();
  if (error || !policy) throw new Error("Tarifa inexistente.");
  // Never accept a client-asserted verified supplier cost: re-read matching evidence server-side.
  const lines = [];
  for (const line of input.lines) {
    if (!line.offerId) { lines.push(line); continue; }
    validId(line.offerId);
    const { data: offer, error: offerError } = await db.from("supplier_offers").select("*").eq("id", line.offerId).single();
    if (offerError || !offer) throw new Error("Oferta inexistente.");
    const supplier = await supplierById(db, offer.supplier_id);
    if (offer.product_id !== (line.productId ?? null)) throw new Error("La oferta no corresponde al producto seleccionado.");
    if (offer.origin_cost === null || !offer.currency) throw new Error("La oferta no tiene costo documentado.");
    lines.push({ ...line, title: `${offer.title} · ${offer.variant_key}`, origin: Number(offer.origin_cost), currency: offer.currency, sourceReference: offer.source_url, observedAt: offer.cost_checked_at ?? undefined, sourceConfirmed: offerEvidence(offer as SupplierOffer, supplier).usable });
  }
  const checked = { ...input, lines };
  return { input: checked, result: calculateImport(checked, policy.config as ImportPolicy) };
}
export async function saveImportSimulationAction(title: string, input: ImportInput, policyId: string) {
  const db = await getAdminClient();
  if (typeof title !== "string" || !title.trim() || title.length > 200 || !input || !Array.isArray(input.lines) || input.lines.length > 200) throw new Error("Revisá título y artículos de la simulación.");
  const checked = await evaluate(db, input, policyId);
  const { data, error } = await db.from("import_simulations").insert({ title: title.trim(), policy_id: policyId, ...checked }).select("id").single();
  if (error || !data) throw new Error("No se pudo guardar la simulación.");
  refresh(); return data.id as string;
}
export async function approveImportPurchaseAction(id: string, notes: string, confirmed: boolean) {
  const db = await getAdminClient(); validId(id);
  if (confirmed !== true || typeof notes !== "string" || !notes.trim() || notes.length > 2000) throw new Error("Confirmá la compra y registrá su referencia administrativa.");
  const { data: saved, error } = await db.from("import_simulations").select("input,result,policy_id").eq("id", id).single();
  if (error || !saved) throw new Error("Simulación inexistente.");
  const checked = await evaluate(db, saved.input as ImportInput, saved.policy_id);
  if (!checked.result.approvable || !isDeepStrictEqual(JSON.parse(JSON.stringify(checked.result)), saved.result)) throw new Error("Hay datos pendientes o la evidencia cambió. Guardá una nueva simulación antes de aprobar.");
  const { error: insertError } = await db.from("import_purchases").insert({ simulation_id: id, notes: notes.trim() });
  if (insertError && insertError.code !== "23505") throw new Error("No se pudo registrar la aprobación.");
  refresh();
}
export async function reviewSupplierProposalAction(id: string, status: "approved" | "rejected") {
  const db = await getAdminClient(); validId(id);
  if (!["approved", "rejected"].includes(status)) throw new Error("Revisión inválida.");
  const { data: { user } } = await db.auth.getUser();
  const { data, error } = await db.from("supplier_proposals").update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id }).eq("id", id).eq("status", "pending").select("id").single();
  if (error || !data) throw new Error("La propuesta ya fue revisada o no existe.");
  refresh();
}
export async function configureSupplierQueryAction(id: string, authorized: boolean, freshness: number) {
  const db = await getAdminClient(); await supplierById(db, id);
  if (typeof authorized !== "boolean" || !Number.isInteger(freshness) || freshness < 1 || freshness > 720) throw new Error("Revisá autorización y vigencia de evidencia.");
  const { error } = await db.from("suppliers").update({ automation_authorized: authorized, freshness_hours: freshness }).eq("id", id);
  if (error) throw new Error("No se pudo guardar la configuración del proveedor.");
  refresh();
}
export async function probeSupplierOfferAction(id: string) {
  const db = await getAdminClient(); validId(id);
  const { data: raw, error } = await db.from("supplier_offers").select("*").eq("id", id).single();
  if (error || !raw) throw new Error("Oferta inexistente.");
  const offer = raw as SupplierOffer, supplier = await supplierById(db, offer.supplier_id);
  if (!supplier.automation_authorized || supplier.query_mode !== "product_page") throw new Error("Falta autorización de consulta o adaptador validado. Usá CSV o carga manual.");
  if (offer.last_attempt_at && Date.now() - Date.parse(offer.last_attempt_at) < 60000) throw new Error("Esperá un minuto entre consultas de la misma ficha.");
  const { error: claimError } = await db.rpc("claim_supplier_query_v1", { offer_input: id });
  if (claimError) throw new Error(claimError.message);
  const outcome = await probeRegisteredOffer(offer, supplier);
  const p = outcome.ok ? parseObservation({ ...offer, ...outcome.values, observed_at: new Date().toISOString() }, supplier, "product_page")
    : { supplier_id: supplier.id, external_id: offer.external_id, variant_key: offer.variant_key, method: outcome.missing ? "not_found" : "error", observed_at: new Date().toISOString(), message: outcome.message };
  const { error: saveError } = await db.rpc("record_supplier_observation_v1", { p });
  if (saveError) throw new Error("La consulta terminó pero no se pudo registrar el resultado.");
  refresh(); return outcome.ok ? "Evidencia registrada; revisá las propuestas antes de cambiar el catálogo." : outcome.message;
}
