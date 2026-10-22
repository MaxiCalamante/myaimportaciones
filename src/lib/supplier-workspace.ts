import "server-only";
import { getAdminClient } from "./admin-auth";
import { readAllPages } from "./read-all-pages";
import { readAdminProducts } from "./admin-catalog-read";
import type { IntelligenceSupplier, SupplierOffer } from "./supplier-intelligence";
import type { ImportInput, ImportPolicy, calculateImport } from "./import-costs";
import type { ProductCost } from "./product-profit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TrackingConfig } from "./supplier-automation";

export interface TrackingWorkspace {
  config: TrackingConfig;
  snapshotAt: string;
  queueTotal: number;
  queueErrors: number;
  issues: Array<{ id: string; product_id: string | null; source_url: string; state: string; last_error: string | null; next_run_at: string; attempts: number }>;
  health: Array<{ supplier_id: string; status: string; message: string | null; last_attempt_at: string | null; last_success_at: string | null; products_seen: number }>;
  runs: Array<{ id: string; worker: string; started_at: string; completed_at: string | null; status: string; report: Record<string, unknown> }>;
  searches: Array<{ id: string; query: string; state: string; created_at: string }>;
  decisions: Array<{ id: string; product_id: string; old_price: number | null; new_price: number | null; status: string; reason: string }>;
}

async function readTrackingWorkspace(db: SupabaseClient): Promise<TrackingWorkspace | null> {
  const settings = await db.from("supplier_tracking_settings").select("config").eq("id", true).single();
  if (settings.error) {
    if (["42P01", "PGRST205"].includes(settings.error.code)) return null;
    throw new Error("No se pudo leer el motor de seguimiento.");
  }
  if (!settings.data?.config) return null;
  const [queue, errors, health, runs, searches, decisions, issues] = await Promise.all([
    db.from("supplier_sync_queue").select("id", { count: "exact", head: true }),
    db.from("supplier_sync_queue").select("id", { count: "exact", head: true }).in("state", ["retry", "blocked"]),
    db.from("supplier_source_health").select("*"),
    db.from("supplier_sync_runs").select("*").order("started_at", { ascending: false }).limit(50),
    db.from("supplier_search_requests").select("id,query,state,created_at").order("created_at", { ascending: false }).limit(12),
    db.from("supplier_price_decisions").select("id,product_id,old_price,new_price,status,reason").order("created_at", { ascending: false }).limit(30),
    db.from("supplier_sync_queue").select("id,product_id,source_url,state,last_error,next_run_at,attempts").in("state", ["retry", "blocked"]).order("next_run_at").limit(50),
  ]);
  for (const r of [queue, errors, health, runs, searches, decisions, issues]) if (r.error) throw new Error("No se pudo completar el estado de seguimiento.");
  return {
    snapshotAt: new Date().toISOString(),
    config: settings.data.config as TrackingConfig,
    issues: issues.data ?? [],
    queueTotal: queue.count ?? 0,
    queueErrors: errors.count ?? 0,
    health: health.data ?? [],
    runs: runs.data ?? [],
    searches: searches.data ?? [],
    decisions: decisions.data ?? [],
  };
}

export interface PolicyVersion { id: string; config: ImportPolicy; created_at: string }
export interface SavedSimulation { id: string; title: string; input: ImportInput; result: ReturnType<typeof calculateImport>; policy_id: string; created_at: string }
export interface SupplierProposal { id: string; offer_id: string; kind: string; status: string; before_value: Partial<SupplierOffer> | null; after_value: Partial<SupplierOffer>; created_at: string }
export interface WorkspaceProduct { id: string; title: string; brand: string; model: string; sku: string; retail_price: number; stock: number; fulfillment_mode: string; supplier_available: boolean; has_variants?: boolean; category_id?: string }
export interface WorkspaceCategory { id: string; name: string; slug: string }
export interface WorkspaceVariant { id: string; product_id: string; title: string; sku: string | null; retail_price: number; options: Record<string, string> }
export interface CrosslinkWorkspace {
  jobs: Array<{ id: string; supplier_id: string; kind: string; query: string; source_url: string; product_ids: string[]; state: string; last_success_at: string | null; last_error: string | null; report: { seen?: number; linked?: number; complete?: boolean } }>;
  decisions: Array<{ id: string; offer_id: string; product_id: string | null; variant_id: string | null; status: string; method: string | null; reason: string; created_at: string }>;
}

