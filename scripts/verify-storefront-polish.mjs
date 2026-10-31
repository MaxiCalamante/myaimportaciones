import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import axe from 'axe-core';

const base = process.env.QA_BASE_URL || 'http://localhost:3100';
const stage = process.env.QA_STAGE || 'local';
const output = `docs/seo/qa-private/premium-2026-10-31/${stage}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addInitScript(() => localStorage.setItem('mya_analytics_consent', 'denied'));
// This verifier only navigates and changes guest browser state. No backend writes.
const blockedWrites = [];
await context.route('**/*', route => {
  if (!['GET', 'HEAD'].includes(route.request().method())) {
    blockedWrites.push(new URL(route.request().url()).pathname);
    return route.abort();
  }
  return route.continue();
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const report = { stage, base, views: [], interactions: [], accessibility: [], blockedWrites, errors };
const checkWidth = async label => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow: ${label}`);
const goto = async path => {
  const response = await page.goto(`${base}${path}`);
  assert.equal(response.status(), 200, path);
  assert.ok(!(await response.text()).includes('maximocalamante14@gmail.com'), `personal email: ${path}`);
  assert.equal(await page.locator('a[href^="mailto:"]').count(), 0, path);
};
async function accessibility(label) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => (await window.axe.run({
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  })).violations.map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) })));
  report.accessibility.push({ label, violations });
}

try {
  const toolResponse = await context.request.get(`${base}/api/search?q=pintura%20total`);
  const tools = (await toolResponse.json()).results;
  const tool = tools.find(product => !product.hasVariants && product.supplierAvailable);
  assert.ok(tool, 'A real available nonvariant product is required for guest cart checks');
  const electronics = (await (await context.request.get(`${base}/api/search?q=iphone`)).json()).results[0];
  assert.ok(electronics);
  const perfumePath = '/producto/lattafa-khamrah-eau-de-parfum-100-ml';
  const routes = [
    ['home', '/'], ['catalog', '/catalogo'], ['perfumes', '/catalogo?category=perfumes-arabes'],
    ['perfume', perfumePath], ['electronics', `/producto/${electronics.slug}`], ['tool', `/producto/${tool.slug}`],
    ['wholesale', '/mayorista'], ['medicube', '/mayorista/medicube'],
    ['favorites', '/favoritos'], ['checkout', '/checkout'],
  ];
  for (const width of (process.env.QA_WIDTHS?.split(',').map(Number) || [320, 390, 768, 1280, 1440])) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [name, path] of routes) {
      await goto(path);
      await checkWidth(`${name}-${width}`);
      if (name === 'home') {
        await page.getByRole('button', { name: 'Pausar carrusel', exact: true }).click();
        const hero = page.getByRole('region', { name: 'Carrusel de inicio', exact: true });
        const before = await hero.getByRole('heading', { level: 2 }).textContent();
        await hero.getByRole('button', { name: 'Siguiente slide', exact: true }).click();
        assert.notEqual(await hero.getByRole('heading', { level: 2 }).textContent(), before);
        await hero.getByLabel('Elegir diapositiva').selectOption('0');
        assert.equal(await hero.getByRole('heading', { level: 2 }).textContent(), before);
        assert.equal(await page.locator('#categorias article').count(), 5);
        const firstCategory = page.locator('#categorias article').first();
        await firstCategory.locator('summary').click();
        assert.ok(await firstCategory.locator('details[open] a').count() > 0);
        await firstCategory.locator('summary').click();
        report.interactions.push({ width, carousel: true, categoryDisclosure: true });
      }
      await page.screenshot({ path: `${output}/${name}-${width}.png` });
      if (name === 'home' || name === 'perfumes') {
        const section = page.locator(name === 'home' ? '#catalogo' : 'main [data-product-card]').first();
        await section.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${output}/${name}-cards-${width}.png` });
      }
      if ([390, 1440].includes(width) && ['home', 'perfumes', 'perfume'].includes(name)) await accessibility(`${name}-${width}`);
      report.views.push({ name, width, status: 200, overflow: false });
    }
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await goto('/catalogo?q=pintura%20total');
    const card = page.locator('[data-product-card]').filter({ has: page.locator(`a[href="/producto/${tool.slug}"]`) });
    await card.getByRole('button', { name: 'Agregar a favoritos', exact: true }).click();
    assert.equal(await card.getByRole('button', { name: 'Quitar de favoritos', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.reload();
    await card.getByRole('button', { name: 'Quitar de favoritos', exact: true }).waitFor();
    await card.getByRole('button', { name: 'Quitar de favoritos', exact: true }).click();
    await page.getByRole('combobox', { name: 'Ordenar productos', exact: true }).selectOption('price_asc');
    if (width >= 640) await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
    await page.waitForURL(url => url.searchParams.get('sort') === 'price_asc');
    await card.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
    await page.getByRole('button', { name: 'Cerrar carrito', exact: true }).click();
    await card.getByRole('button', { name: 'Sumar unidad', exact: true }).click();
    await card.getByText('2', { exact: true }).waitFor();
    await card.getByRole('button', { name: 'Restar unidad', exact: true }).click();
    await page.getByRole('button', { name: 'Abrir carrito', exact: true }).click();
    const cart = page.getByRole('dialog', { name: 'Carrito', exact: true });
    await cart.getByText(tool.title, { exact: true }).waitFor();
    await cart.getByRole('button', { name: `Quitar ${tool.title} del carrito`, exact: true }).click();
    await cart.getByRole('button', { name: 'Cerrar carrito', exact: true }).click();
    await goto('/catalogo?category=perfumes-arabes');
    const versionLink = page.locator('[data-variant-preview] a').first();
    const versionHref = await versionLink.getAttribute('href');
    await versionLink.click();
    await page.waitForURL(url => url.searchParams.get('variant') === new URL(versionHref, base).searchParams.get('variant'));
    await page.locator('[data-product-purchase] button[aria-pressed="true"]').first().waitFor();
    await page.getByRole('button', { name: /^Ampliar foto de/ }).click();
    await page.getByRole('dialog', { name: /^Foto ampliada de/ }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(), 0);
    const photos = page.getByRole('button', { name: /^Ver foto / });
    if (await photos.count() > 1) {
      await photos.nth(1).click();
      assert.equal(await photos.nth(1).getAttribute('aria-pressed'), 'true');
    }
    await page.getByRole('button', { name: 'Consultar por WhatsApp', exact: true }).click();
    const contact = page.getByRole('dialog', { name: 'Hablemos de tu compra', exact: true });
    await contact.waitFor();
    assert.equal(await contact.locator('a[href*="wa.me"]').count(), 2);
    await contact.getByRole('button', { name: 'Cerrar modal de contacto', exact: true }).click();
    report.interactions.push({ width, favoritePersistence: true, sortFilter: true, addIncrementRemove: true, variantDeepLink: true, gallery: true, whatsapp: true });
  }
  for (const path of ['/seguimiento', '/condiciones', '/privacidad', '/arrepentimiento', '/mayorista/presupuesto', '/login']) {
    await goto(path);
    await checkWidth(path);
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/verification.json`, JSON.stringify(report, null, 2));
  assert.deepEqual(report.accessibility.filter(item => item.violations.length), [], 'Accessibility findings');
  console.log(JSON.stringify({ stage, views: report.views.length, interactions: report.interactions.length, accessibility: report.accessibility.length, jsErrors: errors.length, blockedWrites: blockedWrites.length, output }));
} finally {
  await browser.close();
}
