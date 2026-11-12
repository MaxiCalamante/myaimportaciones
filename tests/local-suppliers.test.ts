import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { localOptions, localIdentity, reviewedIds, sameLocalRequest, publicLocalError } from '../scripts/local-suppliers/core';
import { LocalSupplierRunner } from '../scripts/local-suppliers/runner';
import { createLocalSupplierServer } from '../scripts/local-suppliers/server.mjs';
import type { IntelligenceSupplier } from '../src/lib/supplier-intelligence';
import type { MatchTarget } from '../src/lib/supplier-matching';
import type { Browser } from '@playwright/test';

const sid = '11111111-1111-4111-8111-111111111111', pid = '22222222-2222-4222-8222-222222222222', oid = '33333333-3333-4333-8333-333333333333';
const supplier: IntelligenceSupplier = { id: sid, name: 'Star QA', official_key: 'star-company', website: 'https://www.starcompany-py.com/', query_mode: 'product_page', automation_authorized: true, is_active: true, freshness_hours: 24, capabilities: {} };
const target: MatchTarget = { productId: pid, variantId: null, title: 'Anua Serum 50 ml', brand: 'Anua', model: '', sku: '', specifications: {}, sourceUrl: 'https://www.starcompany-py.com/123-anua.html' };
const found = { external_id: '123', variant_key: 'attribute:0', title: target.title, brand: 'Anua', model: '', source_url: target.sourceUrl!, origin_cost: 10, currency: 'USD' as const, availability: 'in_stock' as const, gtin: null };
const options = localOptions({ mode: 'stock', suppliers: ['star-company'], query: '', limit: 5, pages: 1, visible: false });

test('local: origen, credenciales y selección revisada', () => {
  assert.equal(sameLocalRequest({ host: '127.0.0.1:4317' }, 'http://127.0.0.1:4317'), true);
  for (const headers of [{ host: 'evil.test:4317' }, { host: '127.0.0.1:4317', origin: 'https://evil.test' }, { host: '127.0.0.1:4317', 'sec-fetch-site': 'cross-site' }]) assert.equal(sameLocalRequest(headers, 'http://127.0.0.1:4317'), false);
  assert.throws(() => reviewedIds([]));
  assert.throws(() => reviewedIds(Array.from({ length: 21 }, (_, i) => String(i))));
  assert.throws(() => reviewedIds(['a', 'a']));
  assert.equal(reviewedIds(['a']).length, 1);
  assert.throws(() => localOptions({ ...options, limit: 0 }));
  assert.throws(() => localOptions({ ...options, suppliers: ['https://evil.test'] }));
  assert.throws(() => localOptions({ ...options, pages: 101 }));
  assert(!publicLocalError(Error('sb_secret_do_not_show')).includes('do_not_show'));
});

test('local: identidad actual contra MYA, no sólo contra el título previo del proveedor', () => {
  assert.equal(localIdentity(found, target, supplier).ok, true);
  assert.equal(localIdentity({ ...found, title: 'Azzaro Chrome Legend EDT 125ml', brand: 'Azzaro' }, target, supplier).ok, false);
  assert.equal(localIdentity({ ...found, title: 'Anua Serum 100 ml' }, target, supplier).ok, false);
  assert.equal(localIdentity({ ...found, title: 'Tester Anua Serum 50 ml' }, target, supplier).ok, false);
  assert.equal(localIdentity(found, undefined, supplier).ok, false);
  assert.throws(() => localIdentity(found, target, { ...supplier, automation_authorized: false }));
  assert.throws(() => localIdentity({ ...found, source_url: 'https://evil.test/' }, target, supplier));
  assert.throws(() => localIdentity(found, target, { ...supplier, official_key: 'madrid-center' }));
});

