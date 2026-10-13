// Local synthetic UI proof: isolated fake Supabase, no live data or emails.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const runtimeModules = process.env.CODEX_NODE_MODULES || "C:/Users/maxim/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(runtimeModules, "playwright"));
let role = "admin";
const user = { id: "22222222-2222-4222-8222-222222222222", aud: "authenticated", role: "authenticated", email: "admin@example.com", user_metadata: {}, app_metadata: {}, created_at: new Date().toISOString() };
const snapshot = { tracking_code: "ORD-EJEMPLO", status: "shipped", total_amount: 125000, customer_email: "cliente@example.com" };
const fake = createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization,apikey,content-type,x-client-info");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.end();
  if (path.endsWith("/auth/v1/user")) return res.end(JSON.stringify(user));
  if (path.endsWith("/profiles")) return res.end(JSON.stringify({ id: user.id, email: user.email, role, full_name: "Administrador ficticio", customer_tier: "retail" }));
  if (path.endsWith("/email_outbox")) return res.end(JSON.stringify([{ id: "33333333-3333-4333-8333-333333333333", event_type: "order_shipped", audience: "customer", status: "sent", attempts: 1, provider_id: "synthetic-id", delivery_status: "email.delivered", last_error: null, created_at: new Date().toISOString(), snapshot }]));
  res.end("[]");
});
await new Promise(done => fake.listen(3411, "127.0.0.1", done));
const out = resolve("../scratch/email-system-2026-10-10");
await mkdir(out, { recursive: true });
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3412"], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:3411", NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic", SUPABASE_SERVICE_ROLE_KEY: "synthetic", NEXT_PUBLIC_SITE_URL: "http://localhost:3412", TRANSACTIONAL_EMAILS_ENABLED: "false", RESEND_API_KEY: "", RESEND_FROM_EMAIL: "", RESEND_DOMAIN_VERIFIED: "false", RESEND_WEBHOOK_SECRET: "whsec_c3ludGhldGljLXZhbGlkLWtleS0xMjM0NTY3ODkw", CRON_SECRET: "synthetic-cron", COMMERCE_CHECKOUT_ENABLED: "false" } });
let log = "";
app.stdout?.on("data", chunk => { log += chunk.toString(); }); app.stderr?.on("data", chunk => { log += chunk.toString(); });
let browser;
try {
  for (let i = 0; i < 120 && !log.includes("Ready in"); i++) { if (app.exitCode !== null) throw new Error("Local app failed to start"); await new Promise(done => setTimeout(done, 1000)); }
  if (!log.includes("Ready in")) throw new Error("Local app startup timed out");
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => { if (window.top === window) localStorage.setItem("mya_analytics_consent", "denied"); });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://localhost:3412/admin/emails", { waitUntil: "networkidle" });
  assert.ok(page.url().includes("/login"));
  const encode = data => Buffer.from(JSON.stringify(data)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const access_token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: now + 3600, iat: now, aud: "authenticated", role: "authenticated" })}.synthetic`;
  const session = { access_token, refresh_token: "synthetic", token_type: "bearer", expires_at: now + 3600, expires_in: 3600, user };
  await context.addCookies([{ name: "sb-127-auth-token", value: `base64-${encode(session)}`, url: "http://localhost:3412", httpOnly: false }]);
  const results = [];
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("http://localhost:3412/admin/emails", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Emails de la tienda", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Procesar pendientes" }).isDisabled(), true);
    assert.ok(await page.getByText("Entregado al servidor del destinatario", { exact: true }).isVisible());
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, `Page overflow at ${width}`);
    await page.getByLabel("Destinatario", { exact: true }).selectOption("admin");
    await page.getByLabel("Ocasión", { exact: true }).selectOption("payment_review");
    const frame = page.frameLocator('iframe[title="Vista previa del email"]');
    await frame.getByRole("heading", { name: "Atención: pago que requiere revisión", exact: true }).waitFor();
    await page.getByLabel("Destinatario", { exact: true }).selectOption("customer");
    await page.getByLabel("Ocasión", { exact: true }).selectOption("order_shipped");
    await frame.getByRole("heading", { name: "Despachamos tu pedido", exact: true }).waitFor();
    const iframeOverflow = await page.locator("iframe").evaluate(el => { const doc = el.contentDocument; return doc ? doc.documentElement.scrollWidth > doc.documentElement.clientWidth : null; });
    // The sandbox intentionally denies parent DOM access. Inspect through Playwright's frame context.
    const child = page.frames().find(f => f !== page.mainFrame());
    const childOverflow = await child.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(childOverflow, false, `Email overflow at ${width}`);
    await page.locator("iframe").screenshot({ path: resolve(out, `email-shipped-${width}.png`) });
    await page.screenshot({ path: resolve(out, `admin-emails-${width}.png`), fullPage: true });
    results.push({ width, overflow, iframeOverflow, childOverflow, previewInteractions: true });
  }
  const emailHtml = await page.frames().find(f => f !== page.mainFrame()).content();
  const emailPage = await context.newPage();
  await emailPage.setViewportSize({ width: 390, height: 900 });
  await emailPage.setContent(emailHtml);
  await emailPage.screenshot({ path: resolve(out, "email-demo-390.png"), fullPage: true });
  await writeFile(resolve(out, "email-demo.html"), emailHtml);
  await emailPage.close();
  const cron = await context.request.get("http://localhost:3412/api/cron/emails"); assert.equal(cron.status(), 401);
  const disabledCron = await context.request.get("http://localhost:3412/api/cron/emails", { headers: { authorization: "Bearer synthetic-cron" } }); assert.deepEqual(await disabledCron.json(), { enabled: false });
  const unsigned = await context.request.post("http://localhost:3412/api/resend/webhook", { data: { type: "email.delivered" } }); assert.equal(unsigned.status(), 401);
  role = "customer";
  await page.goto("http://localhost:3412/admin/emails", { waitUntil: "networkidle" }); assert.ok(page.url().includes("/cuenta"));
  assert.deepEqual(errors, []);
  const report = { evidence: "local actual routes with synthetic Supabase/auth; no live writes or email sending", results, anonymousRedirect: true, customerRedirect: true, cronAuth: true, disabledCron: true, unsignedWebhookRejected: true, pageErrors: errors };
  await writeFile(resolve(out, "verification.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  await writeFile(resolve(out, "failure-log.txt"), log);
  throw error;
} finally {
  await browser?.close(); app.kill(); fake.close();
}
