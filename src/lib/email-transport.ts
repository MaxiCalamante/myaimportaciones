export interface ResendPayload { from: string; to: string[]; reply_to: string; subject: string; html: string; text: string; tags: { name: string; value: string }[]; headers?: Record<string, string> }
export class EmailSendError extends Error {
  constructor(public code: string, public retryable: boolean) { super(code); }
}
export async function sendResendEmail(payload: ResendPayload, key: string, apiKey: string, fetcher: typeof fetch = fetch) {
  let response: Response;
  try {
    response = await fetcher("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
  } catch { throw new EmailSendError("provider_timeout_or_network", true); }
  const data = await response.json().catch(() => ({})) as { id?: string; name?: string };
  if (!response.ok) {
    const code = /^[a-z_]+$/.test(data.name || "") ? data.name! : `http_${response.status}`;
    throw new EmailSendError(code, response.status === 429 || response.status >= 500 || code === "concurrent_idempotent_requests");
  }
  if (!data.id) throw new EmailSendError("provider_response_missing_id", true);
  return data.id;
}
