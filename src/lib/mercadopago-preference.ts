export interface PreferenceInput {
  trackingCode: string;
  orderId: string;
  total: number;
  expiresAt: string;
  payerEmail: string;
  payerName: string;
}

export function buildMercadoPagoPreference(params: PreferenceInput, appUrl: string, now = Date.now()) {
  const origin = new URL(appUrl);
  const expiry = Date.parse(params.expiresAt);
  if (origin.protocol !== "https:" || origin.username || origin.password ||
      !Number.isFinite(params.total) || params.total <= 0 ||
      !Number.isFinite(expiry) || expiry <= now) {
    throw new Error("El importe o el plazo de pago no es válido.");
  }
  const tracking = new URL("/seguimiento", origin);
  tracking.searchParams.set("code", params.trackingCode);
  return {
    items: [{ id: params.orderId, title: `Pedido MYA ${params.trackingCode}`, quantity: 1, unit_price: params.total, currency_id: "ARS" }],
    payer: { name: params.payerName, email: params.payerEmail },
    external_reference: params.orderId,
    metadata: { order_id: params.orderId },
    statement_descriptor: "MYA IMPORTACIONES",
    expires: true,
    expiration_date_to: params.expiresAt,
    back_urls: { success: tracking.href, pending: tracking.href, failure: tracking.href },
    auto_return: "approved",
    notification_url: new URL("/api/mercadopago/webhook", origin).href,
  };
}

export function parseMercadoPagoPreference(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const { id, init_point } = data as Record<string, unknown>;
  if (typeof id !== "string" || !id || typeof init_point !== "string") return null;
  try {
    const url = new URL(init_point);
    if (url.protocol !== "https:" || url.hostname !== "www.mercadopago.com.ar" || url.username || url.password) return null;
    return { preferenceId: id, initPoint: url.href };
  } catch { return null; }
}
