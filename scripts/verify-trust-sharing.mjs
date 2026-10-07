import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve("playwright", { paths: [process.argv[3]] }));
const base = process.argv[2] || "http://localhost:3110";
const dir = "docs/trust-sharing-2026-10-07";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const results = [];
try {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  await page.addInitScript(() => localStorage.setItem("mya_analytics_consent", "denied"));
  await page.goto(`${base}/catalogo`, { waitUntil: "networkidle" });
  const paths = await page.locator('article a[href^="/producto/"]').evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute("href")))].slice(0, 2));
  assert.equal(paths.length, 2);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", ...paths]) {
      const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width} ${path}`);
      const logo = page.locator('header a[aria-label="MyA importaciones"]');
      assert.equal(await logo.innerText(), "");
      assert.equal(await logo.locator("div").evaluate(node => getComputedStyle(node).boxShadow), "none");
      if (path === "/") await page.locator("header").screenshot({ path: `${dir}/${width}-navbar.png` });
      const block = page.locator("[data-trust-badges]");
      await block.scrollIntoViewIfNeeded();
      assert.equal(await block.locator("h3").count(), 4);
      const clipped = await block.locator("h3, p, a").evaluateAll(nodes => nodes.some(node => node.scrollWidth > node.clientWidth + 1));
      assert.equal(clipped, false, `Clipped text ${width} ${path}`);
      const link = block.getByRole("link");
      assert.ok((await link.boundingBox()).height >= 44);
      await block.screenshot({ path: `${dir}/${width}-${path === "/" ? "home" : `product-${paths.indexOf(path)}`}.png` });
      if (width === 390 && path === "/") {
        await link.click();
        await page.waitForURL("**/condiciones");
      }
      results.push({ width, path, overflow: false, clipped: false });
    }
  }
  for (const bot of ["WhatsApp/2.24.1", "facebookexternalhit/1.1"]) {
    const context = await browser.newContext({ userAgent: bot });
    const botPage = await context.newPage();
    botPage.setDefaultNavigationTimeout(60000);
    for (const path of ["/", ...paths]) {
      const response = await botPage.goto(`${base}${path}`, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200);
      const meta = async name => botPage.locator(`meta[property="${name}"], meta[name="${name}"]`).getAttribute("content");
      const title = await meta("og:title");
      const image = await meta("og:image");
      assert.ok(title.includes("MYA Importaciones"));
      assert.ok(image && !image.includes("undefined"));
      if (path !== "/") {
        const product = await botPage.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent)).find(item => item["@type"] === "Product"));
        assert.ok(title.includes(product.name));
        assert.ok(title.includes("ARS"));
        assert.equal(await meta("product:price:amount"), String(product.offers.price));
        assert.equal(image, product.image[0]);
        assert.ok((await meta("og:description")).includes("ARS"));
        assert.equal(await meta("twitter:image"), image);
      } else {
        assert.ok(!title.includes("Coreana"));
        assert.ok(image.endsWith("/compartir"));
      }
      const imageResponse = await context.request.get(image.replace("https://myaimportaciones.vercel.app", base));
      assert.equal(imageResponse.status(), 200, image);
      assert.ok(imageResponse.headers()["content-type"].startsWith("image/"));
      if (path === "/") await writeFile(`${dir}/brand-share.png`, await imageResponse.body());
      results.push({ bot, path, title, image });
    }
    await context.close();
  }
  await writeFile(`${dir}/verification.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ responsiveChecks: 12, botMetadataChecks: 6, images: "HTTP 200", conditionsLink: "passed" }));
} finally {
  await browser.close();
}
