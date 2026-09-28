"use server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { invalidateAdminStorefrontCache } from "@/lib/storefront";

export async function saveFulfillmentControl(form: FormData) {
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Iniciá sesión.");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Sin permisos.");
  const mode = String(form.get("mode"));
  if (!["own_stock", "supplier"].includes(mode)) throw new Error("Modalidad inválida.");
  const productId = String(form.get("product_id"));
  const available = form.get("available") === "on";

  const { error } = await db.rpc("set_product_fulfillment_v1", {
    product_id_input: productId,
    mode_input: mode,
    available_input: available,
  });
  if (error) throw new Error("No se pudo cambiar la modalidad. Resolvé reservas pendientes antes de cambiarla.");

  invalidateAdminStorefrontCache();
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/admin/costos");
  return "Modalidad de entrega guardada.";
}

export async function saveFinancialControl(form: FormData) {
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Iniciá sesión.");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Sin permisos.");
  
  const amounts = Object.fromEntries(
    ["purchase", "exchange", "freight", "other", "variable", "fee", "sale", "minimum"].map((k) => [
      k,
      Number(form.get(k)),
    ])
  );
  if (Object.values(amounts).some((v) => !Number.isFinite(v) || v < 0 || v > 1e9)) {
    throw new Error("Revisá los importes ingresados.");
  }
  
  const stockText = String(form.get("stock") ?? "").trim();
  const stock = stockText === "" ? null : Number(stockText);
  if (
    stock !== null &&
    (!Number.isInteger(stock) || stock < 0 || stock > 100000 || form.get("stock_confirmed") !== "on")
  ) {
    throw new Error("Confirmá el conteo físico para actualizar existencias.");
  }

  const productId = String(form.get("product_id"));
  const currency = String(form.get("currency") || "ARS");

  const { error } = await db.rpc("save_retail_financials_v1", {
    payload: {
      ...amounts,
      product_id: productId,
      currency,
      expenses_confirmed: form.get("expenses_confirmed") === "on",
      stock,
      stock_confirmed: form.get("stock_confirmed") === "on",
    },
  });
  if (error) {
    throw new Error("No se guardó: verificá que la venta cubra los costos y resolvé reservas pendientes antes de modificar stock.");
  }

  // Update supplier url, live price, and delivery mode on products table if provided
  const sourceUrl = form.get("source_url");
  const updateProductPayload: Record<string, unknown> = {};
  if (typeof sourceUrl === "string") {
    updateProductPayload.source_url = sourceUrl.trim() || null;
  }
  if (amounts.purchase > 0) {
    const costInArs = amounts.purchase * (amounts.exchange || 1);
    updateProductPayload.supplier_live_price = costInArs;
  }
  const mode = form.get("mode");
  if (mode === "own_stock" || mode === "supplier") {
    updateProductPayload.fulfillment_mode = mode;
  }
  if (form.has("available")) {
    updateProductPayload.supplier_available = form.get("available") === "on";
  }

  if (Object.keys(updateProductPayload).length > 0) {
    await db.from("products").update(updateProductPayload).eq("id", productId);
  }

  invalidateAdminStorefrontCache();
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/admin/costos");
  return "Costos y precios actualizados con éxito.";
}