function fixture(badNeighbor = false) {
  const product = { id: pid, slug: 'anua-serum-50-ml', title: target.title, brand: 'Anua', model: '', sku: '', source_url: found.source_url, has_variants: false, specifications: {}, is_active: true, deleted_at: null, retail_price: 100000, wholesale_price: 80000, fulfillment_mode: 'supplier', supplier_available: true };
  const offer = { ...found, id: oid, supplier_id: sid, product_id: pid, variant_id: null, verification: 'verified', evidence: { sourceTitle: found.title }, last_success_at: null, last_error: null };
  const tables: Record<string, Array<Record<string, unknown>>> = { products: [product], product_variants: [], suppliers: [supplier as unknown as Record<string, unknown>], supplier_offers: [offer] };
  if (badNeighbor) tables.supplier_offers.push({ ...offer, id: '44444444-4444-4444-8444-444444444444', external_id: '999', title: 'Azzaro Chrome 125 ml', brand: 'Azzaro', evidence: { sourceTitle: 'Azzaro Chrome 125 ml' } });
  const calls: Array<{ name: string; input: Record<string, unknown> }> = [];
  const db = { from(name: string) {
    let start = 0, end = 999999; const filters: Array<[string, unknown]> = [];
    const execute = () => ({ data: (tables[name] ?? []).filter(x => filters.every(([k, v]) => x[k] === v)).slice(start, end + 1), error: null });
    const q = { select() { return q; }, order() { return q; }, eq(k: string, v: unknown) { filters.push([k, v]); return q; }, range(a: number, z: number) { start = a; end = z; return q; }, limit(n:number) { end = n - 1; return q; }, single() { return Promise.resolve({ data: execute().data[0] ?? null, error: null }); }, maybeSingle() { return q.single(); }, then(resolve: (x: ReturnType<typeof execute>) => unknown) { return Promise.resolve(execute()).then(resolve); } };
    return q;
  }, async rpc(name: string, input: Record<string, unknown>) { calls.push({ name, input }); return { data: name === 'reserve_supplier_source_slot_v1' ? 0 : name === 'refresh_supplier_availability_v1' ? true : oid, error: null }; } } as unknown as SupabaseClient;
  return { db, calls, tables };
}
async function finished(runner: LocalSupplierRunner) {
  // Initial robots cadence and a reviewed native read can each reserve ten seconds.
  const deadline = Date.now() + 45000;
  while (runner.busy() && Date.now() < deadline) await new Promise(r => setTimeout(r, 20));
  assert.equal(runner.busy(), false, JSON.stringify(runner.snapshot()));
}
test('local: revisión no escribe catálogo; guardado usa RPC, preserva inventario y bloquea agregados con enlaces ajenos', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async input => String(input).endsWith('robots.txt') ? new Response('User-agent: *\nDisallow:') : new Response('<div id="product-details" data-product=\'{"id_product":123,"id_product_attribute":0,"name":"Anua Serum 50 ml","manufacturer_name":"Anua","quantity":2,"price_amount":10,"price_currency_code":"USD"}\'></div>');
  const folder = await mkdtemp(join(tmpdir(), 'mya-local-'));
  try {
    for (const badNeighbor of [false, true]) {
      const f = fixture(badNeighbor), runner = new LocalSupplierRunner(f.db, folder);
      await runner.start({ ...options, limit: 1 }); await finished(runner);
      assert.equal(runner.state.phase, 'completed');
      const row = [...runner.rows.values()][0]; assert.equal(row.status, 'ready');
      assert.deepEqual(f.calls.map(c => c.name), ['reserve_supplier_source_slot_v1']);
      await runner.apply([row.id]);
      assert.equal(row.status, 'saved');
      const observation = f.calls.find(c => c.name === 'record_supplier_observation_v1')!.input.p as Record<string, unknown>;
      assert.equal(observation.product_id, pid); assert.equal(observation.verification, 'verified');
      assert.equal(observation.title, found.title);
      for (const key of ['stock', 'retail_price', 'wholesale_price', 'is_active']) assert.equal(key in observation, false);
      assert.equal(f.calls.some(c => c.name === 'refresh_supplier_availability_v1'), !badNeighbor);
      await assert.rejects(runner.apply([row.id]), /no se pueden guardar/);
      const report = JSON.parse(await readFile(join(folder, runner.state.runId + '.json'), 'utf8'));
      assert.equal(report.saved, 1); assert.equal(report.results[0].status, 'saved');
      assert.equal(f.tables.products[0].is_active, true);
      await runner.close();
    }
  } finally { globalThis.fetch = original; await rm(folder, { recursive: true, force: true }); }
});
test('local: un vínculo mal cargado se ve en revisión sin consultarlo ni guardar stock', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'mya-local-'));
  try {
    const f = fixture(); f.tables.supplier_offers[0].evidence = { sourceTitle: 'Azzaro Chrome EDT 125 ml' };
    const runner = new LocalSupplierRunner(f.db, folder);
    await runner.start(options); await finished(runner);
    const row = [...runner.rows.values()][0]; assert.equal(row.status, 'review'); assert.equal(f.calls.length, 0);
    await assert.rejects(runner.apply([row.id]));
    await runner.close();
  } finally { await rm(folder, { recursive: true, force: true }); }
});
test('local: servidor no expone claves y rechaza peticiones externas o sin token', async () => {
  const f = fixture(), folder = await mkdtemp(join(tmpdir(), 'mya-local-'));
  const runner = new LocalSupplierRunner(f.db, folder), port = 46000 + Math.floor(Math.random() * 10000);
  const { server, origin } = createLocalSupplierServer(runner, port);
  await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve));
  try {
    const page = await fetch(origin); assert.equal(page.status, 200); assert.match(page.headers.get('content-security-policy')!, /frame-ancestors 'none'/);
    const html = await page.text(); assert(!html.includes('SUPABASE_SERVICE_ROLE_KEY'));
    const token = html.match(/name="local-token" content="([^"]+)"/)![1];
    assert.equal((await fetch(origin + '/api/state')).status, 403);
    assert.equal((await fetch(origin + '/api/state', { headers: { 'x-local-token': token, Origin: 'https://evil.test' } })).status, 403);
    const state = await fetch(origin + '/api/state', { headers: { 'x-local-token': token } }); assert.equal(state.status, 200);
    const noApproval = await fetch(origin + '/api/apply', { method: 'POST', headers: { 'x-local-token': token }, body: JSON.stringify({ ids: ['a'] }) }); assert.equal(noApproval.status, 400);
    assert.equal(f.calls.length, 0);
    const script = await fetch(origin + '/panel.js'); assert.equal(script.status, 200);
  } finally { await runner.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await rm(folder, { recursive: true, force: true }); }
});

