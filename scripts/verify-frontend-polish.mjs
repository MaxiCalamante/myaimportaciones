import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve("playwright", { paths: process.argv[3] ? [process.argv[3]] : undefined }));
const base = process.argv[2] ?? "http://localhost:3107";
const dir = process.argv[4] ?? "docs/frontend-polish-2026-10-07";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || "msedge" });
const routes = [], interactions = [];
const widths = [320, 390, 430, 768, 1280, 1440];
const errors = [];
async function visit(page, path) {
  const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  assert.equal(response.status(), 200, path);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow: ${path}`);
}
async function screenshot(page, name, fullPage = false) {
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage });
}
async function containedFocus(page, dialog) {
  await page.keyboard.press("Shift+Tab");
  assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true);
  await page.keyboard.press("Tab");
  assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true);
}
try {
  const seed = await browser.newPage();
  await visit(seed, "/catalogo");
  const productPaths = await seed.locator('article a[href^="/producto/"]').evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute("href")))].slice(0, 2));
  assert.equal(productPaths.length, 2, "Needs two public products for route coverage");
  await seed.close();
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on("pageerror", error => errors.push({ width, message: error.message }));
    await page.addInitScript(() => localStorage.setItem("mya_analytics_consent", "denied"));
    for (const path of ["/", "/catalogo", ...productPaths, "/favoritos", "/checkout", "/login", "/register", "/seguimiento", "/condiciones", "/privacidad", "/arrepentimiento", "/cuenta", "/admin"]) {
      await visit(page, path);
      if (path === "/cuenta" || path === "/admin") assert.equal(new URL(page.url()).pathname, "/login");
      const button = await page.getByRole("button", { name: "Abrir carrito", exact: true }).boundingBox();
      assert.ok(button.width >= 44 && button.height >= 44, `Header touch target: ${width}`);
      if (width < 768 && (path === "/catalogo" || path.startsWith("/producto/"))) {
        assert.equal(await page.getByRole("navigation", { name: "Navegación principal móvil" }).getByRole("link", { name: "Catálogo" }).getAttribute("aria-current"), "page");
      }
      if (width < 768 && path === "/login") assert.equal(await page.getByRole("textbox", { name: "Email", exact: true }).evaluate(node => getComputedStyle(node).fontSize), "16px");
      if ([390, 1440].includes(width) && ["/", "/catalogo", productPaths[0], "/login", "/seguimiento", "/condiciones"].includes(path)) {
        await screenshot(page, `${width}-${path === "/" ? "home" : path.startsWith("/producto/") ? "product" : path.slice(1)}`);
      }
      if (path === productPaths[0] && width < 768) {
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
        const privacy = await page.getByRole("button", { name: "Preferencias de privacidad" }).boundingBox();
        const bar = await page.locator('[data-product-page] div.fixed').boundingBox();
        assert.ok(privacy.y + privacy.height <= bar.y + 1, "Footer must remain above product action bar");
      }
      routes.push({ width, path, status: 200, horizontalOverflow: false });
    }
    await page.close();
    console.log(`Routes verified at ${width}px`);
  }
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    page.on("pageerror", error => errors.push({ width, message: error.message }));
    await page.addInitScript(() => localStorage.setItem("mya_analytics_consent", "denied"));
    await visit(page, "/catalogo");
    await page.getByRole("button", { name: "Abrir carrito", exact: true }).click();
    const cart = page.getByRole("dialog", { name: "Carrito", exact: true });
    await cart.getByRole("heading", { name: "Tu carrito está vacío" }).waitFor();
    await containedFocus(page, cart);
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("button", { name: "Abrir carrito", exact: true }).evaluate(node => node === document.activeElement), true);
    await page.getByRole("button", { name: "Agregar", exact: true }).first().click();
    await cart.waitFor();
    assert.equal(await cart.evaluate(node => node.scrollWidth > node.clientWidth), false);
    await cart.getByRole("button", { name: /Sumar una unidad/ }).click();
    await screenshot(page, `${width}-cart`);
    await cart.getByRole("link", { name: "Continuar al checkout" }).click();
    await page.waitForURL("**/checkout");
    await page.getByRole("heading", { name: "Resumen de compra" }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Filled checkout overflow");
    await screenshot(page, `${width}-checkout`);
    await page.getByRole("combobox", { name: "Medio de pago" }).selectOption("mercado_pago");
    await page.getByRole("combobox", { name: "Medio de pago" }).selectOption("transferencia");
    await page.getByRole("button", { name: "Abrir carrito", exact: true }).click();
    await cart.getByRole("button", { name: /Quitar .* del carrito/ }).click();
    await cart.getByRole("heading", { name: "Tu carrito está vacío" }).waitFor();
    await page.keyboard.press("Escape");
    await visit(page, "/catalogo");
    const favorite = page.getByRole("button", { name: "Agregar a favoritos", exact: true }).first();
    await favorite.click();
    await page.getByRole("button", { name: "Quitar de favoritos", exact: true }).first().waitFor();
    await visit(page, "/favoritos");
    await page.getByRole("button", { name: "Quitar de favoritos", exact: true }).first().click();
    await page.getByRole("heading", { name: "Tu lista de favoritos está lista para empezar" }).waitFor();
    await visit(page, productPaths[0]);
    await page.getByRole("button", { name: /Ampliar foto de/ }).click();
    const gallery = page.getByRole("dialog", { name: /Foto ampliada de/ });
    await gallery.waitFor();
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
    await page.keyboard.press("Escape");
    await gallery.waitFor({ state: "hidden" });
    assert.equal(await page.getByRole("button", { name: /Ampliar foto de/ }).evaluate(node => node === document.activeElement), true);
    interactions.push({ width, cart: "empty/filled/quantity/remove/focus", checkout: "filled/two payment methods/no submit", favorites: "add/remove", gallery: "open/Escape/scroll lock" });
    if (width < 768) {
      await visit(page, "/catalogo");
      await page.getByRole("button", { name: /Filtros/ }).first().click();
      const filters = page.getByRole("dialog", { name: "Filtros del catálogo" });
      await containedFocus(page, filters);
      await screenshot(page, `${width}-filters`);
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("button", { name: /Filtros/ }).first().evaluate(node => node === document.activeElement), true);
      await page.getByRole("button", { name: /Filtros/ }).first().click();
      await filters.getByRole("button", { name: "Menor precio", exact: true }).click();
      await filters.getByRole("button", { name: /Aplicar filtros/ }).click();
      await page.waitForURL("**/catalogo?sort=price_asc");
      await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
      assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("button", { name: "Abrir menu", exact: true }).getAttribute("aria-expanded"), "false");
      await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
      await page.locator("#mobile-site-menu").getByRole("textbox", { name: "Buscar productos", exact: true }).fill("anua");
      await page.locator("#mobile-site-menu").getByRole("button", { name: /Anua Heartleaf/ }).first().click();
      const preview = page.getByRole("dialog", { name: /Anua Heartleaf/ });
      await preview.waitFor();
      await preview.locator("img").evaluate(image => image.complete ? undefined : new Promise(resolve => { image.onload = resolve; image.onerror = resolve; }));
      await containedFocus(page, preview);
      assert.equal(await preview.evaluate(node => node.scrollWidth > node.clientWidth), false);
      await screenshot(page, `${width}-preview`);
      await page.keyboard.press("Escape");
      interactions.push({ width, filters: "focus/Escape/apply sort", menu: "scroll lock/Escape", productPreview: "search/open/focus/Escape" });
    } else {
      await visit(page, "/catalogo");
      const categoryControl = page.getByRole("combobox", { name: "Categoría", exact: true });
      const toolsSlug = await categoryControl.locator("option").evaluateAll(options => options.find(option => option.value.includes("herramienta"))?.value);
      assert.ok(toolsSlug);
      await categoryControl.selectOption(toolsSlug);
      await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
      await page.waitForURL(/category=/);
      await page.getByRole("button", { name: "Categorías", exact: true }).click();
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("button", { name: "Categorías", exact: true }).getAttribute("aria-expanded"), "false");
      interactions.push({ width, desktopFilters: "category apply", categoryMenu: "Escape" });
    }
    await visit(page, `/catalogo?q=${"zzzzsynthetic".repeat(8)}`);
    await page.getByRole("heading", { name: "No encontramos productos con esos filtros" }).waitFor();
    await screenshot(page, `${width}-no-results`);
    await page.getByRole("button", { name: "Limpiar todo", exact: true }).click();
    await page.waitForURL("**/catalogo");
    await visit(page, "/register");
    await page.getByRole("textbox", { name: "Nombre y apellido" }).fill("Prueba local");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("local@example.invalid");
    await page.locator('input[name="password"]').fill("LocalOnly123");
    await page.locator('input[name="confirm_password"]').fill("Different123");
    await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Las contraseñas no coinciden" }).waitFor();
    assert.equal(await page.locator('input[name="password"]').inputValue(), "LocalOnly123");
    interactions.push({ width, noResults: "long query/clear", registration: "local mismatch validation preserves input; no account created" });
    await page.close();
  }
  const consentPage = await browser.newPage({ viewport: { width: 320, height: 844 } });
  await visit(consentPage, productPaths[0]);
  const banner = consentPage.getByRole("region", { name: "Privacidad", exact: true });
  await banner.waitFor();
  const bannerBox = await banner.boundingBox(), actionBar = await consentPage.locator('[data-product-page] div.fixed').boundingBox();
  assert.ok(bannerBox.y + bannerBox.height < actionBar.y, "Privacy must not overlap product actions");
  await screenshot(consentPage, "320-privacy");
  await banner.getByRole("button", { name: "Rechazar", exact: true }).click();
  assert.equal(await consentPage.evaluate(() => localStorage.getItem("mya_analytics_consent")), "denied");
  await consentPage.close();
  interactions.push({ width: 320, consent: "product bar clearance/reject" });
  assert.deepEqual(errors, [], "Browser errors");
  await writeFile(`${dir}/verification.json`, JSON.stringify({ date: "2026-10-07", base, widths, routes, interactions, browserErrors: errors, authenticatedAdmin: false, submittedOrders: false, createdAccounts: false, databaseWrites: false }, null, 2));
  console.log(JSON.stringify({ routes: routes.length, interactions: interactions.length, browserErrors: errors.length, screenshots: dir }));
} finally { await browser.close(); }
