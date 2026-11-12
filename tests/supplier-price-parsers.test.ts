import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePublicAmount, publicProductFromJsonLd } from '../src/lib/supplier-public-data';
import { originalPrice } from '../src/lib/supplier-tracker/adapters/shared';
import { atacadoConnectAdapter } from '../src/lib/supplier-tracker/adapters/atacado-connect';

test('published amounts preserve a single thousands dot and decimal cents', () => {
  assert.equal(parsePublicAmount('USD 1.234'), 1234);
  assert.equal(parsePublicAmount('Gs 150.000'), 150000);
  assert.equal(parsePublicAmount('USD 12.50'), 12.5);
  assert.equal(parsePublicAmount('USD 0.500'), 0.5);
  assert.equal(parsePublicAmount('USD 1.234,50'), 1234.5);
  assert.equal(parsePublicAmount('USD 1,234.50'), 1234.5);
});

test('JSON numeric prices retain their precision instead of applying display separators', () => {
  const url = 'https://atacadoconnect.com/produto/exacto/123';
  const html = '<script type="application/ld+json">' + JSON.stringify({
    '@type': 'Product', url, name: 'Producto exacto', sku: '123',
    offers: { price: 1.234, priceCurrency: 'USD' },
  }) + '</script>';
  assert.equal(publicProductFromJsonLd(html, url, '123')?.origin_cost, 1.234);
});

test('JSON-LD canonical decimal strings retain their precision independently of displayed thousands', () => {
  const url = 'https://atacadoconnect.com/produto/exacto/123';
  const html = '<script type="application/ld+json">' + JSON.stringify({
    '@type': 'Product', url, name: 'Producto exacto', sku: '123', offers: { price: '1.234', priceCurrency: 'USD' },
  }) + '</script>';
  assert.equal(publicProductFromJsonLd(html, url, '123')?.origin_cost, 1.234);
  assert.equal(parsePublicAmount('USD 1.234'), 1234);
});

test('an unavailable USD quote never borrows digits from an informational ARS quote', () => {
  assert.deepEqual(originalPrice('USD consultar ARS 50.000'), { cost: null, currency: 'USD' });
  assert.deepEqual(originalPrice('ARS 50.000 USD consultar'), { cost: null, currency: 'USD' });
  assert.deepEqual(originalPrice('USD consultar Gs 50.000'), { cost: null, currency: 'USD' });
  assert.deepEqual(originalPrice('ARS consultar Gs 50.000'), { cost: null, currency: 'ARS' });
  assert.deepEqual(originalPrice('ARS 50.000 USD 32,50'), { cost: 32.5, currency: 'USD' });
  assert.deepEqual(originalPrice('$ 32,50', 'USD'), { cost: 32.5, currency: 'USD' });
  assert.deepEqual(originalPrice('32,50 USD'), { cost: 32.5, currency: 'USD' });
});

test('Connect detail rejects a sole related product with a different explicit source URL', () => {
  const url = 'https://atacadoconnect.com/produto/exacto/123';
  const html = '<script type="application/ld+json">' + JSON.stringify({
    '@type': 'Product', url: 'https://atacadoconnect.com/produto/relacionado/999',
    name: 'Producto relacionado', sku: '999',
    offers: { price: 1, priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
  }) + '</script>';
  assert.equal(publicProductFromJsonLd(html, url, '123'), null);
  assert.equal(atacadoConnectAdapter.detail(html, url), null);
});
