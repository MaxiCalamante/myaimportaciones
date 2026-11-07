import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, type Browser } from '@playwright/test';
import { collectPublicCatalog } from './lib/supplier-browser.mjs';

test('lector local: programa del navegador ejecutable bajo tsx y tarjeta moderna con ID de URL, moneda explícita y stock desconocido', async () => {
  const real = await chromium.launch({ channel: 'chrome', headless: true });
  let requests = 0;
  const html = '<html><title>Catálogo sintético</title><body><article class="av-product-card" data-av-ref="999" data-av-name="Producto QA 50ml" data-av-brand="QA"><h3><a href="/produto/123">Producto QA 50ml</a></h3><span class="av-price">10.00</span><button>Comprar</button></article><a rel="next" href="/categoria/qa?p=2">Siguiente</a></body></html>';
  const browser = { async newContext(options: Parameters<Browser['newContext']>[0]) {
    const context = await real.newContext(options);
    const newPage = context.newPage.bind(context);
    context.newPage = async () => {
      const page = await newPage();
      // Page routes take precedence: this isolated fixture never contacts a supplier.
      await page.route('**/*', route => { requests++; return route.fulfill({ contentType: 'text/html', body: html }); });
      return page;
    };
    return context;
  } } as unknown as Browser;
  try {
    const result = await collectPublicCatalog(browser, { official_key: 'atacado-usa', website: 'https://atacadousa.com.py/' });
    assert.equal(requests, 1); assert.equal(result.records.length, 1);
    assert.equal(result.records[0].id, '123'); assert.equal(result.records[0].currency, null);
    assert.equal(result.records[0].availability, 'unknown'); assert.equal(result.records[0].basis, 'listing_only');
    assert.equal(result.nextUrl, 'https://atacadousa.com.py/categoria/qa?p=2');
  } finally { await real.close(); }
});
