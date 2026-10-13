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

  console.log('--- ANALYSIS OF DRAFTS ---');

  // 1. K-Beauty
  const kb = drafts?.filter(d => d.sku.startsWith('MYA-KB-')) || [];
  console.log(`\n1. K-Beauty Drafts (${kb.length}):`);
  for (const p of kb) {
    const c = costMap.get(p.id);
    console.log(`SKU: ${p.sku} | Title: ${p.title} | Price: ${p.retail_price} | Cost: ${c?.origin_cost} ${c?.currency} | Category: ${p.category_id} | Warranty: ${p.warranty_terms} | Desc length: ${p.description?.length}`);
  }

  // 2. Total Tools
  const tools = drafts?.filter(d => ['Total', 'Wadfow'].includes(d.brand)) || [];
  console.log(`\n2. Total Tools Drafts (${tools.length}):`);
  for (const p of tools) {
    const c = costMap.get(p.id);
    console.log(`SKU: ${p.sku} | Title: ${p.title} | Price: ${p.retail_price} | Cost: ${c?.origin_cost} ${c?.currency} | Category: ${p.category_id} | Warranty: ${p.warranty_terms} | Desc: ${p.description?.slice(0, 60)}`);
  }

  // 3. Electronics
  const elec = drafts?.filter(d => ['Apple', 'Samsung'].includes(d.brand)) || [];
  console.log(`\n3. Electronics Drafts (${elec.length}):`);
  const missingInElec = {
    priceZero: 0,
    noImages: 0,
    noDesc: 0,
    noSpecs: 0,
    simToConfirm: 0,
    conditionToConfirm: 0,
    noMlPrice: 0,
    lowMargin: 0
  };

  for (const p of elec) {
    const c = costMap.get(p.id);
    if (!p.retail_price || Number(p.retail_price) <= 0) missingInElec.priceZero++;
    if (!p.image_url) missingInElec.noImages++;
    if (!p.description) missingInElec.noDesc++;
    if (!p.specifications) missingInElec.noSpecs++;
    if (p.specifications?.SIM?.includes('confirmar')) missingInElec.simToConfirm++;
    if (c?.source_document?.includes('Condición') || c?.source_document?.includes('batería')) missingInElec.conditionToConfirm++;
    if (!c?.ml_price) missingInElec.noMlPrice++;
    if (c?.source_document?.includes('piso de 15%')) missingInElec.lowMargin++;
  }
  console.log('Electronics stats:', missingInElec);
}

run().catch(console.error);
