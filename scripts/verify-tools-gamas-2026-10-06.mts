import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
type Product = Record<string, unknown> & { id: string; model: string; title: string; description: string; slug: string; retail_price: number; specifications: Record<string, string> };
type Snapshot = { checkedAt: string; products: Product[]; product_costs: unknown[]; categories: unknown[] };
nextEnv.loadEnvConfig(process.cwd());
const dir = 'docs/tools-additions-2026-10-06';
const before: Snapshot = JSON.parse(await fs.readFile(`${dir}/gamas-before.json`, 'utf8'));
const payload: Product[] = JSON.parse(await fs.readFile(`${dir}/gamas-payload.json`, 'utf8'));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const after: Snapshot = { checkedAt: new Date().toISOString(), products: [], product_costs: [], categories: [] };
for (const table of ['products', 'product_costs', 'categories'] as const) {
  const { data, error } = await db.from(table).select('*').order(table === 'product_costs' ? 'product_id' : 'id');
  if (error) throw error;
  after[table] = data;
}
await fs.writeFile(`${dir}/gamas-after.json`, JSON.stringify(after, null, 2));
assert.equal(after.products.length, before.products.length);
assert.deepEqual(after.product_costs, before.product_costs);
assert.deepEqual(after.categories, before.categories);
const allowed = ['title', 'description', 'tags', 'specifications', 'updated_at'];
for (const old of before.products) {
  const current = after.products.find(p => p.id === old.id)!;
  const change = payload.find(p => p.id === old.id);
  if (!change) { assert.deepEqual(current, old); continue; }
  for (const key of Object.keys(old)) {
    if (!allowed.includes(key)) assert.deepEqual(current[key], old[key], `${old.model}: ${key}`);
    else if (key === 'description') assert.equal(current.description.replaceAll('\r\n', '\n'), change.description.replaceAll('\r\n', '\n'));
    else if (key !== 'updated_at') assert.deepEqual(current[key], change[key]);
  }
}
const checks = [];
for (const p of payload) {
  const url = `https://myaimportaciones.vercel.app/producto/${p.slug}`;
  const response = await fetch(url);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes(p.title), `${p.model}: title`);
  assert.ok(html.includes(p.specifications.Gama), `${p.model}: tier`);
  assert.ok(html.includes(p.description.split('\n')[0]), `${p.model}: description`);
  assert.ok(!html.includes('totalherramientasoficial.com.py/produto/') && !html.includes('source_document'), `${p.model}: private supplier`);
  checks.push({ model: p.model, tier: p.specifications.Gama, price: p.retail_price, url, status: response.status });
}
const report = { checkedAt: after.checkedAt, products: after.products.length, tiers: checks, unchangedPricesCostsStockAndOtherProducts: true };
await fs.writeFile(`${dir}/gamas-verification.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
