"use server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateResale } from "@/lib/resale-pricing";
import { revalidatePath } from "next/cache";
export async function saveProductCostAction(data: FormData) {
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Iniciá sesión como administrador.");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Sin permisos.");
  if (data.get("confirmed") !== "on") throw new Error("Confirmá las fuentes.");
  const n = (key: string) => Number(data.get(key));
  const i = { purchase: n("purchase"), exchange: n("exchange"), freight: n("freight"), other: n("other"), variable: n("variable"), feePercent: n("feePercent"), minimum: n("minimum"), ml: n("ml") };
  calculateResale(i);
  const supplier = String(data.get("supplier_url") ?? ""), ml = String(data.get("ml_url") ?? "");
  if (!/^https:\/\//.test(supplier) || (i.ml && !/^https:\/\/([^/]+\.)?mercadolibre\.com\.ar\//.test(ml))) throw new Error("Revisá los enlaces de referencia.");
  const currency = String(data.get("currency"));
  if (!["ARS","USD","PYG"].includes(currency) || (currency === "ARS" && i.exchange !== 1)) throw new Error("Revisá moneda y cotización.");
  const id = String(data.get("product_id"));
  const { data: product } = await db.from("products").select("retail_price").eq("id", id).single();
  if (!product) throw new Error("Producto inexistente.");
  const { error } = await db.from("product_costs").upsert({ product_id: id, origin_cost: i.purchase, currency, exchange_rate: i.exchange, freight_per_unit: i.freight, other_landed_cost: i.other, variable_cost: i.variable, payment_fee_percent: i.feePercent, minimum_contribution: i.minimum, supplier_url: supplier, ml_price: i.ml || null, ml_url: i.ml ? ml : null, ml_checked_at: i.ml ? new Date().toISOString() : null, verified_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  if (error) throw new Error("No se pudo guardar. Verificá que esté aplicada la migración de costos.");
  revalidatePath("/admin");
  return "Costos registrados. El precio público no se modificó.";
}
