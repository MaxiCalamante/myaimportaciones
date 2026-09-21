import "server-only";
import { siteConfig } from "@/lib/site";
const token = () => process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;
export async function createMercadoPagoPreference(params: { trackingCode: string; orderId: string; total: number; expiresAt: string; payerEmail: string; payerName: string }) {
  if (!token()) return { success: false, initPoint: undefined, preferenceId: undefined };
  const appUrl = siteConfig.appUrl.replace(/\/$/, "");
  if (!appUrl.startsWith("https://")) return { success: false, initPoint: undefined, preferenceId: undefined };
  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST", signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}`, "X-Idempotency-Key": params.orderId },
    body: JSON.stringify({
      items: [{ id: params.orderId, title: `Pedido MYA ${params.trackingCode}`, quantity: 1, unit_price: params.total, currency_id: "ARS" }],
      payer: { name: params.payerName, email: params.payerEmail },
      external_reference: params.orderId, metadata: { order_id: params.orderId },
      expires: true, expiration_date_to: params.expiresAt,
      back_urls: Object.fromEntries(["success", "pending", "failure"].map(k => [k, `${appUrl}/seguimiento?code=${params.trackingCode}`])),
      auto_return: "approved", notification_url: `${appUrl}/api/mercadopago/webhook`,
    }),
  }).catch(() => null);
  if (!res?.ok) return { success: false, initPoint: undefined, preferenceId: undefined };
  const data = await res.json();
  return { success: Boolean(data.id && data.init_point), preferenceId: data.id as string, initPoint: data.init_point as string };
}
export interface MercadoPagoPayment { id: number; status: string; external_reference: string; transaction_amount: number; currency_id: string; collector_id: number; live_mode: boolean }
export async function getMercadoPagoPaymentDetails(id: string): Promise<MercadoPagoPayment | null> {
  if (!token() || !/^\d+$/.test(id)) return null;
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, { headers: { Authorization: `Bearer ${token()}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  return res.ok ? res.json() : null;
}
