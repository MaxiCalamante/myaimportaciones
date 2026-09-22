"use server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
export async function saveFulfillmentControl(form: FormData) {
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Iniciá sesión.");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Sin permisos.");
  const mode = String(form.get("mode"));
  if (!["own_stock", "supplier"].includes(mode)) throw new Error("Modalidad inválida.");
  const { error } = await db.rpc("set_product_fulfillment_v1", { product_id_input: String(form.get("product_id")), mode_input: mode, available_input: form.get("available") === "on" });
  if (error) throw new Error("No se pudo cambiar la modalidad. Resolvé reservas pendientes antes de cambiarla.");
  revalidatePath("/", "layout");
  return "Modalidad de entrega guardada.";
}
export async function saveFinancialControl(form: FormData) {
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Iniciá sesión.");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Sin permisos.");
  const amounts = Object.fromEntries(["purchase", "exchange", "freight", "other", "variable", "fee", "sale", "minimum"].map(k => [k, Number(form.get(k))]));
  if (Object.values(amounts).some(v => !Number.isFinite(v) || v < 0 || v > 1e9)) throw new Error("Revisá los importes.");
  const stockText = String(form.get("stock") ?? "").trim();
  const stock = stockText === "" ? null : Number(stockText);
  if (stock !== null && (!Number.isInteger(stock) || stock < 0 || stock > 100000 || form.get("stock_confirmed") !== "on")) throw new Error("Confirmá el conteo físico para actualizar existencias.");
  const { error } = await db.rpc("save_retail_financials_v1", { payload: { ...amounts, product_id: String(form.get("product_id")), currency: String(form.get("currency")), expenses_confirmed: form.get("expenses_confirmed") === "on", stock, stock_confirmed: form.get("stock_confirmed") === "on" } });
  if (error) throw new Error("No se guardó: verificá que la venta cubra los costos y resolvé reservas pendientes antes de modificar stock.");
  revalidatePath("/", "layout");
  return "Costos y precio guardados. El stock sólo cambió si cargaste un conteo confirmado.";
}
