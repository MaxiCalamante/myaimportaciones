import { Webhook } from "svix";
import { validEmail } from "./email-config";
export interface EmailProviderEvent { type: string; created_at: string; data: { email_id: string; from?: string; to?: string[] } }
// Resend webhooks belong to the account, which can contain unrelated projects.
// Never let another sender's events update MYA history or suppress its recipients.
export function isEmailWebhookForSender(event: EmailProviderEvent, configuredSender: string) {
  const address = (raw: unknown) => {
    if (typeof raw !== "string" || /[\r\n]/.test(raw)) return null;
    const value = raw.trim();
    const email = (value.match(/<([^<>]+)>$/)?.[1] || value).trim().toLowerCase();
    return validEmail(email) ? email : null;
  };
  const expected = address(configuredSender);
  return Boolean(expected && address(event.data.from) === expected);
}
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
    if (event.data.from !== undefined && typeof event.data.from !== "string") return null;
    return event;
  } catch { return null; }
}
