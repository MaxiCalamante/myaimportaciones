import { NextResponse } from "next/server";
import { isEmailWebhookForSender, verifyResendWebhook } from "@/lib/email-webhook";
import { getEmailConfig, validEmail } from "@/lib/email-config";
import { createCommerceService, hasCommerceService } from "@/lib/supabase/service";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !hasCommerceService()) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const body = await req.text();
  if (body.length > 100000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const event = verifyResendWebhook(body, req.headers, secret);
  if (!event) return NextResponse.json({ error: "Invalid signature or event" }, { status: 401 });
  const types = ["email.sent", "email.delivered", "email.delivery_delayed", "email.bounced", "email.complained", "email.failed", "email.suppressed"];
  if (!types.includes(event.type)) return NextResponse.json({ received: true });
  if (!isEmailWebhookForSender(event, getEmailConfig().from)) return NextResponse.json({ received: true, ignored: true });
  try {
    const db = createCommerceService();
    const { error } = await db.from("email_provider_events").upsert({ id: req.headers.get("svix-id"), provider_id: event.data.email_id, event_type: event.type, occurred_at: event.created_at }, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw new Error();
    if (["email.bounced", "email.complained", "email.suppressed"].includes(event.type)) {
      const addresses = (event.data.to || []).map(r => r.toLowerCase()).filter(validEmail);
      if (addresses.length) {
        const { error: suppressionError } = await db.from("email_suppressions").upsert(addresses.map(email => ({ email, reason: event.type })), { onConflict: "email" });
        if (suppressionError) throw new Error();
      }
    }
    const { error: applyError } = await db.rpc("apply_email_provider_events_v1");
    if (applyError) throw new Error();
    return NextResponse.json({ received: true });
  } catch { return NextResponse.json({ error: "Processing failed" }, { status: 503 }); }
}
