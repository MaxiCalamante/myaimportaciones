"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/admin-auth";
import { createCommerceService } from "@/lib/supabase/service";
import { getEmailConfig } from "@/lib/email-config";
import { processEmailOutbox } from "@/lib/email-worker";
export async function processPendingEmailsAction() {
  await getAdminClient();
  if (!getEmailConfig().enabled) redirect("/admin/emails?notice=disabled");
  try { await processEmailOutbox(); } catch { redirect("/admin/emails?notice=error"); }
  revalidatePath("/admin/emails");
  redirect("/admin/emails?notice=processed");
}
export async function retryFailedEmailAction(form: FormData) {
  await getAdminClient();
  if (!getEmailConfig().enabled) redirect("/admin/emails?notice=disabled");
  const id = String(form.get("id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/emails?notice=error");
  const db = createCommerceService();
  const { data: row, error } = await db.from("email_outbox").select("status,last_error,first_attempt_at").eq("id", id).maybeSingle();
  const retryable = /^(provider_timeout_or_network|provider_response_missing_id|concurrent_idempotent_requests|rate_limit_exceeded|http_429|http_5\d\d|internal_server_error|Error interno)/.test(row?.last_error || "");
  if (error || row?.status !== "failed" || !retryable || !row.first_attempt_at || Date.now() - Date.parse(row.first_attempt_at) >= 23 * 3600000) redirect("/admin/emails?notice=review");
  const { error: updateError } = await db.from("email_outbox").update({ status: "pending", available_at: new Date().toISOString(), attempts: 0 }).eq("id", id).eq("status", "failed");
  if (updateError) redirect("/admin/emails?notice=error");
  try { await processEmailOutbox(); } catch { redirect("/admin/emails?notice=error"); }
  revalidatePath("/admin/emails");
  redirect("/admin/emails?notice=processed");
}
