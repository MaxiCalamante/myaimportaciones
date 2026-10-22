import type { SupabaseClient } from "@supabase/supabase-js";
import { getEmailConfig } from "./email-config";
import { sendResendEmail } from "./email-transport";
import { formatCurrency } from "./format";

export const DEFAULT_PRICE_ALERT_THRESHOLD = 30;

export async function getPriceAlertThreshold(db?: SupabaseClient): Promise<number> {
  const envVal = Number(process.env.PRICE_ALERT_THRESHOLD_PERCENT);
  if (Number.isFinite(envVal) && envVal >= 5 && envVal <= 100) {
    return Math.round(envVal);
  }
  if (db) {
    try {
      const { data } = await db
        .from("supplier_tracking_settings")
        .select("config")
        .eq("id", true)
        .maybeSingle();
      const cfg = (data?.config as Record<string, unknown>) ?? {};
      const configured = Number(cfg.priceAlertThresholdPercent);
      if (Number.isFinite(configured) && configured >= 5 && configured <= 100) {
        return Math.round(configured);
      }
    } catch {
      // Fallback to default if table or column is unavailable
    }
  }
  return DEFAULT_PRICE_ALERT_THRESHOLD;
}

export interface SuddenPriceAlertParams {
  productId: string;
  productTitle: string;
  sku?: string | null;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  changeType?: string;
  origin?: string;
  thresholdPct?: number;
}

/**
 * Evaluates whether a price change exceeds the alert threshold (default 30% or custom configured).
 * If so, sends an immediate executive security notification email to MYA administrators.
 */
export async function checkAndAlertSuddenPriceChange(
  params: SuddenPriceAlertParams
): Promise<{ alerted: boolean; deltaPct?: number; error?: string }> {
  const { productId, productTitle, sku, oldPrice, newPrice, changedBy, changeType, origin, thresholdPct } = params;

  if (!oldPrice || oldPrice <= 0 || !newPrice || newPrice <= 0) {
    return { alerted: false };
  }

  const threshold = typeof thresholdPct === "number" && thresholdPct > 0
    ? thresholdPct
    : DEFAULT_PRICE_ALERT_THRESHOLD;

  const deltaPct = Math.round(((newPrice - oldPrice) / oldPrice) * 100);
  const absDelta = Math.abs(deltaPct);

  // Trigger alert threshold evaluation
  if (absDelta < threshold) {
    return { alerted: false, deltaPct };
  }

  const config = getEmailConfig();
  if (!config.enabled || !config.apiKey) {
    console.warn(`[price-alert] Alerta de precio omitida (email no configurado): ${productTitle} ${deltaPct}% (umbral ${threshold}%)`);
    return { alerted: true, deltaPct };
  }

  const isIncrease = deltaPct > 0;
  const arrow = isIncrease ? "▲" : "▼";
  const sign = isIncrease ? "+" : "";
  const siteUrl = origin || config.origin || "https://myaimportaciones.com.ar";
  const productAdminUrl = `${siteUrl}/admin?search=${encodeURIComponent(sku || productTitle)}`;

  const subject = `⚠️ ALERTA DE PRECIO: Variación brusca de ${sign}${deltaPct}% (Umbral ±${threshold}%) en ${productTitle}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
    .card { background-color: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background-color: ${isIncrease ? "#4338ca" : "#be123c"}; padding: 20px 24px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 800; }
    .content { padding: 24px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 13px; font-weight: 700; background-color: ${isIncrease ? "#e0e7ff" : "#ffe4e6"}; color: ${isIncrease ? "#3730a3" : "#9f1239"}; margin-bottom: 16px; }
    .price-box { display: flex; align-items: center; justify-content: space-around; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; }
    .price-col { text-align: center; }
    .price-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .price-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    .old-val { text-decoration: line-through; color: #94a3b8; }
    .btn { display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 700; margin-top: 16px; }
    .footer { padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>MYA Importaciones · Alerta de Seguridad Comercial</h1>
    </div>
    <div class="content">
      <div class="badge">
        Variación Significativa: ${arrow} ${sign}${deltaPct}% (Umbral configurado: ±${threshold}%)
      </div>
      <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #09090b;">
        ${productTitle}
      </p>
      ${sku ? `<p style="margin: 0 0 16px 0; font-size: 12px; font-family: monospace; color: #71717a;">SKU: ${sku}</p>` : ""}

      <div class="price-box">
        <div class="price-col">
          <div class="price-label">Precio Anterior</div>
          <div class="price-val old-val">${formatCurrency(oldPrice)}</div>
        </div>
        <div style="font-size: 20px; color: #94a3b8; font-weight: bold;">➔</div>
        <div class="price-col">
          <div class="price-label">Precio Nuevo</div>
          <div class="price-val" style="color: ${isIncrease ? "#2563eb" : "#e11d48"};">
            ${formatCurrency(newPrice)}
          </div>
        </div>
      </div>

      <p style="font-size: 13px; color: #52525b; line-height: 1.5; margin: 16px 0;">
        <strong>Modificado por:</strong> ${changedBy}<br>
        <strong>Acción:</strong> ${changeType || "Edición de precio"}<br>
        <strong>Fecha:</strong> ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}
      </p>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${productAdminUrl}" class="btn" style="color: #ffffff;">
          Ver Ficha y Auditar en el Panel
        </a>
      </div>
    </div>
    <div class="footer">
      Este es un aviso automático de seguridad comercial generado por el sistema de control de catálogo de MYA Importaciones.
    </div>
  </div>
</body>
</html>
`;

  const text = `AVISO DE SEGURIDAD - CAMBIO BRUSCO DE PRECIO (${sign}${deltaPct}% · Umbral: ±${threshold}%)

Producto: ${productTitle} (ID: ${productId})
Precio anterior: ${formatCurrency(oldPrice)}
Precio nuevo: ${formatCurrency(newPrice)}
Variación: ${sign}${deltaPct}% (Umbral configurado: ±${threshold}%)
Modificado por: ${changedBy}
Acción: ${changeType || "Edición de precio"}
Fecha: ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}
Enlace al panel: ${productAdminUrl}`;

  try {
    const payload = {
      from: config.from,
      to: config.recipients,
      reply_to: config.replyTo,
      subject,
      html,
      text,
      tags: [{ name: "event", value: "sudden_price_alert" }],
    };

    const idempotencyKey = `price-alert-${productId}-${Date.now()}`;
    await sendResendEmail(payload, idempotencyKey, config.apiKey);
    return { alerted: true, deltaPct };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error enviando email de alerta.";
    console.warn("[price-alert] Falló el envío del email:", errorMsg);
    return { alerted: true, deltaPct, error: errorMsg };
  }
}
