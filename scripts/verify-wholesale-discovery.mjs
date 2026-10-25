// Read-only UI, crawlability and quote checks. Never opens WhatsApp or submits an order.
import assert from "node:assert/strict";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = process.env.SEO_BASE_URL || "http://localhost:3118";
const official = "https://myaimportaciones.com";
const out = process.env.SEO_QA_OUT || "docs/seo/qa-private/wholesale-discovery-2026-10-25";
await mkdir(out, { recursive: true });
const wholesale = ["/mayorista", ...["cosmetica-coreana", "perfumeria", "cuidado-capilar", "herramientas", "electronica", "medicube"].map(slug => `/mayorista/${slug}`)];
const retail = ["/catalogo?brand=Medicube", ...["cosmetica-coreana", "perfumeria", "cuidado-capilar", "herramientas-equipamiento", "electronica"].map(slug => `/catalogo?category=${slug}`)];
const report = { base, at: new Date().toISOString(), pages: [], views: [], flows: [], errors: [], blockedWrites: [], crawlerRequests: [] };
const cache = path.join(process.env.LOCALAPPDATA, "ms-playwright");
const installed = (await readdir(cache)).filter(x => /^chromium-\d+$/.test(x)).sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || path.join(cache, installed[0], "chrome-win64", "chrome.exe") });
const decode = value => value.replaceAll("&amp;", "&");
try {
  const liveSitemap = await (await fetch(official + "/sitemap.xml")).text();
  const localSitemap = await (await fetch(base + "/sitemap.xml")).text();
  const urls = xml => [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => decode(match[1]));
  const before = urls(liveSitemap), after = new Set(urls(localSitemap));
  assert.ok(before.length > 0);
  assert.deepEqual(before.filter(url => !after.has(url)), [], "Existing sitemap URLs must be preserved");
  assert.ok(after.has(official + "/mayorista/medicube"));
  report.sitemap = { before: before.length, after: after.size, added: [...after].filter(url => !before.includes(url)) };
  for (const route of [...wholesale, ...retail]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    const canonical = decode(html.match(/rel="canonical" href="([^"]+)"/)?.[1] || "");
    assert.equal(canonical, official + route);
    assert.ok(!html.includes('content="noindex'), route);
    if (route.startsWith("/mayorista")) {
      assert.match(html, /"@type":"Service"/);
      const readable = html.replaceAll("<!-- -->", "");
      assert.ok(readable.includes("Precios con Máximo"), route + " Máximo contact");
      assert.ok(readable.includes("Precios con Agustina"), route + " Agustina contact");
      assert.ok(!html.includes('"wholesalePrice"') && !html.includes('"wholesale_price"'), "No wholesale price props in public HTML");
      assert.ok(html.includes('href="/mayorista/electronica"'), "Electronics remains reachable in the wholesale navigation");
      const shareImage = decode(html.match(/property="og:image" content="([^"]+)"/)?.[1] || "");
      const shareUrl = new URL(shareImage);
      assert.equal(shareUrl.searchParams.get("tipo"), "categoria");
      assert.ok(shareUrl.searchParams.get("cat").includes("mayor"));
      assert.equal(shareUrl.searchParams.has("precio"), false);
    }
    report.pages.push({ route, status: response.status, canonical });
  }
  const missing = await fetch(base + "/mayorista/inexistente");
  assert.equal(missing.status, 404);
  const legacy = await fetch(base + "/mayorista?category=cosmetica-coreana", { redirect: "manual" });
  assert.equal(legacy.status, 307);
  assert.ok(legacy.headers.get("location").endsWith("/mayorista/cosmetica-coreana"));
  const robots = await (await fetch(base + "/robots.txt")).text();
  assert.match(robots, /User-Agent: \*/i);
  assert.match(robots, /Allow: \/\r?\n/);
  assert.match(robots, /Disallow: \/admin/);
  report.robots = "Shared rules permit public pages and retain private exclusions; no special bot overrides.";
  for (const agent of ["OAI-SearchBot/1.4", "ChatGPT-User/1.0", "Claude-SearchBot/1.0", "Claude-User/1.0", "Googlebot"]) {
    const response = await fetch(base + "/mayorista", { headers: { "User-Agent": agent } });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Envíos a toda Argentina/);
    report.crawlerRequests.push({ agent, status: response.status, note: "Simulated user agent; not evidence of an actual crawler visit." });
  }
  const directory = await fetch(base + "/llms.txt");
  assert.equal(directory.status, 200);
  assert.match(directory.headers.get("content-type"), /text\/plain/);
  const directoryText = await directory.text();
  assert.match(directoryText, /Basta con cumplir una de las dos condiciones/);
  assert.match(directoryText, /electrónica y tecnología/);
  report.directory = "200 text/plain with shared minimums, both contacts and all wholesale pages";
  const wholesaleShare = await fetch(base + "/compartir?" + new URLSearchParams({ tipo: "categoria", cat: "Venta mayorista en Argentina", desc: "Desde 5 productos o $100.000. Envíos a toda Argentina." }));
  assert.equal(wholesaleShare.status, 200);
  assert.match(wholesaleShare.headers.get("content-type"), /image\/png/);
  const shareBytes = new Uint8Array(await wholesaleShare.arrayBuffer());
  assert.deepEqual([...shareBytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  await writeFile(`${out}/wholesale-share.png`, shareBytes);
  report.shareImage = { status: 200, type: "image/png", bytes: shareBytes.length };

  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem("mya_analytics_consent", "denied"));
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    // These checks use full document loads; skip speculative Next Link prefetches.
    if (request.headers()["next-router-prefetch"] === "1") return route.abort();
    if (!["GET", "HEAD"].includes(request.method())) { report.blockedWrites.push(url.pathname); return route.abort(); }
    if (url.origin === base || request.resourceType() === "image" || url.protocol === "data:") return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", ...wholesale, ...retail]) {
      const response = await page.goto(base + route, { waitUntil: "load" });
      assert.equal(response.status(), 200, route);
      await response.finished();
      await page.evaluate(() => document.fonts.ready);
      await page.locator("main h1").waitFor({ timeout: 30_000 });
      assert.equal(await page.locator("main h1").count(), 1, route);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route} at ${width}`);
      if (wholesale.includes(route)) {
        const direct = page.locator('main header a[href^="https://wa.me/"]');
        assert.equal(await direct.count(), 2);
        if (route === "/mayorista" && width === 390) {
          for (let i = 0; i < 2; i++) {
            const box = await direct.nth(i).boundingBox();
            assert.ok(box && box.y + box.height < 900, "Both advisors are visible in the first mobile viewport");
          }
        }
        for (let i = 0; i < 2; i++) {
          const url = new URL(await direct.nth(i).getAttribute("href"));
          assert.equal(url.pathname, i === 0 ? "/5492494638919" : "/5492494251541");
          assert.match(url.searchParams.get("text"), /MAYORISTAS/);
          assert.match(url.searchParams.get("text"), /\$100\.000 en productos o 5 unidades en total/);
        }
      }
      if (["/mayorista", "/mayorista/medicube", "/mayorista/electronica", "/catalogo?brand=Medicube"].includes(route)) {
        await page.screenshot({ path: `${out}/${width}-${route.replace(/[^a-z0-9]/gi, "-")}.png`, fullPage: true });
        if (route === "/mayorista") await page.screenshot({ path: `${out}/${width}-hero.png`, fullPage: false });
      }
      report.views.push({ width, route });
    }
    console.log(`Responsive ${width}px: 14 pages passed`);
  }
  for (const route of ["/mayorista/medicube", "/mayorista/electronica", "/mayorista/perfumeria"]) {
    await (await page.goto(base + route)).finished();
    await page.getByLabel("Productos, marcas o modelos").fill("Selección de prueba, presentación exacta");
    await page.getByLabel("Cantidades aproximadas").fill("2 de un producto y 3 de otro");
    await page.getByLabel("Ciudad y código postal").fill("Rosario, CP 2000");
    await page.getByRole("button", { name: "Preparar consulta por WhatsApp" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    const links = dialog.locator('a[href^="https://wa.me/"]');
    assert.equal(await links.count(), 2);
    for (let i = 0; i < 2; i++) {
      const text = new URL(await links.nth(i).getAttribute("href")).searchParams.get("text");
      for (const fragment of ["MAYORISTA", "Selección de prueba", "2 de un producto y 3 de otro", "Rosario, CP 2000"]) assert.ok(text.includes(fragment));
    }
    await page.getByRole("button", { name: "Cerrar modal de contacto" }).click();
    const quote = page.getByRole("button", { name: "Consultar por mayor", exact: true }).first();
    assert.ok(await quote.count(), "Real catalog products must be rendered");
    await quote.click();
    await dialog.waitFor();
    const productMessage = new URL(await dialog.locator('a[href^="https://wa.me/"]').first().getAttribute("href")).searchParams.get("text");
    assert.match(productMessage, /https:\/\/myaimportaciones.com\/producto\//);
    assert.match(productMessage, /Cantidad de este producto a consultar: 1/);
    await page.getByRole("button", { name: "Cerrar modal de contacto" }).click();
    report.flows.push({ route, detailedQuote: true, productQuote: true, advisors: 2 });
  }
  await (await page.goto(base + "/mayorista")).finished();
  await page.addScriptTag({ content: await readFile("node_modules/axe-core/axe.min.js", "utf8") });
  const axe = await page.evaluate(() => window.axe.run(document.querySelector("main"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } }));
  report.accessibility = axe.violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length }));
  assert.deepEqual(report.accessibility, []);
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJs.newPage();
  await (await staticPage.goto(base + "/mayorista/medicube")).finished();
  await staticPage.getByRole("heading", { level: 1, name: "Medicube por mayor en Argentina para revendedores" }).waitFor();
  assert.equal(await staticPage.locator('main header a[href^="https://wa.me/"]').count(), 2);
  assert.ok(await staticPage.locator('main article a[href^="/producto/"]').count() > 0);
  report.withoutJavaScript = "Business terms, contacts and actual product links are readable";
  await noJs.close();
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.blockedWrites, []);
} finally {
  await writeFile(`${out}/verification.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ pages: report.pages.length, views: report.views.length, flows: report.flows.length, sitemap: report.sitemap, errors: report.errors }, null, 2));
