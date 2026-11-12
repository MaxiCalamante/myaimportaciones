import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { processSupplierJob, type TrackingConfig } from '../src/lib/supplier-automation';
import type { IntelligenceSupplier } from '../src/lib/supplier-intelligence';

const config = { autoStock: false } as TrackingConfig;

for (const key of ['atacado-connect', 'total'] as const) {
  test(`${key} preserves a registered default identity only with exact primary source evidence`, async t => {
    const url = key === 'total'
      ? 'https://www.totalherramientasoficial.com.py/produto/exacto-123.html'
      : 'https://atacadoconnect.com/produto/exacto/123';
    const supplier: IntelligenceSupplier = { id: 'supplier', official_key: key, website: new URL(url).origin,
      name: key, query_mode: 'product_page', automation_authorized: true, freshness_hours: 24,
      is_active: true, capabilities: {} };
    const scenarios = [
      { name: 'legacy default', variant: 'attribute:0', productId: '123', source: url, variants: undefined, want: true },
      { name: 'real attribute', variant: 'attribute:1', productId: '123', source: url, variants: undefined, want: false },
      { name: 'different product', variant: 'attribute:0', productId: '999', source: url, variants: undefined, want: false },
      { name: 'different primary URL', variant: 'attribute:0', productId: '123', source: url + '?variant=2', variants: undefined, want: false },
      { name: 'published variants', variant: 'attribute:0', productId: '123', source: url, variants: [{ sku: '123-red' }], want: false },
    ];
    for (const scenario of scenarios) {
      const prior = { id: 'existing-offer', external_id: '123', variant_key: scenario.variant,
        source_url: url, title: 'Producto exacto', brand: '', model: '', gtin: null, verification: 'verified' };
      const records: Record<string, unknown>[] = [];
      const db = {
        from(table: string) {
          const q = { select() { return q; }, eq() { return q; }, update() { return q; }, upsert() { return q; },
            async single() { return { data: table === 'supplier_offers' ? prior : null, error: null }; },
            then(resolve: (r: unknown) => unknown) { return Promise.resolve({ data: null, error: null }).then(resolve); } };
          return q;
        },
        async rpc(name: string, args: { p?: Record<string, unknown> }) {
          if (name === 'record_supplier_observation_v1') records.push(args.p!);
          return { data: 'existing-offer', error: null };
        },
      } as unknown as SupabaseClient;
      const html = '<script type="application/ld+json">' + JSON.stringify({
        '@type': 'Product', url: scenario.source, productID: scenario.productId,
        name: 'Producto exacto', hasVariant: scenario.variants,
        offers: { price: 20, priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
      }) + '</script><h1>Producto exacto</h1><div class="product-price">USD 20.00</div>';
      const mock = t.mock.method(globalThis, 'fetch', async () => new Response(html));
      try {
        const result = await processSupplierJob(db, { id: 'job', supplier_id: 'supplier', offer_id: 'existing-offer',
          product_id: null, variant_id: null, source_url: url, attempts: 0 }, supplier, config);
        assert.equal(result.ok, scenario.want, `${scenario.name}: ${JSON.stringify(result)}`);
        assert.equal(records.length, 1, scenario.name);
        assert.equal(records[0].method, scenario.want ? 'product_page' : 'error', scenario.name);
        assert.equal(records[0].variant_key, scenario.variant, scenario.name);
      } finally { mock.mock.restore(); }
    }
  });
}

test('USA hosted monitor uses only the exact reviewed native URL when the summary lacks evidence', async t => {
  const url = 'https://atacadousa.com.py/produto/9051';
  const native = 'https://atacadousa.com.py/perfumes/9051-perfume.html?av_native=1';
  const supplier: IntelligenceSupplier = { id: 'supplier', official_key: 'atacado-usa', website: 'https://atacadousa.com.py',
    name: 'Atacado USA', query_mode: 'product_page', automation_authorized: true, freshness_hours: 24, is_active: true, capabilities: {} };
  for (const scenario of [
    { name: 'reviewed native', observed: native, id: 9051, attribute: 0, currency: 'USD', title: 'Perfume 100 ml', want: true },
    { name: 'wrong domain', observed: native.replace('atacadousa.com.py', 'evil.test'), id: 9051, attribute: 0, currency: 'USD', title: 'Perfume 100 ml', want: false },
    { name: 'wrong URL ID', observed: native.replace('9051', '9052'), id: 9051, attribute: 0, currency: 'USD', title: 'Perfume 100 ml', want: false },
    { name: 'no reviewed URL', observed: undefined, id: 9051, attribute: 0, currency: 'USD', title: 'Perfume 100 ml', want: false },
    { name: 'unknown currency', observed: native, id: 9051, attribute: 0, currency: undefined, title: 'Perfume 100 ml', want: false },
    { name: 'changed product', observed: native, id: 9052, attribute: 0, currency: 'USD', title: 'Perfume 100 ml', want: false },
    { name: 'changed attribute', observed: native, id: 9051, attribute: 1, currency: 'USD', title: 'Perfume 100 ml', want: false },
    { name: 'changed title', observed: native, id: 9051, attribute: 0, currency: 'USD', title: 'Perfume 50 ml', want: false },
  ]) {
    const prior = { id: 'existing-offer', external_id: '9051', variant_key: 'attribute:0', source_url: url,
      title: 'Perfume 100 ml', brand: '', model: '', gtin: null, verification: 'verified',
      evidence: { observedUrl: scenario.observed, sourceTitle: 'Perfume 100 ml' } };
    const records: Record<string, unknown>[] = [], requests: string[] = [], reservations: string[] = [];
    const db = {
      from(table: string) {
        const q = { select() { return q; }, eq() { return q; }, update() { return q; }, upsert() { return q; },
          async single() { return { data: table === 'supplier_offers' ? prior : null, error: null }; },
          then(resolve: (r: unknown) => unknown) { return Promise.resolve({ data: null, error: null }).then(resolve); } };
        return q;
      },
      async rpc(name: string, args: { p?: Record<string, unknown> }) {
        if (name === 'record_supplier_observation_v1') records.push(args.p!);
        if (name === 'reserve_supplier_source_slot_v1') reservations.push(name);
        return { data: name === 'reserve_supplier_source_slot_v1' ? 0 : 'existing-offer', error: null };
      },
    } as unknown as SupabaseClient;
    const summary = '<section class="av-product-detail"><h1>Perfume 100 ml</h1><div class="av-detail-price">$36,00</div><button>Orçamento</button></section>';
    const detail = '<div id="product-details" data-product=\'' + JSON.stringify({ id_product: scenario.id, id_product_attribute: scenario.attribute,
      name: scenario.title, quantity: 2, price_amount: 36, price_currency_code: scenario.currency }) + '\'></div>';
    const mock = t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
      const target = String(input); requests.push(target);
      return new Response(target.endsWith('/robots.txt') ? 'User-agent: *\nDisallow:' : target === url ? summary : detail);
    });
    try {
      const result = await processSupplierJob(db, { id: 'job', supplier_id: 'supplier', offer_id: 'existing-offer',
        product_id: null, variant_id: null, source_url: url, attempts: 0 }, supplier, config);
      assert.equal(result.ok, scenario.want, `${scenario.name}: ${JSON.stringify(result)}`);
      assert.equal(records[0].method, scenario.want ? 'product_page' : 'error', scenario.name);
      const allowedNative = scenario.observed === native;
      assert.equal(requests.filter(target => target !== url && !target.endsWith('/robots.txt')).length, allowedNative ? 1 : 0, scenario.name);
      assert.equal(reservations.length, allowedNative ? 1 : 0, scenario.name);
      if (scenario.want) {
        assert.equal(records[0].source_url, url);
        assert.equal(records[0].variant_key, 'attribute:0');
        assert.equal(records[0].origin_cost, 36);
        assert.equal((records[0].evidence as Record<string, unknown>).observedUrl, native);
      }
    } finally { mock.mock.restore(); }
  }
});
