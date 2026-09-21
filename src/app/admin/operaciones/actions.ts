"use server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
export async function updateWithdrawalAction(form: FormData) {
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Iniciá sesión.");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Sin permisos.");
  const reference = String(form.get("reference") ?? "");
  const status = String(form.get("status") ?? "");
  if (!/^ARR-[A-F0-9]{32}$/.test(reference) || !["received", "contacted", "resolved"].includes(status)) throw new Error("Solicitud inválida.");
  const { data, error } = await db.from("withdrawal_requests").update({ status }).eq("reference", reference).select("reference").single();
  if (error || !data) throw new Error("No se pudo actualizar la solicitud.");
  revalidatePath("/admin/operaciones");
}
export async function verifyInventoryAction(form: FormData) {
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Iniciá sesión.");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Sin permisos.");
  const stock = Number(form.get("stock")), weight = Number(form.get("weight"));
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000 || !Number.isFinite(weight) || weight < 0 || form.get("confirmed") !== "on") throw new Error("Confirmá el conteo físico y los datos del producto.");
  const fields = ["modelo", "contenido", "ingredientes", "uso", "precauciones", "incluye", "compatibilidad", "responsable_local", "lote", "vencimiento"];
  const specifications = Object.fromEntries(fields.map(k => [k, String(form.get(k) ?? "").trim().slice(0, 3000)]));
  const { error } = await db.rpc("verify_retail_inventory_v2", { product_id_input: String(form.get("product_id")), stock_input: stock, specifications_input: { ...specifications, peso_kg: String(weight) }, warranty_input: String(form.get("warranty") ?? "").slice(0, 3000) });
  if (error) throw new Error("No se pudo verificar el inventario. Revisá reservas activas y migración.");
  revalidatePath("/", "layout");
}
