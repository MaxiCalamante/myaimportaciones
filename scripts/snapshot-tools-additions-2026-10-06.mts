import fs from 'node:fs/promises';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd());
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const snapshot: Record<string, unknown> = { checkedAt: new Date().toISOString() };
for (const table of ['products', 'product_costs', 'categories']) {
  const { data, error } = await db.from(table).select('*').order(table === 'product_costs' ? 'product_id' : 'id');
  if (error) throw error;
  snapshot[table] = data;
}
const name = process.argv.includes('--after') ? 'after' : 'before';
await fs.writeFile(`docs/tools-additions-2026-10-06/${name}.json`, JSON.stringify(snapshot, null, 2));
console.log(JSON.stringify({ snapshot: name, products: (snapshot.products as unknown[]).length, categories: (snapshot.categories as unknown[]).length }));

