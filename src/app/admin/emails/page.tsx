import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getAdminClient } from "@/lib/admin-auth";
import { getEmailConfig } from "@/lib/email-config";
import { emailEventLabels } from "@/lib/email-templates";
import { EmailPreview } from "@/components/admin/email-preview";
import { processPendingEmailsAction, retryFailedEmailAction, sendEmailTestAction } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Emails | MYA Importaciones", robots: { index: false, follow: false } };
const statusLabels: Record<string, string> = { pending: "Pendiente", processing: "Procesando", sent: "Aceptado por Resend", failed: "Falló", review: "Revisión manual", skipped: "Omitido" };
const deliveryLabels: Record<string, string> = { "email.sent": "Enviado", "email.delivered": "Entregado al servidor del destinatario", "email.delivery_delayed": "Entrega demorada", "email.bounced": "Rebotó", "email.complained": "Queja de spam", "email.failed": "Falló la entrega", "email.suppressed": "Destinatario bloqueado" };
export default async function EmailsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const auth = await getCurrentProfile();
  if (!auth.profile) redirect("/login?next=/admin/emails");
  if (auth.profile.role !== "admin") redirect("/cuenta");
  const db = await getAdminClient();
  const config = getEmailConfig();
  const { data: rows, error } = await db.from("email_outbox").select("id,event_type,audience,status,attempts,provider_id,delivery_status,last_error,created_at,snapshot").order("created_at", { ascending: false }).limit(50);
  const { notice } = await searchParams;
  const notices: Record<string, string> = { disabled: "Los envíos todavía están desactivados.", processed: "Se procesaron los avisos pendientes. Revisá el resultado en el historial.", error: "No se pudo completar la operación. Revisá la configuración y la cola.", review: "Este aviso necesita revisión en Resend antes de reenviarlo." };
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
    <Link href="/admin" className="inline-flex min-h-11 items-center text-sm font-semibold text-sky-800">← Volver al panel</Link>
    <div><h1 className="text-3xl font-bold">Emails de la tienda</h1><p className="mt-2 text-zinc-600">Avisos para clientes y administradores, con historial de envío y entrega.</p></div>
    <Link href="/admin/emails/campanas" className="inline-flex min-h-11 items-center rounded-xl bg-sky-800 px-5 py-3 font-semibold text-white">Crear ofertas y ver recordatorios →</Link>
    {notice && notices[notice] && <p role="status" className="rounded-xl border bg-sky-50 p-4">{notices[notice]}</p>}
    <section className={`rounded-2xl border p-5 ${config.enabled ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <h2 className="text-lg font-bold">{config.enabled ? "Envíos habilitados" : "Preparado · envíos desactivados"}</h2>
      {!config.enabled && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{config.problems.map(p => <li key={p}>{p}</li>)}</ul>}
      <p className="mt-3 break-words text-sm"><strong>Administradores:</strong> {config.recipients.join(", ")}</p>
      <p className="mt-1 break-words text-sm"><strong>Remitente:</strong> {config.from || "Pendiente de un dominio propio verificado"}</p>
      <p className="mt-2 text-sm">Los avisos de despacho y entrega se generan al actualizar el pedido. La guía se envía cuando está cargada y el pedido figura despachado. También se notifican la bienvenida, los cambios de acceso mayorista y la atención de solicitudes de arrepentimiento.</p>
      <p className="mt-2 text-sm">Confirmación de cuenta y recuperación de contraseña usan Supabase Auth. Para enviarlas con Resend también debe configurarse su SMTP. Las promociones requieren consentimiento aparte.</p>
      {!process.env.RESEND_WEBHOOK_SECRET && <p className="mt-2 text-sm">El registro de entregas y rebotes requiere configurar el webhook de Resend.</p>}
      {!process.env.CRON_SECRET && <p className="mt-2 text-sm">Falta configurar la recuperación automática de pendientes.</p>}
      <form action={sendEmailTestAction} className="mt-4"><button disabled={!config.enabled || Boolean(error)} className="min-h-11 rounded-xl border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">Enviar prueba a administradores</button><p className="mt-2 text-xs">Un aviso de prueba cada 10 minutos. El historial distingue aceptación por Resend y entrega confirmada.</p></form>
      {notice === "test" && <p role="status" className="mt-3 text-sm">Prueba registrada. Revisá el historial y ambas casillas.</p>}
    </section>
    <section className="rounded-2xl border bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Historial reciente</h2><form action={processPendingEmailsAction}><button disabled={!config.enabled || Boolean(error)} className="min-h-11 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Procesar pendientes</button></form></div>
      {error ? <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm">El historial todavía no está disponible. Falta aplicar la migración de emails o revisar los permisos de la base.</p> : !rows?.length ? <p className="mt-4 text-sm text-zinc-600">Todavía no hay avisos registrados.</p> : <div className="mt-4 space-y-3">{rows.map(row => <article key={row.id} className="rounded-xl border p-4 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><strong>{emailEventLabels[row.event_type] || row.event_type} · {row.audience === "admin" ? "Administradores" : "Cliente"}</strong><span className="rounded-lg bg-zinc-100 px-2 py-1">{statusLabels[row.status] || row.status}</span></div>
        <p className="mt-2 break-words text-zinc-600">{row.snapshot?.tracking_code || row.snapshot?.reference || ""} · {new Date(row.created_at).toLocaleString("es-AR", { timeZone: "America/Buenos_Aires" })} · {row.attempts} intentos</p>
        {row.delivery_status && <p className="mt-2">{deliveryLabels[row.delivery_status] || row.delivery_status}</p>}
        {row.last_error && <p className="mt-2 break-words text-amber-800">{row.last_error}</p>}
        {row.status === "failed" && <form action={retryFailedEmailAction} className="mt-3"><input type="hidden" name="id" value={row.id} /><button disabled={!config.enabled} className="min-h-11 rounded-lg border px-3 font-semibold disabled:opacity-50">Reintentar si es seguro</button></form>}
      </article>)}</div>}
    </section>
    <EmailPreview />
  </main>;
}
