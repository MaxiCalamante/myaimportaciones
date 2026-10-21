import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const envContent = readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
}

const supabase = createClient(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"]);

async function run() {
  const { data: products } = await supabase
    .from("products")
    .select("id, title, slug, has_variants, options_config, product_variants(*)")
    .eq("has_variants", true);

  for (const p of products || []) {
    console.log(`\n========================================`);
    console.log(`PRODUCT: ${p.title} (${p.slug})`);
    console.log(`Options config:`, JSON.stringify(p.options_config));
    console.log(`Variants count:`, p.product_variants?.length);
    for (const v of p.product_variants || []) {
      console.log(`  - Variant: "${v.title}" | Options:`, v.options, `| Price: $${v.retail_price} | Stock: ${v.stock} | Image: ${v.image_url?.slice(0, 60)}...`);
    }
  }
}

run();
