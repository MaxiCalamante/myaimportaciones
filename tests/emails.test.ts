import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Webhook } from "svix";
import { getEmailConfig } from "../src/lib/email-config";
import { renderTransactionalEmail, emailEventLabels } from "../src/lib/email-templates";
import { isEmailWebhookForSender, verifyResendWebhook } from "../src/lib/email-webhook";
import { sendResendEmail, EmailSendError, type ResendPayload } from "../src/lib/email-transport";

test("sending requires explicit activation, private key, owned verified sender and valid recipients", () => {
  const env = { TRANSACTIONAL_EMAILS_ENABLED: "true", RESEND_API_KEY: "synthetic", RESEND_DOMAIN_VERIFIED: "true", RESEND_FROM_EMAIL: "MYA <pedidos@mail.example.com>", NEXT_PUBLIC_SITE_URL: "https://shop.example.com", ADMIN_NOTIFICATION_EMAILS: "maxi@example.com,agustina@example.com,maxi@example.com" };
  assert.equal(getEmailConfig(env).enabled, true);
  assert.deepEqual(getEmailConfig(env).recipients, ["maxi@example.com", "agustina@example.com"]);
  assert.equal(getEmailConfig({}).enabled, false);
  for (const field of ["TRANSACTIONAL_EMAILS_ENABLED", "RESEND_API_KEY", "RESEND_DOMAIN_VERIFIED", "RESEND_FROM_EMAIL"]) assert.equal(getEmailConfig({ ...env, [field]: "" }).enabled, false);
  for (const from of ["maxi@gmail.com", "pedidos@mya.vercel.app", "onboarding@resend.dev", "bad", "MYA\r\nBcc: test@example.com <pedidos@mail.example.com>"]) assert.equal(getEmailConfig({ ...env, RESEND_FROM_EMAIL: from }).enabled, false);
  assert.equal(getEmailConfig({ ...env, ADMIN_NOTIFICATION_EMAILS: "Agustina G 009" }).enabled, false);
  assert.equal(getEmailConfig({ ...env, NEXT_PUBLIC_SITE_URL: "http://example.com" }).enabled, false);
});

test("customer mail escapes content, protects admin-only fields and keeps email out of tracking URL", () => {
  const s = { customer_email: "customer@example.com", shipping_name: '<script>alert("x")</script>', order_notes: "PRIVATE ADMIN NOTE", shipping_phone: "PRIVATE PHONE", tracking_code: "ORD-TEST", payment_method: "transferencia", total_amount: 1000, shipping_option: "delivery_quote_separately", items: [{ product_title: "<img src=x onerror=bad>", quantity: 1, unit_price: 1000 }] };
  const content = renderTransactionalEmail("order_created", "customer", s, "https://shop.example.com");
  assert.ok(content.html.includes("&lt;script&gt;"));
  assert.ok(!content.html.includes("<script>"));
  assert.ok(!content.html.includes("PRIVATE ADMIN NOTE"));
  assert.ok(!content.html.includes("PRIVATE PHONE"));
  assert.ok(!content.html.includes("customer@example.com"));
  assert.match(content.text, /acreditación se confirma luego/);
  assert.match(content.text, /envío se cotiza y abona por separado/);
  const admin = renderTransactionalEmail("order_created", "admin", s, "https://shop.example.com");
  assert.match(admin.text, /pago todavía está pendiente/);
  assert.ok(admin.text.includes("PRIVATE ADMIN NOTE"));
  assert.ok(admin.text.includes("customer@example.com"));
});

test("shipment without a guide doesn't invent it, cancellation doesn't promise refunds, and all events render", () => {
  const shipped = renderTransactionalEmail("order_shipped", "customer", { tracking_code: "ORD-TEST" }, "https://shop.example.com");
  assert.match(shipped.text, /guía todavía no está cargada/);
  assert.ok(!shipped.html.includes("Guía del envío:"));
  const pickup = renderTransactionalEmail("order_shipped", "customer", { shipping_option: "pickup_tandil" }, "https://shop.example.com");
  assert.match(pickup.text, /listo para retirar/);
  assert.ok(!pickup.text.includes("despacho"));
  const guide = renderTransactionalEmail("tracking_updated", "customer", { carrier_tracking_code: "GUIDE-123" }, "https://shop.example.com");
  assert.ok(guide.html.includes("GUIDE-123"));
  assert.ok(guide.html.includes("https://www.correoargentino.com.ar/formularios/e-commerce"));
  assert.match(renderTransactionalEmail("order_cancelled", "customer", {}, "https://shop.example.com").text, /no confirma un reintegro/);
  for (const event of Object.keys(emailEventLabels).filter(e => !["campaign", "cart_reminder"].includes(e))) for (const audience of ["customer", "admin"] as const) {
    const content = renderTransactionalEmail(event, audience, {}, "https://shop.example.com");
    assert.ok(content.subject && content.text && content.html);
  }
});

