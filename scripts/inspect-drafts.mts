import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

nextEnv.loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const db = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const { data: categories } = await db.from('categories').select('id, name, slug, parent_id');
  const catMap = new Map((categories || []).map(c => [c.id, c]));

  const { data: drafts, error } = await db
    .from('products')
    .select(`
      id, sku, title, brand, model, category_id, retail_price, wholesale_price,
      is_active, is_wholesale_only, image_url, specifications, warranty_terms, description
    `)
    .eq('is_active', false)
    .order('sku');

  if (error) throw error;

  const { data: costs } = await db
    .from('product_costs')
    .select('*')
    .in('product_id', (drafts || []).map(d => d.id));

  const costMap = new Map((costs || []).map(c => [c.product_id, c]));

  console.log(`Total draft products: ${drafts?.length}`);

  const summary = (drafts || []).map(d => {
    const cat = catMap.get(d.category_id);
    const parentCat = cat?.parent_id ? catMap.get(cat.parent_id) : null;
    const cost = costMap.get(d.id);
    return {
      sku: d.sku,
      title: d.title,
      brand: d.brand,
      category: cat ? `${parentCat ? parentCat.name + ' > ' : ''}${cat.name} (${cat.slug})` : 'SIN CATEGORIA',
      price: Number(d.retail_price),
      origin_cost: cost ? `${cost.origin_cost} ${cost.currency}` : 'SIN COSTO',
      ml_price: cost?.ml_price || null,
      source_document: cost?.source_document ? cost.source_document.slice(0, 80) + '...' : null,
      has_image: Boolean(d.image_url),
      has_desc: Boolean(d.description && d.description.length > 20),
      has_specs: Boolean(d.specifications && Object.keys(d.specifications).length > 0)
    };
  });

  console.table(summary);
}

run().catch(console.error);