test('local: descubrimiento privado no publica ni infiere stock de una tarjeta', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('User-agent: *\nDisallow:');
  const folder = await mkdtemp(join(tmpdir(), 'mya-local-'));
  try {
    const f = fixture(); let closed = false;
    const runner = new LocalSupplierRunner(f.db, folder, {
      launch: async () => ({ close: async () => { closed = true; } }) as unknown as Browser,
      collect: async () => ({ records: [{ id: '999', title: 'Candidato QA 50 ml', url: 'https://www.starcompany-py.com/999-candidato.html', price: 'USD 10', currency: 'USD', availability: 'in_stock', basis: 'listed_orderable', scope: 'origin', brand: 'QA' }], title: 'Catálogo QA', url: supplier.website!, searched: true, nextUrl: null, limited: false }),
    });
    await runner.start({ ...options, mode: 'discover' }); await finished(runner);
    assert(closed); const row = [...runner.rows.values()][0];
    assert.equal(row.status, 'candidate'); assert.equal(row.availability, 'unknown');
    assert.deepEqual(f.calls.map(x => x.name), ['reserve_supplier_source_slot_v1']);
    await runner.apply([row.id]);
    const payload = f.calls.find(x => x.name === 'record_supplier_observation_v1')!.input.p as Record<string, unknown>;
    assert.equal(payload.product_id, null); assert.equal(payload.variant_id, null); assert.equal(payload.verification, 'pending'); assert.equal(payload.availability, 'unknown');
    assert.equal(f.calls.some(x => x.name === 'refresh_supplier_availability_v1'), false);
    await runner.close();
  } finally { globalThis.fetch = original; await rm(folder, { recursive: true, force: true }); }
});

