import { siteConfig, getWhatsAppUrl } from "./site";
import { formatPaymentMethod } from "./format";
const formatCurrency = (value: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);

export const emailEventLabels: Record<string, string> = {
  campaign: "Campaña de ofertas", cart_reminder: "Recordatorio de carrito",
  order_created: "Pedido registrado", payment_confirmed: "Pago acreditado", payment_failed: "Intento de pago rechazado o cancelado",
  order_preparing: "Preparación", order_shipped: "Despacho", tracking_updated: "Guía actualizada",
  order_delivered: "Entrega", order_cancelled: "Cancelación", reservation_expired: "Reserva vencida",
  payment_review: "Pago a revisar", withdrawal_received: "Solicitud de arrepentimiento",
  withdrawal_contacted: "Solicitud en atención", withdrawal_resolved: "Solicitud cerrada",
  account_welcome: "Bienvenida", wholesale_approved: "Acceso mayorista habilitado", wholesale_revoked: "Acceso mayorista actualizado",
  email_test: "Prueba de configuración",
};
export interface EmailSnapshot {
  order_id?: string; buyer_name?: string; buyer_email?: string;
  customer_email?: string; shipping_name?: string; shipping_phone?: string; shipping_address?: string;
  order_notes?: string; tracking_code?: string; status?: string; payment_method?: string;
  subtotal_amount?: number; discount_amount?: number; shipping_amount?: number; total_amount?: number;
  shipping_option?: string; reservation_expires_at?: string; carrier_tracking_code?: string;
  reference?: string; reason?: string; profile_id?: string;
  items?: { product_title: string; quantity: number; unit_price: number; variant_title?: string | null; variant_sku?: string | null }[];
}
export interface EmailContent { subject: string; html: string; text: string }
export function escapeEmailHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
export function renderTransactionalEmail(event: string, audience: "customer" | "admin", s: EmailSnapshot, origin: string): EmailContent {
  if (!emailEventLabels[event] || ["campaign", "cart_reminder"].includes(event)) throw new Error("Evento de email desconocido.");
  const admin = audience === "admin";
  const code = s.tracking_code || s.reference || "";
  const tracking = new URL("/seguimiento", origin);
  if (s.tracking_code) tracking.searchParams.set("code", s.tracking_code);
  // Customer enters their email on the tracking page; keep personal data out of URLs.
  const accountEvent = ["account_welcome", "wholesale_approved", "wholesale_revoked"].includes(event);
  const withdrawalEvent = event.startsWith("withdrawal_");
  const orderAdminPath = s.order_id && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(s.order_id) ? `/admin/ventas/${s.order_id}` : `/admin/ventas${s.tracking_code ? `?buscar=${encodeURIComponent(s.tracking_code)}` : ''}`;
  const actionUrl = admin ? new URL(accountEvent || withdrawalEvent || event === 'email_test' ? '/admin' : orderAdminPath, origin).href : accountEvent ? new URL(event === "wholesale_approved" ? "/mayorista" : "/cuenta", origin).href : tracking.href;
  let title = emailEventLabels[event];
  const paragraphs: string[] = [];
  switch (event) {
    case "account_welcome": title = "Te damos la bienvenida a MYA"; paragraphs.push(`Hola ${s.shipping_name || ""}, tu cuenta ya está creada. Podés guardar favoritos y consultar tus compras desde la tienda. Gracias por elegirnos.`); break;
    case "wholesale_approved": title = "Ya tenés acceso mayorista"; paragraphs.push("Habilitamos el acceso mayorista de tu cuenta. Ingresá a la tienda para consultar el catálogo y las condiciones vigentes."); break;
    case "wholesale_revoked": title = "Actualizamos el acceso de tu cuenta"; paragraphs.push("Tu cuenta continúa disponible para compras minoristas. Si necesitás consultar tu acceso mayorista, contactanos."); break;
    case "withdrawal_contacted": title = "Tu solicitud está en atención"; paragraphs.push("Registramos que el equipo está atendiendo tu solicitud. Si todavía necesitás coordinar los próximos pasos, contactanos con la referencia indicada. Este aviso no confirma una cancelación ni un reintegro."); break;
    case "withdrawal_resolved": title = "Actualizamos tu solicitud"; paragraphs.push("El equipo marcó tu solicitud como resuelta. Si tenés alguna consulta sobre la solución acordada, contactanos con esta referencia. Este aviso por sí solo no acredita un reintegro."); break;
    case "email_test": title = "Prueba de emails de MYA"; paragraphs.push("Este es un email de prueba para verificar la configuración de la tienda. No corresponde a una compra ni modifica pedidos o pagos."); break;
    case "order_created":
      title = admin ? "Nueva compra registrada" : "Recibimos tu pedido";
      paragraphs.push(admin ? "Se registró una compra en la tienda. El pago todavía está pendiente de acreditación." : `Hola ${s.shipping_name || ""}, recibimos tu pedido. Te avisaremos cuando el pago esté acreditado.`);
      if (!admin && s.payment_method === "transferencia") paragraphs.push(`Transferí ${formatCurrency(Number(s.total_amount))} al alias ${siteConfig.bankTransfer.alias}. Titular: ${siteConfig.bankTransfer.holder}. Envianos el comprobante por WhatsApp indicando tu código de pedido. La acreditación se confirma luego de verificar los fondos.`);
      if (!admin && s.payment_method === "mercado_pago") paragraphs.push("Completá el pago desde el checkout de la tienda. Abrir Mercado Pago o enviarnos un comprobante no confirma la acreditación.");
      if (s.reservation_expires_at) paragraphs.push(`Reserva hasta el ${new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Buenos_Aires" }).format(new Date(s.reservation_expires_at))} (hora de Argentina).`);
      break;
    case "payment_confirmed":
      title = admin ? "Pago acreditado: pedido para preparar" : "Tu pago está acreditado";
      paragraphs.push(admin ? "El pago fue confirmado. Revisá el pedido para coordinar su preparación y entrega." : "Confirmamos la acreditación del pago de tu pedido. Te iremos avisando los próximos pasos.");
      break;
    case "payment_failed":
      title = "Un intento de pago no se acreditó";
      paragraphs.push("Mercado Pago informó que un intento de pago de este pedido fue rechazado o cancelado. Si completaste otro pago después, revisá el seguimiento para ver el estado actualizado. Contactanos antes de repetir el pago si tenés dudas.");
      break;
    case "order_preparing": paragraphs.push("Estamos preparando tu pedido. Te avisaremos cuando se despache o coordinemos la entrega."); break;
    case "order_shipped":
      title = s.shipping_option === "pickup_tandil" ? "Tu pedido está listo para retirar" : "Despachamos tu pedido";
      paragraphs.push(s.shipping_option === "pickup_tandil" ? "Tu pedido está listo para el retiro coordinado en Tandil. Contactanos para acordar el horario." : "Registramos el despacho de tu pedido. Podés consultar su estado desde el seguimiento de la tienda.");
      if (!s.carrier_tracking_code && s.shipping_option !== "pickup_tandil") paragraphs.push("La guía todavía no está cargada. Te enviaremos otro aviso cuando esté disponible.");
      break;
    case "tracking_updated": title = "Ya tenés la guía de tu pedido"; paragraphs.push("Actualizamos la guía de tu envío. Usá el número indicado para consultar el recorrido con el correo."); break;
    case "order_delivered": paragraphs.push("Tu pedido figura como entregado. Si necesitás ayuda con los productos o la entrega, contactanos con tu código de pedido."); break;
    case "order_cancelled": paragraphs.push(admin ? "El pedido pendiente fue cancelado. Revisá cualquier consulta o pago que llegue después de la cancelación." : "Tu pedido fue cancelado. Si realizaste un pago o necesitás ayuda, contactanos para revisar tu caso. Este aviso no confirma un reintegro."); break;
    case "reservation_expired": paragraphs.push(admin ? "Venció la reserva sin acreditación del pago. Revisá cualquier pago posterior antes de confirmar la compra." : "Venció el plazo de reserva de tu pedido sin acreditación del pago. Consultanos antes de transferir o volver a comprar. Si ya pagaste, envianos el comprobante para revisarlo."); break;
    case "payment_review": title = "Atención: pago que requiere revisión"; paragraphs.push("Hay un pago que requiere revisión manual (por ejemplo, posterior al vencimiento, reintegro o contracargo). Verificá el pedido y Mercado Pago antes de despachar. Este aviso no confirma un pago ni un reintegro."); break;
    case "withdrawal_received": title = admin ? "Nueva solicitud de arrepentimiento" : "Recibimos tu solicitud de arrepentimiento"; paragraphs.push(admin ? "Hay una solicitud de arrepentimiento para revisar y responder." : "Guardamos tu solicitud. Conservá esta referencia para consultar su estado. La recepción no implica que se haya cancelado el pedido o realizado un reintegro."); paragraphs.push(`Referencia: ${s.reference || ""}`); break;
  }
  if (s.shipping_option === "delivery_quote_separately") paragraphs.push("El total corresponde a los productos. El envío se cotiza y abona por separado.");
  const items = s.items || [];
  const itemTitle = (i: NonNullable<EmailSnapshot['items']>[number]) => [i.product_title, i.variant_title && !i.product_title.includes(i.variant_title) ? i.variant_title : '', admin && i.variant_sku ? `SKU: ${i.variant_sku}` : ''].filter(Boolean).join(' · ');
  const details = [
    code ? `Pedido: ${code}` : "",
    s.total_amount !== undefined ? `Total: ${formatCurrency(Number(s.total_amount))}` : "",
    s.payment_method ? `Medio de pago: ${formatPaymentMethod(s.payment_method)}` : "",
    s.shipping_address ? `Entrega: ${s.shipping_address}` : "",
    admin && s.shipping_name ? `A nombre de: ${s.shipping_name}` : "",
    admin && s.buyer_name ? `Cuenta compradora: ${s.buyer_name}` : "",
    admin && s.buyer_email ? `Email de la cuenta: ${s.buyer_email}` : "",
    admin && s.customer_email ? `Email: ${s.customer_email}` : "",
    admin && s.shipping_phone ? `Teléfono: ${s.shipping_phone}` : "",
    admin && s.order_notes ? `Notas: ${s.order_notes}` : "",
    admin && s.reason ? `Motivo: ${s.reason}` : "",
  ].filter(Boolean);
  const showGuide = s.carrier_tracking_code && ["order_shipped", "tracking_updated", "order_delivered"].includes(event);
  const knownCorreo = !s.shipping_option || s.shipping_option.startsWith("correo_");
  const guideUrl = knownCorreo ? "https://www.correoargentino.com.ar/formularios/e-commerce" : tracking.href;
  const supportUrl = getWhatsAppUrl(withdrawalEvent ? `Hola MYA, consulto por mi solicitud ${s.reference || code}.` : accountEvent ? "Hola MYA, necesito ayuda con mi cuenta." : `Hola MYA, consulto por el pedido ${code}.`);
  const button = (url: string, label: string) => `<a href="${escapeEmailHtml(url)}" style="display:inline-block;background:#075985;color:#fff;text-decoration:none;padding:14px 20px;border-radius:10px;font-weight:bold;margin:8px 8px 8px 0">${label}</a>`;
  const subject = `${title}${code ? ` · ${code}` : ""} | MYA Importaciones`.replace(/[\r\n]/g, " ");
  const html = `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:600px;margin:auto;background:white;border-radius:16px" cellpadding="0" cellspacing="0"><tr><td style="background:#18181b;padding:28px;color:white;border-radius:16px 16px 0 0"><strong style="font-size:23px">MYA Importaciones</strong><p style="color:#bae6fd;margin-bottom:0">Desde Tandil a todo el país</p></td></tr><tr><td style="padding:28px;overflow-wrap:anywhere"><h1 style="font-size:24px;line-height:1.3">${escapeEmailHtml(title)}</h1>${paragraphs.map(p => `<p style="line-height:1.65;font-size:15px">${escapeEmailHtml(p)}</p>`).join("")}<div style="background:#f4f4f5;padding:16px;border-radius:12px">${details.map(d => `<p style="margin:6px 0;line-height:1.5;font-size:14px">${escapeEmailHtml(d)}</p>`).join("")}</div>${items.length ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">${items.map(i => `<tr><td style="padding:12px 0;border-bottom:1px solid #e4e4e7;font-size:14px">${escapeEmailHtml(itemTitle(i))}<br><span style="color:#52525b">${i.quantity} × ${formatCurrency(Number(i.unit_price))}</span></td><td style="text-align:right;border-bottom:1px solid #e4e4e7;font-size:14px">${formatCurrency(i.quantity * Number(i.unit_price))}</td></tr>`).join("")}</table>` : ""}${showGuide ? `<p><strong>Guía del envío: ${escapeEmailHtml(s.carrier_tracking_code)}</strong></p>${button(guideUrl, knownCorreo ? "Consultar el correo" : "Ver la guía del pedido")}` : ""}${button(withdrawalEvent && !admin ? supportUrl : actionUrl, admin ? "Abrir administración" : withdrawalEvent ? "Consultar mi solicitud" : accountEvent ? "Ver mi cuenta" : "Ver mi pedido")}<p style="font-size:14px">${admin ? "" : `<a href="${escapeEmailHtml(supportUrl)}">Hablar con Máximo y Agustina</a>`}</p><p style="border-top:1px solid #e4e4e7;padding-top:20px;font-size:12px;color:#71717a;line-height:1.6">Este es un aviso relacionado con tu ${withdrawalEvent ? "solicitud" : accountEvent ? "cuenta" : "pedido"}. MYA Importaciones · Tandil, Buenos Aires.</p></td></tr></table></td></tr></table></body></html>`;
  const text = [title, ...paragraphs, ...details, ...items.map(i => `${i.quantity} × ${itemTitle(i)}: ${formatCurrency(i.quantity * Number(i.unit_price))}`), showGuide ? `Guía: ${s.carrier_tracking_code}\nCorreo: ${guideUrl}` : "", `Consultar: ${withdrawalEvent && !admin ? supportUrl : actionUrl}`, admin ? "" : `Ayuda: ${supportUrl}`, "MYA Importaciones · Tandil, Buenos Aires."].filter(Boolean).join("\n\n");
  return { subject, html, text };
}
