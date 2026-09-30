"use server";

import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/admin-auth";
import { parseSupplier } from "@/lib/suppliers";

export async function saveSupplierAction(form: FormData) {
  const db = await getAdminClient();
  const { id, values } = parseSupplier(form);
  const query = id ? db.from("suppliers").update(values).eq("id", id) : db.from("suppliers").insert(values);
  const { data, error } = await query.select("id").single();
  if (error || !data) throw new Error(error?.code === "42P01" || error?.code === "PGRST205" ? "Falta aplicar la migración de proveedores. Revisá el informe de lanzamiento." : "No se pudo guardar el proveedor. Revisá tu conexión y acceso.");
  revalidatePath("/admin/proveedores");
  return { success: true };
}