async function readCrosslinkWorkspace(db: SupabaseClient): Promise<CrosslinkWorkspace | null> {
  const [jobs, decisions] = await Promise.all([
    readAllPages<CrosslinkWorkspace["jobs"][number]>((from, to) => db.from("supplier_discovery_jobs").select("id,supplier_id,kind,query,source_url,product_ids,state,last_success_at,last_error,report").order("id").range(from, to)),
    db.from("supplier_link_decisions").select("id,offer_id,product_id,variant_id,status,method,reason,created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  if (decisions.error) throw new Error("No se pudo leer la auditoría de vínculos.");
  return { jobs, decisions: decisions.data ?? [] };
}

export async function readSupplierWorkspace() {
  const db = await getAdminClient();
  const supplierResult = await db.from("suppliers").select("id,name,website,official_key,query_mode,automation_authorized,freshness_hours,is_active,capabilities").order("name");
  if (supplierResult.error) {
    if (["42703", "PGRST204"].includes(supplierResult.error.code)) return null;
    throw new Error("No se pudo leer el registro de proveedores.");
  }
  const [offers, products, costs, variants, policies, simulations, proposals, purchases, observations, automation, crosslinks, categoriesResult] = await Promise.all([
    readAllPages<SupplierOffer>((from, to) => db.from("supplier_offers").select("*").order("id").range(from, to)),
    readAllPages<Record<string, unknown>>((from, to) => readAdminProducts(db, { from, size: to - from + 1 })),
    readAllPages<ProductCost>((from, to) => db.from("product_costs").select("*").order("product_id").range(from, to)),
    readAllPages<WorkspaceVariant>((from, to) => db.from("product_variants").select("id,product_id,title,sku,retail_price,options").order("id").range(from, to)),
    db.from("import_cost_policies").select("id,config,created_at").order("created_at", { ascending: false }).limit(100),
    db.from("import_simulations").select("*").order("created_at", { ascending: false }).limit(50),
    db.from("supplier_proposals").select("*").order("created_at", { ascending: false }).limit(200),
    db.from("import_purchases").select("id,simulation_id,approved_at,notes").order("approved_at", { ascending: false }).limit(50),
    db.from("supplier_observations").select("id,offer_id,kind,observed_at,recorded_at,payload").order("recorded_at", { ascending: false }).limit(100),
    readTrackingWorkspace(db),
    readCrosslinkWorkspace(db),
    db.from("categories").select("id,name,slug").order("display_order"),
  ]);
  for (const result of [policies, simulations, proposals, purchases, observations]) if (result.error) throw new Error("No se pudo completar el historial de proveedores.");
  // Send only the admin data required by this workspace; no profiles, credentials or checkout data.
  return {
    suppliers: supplierResult.data as IntelligenceSupplier[],
    offers,
    costs,
    variants,
    automation,
    crosslinks,
    categories: (categoriesResult.data ?? []) as WorkspaceCategory[],
    products: products.map(p => ({
      id: String(p.id),
      title: String(p.title),
      brand: String(p.brand ?? ""),
      model: String(p.model ?? ""),
      sku: String(p.sku ?? ""),
      retail_price: Number(p.retail_price),
      stock: Number(p.stock),
      fulfillment_mode: String(p.fulfillment_mode),
      supplier_available: Boolean(p.supplier_available),
      has_variants: Boolean(p.has_variants),
      category_id: p.category_id ? String(p.category_id) : undefined,
    })),
    policies: (policies.data ?? []) as PolicyVersion[],
    simulations: (simulations.data ?? []) as SavedSimulation[],
    proposals: (proposals.data ?? []) as SupplierProposal[],
    purchases: purchases.data ?? [],
    observations: observations.data ?? [],
  };
}

export type SupplierWorkspaceData = NonNullable<Awaited<ReturnType<typeof readSupplierWorkspace>>>;