test('local: pausa, cancelación y exclusión de recorridos concurrentes', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'mya-local-'));
  try {
    const f = fixture(), runner = new LocalSupplierRunner(f.db, folder);
    const starting = runner.start(options);
    await assert.rejects(runner.start(options), /en curso/);
    await starting; runner.pause();
    await new Promise(r => setTimeout(r, 30));
    assert.equal(runner.state.phase, 'paused'); assert.equal(f.calls.length, 0);
    await runner.stop(); await runner.close();
    assert.equal(runner.state.phase, 'cancelled'); assert.equal(f.calls.length, 0);
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test('local: sincronización durante el recorrido, lectura compartida y recuperación con nueva consulta de evidencia vencida', async () => {
  const original = globalThis.fetch;
  let reads = 0;
  globalThis.fetch = async input => {
    if (String(input).endsWith('robots.txt')) return new Response('User-agent: *\nDisallow:');
    reads++;
    return new Response('<div id="product-details" data-product=\'{"id_product":123,"id_product_attribute":0,"name":"Anua Serum 50 ml","manufacturer_name":"Anua","quantity":2,"price_amount":10,"price_currency_code":"USD"}\'></div>');
  };
  const folder=await mkdtemp(join(tmpdir(),'mya-local-sync-'));
  try {
    const f=fixture(), review=new LocalSupplierRunner(f.db,folder);
    await review.start(options); await finished(review);
    const path=join(folder,review.state.runId+'.json'), report=JSON.parse(await readFile(path,'utf8'));
    report.results[0].at='2000-01-01T00:00:00Z';
    await review.close(); await writeFile(path,JSON.stringify(report));
    const live=new LocalSupplierRunner(f.db,folder);
    await live.recoverLatest(true,false); await finished(live);
    const row=[...live.rows.values()][0];
    assert.equal(row.status,'saved'); assert.equal(live.state.saved,1); assert.equal(reads,2);
    assert.equal(live.snapshot().syncEnabled,true);
    const web=await live.webState(row.id);
    assert.equal(web.state,'active'); assert('retail_price' in web && web.retail_price===100000);
    assert('editUrl' in web && web.editUrl?.includes(pid));
    assert('publicUrl' in web && web.publicUrl?.endsWith('/producto/anua-serum-50-ml'));
    assert.deepEqual(f.calls.map(x=>x.name),['reserve_supplier_source_slot_v1','reserve_supplier_source_slot_v1','record_supplier_observation_v1','refresh_supplier_availability_v1']);
    await live.close();
  } finally { globalThis.fetch=original; await rm(folder,{recursive:true,force:true}); }
});

test('local: sincronización conserva el atributo base histórico de Connect y Total sólo con evidencia exacta', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'mya-local-default-'));
  try {
    for (const key of ['atacado-connect', 'total']) {
      const url = key === 'total' ? 'https://www.totalherramientasoficial.com.py/produto/anua-123.html'
        : 'https://atacadoconnect.com/produto/anua/123';
      for (const scenario of [
        { name: 'base histórica', variant: 'attribute:0', id: '123', source: url, variants: undefined, want: true },
        { name: 'atributo real', variant: 'attribute:1', id: '123', source: url, variants: undefined, want: false },
        { name: 'otro producto', variant: 'attribute:0', id: '999', source: url, variants: undefined, want: false },
        { name: 'otra URL primaria', variant: 'attribute:0', id: '123', source: url + '?variant=2', variants: undefined, want: false },
        { name: 'variantes publicadas', variant: 'attribute:0', id: '123', source: url, variants: [{ sku: '123-red' }], want: false },
      ]) {
        const f = fixture();
        f.tables.suppliers[0] = { ...f.tables.suppliers[0], official_key: key, website: new URL(url).origin };
        Object.assign(f.tables.supplier_offers[0], { source_url: url, variant_key: scenario.variant });
        f.tables.products[0].source_url = url;
        const html = '<script type="application/ld+json">' + JSON.stringify({
          '@type': 'Product', url: scenario.source, productID: scenario.id, name: target.title,
          brand: { name: 'Anua' }, hasVariant: scenario.variants,
          offers: { price: 20, priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
        }) + '</script><h1>Anua Serum 50 ml</h1><div class="product-price">USD 20.00</div>';
        const mock = t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => String(input).endsWith('robots.txt')
          ? new Response('User-agent: *\nDisallow:') : new Response(html));
        const runner = new LocalSupplierRunner(f.db, folder);
        try {
          await runner.start({ ...options, suppliers: [key], sync: true }); await finished(runner);
          const row = [...runner.rows.values()][0];
          assert.equal(row.status, scenario.want ? 'saved' : 'review', `${key}: ${scenario.name}: ${row.message}`);
          const records = f.calls.filter(call => call.name === 'record_supplier_observation_v1');
          assert.equal(records.length, scenario.want ? 1 : 0, scenario.name);
          if (scenario.want) {
            const payload = records[0].input.p as Record<string, unknown>;
            assert.equal(payload.variant_key, 'attribute:0');
            assert.equal(payload.product_id, pid);
            assert.equal(payload.verification, 'verified');
            assert.equal('stock' in payload, false);
          }
        } finally { await runner.close(); mock.mock.restore(); }
      }
    }
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test('local: USA sincroniza la ficha nativa revisada y conserva la URL e identidad registradas', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'mya-local-native-'));
  const url = 'https://atacadousa.com.py/produto/9051', native = 'https://atacadousa.com.py/cosmeticos/9051-anua.html?av_native=1';
  try {
    for (const scenario of [
      { observed: native, currency: 'USD', want: true },
      { observed: native.replace('9051', '9052'), currency: 'USD', want: false },
      { observed: native.replace('atacadousa.com.py', 'evil.test'), currency: 'USD', want: false },
      { observed: native, currency: undefined, want: false },
    ]) {
      const f = fixture();
      f.tables.suppliers[0] = { ...f.tables.suppliers[0], official_key: 'atacado-usa', website: 'https://atacadousa.com.py' };
      Object.assign(f.tables.supplier_offers[0], { external_id: '9051', source_url: url,
        evidence: { sourceTitle: target.title, observedUrl: scenario.observed } });
      f.tables.products[0].source_url = url;
      const requests: string[] = [];
      const detail = '<div id="product-details" data-product=\'' + JSON.stringify({ id_product: 9051, id_product_attribute: 0,
        name: target.title, manufacturer_name: 'Anua', quantity: 2, price_amount: 10, price_currency_code: scenario.currency }) + '\'></div>';
      const mock = t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
        const request = String(input); requests.push(request);
        return new Response(request.endsWith('/robots.txt') ? 'User-agent: *\nDisallow:' : request === url
          ? '<section class="av-product-detail"><h1>Anua Serum 50 ml</h1><div class="av-detail-price">$10,00</div></section>' : detail);
      });
      const runner = new LocalSupplierRunner(f.db, folder);
      try {
        await runner.start({ ...options, suppliers: ['atacado-usa'], sync: true }); await finished(runner);
        const row = [...runner.rows.values()][0];
        assert.equal(row.status, scenario.want ? 'saved' : 'error', row.message);
        assert.equal(requests.includes(native), scenario.observed === native);
        const records = f.calls.filter(call => call.name === 'record_supplier_observation_v1');
        assert.equal(records.length, scenario.want ? 1 : 0);
        if (scenario.want) {
          const payload = records[0].input.p as Record<string, unknown>;
          assert.equal(payload.source_url, url); assert.equal(payload.external_id, '9051'); assert.equal(payload.variant_key, 'attribute:0');
          assert.equal((payload.evidence as Record<string, unknown>).observedUrl, native);
          assert.equal(f.calls.filter(call => call.name === 'reserve_supplier_source_slot_v1').length, 2);
        }
      } finally { await runner.close(); mock.mock.restore(); }
    }
  } finally { await rm(folder, { recursive: true, force: true }); }
});
