"use server";

import { getAdminClient } from "@/lib/admin-auth";

export type CatalogSyncProduct = {
  position: number;
  title: string;
  status: "running" | "pending" | "own" | "review" | "issue" | "checked";
  finished_at: string | null;
  sources: number;
  verified: number;
  available: number;
  message: string | null;
  missing_variants: boolean;
};

export type CatalogSyncSnapshot = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  enabled: boolean;
  total: number;
  processed: number;
  checked: number;
  issues: number;
  own: number;
  review: number;
  queries: number;
  recent: CatalogSyncProduct[];
  rows: CatalogSyncProduct[];
};

async function readProgress(db: Awaited<ReturnType<typeof getAdminClient>>, page: number) {
  const result = await db.rpc("read_supplier_catalog_sync_v1", { page_input: page });
  if (result.error) throw new Error("No se pudo consultar el avance del catálogo.");
  return result.data as CatalogSyncSnapshot | null;
}

export async function readSupplierCatalogSyncAction(page: number) {
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw new Error("Página inválida.");
  return readProgress(await getAdminClient(), page);
}

export async function startSupplierCatalogSyncAction() {
  const db = await getAdminClient();
  const result = await db.rpc("start_supplier_catalog_sync_v1");
  if (result.error) {
    if (result.error.message.includes("desactivado")) throw new Error("El seguimiento de proveedores está desactivado.");
    throw new Error("No se pudo iniciar la revisión del catálogo.");
  }
  return readProgress(db, 1);
}
