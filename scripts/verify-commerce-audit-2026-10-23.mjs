import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.argv[2] || "http://localhost:3108";
const output = process.argv[3] || "docs/commerce-audit-2026-10-23/ui";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error("Use a local preview; this verifier does not submit orders or payments.");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const checks = [], errors = [];
async function visit(page, path, width) {
  const response = await page.goto(base + path, { waitUntil: "networkidle" });
  assert.equal(response.status(), 200, path);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${width}: ${path}`);
  checks.push({ width, path, status: response.status(), overflow: false });
}
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => localStorage.setItem("mya_analytics_consent", "denied"));
    await context.route(/googletagmanager|google-analytics|connect\.facebook/, route => route.abort());
    const page = await context.newPage();
    page.on("pageerror", error => errors.push({ width, message: error.message }));
    await visit(page, "/catalogo", width);
    // The first catalog page may contain only variant products or unavailable stock.
    await visit(page, "/catalogo?q=Anua", width);
    const purchasable = page.locator("article").filter({ has: page.getByRole("button", { name: "Agregar", exact: true }) }).first();
    const product = await purchasable.locator('a[href^="/producto/"]').first().getAttribute("href");
    assert.ok(product);
    const add = purchasable.getByRole("button", { name: "Agregar", exact: true });
    await add.click();
    const cart = page.getByRole("dialog", { name: "Carrito", exact: true });
    await cart.waitFor();
    await cart.getByText("Beneficio por transferencia", { exact: true }).waitFor();
    await cart.getByRole("button", { name: /Aumentar/ }).first().click();
    await page.screenshot({ path: `${output}/${width}-cart.png` });
    await cart.getByRole("link", { name: /Iniciar Compra Segura|Coordinar mi compra/ }).click();
    await page.waitForURL("**/checkout");
    await page.getByRole("heading", { name: /Resumen de compra|Resumen del carrito/ }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${output}/${width}-checkout.png` });
    checks.push({ width, interaction: "add, quantity, cart to filled checkout", ok: true });

    await visit(page, product, width);
    await page.getByText("Todavía no hay opiniones verificadas publicadas para este producto.", { exact: true }).waitFor();
    assert.equal(await page.getByText(/valoraciones verificadas|99% recomienda/).count(), 0);
    const cp = page.getByPlaceholder(/código postal|1000|7000/i).first();
    if (await cp.count()) {
      await cp.fill("1425");
      const delivery = page.getByRole("radio").filter({ hasText: /domicilio/i }).first();
      await delivery.click();
      assert.equal(await page.evaluate(() => sessionStorage.getItem("mya_postal_code")), "1425");
      if ((await delivery.innerText()).includes("Tarifa a cotizar")) {
        assert.doesNotMatch(await delivery.innerText(), /GRATIS|Llega entre/);
      }
    }
    await page.screenshot({ path: `${output}/${width}-product.png`, fullPage: true });
    for (const path of ["/", "/favoritos", "/login", "/register", "/seguimiento", "/condiciones", "/privacidad", "/arrepentimiento", "/cuenta", "/admin", "/admin/ventas", "/admin/costos", "/pedido/ORD-SYNTHETIC-AUDIT"]) {
      await visit(page, path, width);
      if (path.startsWith("/admin") || path === "/cuenta") assert.equal(new URL(page.url()).pathname, "/login");
      if (path.startsWith("/pedido")) {
        await page.getByRole("heading", { name: "Consultar comprobante" }).waitFor();
        assert.equal(await page.getByText("Dirección de entrega", { exact: true }).count(), 0);
        await page.screenshot({ path: `${output}/${width}-receipt-protected.png` });
      }
    }
    console.log(`Verified ${width}px`);
    await context.close();
  }
  assert.deepEqual(errors, [], "Browser JavaScript errors");
} finally {
  await writeFile(`${output}/verification.json`, JSON.stringify({ checks, errors, noOrdersOrPaymentsSubmitted: true }, null, 2));
  await browser.close();
}
