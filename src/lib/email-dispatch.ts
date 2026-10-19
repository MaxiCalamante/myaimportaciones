import type { SupabaseClient } from "@supabase/supabase-js";
import { getEmailConfig, validEmail } from "./email-config";
import { renderTransactionalEmail, type EmailSnapshot } from "./email-templates";
import { sendResendEmail, EmailSendError, type ResendPayload } from "./email-transport";
import { renderOptionalEmail, type OptionalEmailSnapshot } from "./email-marketing";

interface OutboxRow {
  id: string; event_key: string; event_type: string; audience: "customer" | "admin";
  order_id: string | null; snapshot: EmailSnapshot; payload: ResendPayload | null;
  lease_token: string; attempts: number; created_at: string; first_attempt_at: string | null;
}
export async function dispatchEmailOutbox(db: SupabaseClient, config: ReturnType<typeof getEmailConfig>, orderId?: string, send = sendResendEmail) {
  if (!config.enabled) return { enabled: false, sent: 0, failed: 0, skipped: 0 };
  const { data, error } = await db.rpc("claim_transactional_emails_v1", { limit_input: 4, order_input: orderId || null });
  if (error) throw new Error("No se pudo leer la cola de emails.");
  const report = { enabled: true, sent: 0, failed: 0, skipped: 0 };
  for (const row of (data || []) as OutboxRow[]) {
    const save = async (fields: Record<string, unknown>) => {
      const { data: changed, error: saveError } = await db.from("email_outbox").update(fields).eq("id", row.id).eq("lease_token", row.lease_token).eq("status", "processing").select("id");
      if (saveError || !changed?.length) throw new Error("No se pudo guardar el resultado del email.");
    };
    try {
      const optional = ["campaign", "cart_reminder"].includes(row.event_type);
      if (optional) {
        const { data: allowed, error: consentError } = await db.rpc("can_send_optional_email_v1", { snapshot_input: row.snapshot, event_input: row.event_type });
        if (consentError) throw new Error("No se pudo verificar el consentimiento.");
        if (allowed !== true) { await save({ status: "skipped", last_error: "Preferencias, campaña o carrito cambiaron; no se envía.", lease_token: null, leased_until: null }); report.skipped++; continue; }
      }
      // Activation never sends an unattended historical backlog.
      if (!row.first_attempt_at && Date.now() - Date.parse(row.created_at) > 86400000) {
        await save({ status: "skipped", last_error: "Aviso antiguo: no se envía automáticamente.", lease_token: null, leased_until: null }); report.skipped++; continue;
      }
      if (!row.payload && row.snapshot.profile_id) {
        const { data: profile, error: profileError } = await db.from("profiles").select("email,is_approved_wholesale").eq("id", row.snapshot.profile_id).maybeSingle();
        if (profileError) throw new Error("No se pudo verificar la cuenta.");
        const obsolete = !profile || profile.email?.toLowerCase() !== row.snapshot.customer_email?.toLowerCase()
          || (row.event_type === "wholesale_approved" && !profile.is_approved_wholesale)
          || (row.event_type === "wholesale_revoked" && profile.is_approved_wholesale);
        if (obsolete) { await save({ status: "skipped", last_error: "La cuenta cambió desde que se generó el aviso.", lease_token: null, leased_until: null }); report.skipped++; continue; }
      }
      if (!row.payload && row.order_id && ["order_created", "payment_failed", "order_preparing", "order_shipped", "tracking_updated"].includes(row.event_type)) {
        const { data: order, error: orderError } = await db.from("orders").select("status,carrier_tracking_code").eq("id", row.order_id).maybeSingle();
        if (orderError) throw new Error("No se pudo verificar el estado del pedido.");
        const obsolete = !order || order.status !== row.snapshot.status || (row.event_type === "tracking_updated" && order.carrier_tracking_code !== row.snapshot.carrier_tracking_code);
        if (obsolete) { await save({ status: "skipped", last_error: "Hay un estado más reciente del pedido.", lease_token: null, leased_until: null }); report.skipped++; continue; }
      }
      let to = row.payload?.to || (row.audience === "admin" ? config.recipients : [row.snapshot.customer_email || ""]);
      if (to.some(address => !validEmail(address))) throw new EmailSendError("invalid_recipient", false);
      const { data: suppressed, error: suppressionError } = await db.from("email_suppressions").select("email").in("email", to);
      if (suppressionError) throw new Error("No se pudo verificar el destinatario.");
      if (suppressed?.length && !row.payload && row.audience === "admin") to = to.filter(address => !suppressed.some(s => s.email === address));
      if (!to.length || (suppressed?.length && (row.payload || row.audience === "customer"))) {
        await save({ status: "skipped", last_error: "Destinatario bloqueado por rebote o queja; revisar antes de reenviar.", lease_token: null, leased_until: null }); report.skipped++; continue;
      }
      const payload = row.payload || {
        from: config.from, to, reply_to: config.replyTo,
        ...(optional ? renderOptionalEmail(row.event_type, row.snapshot, config.origin) : renderTransactionalEmail(row.event_type, row.audience, row.snapshot, config.origin)),
        ...(optional ? { headers: { "List-Unsubscribe": `<${new URL(`/api/emails/unsubscribe?token=${encodeURIComponent((row.snapshot as OptionalEmailSnapshot).unsubscribe_token || "")}`, config.origin).href}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
        tags: [{ name: "event", value: row.event_type }, { name: "audience", value: row.audience }, { name: "outbox_id", value: row.id }],
      };
      // Persist the exact body before touching the provider. All retries reuse it, even after config changes.
      await save({ payload, attempts: row.attempts + 1, first_attempt_at: row.first_attempt_at || new Date().toISOString() });
      row.attempts++;
      const id = await send(payload, `mya/${row.id}`, config.apiKey);
      await save({ status: "sent", provider_id: id, sent_at: new Date().toISOString(), last_error: suppressed?.length ? "Se omitieron destinatarios bloqueados; revisar las casillas administrativas." : null, lease_token: null, leased_until: null });
      report.sent++;
    } catch (error) {
      const providerError = error instanceof EmailSendError;
      const retry = !providerError || error.retryable;
      await save({ status: retry && row.attempts < 8 ? "pending" : "failed", last_error: providerError ? error.code : "Error interno al procesar el email.", available_at: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(row.attempts, 6))).toISOString(), lease_token: null, leased_until: null });
      report.failed++;
    }
  }
  // Apply webhook results that raced with the send response.
  const { error: webhookError } = await db.rpc("apply_email_provider_events_v1");
  if (webhookError) throw new Error("No se pudo actualizar la entrega de los emails.");
  return report;
}

