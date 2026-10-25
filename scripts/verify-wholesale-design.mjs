import assert from "node:assert/strict";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = process.env.SEO_BASE_URL || "http://localhost:3118";
const out = "docs/seo/qa-private/wholesale-design-2026-10-25";
await mkdir(out, { recursive: true });
const cache = path.join(process.env.LOCALAPPDATA, "ms-playwright");
const installed = (await readdir(cache)).filter(x => /^chromium-\d+$/.test(x)).sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
const browser = await chromium.launch({ headless: true, executablePath: path.join(cache, installed[0], "chrome-win64", "chrome.exe") });
const report = { views: [], menus: [], searches: [], images: [], accessibility: [], errors: [], writes: [] };
try {
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem("mya_analytics_consent", "denied"));
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (!["GET", "HEAD"].includes(request.method())) { report.writes.push(url.pathname); return route.abort(); }
    if (request.headers()["next-router-prefetch"] === "1") return route.abort();
    if (url.origin === base || request.resourceType() === "image") return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  const go = async route => { await (await page.goto(base + route, { waitUntil: "load" })).finished(); await page.locator("main h1").waitFor(); };
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/mayorista", "/catalogo"]) {
      await go(route);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const header = page.locator("body header").first();
      assert.equal(await header.getByText(/Ir a Minorista|Ir a Tienda Minorista/).count(), 0);
      const background = await header.evaluate(element => {
        const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
        ctx.fillStyle = getComputedStyle(element).backgroundColor;
        ctx.fillRect(0, 0, 1, 1);
        return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
      });
      assert.ok(background.every(channel => channel > 245), "Both sections use the same white header");
      assert.equal(await header.locator('a[aria-label="MyA importaciones"]').getAttribute("href"), "/");
      if (width >= 1280) {
        const nav = header.getByRole("navigation", { name: "Navegación principal" });
        await nav.waitFor({ state: "visible" });
        const links = await nav.locator(":scope > a").evaluateAll(elements => elements.map(element => ({ text: element.textContent.trim(), height: element.getBoundingClientRect().height, whiteSpace: getComputedStyle(element).whiteSpace })));
        for (const link of links) { assert.equal(link.whiteSpace, "nowrap"); assert.ok(link.height < 48, link.text); }
        if (route === "/mayorista") assert.equal(await nav.getByRole("link", { name: "Mayoristas", exact: true }).getAttribute("aria-current"), "page");
      } else {
        const menu = header.getByRole("button", { name: "Abrir menu" });
        await menu.click();
        await page.locator("#mobile-site-menu").waitFor({ state: "visible" });
        assert.equal(await menu.getAttribute("aria-expanded"), "true");
        await page.keyboard.press("Escape");
        assert.equal(await menu.getAttribute("aria-expanded"), "false");
        report.menus.push({ width, route, openClose: true });
      }
      if (route === "/mayorista") {
        const hero = page.locator("main header");
        const images = await hero.locator("img").evaluateAll(async elements => Promise.all(elements.map(async img => { img.loading = "eager"; try { await img.decode(); } catch {} return { alt: img.alt, loaded: img.complete && img.naturalWidth > 0 }; })));
        assert.equal(images.length, 5);
        assert.ok(images.every(image => image.loaded));
        report.images.push({ width, loaded: images.length });
        await page.screenshot({ path: `${out}/${width}-hero.png` });
        if ([390, 1440].includes(width)) await page.screenshot({ path: `${out}/${width}-full.png`, fullPage: true });
      }
      report.views.push({ width, route });
    }
    console.log(`Header and layout ${width}px passed`);
  }
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await go("/mayorista");
    if (width < 1280) await page.getByRole("button", { name: "Abrir menu" }).click();
    const input = width < 1280 ? page.locator("#mobile-search-input") : page.getByRole("textbox", { name: "Buscar productos", exact: true });
    await input.fill("Medicube");
    await page.waitForResponse(response => response.url().includes("/api/search?q=Medicube") && response.status() === 200);
    const results = width < 1280 ? page.locator("#mobile-site-menu button:has(img)") : page.locator('header a[href^="/producto/"]:visible');
    await results.first().waitFor({ state: "visible" });
    assert.ok(await results.count() > 0);
    await input.press("Enter");
    await page.waitForURL("**/catalogo?q=Medicube");
    report.searches.push({ width, productsFound: true, target: "/catalogo?q=Medicube" });
  }
  for (const route of ["/mayorista", "/mayorista/medicube"]) {
    await go(route);
    await page.addScriptTag({ content: await readFile("node_modules/axe-core/axe.min.js", "utf8") });
    const violations = await page.evaluate(() => window.axe.run(document.querySelector("main"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } }).then(result => result.violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map(node => node.target) }))));
    report.accessibility.push({ route, violations });
    assert.deepEqual(violations, []);
  }
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.writes, []);
} finally {
  await writeFile(`${out}/design-verification.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ views: report.views.length, menus: report.menus.length, searches: report.searches.length, accessibility: report.accessibility, errors: report.errors }, null, 2));
