import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

nextEnv.loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const { data: drafts } = await db.from('products').select('*').eq('is_active', false);
  const { data: costs } = await db.from('product_costs').select('*').in('product_id', (drafts || []).map(d => d.id));
  const costMap = new Map((costs || []).map(c => [c.product_id, c]));

  const groups: Record<string, any[]> = {
    'k-beauty-zero-price': [],
    'total-tools': [],
    'electronics': [],
    'other': []
  };

  for (const d of drafts || []) {
    const c = costMap.get(d.id);
    if (d.sku.startsWith('MYA-KB-')) {
      groups['k-beauty-zero-price'].push({ ...d, cost: c });
    } else if (['Total', 'Wadfow'].includes(d.brand)) {
      groups['total-tools'].push({ ...d, cost: c });
    } else if (['Apple', 'Samsung'].includes(d.brand)) {
      groups['electronics'].push({ ...d, cost: c });
    } else {
      groups['other'].push({ ...d, cost: c });
    }
  }

  console.log('Draft counts:');
  for (const [k, v] of Object.entries(groups)) {
    console.log(`  ${k}: ${v.length}`);
  }

  console.log('\n--- K-Beauty Drafts ---');
  for (const p of groups['k-beauty-zero-price']) {
    console.log(`- ${p.sku}: ${p.title} | cost: ${p.cost?.origin_cost} ${p.cost?.currency} | price: ${p.retail_price}`);
  }

  console.log('\n--- Total Tools Drafts ---');
  for (const p of groups['total-tools']) {
    console.log(`- ${p.sku}: ${p.title} | cost: ${p.cost?.origin_cost} ${p.cost?.currency} | price: ${p.retail_price} | ml_price: ${p.cost?.ml_price}`);
  }

  console.log('\n--- Electronics Drafts (first 10 of ' + groups['electronics'].length + ') ---');
  for (const p of groups['electronics'].slice(0, 10)) {
    console.log(`- ${p.sku}: ${p.title} | cost: ${p.cost?.origin_cost} ${p.cost?.currency} | price: ${p.retail_price} | ml: ${p.cost?.ml_price} | notes: ${p.cost?.source_document?.slice(0, 60)}`);
  }
}

run().catch(console.error);
