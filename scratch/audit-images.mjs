import { createClient } from "@supabase/supabase-js";
import process from "node:process";
process.loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

async function checkUrl(url) {
  if (url.startsWith("/")) {
    return { ok: false, reason: `Local relative path: ${url}` };
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-10", "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok || res.status === 206) {
      return { ok: true, status: res.status };
    }
    return { ok: false, reason: `HTTP status ${res.status}` };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

async function mapConcurrent(items, limit, fn) {
  const results = [];
  const executing = new Set();
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean).catch(clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

async function main() {
  console.log("Fetching all products...");
  const { data: products, error: pErr } = await db
    .from("products")
    .select("id, title, slug, image_url, image_urls, is_active, category_id");

  if (pErr) {
    console.error("Error fetching products:", pErr);
    process.exit(1);
  }

  const { data: categories, error: cErr } = await db
    .from("categories")
    .select("id, name, slug, image_url, parent_id");

  if (cErr) {
    console.error("Error fetching categories:", cErr);
    process.exit(1);
  }

  console.log(`Auditing ${categories.length} categories...`);
  for (const cat of categories) {
    if (!cat.image_url) {
      console.log(`[CAT NO IMAGE] (${cat.name}) slug: ${cat.slug}, parent: ${cat.parent_id}`);
      continue;
    }
    const res = await checkUrl(cat.image_url);
    if (!res.ok) {
      console.log(`[CAT BROKEN IMAGE] (${cat.name}): ${cat.image_url} -> ${res.reason}`);
    } else {
      console.log(`[CAT OK] (${cat.name})`);
    }
  }

  console.log(`\nAuditing ${products.length} products with concurrency 15...`);
  const brokenProducts = [];
  const missingProducts = [];

  await mapConcurrent(products, 15, async (prod) => {
    const urls = [];
    if (prod.image_url) urls.push(prod.image_url);
    if (Array.isArray(prod.image_urls)) {
      for (const u of prod.image_urls) {
        if (u && !urls.includes(u)) urls.push(u);
      }
    }

    if (urls.length === 0) {
      missingProducts.push(prod);
      return;
    }

    let hasAnyValid = false;
    for (const u of urls) {
      const res = await checkUrl(u);
      if (res.ok) {
        hasAnyValid = true;
      } else {
        brokenProducts.push({ prod, url: u, reason: res.reason });
      }
    }
  });

  console.log("\n--- REPORT ---");
  console.log(`Total products: ${products.length}`);
  console.log(`Missing all images: ${missingProducts.length}`);
  for (const p of missingProducts) {
    console.log(`  - [ID: ${p.id}] ${p.title} (active: ${p.is_active})`);
  }
  console.log(`Broken image URLs: ${brokenProducts.length}`);
  for (const b of brokenProducts) {
    console.log(`  - [ID: ${b.prod.id}] ${b.prod.title} -> ${b.url} (${b.reason})`);
  }
}

main();
