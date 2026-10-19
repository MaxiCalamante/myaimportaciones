import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { dispatchEmailOutbox } from "../src/lib/email-dispatch";
import { getEmailConfig } from "../src/lib/email-config";
import { EmailSendError, type ResendPayload } from "../src/lib/email-transport";

const config = getEmailConfig({ TRANSACTIONAL_EMAILS_ENABLED: "true", RESEND_API_KEY: "synthetic", RESEND_DOMAIN_VERIFIED: "true", RESEND_FROM_EMAIL: "pedidos@example.com", NEXT_PUBLIC_SITE_URL: "https://shop.example.com" });
function fixture(overrides: Record<string, unknown> = {}, options: { currentStatus?: string; suppressed?: boolean; failResultSave?: boolean; profileEmail?: string; wholesale?: boolean } = {}) {
  const row = { id: "12345678-1234-1234-1234-123456789abc", event_key: "order/test/created", event_type: "order_created", audience: "customer", order_id: "order-test", snapshot: { status: "pending", customer_email: "customer@example.com", shipping_name: "Test Customer", tracking_code: "ORD-TEST", payment_method: "transferencia", total_amount: 1000 }, payload: null, lease_token: "lease", attempts: 0, created_at: new Date().toISOString(), first_attempt_at: null, ...overrides };
  const updates: Record<string, unknown>[] = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith("/rpc/claim_transactional_emails_v1")) return Response.json([row]);
    if (path.endsWith("/rpc/apply_email_provider_events_v1")) return Response.json(null);
    if (path.endsWith("/orders")) return Response.json({ status: options.currentStatus || "pending", carrier_tracking_code: null });
    if (path.endsWith("/profiles")) return Response.json({ email: options.profileEmail || "customer@example.com", is_approved_wholesale: options.wholesale ?? true });
    if (path.endsWith("/email_suppressions")) return Response.json(options.suppressed ? [{ email: "customer@example.com" }] : []);
    if (path.endsWith("/email_outbox")) {
      const fields = JSON.parse(String(init?.body)); updates.push(fields);
      if (options.failResultSave && fields.status === "sent") return Response.json({ message: "database temporarily unavailable" }, { status: 503 });
      return Response.json([{ id: row.id }]);
    }
    throw new Error(`Unexpected fake endpoint: ${path}`);
  }) as typeof fetch;
  const db = createClient("https://database.example.com", "synthetic", { global: { fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false } });
  return { db, row, updates };
}
test("worker persists exact payload before send and retries frozen recipients/body after config changes", async () => {
  const f = fixture();
  let firstPayload: ResendPayload | undefined;
  const result = await dispatchEmailOutbox(f.db, config, undefined, async (payload, key) => {
    assert.deepEqual(f.updates[0].payload, payload);
    assert.equal(key, `mya/${f.row.id}`);
    firstPayload = payload;
    return "provider-id";
  });
  assert.equal(result.sent, 1);
  assert.equal(f.updates.at(-1)?.status, "sent");
  const retry = fixture({ payload: firstPayload, first_attempt_at: new Date().toISOString(), attempts: 1 });
  await dispatchEmailOutbox(retry.db, { ...config, from: "new@example.com", recipients: ["new-admin@example.com"], replyTo: "new-support@example.com" }, undefined, async payload => { assert.deepEqual(payload, firstPayload); return "provider-id"; });
});
test("worker does not send disabled, obsolete, old or suppressed notifications", async () => {
  let calls = 0;
  const send = async () => { calls++; return "provider-id"; };
  const disabled = fixture();
  await dispatchEmailOutbox(disabled.db, { ...config, enabled: false }, undefined, send);
  assert.equal(disabled.updates.length, 0);
  for (const f of [fixture({}, { currentStatus: "paid" }), fixture({ created_at: new Date(Date.now() - 2 * 86400000).toISOString() }), fixture({}, { suppressed: true })]) {
    const result = await dispatchEmailOutbox(f.db, config, undefined, send);
    assert.equal(result.skipped, 1);
    assert.equal(f.updates.at(-1)?.status, "skipped");
  }
  assert.equal(calls, 0);
});
test("provider timeout and database failure after acceptance preserve payload for idempotent recovery", async () => {
  const timeout = fixture();
  await dispatchEmailOutbox(timeout.db, config, undefined, async () => { throw new EmailSendError("provider_timeout_or_network", true); });
  assert.equal(timeout.updates.at(-1)?.status, "pending");
  assert.ok(timeout.updates[0].payload);
  assert.ok(timeout.updates[0].first_attempt_at);
  const accepted = fixture({}, { failResultSave: true });
  await dispatchEmailOutbox(accepted.db, config, undefined, async () => "provider-id");
  assert.equal(accepted.updates.at(-1)?.status, "pending");
  assert.ok(accepted.updates[0].payload);
  const terminal = fixture();
  await dispatchEmailOutbox(terminal.db, config, undefined, async () => { throw new EmailSendError("validation_error", false); });
  assert.equal(terminal.updates.at(-1)?.status, "failed");
});
test("one blocked administrator does not prevent a new notification to the other", async () => {
  const f = fixture({ audience: "admin" }, { suppressed: true });
  const result = await dispatchEmailOutbox(f.db, { ...config, recipients: ["customer@example.com", "admin@example.com"] }, undefined, async payload => { assert.deepEqual(payload.to, ["admin@example.com"]); return "provider-id"; });
  assert.equal(result.sent, 1);
  assert.match(String(f.updates.at(-1)?.last_error), /destinatarios bloqueados/);
});

test("account notices cannot reach an old email or describe a wholesale state that was reversed", async () => {
  const account = { event_type: "wholesale_approved", order_id: null, snapshot: { profile_id: "profile-test", customer_email: "customer@example.com" } };
  let calls = 0;
  const send = async () => { calls++; return "provider-id"; };
  for (const f of [fixture(account, { profileEmail: "new@example.com" }), fixture(account, { wholesale: false }), fixture({ ...account, event_type: "wholesale_revoked" })]) {
    assert.equal((await dispatchEmailOutbox(f.db, config, undefined, send)).skipped, 1);
  }
  assert.equal(calls, 0);
  assert.equal((await dispatchEmailOutbox(fixture(account).db, config, undefined, send)).sent, 1);
});
