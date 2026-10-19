import { escapeEmailHtml, type EmailContent, type EmailSnapshot } from "./email-templates";

export interface OptionalEmailSnapshot extends EmailSnapshot {
  consent_revision?: number; campaign_id?: string; cart_revision?: string;
  subject?: string; heading?: string; message?: string; action_path?: string; unsubscribe_token?: string;
}
export function validCampaign(input: { subject: string; heading: string; message: string; action_path: string }) {
  return input.subject.length >= 3 && input.subject.length <= 150 && !/[\r\n]/.test(input.subject)
    && input.heading.length >= 3 && input.heading.length <= 150 && input.message.length >= 10 && input.message.length <= 5000
    && /^\/[a-zA-Z0-9/?=&%_.-]*$/.test(input.action_path) && !input.action_path.startsWith("//") && input.action_path.length <= 500;
}
export function renderOptionalEmail(event: string, s: OptionalEmailSnapshot, origin: string): EmailContent {
  if (!["campaign", "cart_reminder"].includes(event)) throw new Error("Email opcional desconocido");
  const cart = event === "cart_reminder";
  const subject = cart ? "Tu selección te espera | MYA Importaciones" : `${s.subject} | MYA Importaciones`;
  const heading = cart ? "¿Querés retomar tu compra?" : s.heading || "Novedades de MYA";
  const message = cart ? "Guardamos tu selección para que puedas retomarla cuando quieras. Los precios y la disponibilidad se revisan al volver a la tienda. El carrito no reserva productos ni confirma una compra." : s.message || "";
  const candidate = s.action_path || "/catalogo";
  const path = /^\/(?!\/)[a-zA-Z0-9/?=&%_.-]*$/.test(candidate) ? candidate : "/catalogo";
  const url = new URL(cart ? "/recuperar-carrito" : path, origin).href;
  const unsubscribe = new URL(`/emails/baja?token=${encodeURIComponent(s.unsubscribe_token || "")}`, origin).href;
  const label = cart ? "Recuperar mi carrito" : "Ver en la tienda";
  const e = escapeEmailHtml;
  return {
    subject: subject.replace(/[\r\n]/g, " "),
    html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f4f4f5;color:#18181b;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#fff;border-radius:16px"><tr><td style="padding:28px;background:#18181b;color:white;border-radius:16px 16px 0 0"><strong style="font-size:23px">MYA Importaciones</strong><p style="color:#bae6fd">${cart ? "Tu próxima compra" : "Novedades para vos"}</p></td></tr><tr><td style="padding:28px;overflow-wrap:anywhere"><h1 style="font-size:26px;line-height:1.3">${e(heading)}</h1>${message.split(/\n+/).map(p => `<p style="font-size:16px;line-height:1.7">${e(p)}</p>`).join("")}<a href="${e(url)}" style="display:inline-block;padding:15px 20px;background:#075985;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">${label}</a><p style="margin-top:28px;padding-top:20px;border-top:1px solid #e4e4e7;font-size:12px;line-height:1.7;color:#52525b">Recibís este correo porque activaste ${cart ? "los recordatorios de carrito" : "las novedades y ofertas"} en tu cuenta.<br><a href="${e(unsubscribe)}">Dejar de recibir ofertas y recordatorios</a> · <a href="${e(new URL("/cuenta", origin).href)}">Mis preferencias</a><br>MYA Importaciones · Tandil, Buenos Aires.</p></td></tr></table></td></tr></table></body></html>`,
    text: `${heading}\n\n${message}\n\n${label}: ${url}\n\nBaja de ofertas y recordatorios: ${unsubscribe}\nMYA Importaciones · Tandil, Buenos Aires.`,
  };
}
