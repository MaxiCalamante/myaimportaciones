import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd());
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const folder = 'docs/catalog-audit';
await fs.mkdir(folder, { recursive: true });
const products = [];
for (let offset = 0; ; offset += 500) {
  const { data, error } = await db.from('products').select('*').order('id').range(offset, offset + 499);
  if (error) throw error;
  products.push(...data);
  if (data.length < 500) break;
}
const { data: categories, error } = await db.from('categories').select('*').order('display_order');
if (error) throw error;
await fs.writeFile(`${folder}/products-before.json`, JSON.stringify(products, null, 2));
await fs.writeFile(`${folder}/categories-before.json`, JSON.stringify(categories, null, 2));
const results = [];
for (const p of products) {
  if (!p.image_url?.startsWith('/')) { results.push({ id: p.id, image: p.image_url, status: 'remote' }); continue; }
  try {
    const file = path.join(process.cwd(), 'public', decodeURIComponent(p.image_url));
    const meta = await sharp(file).metadata();
    results.push({ id: p.id, image: p.image_url, status: 'local', width: meta.width, height: meta.height, bytes: (await fs.stat(file)).size });
  } catch { results.push({ id: p.id, image: p.image_url, status: 'missing' }); }
}
await fs.writeFile(`${folder}/images-before.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ products: products.length, categories: categories.length, statuses: results.reduce((a,p) => {a[p.status]=(a[p.status]??0)+1;return a;},{}), under800: results.filter(p => p.width && Math.max(p.width,p.height)<800).length, missing: results.filter(p => p.status==='missing').slice(0,8) }, null, 2));
