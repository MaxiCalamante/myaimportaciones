import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSupplierProduct, registeredProductIdentityMatches } from '../src/lib/supplier-offer-adapters';
import { totalAdapter } from '../src/lib/supplier-tracker/adapters/total';
import type { IntelligenceSupplier, SupplierOffer } from '../src/lib/supplier-intelligence';

const url = 'https://www.totalherramientasoficial.com.py/produto/wadfow-caixa-de-ferramentas-com-5-gavetas-wcs2a05-46183.html';
const supplier = { official_key: 'total' } as IntelligenceSupplier;
const prior = { external_id: '46183', variant_key: 'attribute:0' } as SupplierOffer;
function page(canonical: string | null = url, primaryUrl = url) {
  return (canonical ? `<link rel="canonical" href="${canonical}">` : '') +
    '<script type="application/ld+json">' + JSON.stringify({
      '@type': 'Product', productID: '489478', url: primaryUrl,
      name: 'WADFOW CAIXA DE FERRAMENTAS COM 5 GAVETAS WCS2A05', brand: 'WADFOW',
      offers: { price: 239, priceCurrency: 'USD', availability: 'in stock' },
    }) + '</script><div class="product-details"><h1>WADFOW CAIXA DE FERRAMENTAS COM 5 GAVETAS WCS2A05</h1>' +
    '<span class="product-sku sku-visible">489478</span><div class="product-price">USD 239,00 PREÇO SEM I.V.A.</div></div>';
}

test('Total uses the canonical URL source ID and keeps its different supplier SKU separate', () => {
  const html = page(), found = inspectSupplierProduct(html, url, supplier, '46183');
  assert.equal(found?.external_id, '46183');
  assert.equal(found?.origin_cost, 239);
  assert.equal(found?.currency, 'USD');
  assert.notEqual(found?.model, '489478');
  assert.equal(registeredProductIdentityMatches(html, url, supplier, prior, found!), true);
  const tracked = totalAdapter.detail(html, url);
  assert.equal(tracked?.externalId, '46183');
  assert.equal(tracked?.sku, '489478');
  assert.equal(tracked?.model, 'WCS2A05');
});

test('Total cannot reinterpret metadata IDs when canonical or primary source evidence differs', () => {
  for (const html of [page(null), page(url + '?variant=2'), page(url, url.replace('46183', '99999'))]) {
    const found = inspectSupplierProduct(html, url, supplier, '46183');
    assert.equal(found ? registeredProductIdentityMatches(html, url, supplier, prior, found) : false, false);
  }
});
