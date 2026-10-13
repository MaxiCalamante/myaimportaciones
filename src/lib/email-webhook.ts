import { Webhook } from "svix";
export interface EmailProviderEvent { type: string; created_at: string; data: { email_id: string; to?: string[] } }
export function verifyResendWebhook(payload: string, headers: Headers, secret: string): EmailProviderEvent | null {
  try {
    new Webhook(secret).verify(payload, {
      "svix-id": headers.get("svix-id") || "",
      "svix-timestamp": headers.get("svix-timestamp") || "",
      "svix-signature": headers.get("svix-signature") || "",
    });
    const event = JSON.parse(payload) as EmailProviderEvent;
    if (typeof event.type !== "string" || typeof event.data?.email_id !== "string" || !Number.isFinite(Date.parse(event.created_at))) return null;
    if (event.data.to !== undefined && (!Array.isArray(event.data.to) || event.data.to.some(r => typeof r !== "string"))) return null;
    return event;
  } catch { return null; }
}
