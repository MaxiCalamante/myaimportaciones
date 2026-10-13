import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

nextEnv.loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const targetId = '10000000-0000-0000-0000-000000000002';
  const electronicaId = '9d64c87a-12d6-4501-afbd-f35b5f9e4a90';
  const smartphonesSubId = 'cfa5bcfb-99e3-48cf-ab99-3e8c728dfb27';

  // 1. Check existing record
  const { data: existing, error: getErr } = await db
    .from('categories')
    .select('*')
    .eq('id', targetId)
    .maybeSingle();

  if (getErr) throw getErr;

  if (!existing) {
    console.log('Category smartphones-tecnologia does not exist (already deleted).');
  } else {
    console.log('Found category to delete:', existing.name, `(${existing.slug})`);

    // 2. Safeguard: Check products
    const { data: prods, error: prodErr } = await db
      .from('products')
      .select('id, title')
      .eq('category_id', targetId);

    if (prodErr) throw prodErr;

    if (prods && prods.length > 0) {
      console.log(`Found ${prods.length} products still linked to old category. Moving them to electronica-smartphones...`);
      const { error: moveErr } = await db
        .from('products')
        .update({ category_id: smartphonesSubId })
        .eq('category_id', targetId);
      if (moveErr) throw moveErr;
    }

    // 3. Safeguard: Check child categories
    const { data: children, error: childErr } = await db
      .from('categories')
      .select('id, name')
      .eq('parent_id', targetId);

    if (childErr) throw childErr;

    if (children && children.length > 0) {
      console.log(`Found ${children.length} child categories. Moving them to electronica...`);
      const { error: moveChildErr } = await db
        .from('categories')
        .update({ parent_id: electronicaId })
        .eq('parent_id', targetId);
      if (moveChildErr) throw moveChildErr;
    }

    // 4. Delete the category
    console.log('Deleting category...');
    const { error: delErr } = await db
      .from('categories')
      .delete()
      .eq('id', targetId);

    if (delErr) throw delErr;
    console.log('Successfully deleted category smartphones-tecnologia.');
  }

  // 5. Update Electrónica display order to 2
  const { error: updErr } = await db
    .from('categories')
    .update({ display_order: 2 })
    .eq('id', electronicaId);

  if (updErr) throw updErr;
  console.log('Updated Electrónica display_order to 2.');

  // 6. List remaining root categories
  const { data: roots, error: rootsErr } = await db
    .from('categories')
    .select('id, name, slug, display_order')
    .is('parent_id', null)
    .order('display_order');

  if (rootsErr) throw rootsErr;
  console.log('\nRemaining root categories:');
  console.table(roots);
}

run().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});
