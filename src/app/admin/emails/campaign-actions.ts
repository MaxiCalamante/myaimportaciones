"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/admin-auth";
import { createCommerceService } from "@/lib/supabase/service";
import { getEmailConfig } from "@/lib/email-config";
import { renderOptionalEmail, validCampaign } from "@/lib/email-marketing";
import { processEmailOutbox } from "@/lib/email-worker";
const uuid = (value: FormDataEntryValue | null) => /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(value || ""));
export async function createEmailCampaign(form: FormData) {
  const admin = await getAdminClient();
  const content = { subject: String(form.get("subject") || "").trim(), heading: String(form.get("heading") || "").trim(), message: String(form.get("message") || "").trim(), action_path: String(form.get("action_path") || "/catalogo").trim() };
  if (!validCampaign(content) || !uuid(form.get("draft_id"))) redirect("/admin/emails/campanas?notice=invalid");
  const { data: { user } } = await admin.auth.getUser();
  const { error } = await createCommerceService().from("email_campaigns").upsert({ id: String(form.get("draft_id")), ...content, created_by: user!.id }, { onConflict: "id", ignoreDuplicates: true });
  revalidatePath("/admin/emails/campanas");
  redirect(`/admin/emails/campanas?notice=${error ? "error" : "draft"}`);
}
export async function launchEmailCampaign(form: FormData) {
  const admin = await getAdminClient();
  if (!getEmailConfig().enabled || !uuid(form.get("id")) || form.get("confirmed") !== "yes") redirect("/admin/emails/campanas?notice=invalid");
  const { error } = await admin.rpc("launch_email_campaign_v1", { campaign_input: String(form.get("id")) });
  // The scheduler prepares bounded batches. Launch is atomic and duplicate submissions are harmless.
  revalidatePath("/admin/emails/campanas");
  redirect(`/admin/emails/campanas?notice=${error ? "error" : "launched"}`);
}
export async function cancelEmailCampaign(form: FormData) {
  await getAdminClient();
  if (!uuid(form.get("id")) || form.get("confirmed") !== "yes") redirect("/admin/emails/campanas?notice=invalid");
  const { error } = await createCommerceService().from("email_campaigns").update({ status: "cancelled" }).eq("id", String(form.get("id"))).in("status", ["draft", "queued", "queued_all"]);
  revalidatePath("/admin/emails/campanas");
  redirect(`/admin/emails/campanas?notice=${error ? "error" : "cancelled"}`);
}
export async function testEmailCampaign(form: FormData) {
  await getAdminClient();
  const config = getEmailConfig();
  if (!config.enabled || !uuid(form.get("id"))) redirect("/admin/emails/campanas?notice=invalid");
  const db = createCommerceService();
  const { data: campaign, error } = await db.from("email_campaigns").select("subject,heading,message,action_path").eq("id", String(form.get("id"))).maybeSingle();
  if (error || !campaign) redirect("/admin/emails/campanas?notice=error");
  const body = renderOptionalEmail("campaign", campaign, config.origin);
  const { error: queuedError } = await db.from("email_outbox").upsert({ event_key: `campaign-test/${Math.floor(Date.now() / 600000)}`, event_type: "email_test", audience: "admin", snapshot: {}, payload: { from: config.from, to: config.recipients, reply_to: config.replyTo, ...body, subject: `[PRUEBA] ${body.subject}`, tags: [{ name: "event", value: "email_test" }] } }, { onConflict: "event_key", ignoreDuplicates: true });
  if (queuedError) redirect("/admin/emails/campanas?notice=error");
  try { await processEmailOutbox(); } catch { redirect("/admin/emails/campanas?notice=error"); }
  revalidatePath("/admin/emails");
  redirect("/admin/emails/campanas?notice=test");
}
