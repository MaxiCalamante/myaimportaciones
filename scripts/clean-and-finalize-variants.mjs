import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function getEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  content.split("\n").forEach((line) => {
    const [key, ...val] = line.split("=");
    if (key && val) {
      env[key.trim()] = val.join("=").trim().replace(/^["']|["']$/g, "");
    }
  });
  return env;
}

const env = getEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // First, free up the slugs by renaming the inactive products
  await supabase
    .from("products")
    .update({
      slug: "legacy-vs-bare-vanilla-mist-" + Date.now(),
      has_variants: false,
      is_active: false
    })
    .eq("id", "f12c98ec-b2c0-5d56-9288-46582b2693ec");

  await supabase
    .from("products")
    .update({
      slug: "legacy-vs-shimmer-bare-vanilla-" + Date.now(),
      has_variants: false,
      is_active: false
    })
    .eq("id", "021bddc2-ab31-568b-8dc4-32b73f496383");

  await supabase
    .from("products")
    .update({
      slug: "legacy-vs-lotion-amber-romance-" + Date.now(),
      has_variants: false,
      is_active: false
    })
    .eq("id", "c8a66127-b0bf-5518-aad2-f4adf0e2ea12");

  // Now configure the 6 canonical products:
  // 1. Victoria's Secret Body Splash Mist 250 ml
  await supabase
    .from("products")
    .update({
      title: "Victoria's Secret Body Splash Mist 250 ml",
      slug: "victorias-secret-body-splash-mist-250-ml",
      has_variants: true,
      is_active: true,
      options_config: [{ name: "Fragancia", values: [
        "Bare Vanilla", "Coconut Passion", "Pure Seduction", "Amber Romance", "Aqua Kiss", "Love Spell", "Romantic", "Velvet Petals"
      ] }]
    })
    .eq("id", "95a1bba9-115b-50aa-bf3a-a5fd32fbdaab");

  // 2. Victoria's Secret Shimmer Body Splash Mist 250 ml
  await supabase
    .from("products")
    .update({
      title: "Victoria's Secret Shimmer Body Splash Mist 250 ml",
      slug: "victorias-secret-shimmer-body-splash-mist-250-ml",
      has_variants: true,
      is_active: true,
      options_config: [{ name: "Fragancia", values: [
        "Aqua Kiss", "Bare Vanilla", "Coconut Passion", "Love Spell", "Pure Seduction", "Tidal", "Velvet Petals"
      ] }]
    })
    .eq("id", "858f4127-e32b-540b-bc07-5d8ad5e0c9c0");

  // 3. Victoria's Secret Loción Corporal Body Lotion 236 ml
  await supabase
    .from("products")
    .update({
      title: "Victoria's Secret Loción Corporal Body Lotion 236 ml",
      slug: "victorias-secret-locion-corporal-body-lotion-236-ml",
      has_variants: true,
      is_active: true,
      options_config: [{ name: "Fragancia", values: [
        "Amber Romance", "Angel Cake & Cream", "Canyon Blooms", "Gelato Oasis", "Isla Hibiscus", "Love Spell Candied", "Love Spell Sol", "Midnight Bloom", "Pitaya Paradise", "Serene Blooms"
      ] }]
    })
    .eq("id", "accbbd08-1d6a-56f8-b88a-d9060dd858c7");

  // 4. Centella Ampoule
  await supabase
    .from("products")
    .update({
      title: "SKIN1004 Madagascar Centella Ampoule",
      slug: "skin1004-madagascar-centella-ampoule",
      has_variants: true,
      is_active: true,
      options_config: [{ name: "Presentación", values: ["55 ml", "100 ml"] }]
    })
    .eq("id", "625ec9df-0b61-5d34-ad78-6bc75ea5579d");

  // 5. Total Taladro 13mm
  await supabase
    .from("products")
    .update({
      title: "Total Taladro Percutor 13mm Industrial",
      slug: "total-taladro-percutor-13mm-industrial",
      has_variants: true,
      is_active: true,
      options_config: [{ name: "Potencia", values: ["710 W", "900 W"] }]
    })
    .eq("id", "24c04a1d-f3f8-50cf-ba7e-bb148c9705bb");

  // 6. Medicube Booster Pro Mini Plus
  await supabase
    .from("products")
    .update({
      title: "Medicube AGE-R Booster Pro Mini Plus",
      slug: "medicube-age-r-booster-pro-mini-plus",
      has_variants: true,
      is_active: true,
      options_config: [{ name: "Color", values: ["Ivory Beige", "Rosa"] }]
    })
    .eq("id", "c1fb6b72-7e8d-546c-9147-71a7569c0886");

  console.log("✓ Procesamiento completo.");

  // Query and print all active variant products
  const { data: finalActive } = await supabase
    .from("products")
    .select("id, title, slug, options_config, retail_price")
    .eq("has_variants", true)
    .eq("is_active", true);

  console.log(`\n========================================`);
  console.log(`TOTAL PRODUCTOS CON VARIANTES ACTIVOS: ${finalActive.length}`);
  console.log(`========================================`);
  for (const p of finalActive) {
    const { data: vars } = await supabase
      .from("product_variants")
      .select("id, title, sku, retail_price, stock")
      .eq("product_id", p.id)
      .order("display_order");
    console.log(`\n• "${p.title}" (/producto/${p.slug})`);
    console.log(`  Opciones: ${JSON.stringify(p.options_config[0]?.values)}`);
    console.log(`  Variantes cargadas (${vars?.length}):`);
    vars?.forEach(v => console.log(`    - ${v.title} | $${v.retail_price} | Stock: ${v.stock} | SKU: ${v.sku}`));
  }
}

run().catch(console.error);
