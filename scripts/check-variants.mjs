import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const envContent = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
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

const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"];
const serviceKey = env["SUPABASE_SERVICE_ROLE_KEY"];

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data: variants, count: variantCount, error: vErr } = await supabase
    .from("product_variants")
    .select("*", { count: "exact" });

  console.log("Variants count in DB:", variantCount, "Error:", vErr?.message);
  if (variants && variants.length > 0) {
    console.log("Sample variants:", JSON.stringify(variants.slice(0, 3), null, 2));
  }

  const { data: productsWithVariants } = await supabase
    .from("products")
    .select("id, title, slug, has_variants, options_config")
    .eq("has_variants", true);

  console.log("Products with has_variants=true:", productsWithVariants?.length);
  if (productsWithVariants && productsWithVariants.length > 0) {
    console.log("Products with variants:", JSON.stringify(productsWithVariants, null, 2));
  }

  // Count all products in DB
  const { count: totalProducts } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true });
  console.log("Total products in DB:", totalProducts);

  // Check some sample products
  const { data: sampleProducts } = await supabase
    .from("products")
    .select("id, title, slug, brand, model, specifications, options_config, has_variants, retail_price")
    .limit(10);
  console.log("Sample 10 products in DB:", JSON.stringify(sampleProducts?.map(p => ({ title: p.title, slug: p.slug, brand: p.brand, has_variants: p.has_variants, options_config: p.options_config })), null, 2));
}

run();
