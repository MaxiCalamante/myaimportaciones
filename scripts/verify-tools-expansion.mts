import fs from 'node:fs/promises';
import sharp from 'sharp';
const folder = 'docs/tools-expansion-2026-10-02';
const payload = JSON.parse(await fs.readFile(`${folder}/payload.json`, 'utf8'));
const images: Record<string, unknown>[] = [];
for (const product of payload.products) {
  for (const url of product.image_urls) {
    const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error(`Image HTTP ${response.status}`);
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    if (!metadata.width || !metadata.height || Math.max(metadata.width, metadata.height) < 1000) throw new Error(`Insufficient media: ${product.model}`);
    images.push({ model: product.model, width: metadata.width, height: metadata.height, ok: true });
  }
}
await fs.writeFile(`${folder}/media-verification.json`, JSON.stringify(images, null, 2));
if (!process.argv.includes('--live')) { console.log(JSON.stringify({ decodedImages: images.length, ok: true })); process.exit(0); }
const before = JSON.parse(await fs.readFile(`${folder}/before.json`, 'utf8'));
const after = JSON.parse(await fs.readFile(`${folder}/after.json`, 'utf8'));
const addedIds = new Set(payload.products.map((p: { id: string }) => p.id));
for (const expected of payload.products) {
  const actual = after.products.find((p: { id: string }) => p.id === expected.id);
  if (!actual) throw new Error(`Missing product ${expected.model}`);
  for (const [key, value] of Object.entries(expected)) {
    if (JSON.stringify(actual[key]) !== JSON.stringify(value)) {
      if (typeof value === 'object' && !Array.isArray(value) && value && JSON.stringify(Object.entries(actual[key]).sort()) === JSON.stringify(Object.entries(value).sort())) continue;
      throw new Error(`Catalog mismatch ${expected.model}: ${key}`);
    }
  }
  const cost = after.product_costs.find((c: { product_id: string }) => c.product_id === expected.id);
  if (!cost || cost.expenses_confirmed !== false || cost.ml_price * 0.9 < expected.retail_price) throw new Error('Pricing validation failed');
}
if (after.products.length !== before.products.length + addedIds.size) throw new Error('Unexpected product count');
let concurrentChanges = 0;
for (const original of before.products) {
  const current = after.products.find((p: { id: string }) => p.id === original.id);
  if (!current) throw new Error('Existing product missing');
  if (JSON.stringify(original) !== JSON.stringify(current)) concurrentChanges++;
}
const routes = [];
for (const p of payload.products) {
  const url = `https://myaimportaciones.vercel.app/producto/${p.slug}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const html = await response.text();
  const structured = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => JSON.parse(m[1])).find(d => d['@type'] === 'Product');
  if (!response.ok || !structured || structured.sku !== p.sku || Number(structured.offers.price) !== p.retail_price) throw new Error(`Public route mismatch: ${p.model}`);
  if (html.includes('totalherramientasoficial.com.py/produto/') || html.includes('source_document')) throw new Error('Private supplier information exposed');
  routes.push({ model: p.model, url, status: response.status, price: Number(structured.offers.price), structuredData: true });
}
const report = { checkedAt: new Date().toISOString(), published: payload.products.length, supplierStockNotOwnStock: true, unknownExpensesRecorded: true, media: images, routes, originalProductsPreserved: before.products.length, concurrentChanges, pricingBasis: '10% below indexed Argentine Mercado Libre references for the same model and kit, rounded down to ARS100; search indexes may lag; freight and other expenses unknown.' };
await fs.writeFile(`${folder}/verification.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
