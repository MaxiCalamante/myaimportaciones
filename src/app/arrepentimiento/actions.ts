"use server";
import { limitCommerceRequest } from "@/lib/request-limit";
import { createCommerceService, hasCommerceService } from "@/lib/supabase/service";
export async function withdrawalAction(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const code = String(form.get("code") ?? "").trim().slice(0, 120);
  const key = String(form.get("request_key") ?? "");
  const reason = String(form.get("reason") ?? "").trim().slice(0, 1500);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !code || !/^[0-9a-f-]{36}$/i.test(key)) throw new Error("Completá email y referencia de compra.");
  if (!hasCommerceService()) throw new Error("El registro web no está disponible. Usá el email indicado abajo para enviar la solicitud.");
  await limitCommerceRequest("withdrawal");
  const db = createCommerceService();
  const { data, error } = await db.from("withdrawal_requests").upsert({ request_key: key, email, order_code: code, reason }, { onConflict: "request_key", ignoreDuplicates: true }).select("reference").maybeSingle();
  if (error) throw new Error("No pudimos registrar tu solicitud. Enviala al email de contacto.");
  if (data) return data.reference as string;
  const { data: previous } = await db.from("withdrawal_requests").select("reference").eq("request_key", key).eq("email", email).single();
  if (!previous) throw new Error("No pudimos recuperar la constancia. Contactanos.");
  return previous.reference as string;
}
