"use client";
import { useState } from "react";
import { emailEventLabels, renderTransactionalEmail } from "@/lib/email-templates";
export function EmailPreview() {
  const [event, setEvent] = useState("order_shipped");
  const [audience, setAudience] = useState<"customer" | "admin">("customer");
  const adminEvents = ["order_created", "payment_confirmed", "order_cancelled", "reservation_expired", "payment_review", "withdrawal_received", "email_test"];
  const options = Object.entries(emailEventLabels).filter(([key]) => audience === "admin" ? adminEvents.includes(key) : !["payment_review", "email_test"].includes(key));
  const sample = { customer_email: "cliente@example.com", shipping_name: "Cliente de ejemplo", shipping_phone: "Teléfono de ejemplo", shipping_address: "Domicilio de ejemplo, Tandil", tracking_code: "ORD-EJEMPLO", payment_method: "transferencia", total_amount: 125000, shipping_option: "delivery_quote_separately", carrier_tracking_code: "GUIA-DE-EJEMPLO", reference: "ARR-EJEMPLO", reason: "Comentario de ejemplo", items: [{ product_title: "Producto de ejemplo", quantity: 1, unit_price: 125000 }] };
  const content = renderTransactionalEmail(event, audience, sample, "https://myaimportaciones.com");
  return <section className="rounded-2xl border bg-white p-4 sm:p-6">
    <h2 className="text-xl font-bold">Vista previa de los emails</h2>
    <p className="mt-2 text-sm text-zinc-600">Datos ficticios. Esta vista previa no envía emails.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Ocasión<select aria-label="Ocasión" value={event} onChange={e => setEvent(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border bg-white p-3">{options.map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      <label className="text-sm font-semibold">Destinatario<select aria-label="Destinatario" value={audience} onChange={e => { const next = e.target.value as "customer" | "admin"; setAudience(next); if ((next === "admin" && !adminEvents.includes(event)) || (next === "customer" && ["payment_review", "email_test"].includes(event))) setEvent("order_created"); }} className="mt-1 min-h-11 w-full rounded-xl border bg-white p-3"><option value="customer">Cliente</option><option value="admin">Administradores</option></select></label>
    </div>
    <p className="my-4 break-words text-sm"><strong>Asunto:</strong> {content.subject}</p>
    <iframe title="Vista previa del email" sandbox="" srcDoc={content.html} className="h-[650px] w-full rounded-xl border bg-zinc-50" />
  </section>;
}