test("Resend requests use stable keys and bodies; transient errors are distinguishable without leaking responses", async () => {
  const payload: ResendPayload = { from: "pedidos@example.com", to: ["customer@example.com"], reply_to: "support@example.com", subject: "Pedido", html: "<p>Pedido</p>", text: "Pedido", tags: [] };
  const requests: RequestInit[] = [];
  const fake = (async (_url, init) => { requests.push(init!); return Response.json({ id: "provider-id" }); }) as typeof fetch;
  assert.equal(await sendResendEmail(payload, "mya/event-id", "synthetic", fake), "provider-id");
  await sendResendEmail(payload, "mya/event-id", "synthetic", fake);
  assert.equal(requests[0].body, requests[1].body);
  assert.equal((requests[0].headers as Record<string, string>)["Idempotency-Key"], "mya/event-id");
  for (const [status, retryable] of [[429, true], [500, true], [403, false], [422, false]] as const) {
    await assert.rejects(sendResendEmail(payload, "key", "synthetic", (async () => Response.json({ name: "error", message: "private provider detail" }, { status })) as typeof fetch), e => e instanceof EmailSendError && e.retryable === retryable && !e.message.includes("private"));
  }
  await assert.rejects(sendResendEmail(payload, "key", "synthetic", (async () => { throw new Error("timeout"); }) as typeof fetch), e => e instanceof EmailSendError && e.retryable);
});

test("webhooks require authentic signatures, exact body and fresh timestamp", () => {
  const secret = `whsec_${randomBytes(32).toString("base64")}`;
  const wh = new Webhook(secret);
  const timestamp = new Date();
  const body = JSON.stringify({ type: "email.delivered", created_at: timestamp.toISOString(), data: { email_id: "provider-id", to: ["customer@example.com"] } });
  const headers = new Headers({ "svix-id": "event-id", "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)), "svix-signature": wh.sign("event-id", timestamp, body) });
  assert.equal(verifyResendWebhook(body, headers, secret)?.type, "email.delivered");
  assert.equal(verifyResendWebhook(body + " ", headers, secret), null);
  assert.equal(verifyResendWebhook(body, new Headers(), secret), null);
  const old = new Date(Date.now() - 10 * 60000);
  const oldHeaders = new Headers({ "svix-id": "event-id", "svix-timestamp": String(Math.floor(old.getTime() / 1000)), "svix-signature": wh.sign("event-id", old, body) });
  assert.equal(verifyResendWebhook(body, oldHeaders, secret), null);
});

test("account and aftersales templates point to the correct flow without claiming a refund", () => {
  const origin = "https://myaimportaciones.com";
  assert.match(renderTransactionalEmail("account_welcome", "customer", {}, origin).html, /https:\/\/myaimportaciones.com\/cuenta/);
  assert.match(renderTransactionalEmail("wholesale_approved", "customer", {}, origin).html, /https:\/\/myaimportaciones.com\/mayorista/);
  for (const event of ["withdrawal_contacted", "withdrawal_resolved"]) {
    const email = renderTransactionalEmail(event, "customer", { reference: "ARR-TEST" }, origin);
    assert.match(email.text, /ARR-TEST/);
    assert.match(email.text, /no (confirma|acredita) un reintegro|no confirma una cancelación ni un reintegro/);
    assert.ok(!email.html.includes('>Ver mi pedido</a>'));
  }
  assert.match(renderTransactionalEmail("email_test", "admin", {}, origin).text, /No corresponde a una compra/);
});

test("account-wide Resend events cannot mix Turnero deliveries or suppressions into MYA", () => {
  const sender = "MYA Importaciones <pedidos@mail.myaimportaciones.com>";
  const event = { type: "email.bounced", created_at: new Date().toISOString(), data: { email_id: "provider-test", from: "pedidos@mail.myaimportaciones.com", to: ["same-person@example.com"] } };
  assert.equal(isEmailWebhookForSender(event, sender), true);
  assert.equal(isEmailWebhookForSender({ ...event, data: { ...event.data, from: '"MYA Importaciones" <PEDIDOS@mail.myaimportaciones.com>' } }, sender), true);
  for (const from of [undefined, "notificaciones@turnero.site", "pedidos@mail.myaimportaciones.com.other.test", "Other <other@mail.myaimportaciones.com>", "MYA\r\nBcc: other@example.com <pedidos@mail.myaimportaciones.com>"]) {
    assert.equal(isEmailWebhookForSender({ ...event, data: { ...event.data, from } }, sender), false);
  }
  assert.equal(isEmailWebhookForSender(event, ""), false);
});
