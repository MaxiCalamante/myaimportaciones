import "server-only";
import { siteConfig } from "@/lib/site";
import { buildMercadoPagoPreference, parseMercadoPagoPreference, type PreferenceInput } from "@/lib/mercadopago-preference";
const token = () => process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;
export function isMercadoPagoConfigured() {
  const accessToken = token();
  return Boolean(
    accessToken &&
    process.env.MERCADOPAGO_WEBHOOK_SECRET &&
    /^\d+$/.test(process.env.MERCADOPAGO_COLLECTOR_ID ?? "") &&
    siteConfig.appUrl.startsWith("https://") &&
    (process.env.NODE_ENV !== "production" || accessToken.startsWith("APP_USR-"))
  );
}
export async function createMercadoPagoPreference(params: PreferenceInput) {
  if (!isMercadoPagoConfigured()) return { success: false, initPoint: undefined, preferenceId: undefined };
  let body;
  try { body = buildMercadoPagoPreference(params, siteConfig.appUrl); }
  catch { return { success: false, initPoint: undefined, preferenceId: undefined }; }
  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST", signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}`, "X-Idempotency-Key": params.orderId },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!res?.ok) return { success: false, initPoint: undefined, preferenceId: undefined };
  const preference = parseMercadoPagoPreference(await res.json().catch(() => null));
  return preference ? { success: true, ...preference } : { success: false, initPoint: undefined, preferenceId: undefined };
}
export interface MercadoPagoPayment { id: number; status: string; external_reference: string; transaction_amount: number; currency_id: string; collector_id: number; live_mode: boolean }
export async function getMercadoPagoPaymentDetails(id: string): Promise<MercadoPagoPayment | null> {
  if (!token() || !/^\d+$/.test(id)) return null;
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, { headers: { Authorization: `Bearer ${token()}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  return res.ok ? res.json() : null;
}
