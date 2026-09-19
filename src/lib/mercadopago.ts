import { siteConfig } from "@/lib/site";

export interface PreferenceItem {
  id?: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
  description?: string;
  picture_url?: string;
}

export interface CreatePreferenceParams {
  trackingCode: string;
  items: PreferenceItem[];
  payerEmail?: string;
  payerName?: string;
  payerPhone?: string;
  shippingAddress?: string;
  shippingAmount?: number;
}

export interface PreferenceResult {
  success: boolean;
  preferenceId?: string;
  initPoint?: string;
  sandboxInitPoint?: string;
  isDemo?: boolean;
  error?: string;
}

export async function createMercadoPagoPreference(
  params: CreatePreferenceParams
): Promise<PreferenceResult> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;

  // Base URL for webhooks and redirection
  const appUrl = (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.appUrl).replace(/\/$/, "");

  // If no token is configured, return graceful simulation state
  if (!token) {
    return {
      success: true,
      isDemo: true,
      initPoint: `${appUrl}/seguimiento?code=${params.trackingCode}&payment=simulated_card`,
      preferenceId: `demo-pref-${Date.now()}`,
    };
  }

  const items = params.items.map((it) => ({
    id: it.id || "item",
    title: it.title.substring(0, 250),
    quantity: Math.max(1, it.quantity),
    unit_price: Math.round(it.unit_price),
    currency_id: "ARS",
    description: it.description?.substring(0, 250) || undefined,
    picture_url: it.picture_url || undefined,
  }));

  // If there's shipping amount, append it or add as item
  if (params.shippingAmount && params.shippingAmount > 0) {
    items.push({
      id: "envio-correo",
      title: "Costo de Envío Oficial (Correo Argentino / Andreani)",
      quantity: 1,
      unit_price: Math.round(params.shippingAmount),
      currency_id: "ARS",
      description: "Logística y despacho seguro a domicilio o sucursal",
      picture_url: undefined,
    });
  }

  const body = {
    items,
    payer: {
      name: params.payerName || "Cliente",
      email: params.payerEmail || "cliente@myaimportaciones.com",
      phone: {
        number: params.payerPhone || "",
      },
      address: {
        street_name: params.shippingAddress || "Domicilio indicado",
      },
    },
    back_urls: {
      success: `${appUrl}/seguimiento?code=${params.trackingCode}&status=approved`,
      pending: `${appUrl}/seguimiento?code=${params.trackingCode}&status=pending`,
      failure: `${appUrl}/checkout?code=${params.trackingCode}&status=failure`,
    },
    auto_return: "approved",
    external_reference: params.trackingCode,
    statement_descriptor: "MYA IMPORT",
    payment_methods: {
      excluded_payment_types: [],
      installments: 12,
    },
    notification_url: `${appUrl}/api/mercadopago/webhook`,
  };

  try {
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errJson.message || `Error Mercado Pago HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      isDemo: false,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Error al conectar con la pasarela de Mercado Pago",
    };
  }
}

export async function getMercadoPagoPaymentDetails(paymentId: string) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
