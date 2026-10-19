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

async function main() {
  console.log("=== INICIANDO MIGRACIÓN OFICIAL DE PRODUCTOS A VARIANTES ===\n");

  // ==========================================
  // 1. VICTORIA'S SECRET BODY SPLASH MIST 250 ML
  // ==========================================
  console.log("--- 1. Victoria's Secret Body Splash Mist 250 ml ---");
  const vsMistFragrances = [
    { name: "Bare Vanilla", price: 33300, sku: "MYA-VS-8301", image: "/placeholder-product.svg" },
    { name: "Coconut Passion", price: 33300, sku: "MYA-VS-8302", image: "/placeholder-product.svg" },
    { name: "Pure Seduction", price: 35000, sku: "MYA-COS-047", image: "/placeholder-product.svg" },
    { name: "Amber Romance", price: 33300, sku: "MYA-VS-8299", image: "/placeholder-product.svg" },
    { name: "Aqua Kiss", price: 33300, sku: "MYA-VS-8300", image: "/placeholder-product.svg" },
    { name: "Love Spell", price: 33300, sku: "MYA-VS-9546", image: "/placeholder-product.svg" },
    { name: "Romantic", price: 33300, sku: "MYA-VS-10356", image: "/placeholder-product.svg" },
    { name: "Velvet Petals", price: 33300, sku: "MYA-VS-8313", image: "/placeholder-product.svg" },
  ];

  const { data: existingMists } = await supabase
    .from("products")
    .select("id, title, image_url, retail_price, sku, stock, fulfillment_mode")
    .ilike("title", "%Victoria%Secret%")
    .ilike("title", "%Mist%")
    .not("title", "ilike", "%Shimmer%")
    .not("title", "ilike", "%Loción%")
    .not("title", "ilike", "%Kit%");

  const parentMist = existingMists.find(p => p.title.toLowerCase().includes("bare vanilla")) || existingMists[0];
  console.log(`Producto padre designado: [${parentMist.id}] "${parentMist.title}"`);

  vsMistFragrances.forEach(f => {
    const match = existingMists.find(p => p.title.toLowerCase().includes(f.name.toLowerCase()));
    if (match?.image_url) {
      f.image = match.image_url;
      if (match.stock) f.stock = match.stock;
    }
  });

  await supabase
    .from("products")
    .update({
      title: "Victoria's Secret Body Splash Mist 250 ml",
      slug: "victorias-secret-body-splash-mist-250-ml",
      has_variants: true,
      options_config: [{ name: "Fragancia", values: vsMistFragrances.map(f => f.name) }],
      retail_price: Math.min(...vsMistFragrances.map(f => f.price)),
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq("id", parentMist.id);

  await supabase.from("product_variants").delete().eq("product_id", parentMist.id);

  const mistRows = vsMistFragrances.map((f, i) => ({
    product_id: parentMist.id,
    title: f.name,
    sku: f.sku,
    retail_price: f.price,
    stock: f.stock || 5,
    fulfillment_mode: "own_stock",
    stock_verified_at: new Date().toISOString(),
    supplier_available: false,
    image_url: f.image,
    is_active: true,
    options: { "Fragancia": f.name },
    display_order: i,
    updated_at: new Date().toISOString()
  }));

  const { error: errMistIns } = await supabase.from("product_variants").insert(mistRows);
  if (errMistIns) console.error("Error inserting mists:", errMistIns);
  else console.log(`✓ Insertadas ${mistRows.length} fragancias en product_variants.`);

  const redundantMistIds = existingMists.filter(p => p.id !== parentMist.id).map(p => p.id);
  if (redundantMistIds.length) {
    await supabase.from("products").update({ is_active: false }).in("id", redundantMistIds);
    console.log(`✓ Pausados ${redundantMistIds.length} productos duplicados.`);
  }

  // ==========================================
  // 2. VICTORIA'S SECRET SHIMMER MIST 250 ML
  // ==========================================
  console.log("\n--- 2. Victoria's Secret Shimmer Body Splash Mist 250 ml ---");
  const { data: existingShimmers } = await supabase
    .from("products")
    .select("id, title, image_url, retail_price, sku, stock, fulfillment_mode")
    .ilike("title", "%Victoria%Secret%Shimmer%")
    .ilike("title", "%Mist%");

  if (existingShimmers?.length) {
    const parentShimmer = existingShimmers.find(p => p.title.toLowerCase().includes("bare vanilla")) || existingShimmers[0];
    const shimmerFragrances = existingShimmers.map(p => {
      let cleanName = p.title
        .replace(/Victoria's Secret /i, "")
        .replace(/Shimmer /i, "")
        .replace(/ Body Splash Mist 250 ml/i, "")
        .trim();
      return {
        name: cleanName,
        price: Number(p.retail_price || 38700),
        sku: p.sku || `MYA-VS-SHIMMER-${cleanName.toUpperCase().replace(/\s+/g, "")}`,
        image: p.image_url || "/placeholder-product.svg",
        stock: p.stock || 4
      };
    });

    console.log(`Producto padre designado: [${parentShimmer.id}] "${parentShimmer.title}" con ${shimmerFragrances.length} variantes`);

    await supabase
      .from("products")
      .update({
        title: "Victoria's Secret Shimmer Body Splash Mist 250 ml",
        slug: "victorias-secret-shimmer-body-splash-mist-250-ml",
        has_variants: true,
        options_config: [{ name: "Fragancia", values: shimmerFragrances.map(f => f.name) }],
        retail_price: Math.min(...shimmerFragrances.map(f => f.price)),
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", parentShimmer.id);

    await supabase.from("product_variants").delete().eq("product_id", parentShimmer.id);

    const shimmerRows = shimmerFragrances.map((f, i) => ({
      product_id: parentShimmer.id,
      title: f.name,
      sku: f.sku,
      retail_price: f.price,
      stock: f.stock,
      fulfillment_mode: "own_stock",
      stock_verified_at: new Date().toISOString(),
      supplier_available: false,
      image_url: f.image,
      is_active: true,
      options: { "Fragancia": f.name },
      display_order: i,
      updated_at: new Date().toISOString()
    }));

    const { error: errShimIns } = await supabase.from("product_variants").insert(shimmerRows);
    if (errShimIns) console.error("Error inserting shimmers:", errShimIns);
    else console.log(`✓ Insertadas ${shimmerRows.length} fragancias shimmer.`);

    const redundantShimmerIds = existingShimmers.filter(p => p.id !== parentShimmer.id).map(p => p.id);
    if (redundantShimmerIds.length) {
      await supabase.from("products").update({ is_active: false }).in("id", redundantShimmerIds);
      console.log(`✓ Pausados ${redundantShimmerIds.length} productos shimmer duplicados.`);
    }
  }

  // ==========================================
  // 3. VICTORIA'S SECRET BODY LOTION 236 ML
  // ==========================================
  console.log("\n--- 3. Victoria's Secret Loción Corporal Body Lotion 236 ml ---");
  const { data: existingLotions } = await supabase
    .from("products")
    .select("id, title, image_url, retail_price, sku, stock, fulfillment_mode")
    .ilike("title", "%Victoria%Secret%")
    .ilike("title", "%Loción%")
    .not("title", "ilike", "%Shimmer%");

  if (existingLotions?.length) {
    const parentLotion = existingLotions.find(p => p.title.toLowerCase().includes("amber romance")) || existingLotions[0];
    const lotionFragrances = existingLotions.map(p => {
      let cleanName = p.title
        .replace(/Victoria's Secret /i, "")
        .replace(/ Loción Corporal Body Lotion 236 ml/i, "")
        .trim();
      return {
        name: cleanName,
        price: Number(p.retail_price || 38700),
        sku: p.sku || `MYA-VS-LOTION-${cleanName.toUpperCase().replace(/\s+/g, "")}`,
        image: p.image_url || "/placeholder-product.svg",
        stock: p.stock || 4
      };
    });

    console.log(`Producto padre designado: [${parentLotion.id}] "${parentLotion.title}" con ${lotionFragrances.length} variantes`);

    await supabase
      .from("products")
      .update({
        title: "Victoria's Secret Loción Corporal Body Lotion 236 ml",
        slug: "victorias-secret-locion-corporal-body-lotion-236-ml",
        has_variants: true,
        options_config: [{ name: "Fragancia", values: lotionFragrances.map(f => f.name) }],
        retail_price: Math.min(...lotionFragrances.map(f => f.price)),
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", parentLotion.id);

    await supabase.from("product_variants").delete().eq("product_id", parentLotion.id);

    const lotionRows = lotionFragrances.map((f, i) => ({
      product_id: parentLotion.id,
      title: f.name,
      sku: f.sku,
      retail_price: f.price,
      stock: f.stock,
      fulfillment_mode: "own_stock",
      stock_verified_at: new Date().toISOString(),
      supplier_available: false,
      image_url: f.image,
      is_active: true,
      options: { "Fragancia": f.name },
      display_order: i,
      updated_at: new Date().toISOString()
    }));

    const { error: errLotIns } = await supabase.from("product_variants").insert(lotionRows);
    if (errLotIns) console.error("Error inserting lotions:", errLotIns);
    else console.log(`✓ Insertadas ${lotionRows.length} fragancias de loción.`);

    const redundantLotionIds = existingLotions.filter(p => p.id !== parentLotion.id).map(p => p.id);
    if (redundantLotionIds.length) {
      await supabase.from("products").update({ is_active: false }).in("id", redundantLotionIds);
      console.log(`✓ Pausados ${redundantLotionIds.length} productos loción duplicados.`);
    }
  }

  console.log("\n--- 4. SKIN1004 Madagascar Centella Ampoule ---");
  const { data: p55 } = await supabase.from("products").select("id, title, image_url, retail_price, sku, stock, fulfillment_mode").eq("id", "625ec9df-0b61-5d34-ad78-6bc75ea5579d").single();
  const { data: p100 } = await supabase.from("products").select("id, title, image_url, retail_price, sku, stock, fulfillment_mode").eq("id", "a99ad2b8-c03c-530c-8ced-c63bcb056494").single();

  if (p55 && p100) {
    console.log(`Unificando Centella Ampoule 55ml (${p55.id}) y 100ml (${p100.id})`);

      await supabase
        .from("products")
        .update({
          title: "SKIN1004 Madagascar Centella Ampoule",
          slug: "skin1004-madagascar-centella-ampoule",
          has_variants: true,
          options_config: [{ name: "Presentación", values: ["55 ml", "100 ml"] }],
          retail_price: Math.min(Number(p55.retail_price), Number(p100.retail_price)),
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", p55.id);

      await supabase.from("product_variants").delete().eq("product_id", p55.id);

      const ampouleVariants = [
        { name: "55 ml", price: Number(p55.retail_price), sku: p55.sku || "MYA-KB-088", img: p55.image_url, stock: p55.stock || 6 },
        { name: "100 ml", price: Number(p100.retail_price), sku: p100.sku || "MYA-KB-056", img: p100.image_url, stock: p100.stock || 4 }
      ];

      const ampRows = ampouleVariants.map((v, i) => ({
        product_id: p55.id,
        title: v.name,
        sku: v.sku,
        retail_price: v.price,
        stock: v.stock,
        fulfillment_mode: "own_stock",
        stock_verified_at: new Date().toISOString(),
        supplier_available: false,
        image_url: v.img,
        is_active: true,
        options: { "Presentación": v.name },
        display_order: i,
        updated_at: new Date().toISOString()
      }));

      const { error: errAmpIns } = await supabase.from("product_variants").insert(ampRows);
      if (errAmpIns) console.error("Error inserting ampoules:", errAmpIns);
      else console.log(`✓ Insertadas 2 presentaciones de Centella Ampoule.`);

      await supabase.from("products").update({ is_active: false }).eq("id", p100.id);
  }

  // ==========================================
  // 5. MEDICUBE BOOSTER PRO MINI PLUS (COLOR)
  // ==========================================
  console.log("\n--- 5. Medicube AGE-R Booster Pro Mini Plus ---");
  const { data: medMini } = await supabase
    .from("products")
    .select("id, title, image_url, retail_price, sku, stock, fulfillment_mode")
    .ilike("title", "%Medicube AGE-R Booster Pro Mini Plus%");

  if (medMini?.length >= 2) {
    const parentMed = medMini[0];
    const colors = medMini.map(p => {
      const color = p.title.toLowerCase().includes("rosa") ? "Rosa" : "Ivory Beige";
      return {
        name: color,
        price: Number(p.retail_price || 249900),
        sku: p.sku || `MYA-MED-MINI-${color.toUpperCase().replace(/\s+/g, "")}`,
        img: p.image_url,
        stock: p.stock || 3,
        id: p.id
      };
    });

    console.log(`Unificando colores de Medicube Mini Plus: Ivory Beige y Rosa`);

    await supabase
      .from("products")
      .update({
        title: "Medicube AGE-R Booster Pro Mini Plus",
        slug: "medicube-age-r-booster-pro-mini-plus",
        has_variants: true,
        options_config: [{ name: "Color", values: colors.map(c => c.name) }],
        retail_price: colors[0].price,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", parentMed.id);

    await supabase.from("product_variants").delete().eq("product_id", parentMed.id);

    const medRows = colors.map((c, i) => ({
      product_id: parentMed.id,
      title: c.name,
      sku: c.sku,
      retail_price: c.price,
      stock: c.stock,
      fulfillment_mode: "own_stock",
      stock_verified_at: new Date().toISOString(),
      supplier_available: false,
      image_url: c.img,
      is_active: true,
      options: { "Color": c.name },
      display_order: i,
      updated_at: new Date().toISOString()
    }));

    const { error: errMedIns } = await supabase.from("product_variants").insert(medRows);
    if (errMedIns) console.error("Error inserting medicube colors:", errMedIns);
    else console.log(`✓ Insertados 2 colores de Medicube Booster Pro Mini.`);

    const redundantMedIds = medMini.filter(p => p.id !== parentMed.id).map(p => p.id);
    if (redundantMedIds.length) {
      await supabase.from("products").update({ is_active: false }).in("id", redundantMedIds);
    }
  }

  // ==========================================
  // 6. TOTAL TALADRO PERCUTOR 13MM (POTENCIA)
  // ==========================================
  console.log("\n--- 6. Total Taladro Percutor 13mm Industrial ---");
  const { data: totalDrills } = await supabase
    .from("products")
    .select("id, title, image_url, retail_price, sku, stock, fulfillment_mode")
    .ilike("title", "%Total Taladro percutor %13mm%");

  if (totalDrills?.length >= 2) {
    const parentDrill = totalDrills[0];
    const powers = totalDrills.map(p => {
      const matchW = p.title.match(/(\d+)W/i);
      const power = matchW ? `${matchW[1]} W` : p.title;
      return {
        name: power,
        price: Number(p.retail_price),
        sku: p.sku || `TG10-13MM-${power.replace(/\s+/g, "")}`,
        img: p.image_url,
        stock: p.stock || 5,
        id: p.id
      };
    });

    console.log(`Unificando Total Taladros: ${powers.map(p => p.name).join(", ")}`);

    await supabase
      .from("products")
      .update({
        title: "Total Taladro Percutor 13mm Industrial",
        slug: "total-taladro-percutor-13mm-industrial",
        has_variants: true,
        options_config: [{ name: "Potencia", values: powers.map(p => p.name) }],
        retail_price: Math.min(...powers.map(p => p.price)),
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", parentDrill.id);

    await supabase.from("product_variants").delete().eq("product_id", parentDrill.id);

    const drillRows = powers.map((p, i) => ({
      product_id: parentDrill.id,
      title: p.name,
      sku: p.sku,
      retail_price: p.price,
      stock: p.stock,
      fulfillment_mode: "own_stock",
      stock_verified_at: new Date().toISOString(),
      supplier_available: false,
      image_url: p.img,
      is_active: true,
      options: { "Potencia": p.name },
      display_order: i,
      updated_at: new Date().toISOString()
    }));

    const { error: errDrillIns } = await supabase.from("product_variants").insert(drillRows);
    if (errDrillIns) console.error("Error inserting drill powers:", errDrillIns);
    else console.log(`✓ Insertadas 2 potencias de Total Taladro Percutor.`);

    const redundantDrillIds = totalDrills.filter(p => p.id !== parentDrill.id).map(p => p.id);
    if (redundantDrillIds.length) {
      await supabase.from("products").update({ is_active: false }).in("id", redundantDrillIds);
    }
  }

  console.log("\n=== MIGRACIÓN DE CATÁLOGO COMPLETADA EXITOSAMENTE ===");
}

main().catch(console.error);
