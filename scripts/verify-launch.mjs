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
    for (const path of ["/", "/catalogo", "/favoritos", "/checkout"]) {
      const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200, path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, `Horizontal overflow ${viewport.width} ${path}`);
      if (["/", "/catalogo"].includes(path)) assert.equal(await page.getByRole("heading", { name: "Estamos preparando nuestro catálogo" }).count(), 1);
      if (path === "/") {
        assert.equal(await page.getByRole("link", { name: "Consultar por WhatsApp", exact: true }).count(), 1);
        assert.equal(await page.locator('a[href="#contenido"]').count(), 1);
        await page.getByRole("button", { name: "Abrir carrito", exact: true }).click();
        assert.equal(await page.getByRole("dialog", { name: "Carrito", exact: true }).count(), 1);
        assert.equal(await page.getByRole("heading", { name: "Tu carrito está vacío", exact: true }).count(), 1);
        await page.keyboard.press("Escape");
        assert.equal(await page.getByRole("dialog", { name: "Carrito", exact: true }).count(), 0);
        if (viewport.width < 768) {
          await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
          assert.equal(await page.getByRole("textbox", { name: "Buscar productos", exact: true }).count(), 1);
          await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
        }
      }
      await page.screenshot({ path: `${dir}/${viewport.width}-${path.replaceAll("/", "") || "home"}.png`, fullPage: true });
      results.push({ viewport: viewport.width, path, status: response.status(), horizontalOverflow: overflow });
    }
    await page.goto(`${base}/admin/proveedores`, { waitUntil: "networkidle" });
    assert.equal(new URL(page.url()).pathname, "/login");
    results.push({ viewport: viewport.width, path: "/admin/proveedores", unauthenticatedRedirect: "/login" });
    assert.deepEqual(errors, [], `Browser errors ${viewport.width}`);
    await page.close();
  }
  for (const [path, status] of [["/api/search?q=producto", 200], ["/api/favorites/products?ids=invalid", 400], ["/api/cron/sync-supplier-stock", 503], ["/api/catalog/google-feed", 200], ["/sitemap.xml", 200], ["/robots.txt", 200]]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, status, path);
    const body = await response.text();
    if (path.startsWith("/api/search")) assert.deepEqual(JSON.parse(body).results, []);
    if (path === "/robots.txt") assert.match(body, /Disallow: \/admin/);
    results.push({ path, status });
  }
  await writeFile(`${dir}/browser-results.json`, JSON.stringify({ date: "2026-09-30", base, results, adminAuthenticatedTest: false, remoteWrites: false }, null, 2));
  console.log(JSON.stringify({ passed: results.length, screenshots: dir, adminAuthenticatedTest: false }));
} finally { await browser.close(); }
