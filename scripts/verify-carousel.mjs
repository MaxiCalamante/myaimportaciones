import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve("playwright", { paths: process.argv[3] ? [process.argv[3]] : undefined }));
const base = process.argv[2] ?? "http://localhost:3100";
const dir = "docs/launch-validation";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || "msedge" });
const results = [];
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(base, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    const hero = page.getByRole("region", { name: "Carrusel de inicio", exact: true });
    await hero.getByRole("button", { name: "Pausar carrusel" }).click();
    await hero.getByRole("button", { name: "Ir al slide 1", exact: true }).click();
    assert.equal(await hero.getByRole("heading", { name: "Herramientas Industriales y Profesionales", exact: true }).count(), 1);
    await hero.getByRole("button", { name: "Siguiente slide", exact: true }).click();
    assert.equal(await hero.getByRole("button", { name: "Ir al slide 2", exact: true }).getAttribute("aria-current"), "true");
    assert.equal(await hero.getByRole("link", { name: "Ver K-Beauty", exact: true }).getAttribute("href"), "/catalogo?category=cosmetica-coreana");
    await hero.getByRole("button", { name: "Slide anterior", exact: true }).click();
    assert.equal(await hero.getByRole("button", { name: "Ir al slide 1", exact: true }).getAttribute("aria-current"), "true");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false);
    const heroBox = await hero.boundingBox();
    const ctaBox = await hero.getByRole("link", { name: "Ver Herramientas", exact: true }).boundingBox();
    assert.ok(ctaBox.y + ctaBox.height <= heroBox.y + heroBox.height, "Carousel CTA clipped");
    assert.equal(await page.getByRole("heading", { name: "Estamos preparando nuestro catálogo", exact: true }).count(), 1);
    await page.screenshot({ path: `${dir}/carousel-${viewport.width}.png`, fullPage: true });
    await hero.getByRole("button", { name: "Reanudar carrusel" }).click();
    const adminResponse = await page.goto(`${base}/admin/carrusel`, { waitUntil: "networkidle" });
    assert.equal(adminResponse.status(), 200);
    assert.equal(new URL(page.url()).pathname, "/login");
    assert.equal(await page.getByRole("textbox", { name: /email|correo/i }).count(), 1);
    assert.deepEqual(errors, []);
    results.push({ viewport, publicStatus: response.status(), controls: "pause, next, previous, indicators, resume", horizontalOverflow: overflow, ctaClipped: false, guestAdminRedirect: page.url(), browserErrors: errors });
    await page.close();
  }
  await writeFile(`${dir}/carousel-results.json`, JSON.stringify({ date: "2026-09-30", base, results, adminAuthenticatedTest: false, remoteWrites: false }, null, 2));
  console.log(JSON.stringify({ passed: results.length, evidence: `${dir}/carousel-results.json` }));
} finally { await browser.close(); }
