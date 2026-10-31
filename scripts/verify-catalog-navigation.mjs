import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import axe from 'axe-core';

// Read-only browser checks. Start the local app first; no orders, catalog or account writes.
const base = process.env.QA_BASE_URL || 'http://localhost:3100';
const output = 'docs/seo/qa-private/catalog-navigation-2026-10-31';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { routes: [], viewports: [], searches: [], errors: [] };
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => localStorage.setItem('mya_analytics_consent', 'denied'));
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
try {
  assert.equal((await page.goto(`${base}/catalogo`)).status(), 200);
  await page.getByRole('button', { name: 'Categorías', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Categorías', exact: true }).getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Escape');
  await page.mouse.move(0, 0);
  await page.getByRole('button', { name: 'Categorías', exact: true }).hover();
  const navigation = page.locator('#desktop-category-navigation');
  const links = new Set();
  const buttons = navigation.getByRole('button');
  for (let i = 0; i < await buttons.count(); i++) {
    await buttons.nth(i).hover();
    for (const href of await navigation.locator('a[href*="category="]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')))) links.add(href);
  }
  assert.ok(links.size > 10, 'The complete category menu must be exercised');
  const paths = [...links];
  // Four concurrent anonymous reads keep this useful on the real catalog without writes.
  for (let i = 0; i < paths.length; i += 4) {
    const checks = await Promise.all(paths.slice(i, i + 4).map(async path => {
      const response = await context.request.get(`${base}${path}`);
      assert.equal(response.status(), 200, path);
      const html = await response.text();
      assert.ok(!html.includes('No pudimos cargar el catálogo'), path);
      return { path, status: response.status() };
    }));
    report.routes.push(...checks);
  }
  for (const path of ['/catalogo?category=zzzzsynthetic', '/catalogo?category=electronica&page=200']) {
    const response = await context.request.get(`${base}${path}`);
    // Development can stream the existing notFound boundary after the HTTP headers.
    assert.ok(response.status() === 404 || (await response.text()).includes('NEXT_HTTP_ERROR_FALLBACK;404'), path);
  }
  const alias = await context.request.get(`${base}/catalogo?category=smartphones-tecnologia`, { maxRedirects: 0 });
  assert.ok(alias.status() === 308 || (await alias.text()).includes('NEXT_REDIRECT'));

  await page.goto(`${base}/catalogo?category=maquinas-industriales-construccion`);
  await page.getByRole('heading', { name: 'Todavía no hay productos activos en esta subcategoría' }).waitFor();
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    await page.goto(`${base}/catalogo?category=maquinas-industriales-construccion`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}`);
    if (width < 1280) {
      await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
      const menu = page.locator('#mobile-site-menu');
      await menu.locator('summary').filter({ hasText: 'Herramientas y equipamiento' }).click();
      const target = menu.getByRole('link', { name: 'Máquinas para construcción', exact: true });
      await target.scrollIntoViewIfNeeded();
      assert.ok((await target.boundingBox()).height >= 44, 'subcategory touch target');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `menu overflow ${width}`);
      await page.screenshot({ path: `${output}/menu-${width}.png` });
      await target.click();
      await page.getByRole('heading', { name: 'Máquinas para construcción', exact: true }).waitFor();
      assert.equal(await page.locator('#mobile-site-menu').count(), 0);
    } else {
      await page.getByRole('button', { name: 'Categorías', exact: true }).hover();
      await navigation.getByRole('button', { name: 'Herramientas y equipamiento', exact: true }).focus();
      await navigation.getByRole('link', { name: 'Máquinas para construcción', exact: true }).waitFor();
      const box = await navigation.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width, `desktop menu bounds ${width}`);
      await page.screenshot({ path: `${output}/menu-${width}.png` });
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('button', { name: 'Categorías', exact: true }).getAttribute('aria-expanded'), 'false');
    }
    report.viewports.push({ width, overflow: false, navigation: 'passed' });
  }
  for (const query of ['kerastase shampoo', 'pintura total', 'tt 5006 2', 'centella skin1004']) {
    const response = await context.request.get(`${base}/api/search?q=${encodeURIComponent(query)}`);
    assert.equal(response.status(), 200);
    const { results } = await response.json();
    assert.ok(results.length > 0, query);
    assert.ok(results.every(product => !product.sourceUrl && product.supplierLivePrice === undefined));
    await page.goto(`${base}/catalogo?q=${encodeURIComponent(query)}`);
    assert.equal(await page.locator('main article h3').first().textContent(), results[0].title);
    report.searches.push({ query, matches: results.length, catalogConsistent: true });
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/catalogo`);
    if (width < 768) await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    const form = page.getByRole('search', { name: width < 768 ? 'Búsqueda de productos móvil' : 'Búsqueda de productos', exact: true });
    const input = form.getByRole('searchbox', { name: 'Buscar productos' });
    await input.fill('kerastase shampoo');
    const search = form.locator('..');
    await search.getByText('Productos sugeridos', { exact: true }).waitFor();
    await page.screenshot({ path: `${output}/search-${width}.png` });
    await page.addScriptTag({ content: axe.source });
    const accessibility = await page.evaluate(async () => (await window.axe.run(document.querySelector('header'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact })));
    assert.deepEqual(accessibility, [], `header accessibility ${width}`);
    await input.fill('zzzzsynthetic');
    await search.getByText('No encontramos coincidencias.', { exact: true }).waitFor();
    assert.equal(await search.locator('a[href^="/producto/"]').count(), 0);
    await page.route('**/api/search?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"results":[]}' }));
    await input.fill('errorcontrolado');
    await search.getByText('No pudimos cargar la búsqueda.', { exact: true }).waitFor();
    await page.unroute('**/api/search?*');
    await input.fill('kerastase shampoo');
    await search.getByText('Productos sugeridos', { exact: true }).waitFor();
    await form.getByRole('button', { name: 'Ver resultados de búsqueda' }).click();
    await page.waitForURL(/q=kerastase/);
    assert.ok((await page.locator('main article h3').count()) > 0);
    report.searches.push({ width, submit: 'passed', empty: 'passed', networkError: 'passed', accessibility: 'passed' });
  }
  assert.deepEqual(report.errors, []);
  await writeFile(`${output}/verification.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ routes: report.routes.length, viewports: report.viewports.length, searches: report.searches.length, errors: report.errors.length, output }));
} finally {
  await browser.close();
}
