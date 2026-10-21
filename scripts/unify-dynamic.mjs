import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const envContent = readFileSync("Tienda WEB/.env.local", "utf-8");
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

async function findProd(query, sku) {
  let q = supabase.from("products").select("id, title, slug, sku, image_url, retail_price, stock");
  if (sku) {
    const { data } = await q.eq("sku", sku).maybeSingle();
    if (data) return data;
  }
  const { data } = await supabase.from("products").select("id, title, slug, sku, image_url, retail_price, stock").ilike("title", query);
  return data?.[0] || null;
}

async function unifyPair({
  search1, sku1, label1,
  search2, sku2, label2,
  parentTitle, parentSlug, optionName
}) {
  const now = new Date().toISOString();
  console.log(`\n==================================================`);
  console.log(`Unificando: "${parentTitle}"`);
  console.log(`  Opt 1: ${search1} (SKU: ${sku1 || 'any'})`);
  console.log(`  Opt 2: ${search2} (SKU: ${sku2 || 'any'})`);

  const p1 = await findProd(search1, sku1);
  const p2 = await findProd(search2, sku2);

  if (!p1 || !p2) {
    console.error(`  ERROR: No se encontraron ambos productos! P1: ${p1?.id} ("${p1?.title}"), P2: ${p2?.id} ("${p2?.title}")`);
    return;
  }

  console.log(`  ✓ Encontrado P1: [${p1.id}] "${p1.title}" ($${p1.retail_price})`);
  console.log(`  ✓ Encontrado P2: [${p2.id}] "${p2.title}" ($${p2.retail_price})`);

  // P1 será el producto padre
  const parentId = p1.id;
  const redundantId = p2.id;

  const variants = [
    {
      label: label1,
      price: Number(p1.retail_price),
      sku: p1.sku,
      image: p1.image_url,
      stock: p1.stock || 5
    },
    {
      label: label2,
      price: Number(p2.retail_price),
      sku: p2.sku,
      image: p2.image_url,
      stock: p2.stock || 5
    }
  ];

  // Si label1 es mayor que label2 y queremos ordenarlos por precio ascendente
  variants.sort((a, b) => a.price - b.price);

  // 1. Actualizar producto padre
  const { error: updErr } = await supabase
    .from("products")
    .update({
      title: parentTitle,
      slug: parentSlug,
      has_variants: true,
      options_config: [{ name: optionName, values: variants.map(v => v.label) }],
      retail_price: variants[0].price,
      image_urls: variants.map(v => v.image).filter(Boolean),
      is_active: true,
      updated_at: now
    })
    .eq("id", parentId);

  if (updErr) {
    console.error("  Error actualizando producto padre:", updErr);
    return;
  }

  // 2. Limpiar variantes existentes
  await supabase.from("product_variants").delete().eq("product_id", parentId);

  // 3. Insertar nuevas variantes
  const variantRows = variants.map((v, idx) => ({
    product_id: parentId,
    title: v.label,
    sku: v.sku,
    retail_price: v.price,
    stock: v.stock,
    fulfillment_mode: "own_stock",
    stock_verified_at: now,
    supplier_available: false,
    image_url: v.image,
    is_active: true,
    options: { [optionName]: v.label },
    display_order: idx,
    updated_at: now
  }));

  const { error: insErr } = await supabase.from("product_variants").insert(variantRows);
  if (insErr) {
    console.error("  Error insertando variantes:", insErr);
    return;
  }
  console.log(`  ✓ Insertadas ${variantRows.length} variantes exitosamente.`);

  // 4. Desactivar producto redundante
  await supabase
    .from("products")
    .update({ is_active: false, updated_at: now })
    .eq("id", redundantId);
  console.log(`  ✓ Desactivado producto redundante [${redundantId}].`);
}

async function run() {
  console.log("=== UNIFICACIÓN DINÁMICA DE VARIANTES ===");

  // 1. Cosmética Coreana:
  // A. SKIN1004 Toning Toner
  await unifyPair({
    search1: "%Centella Toning Toner 210%",
    label1: "210 ml",
    search2: "%Centella Toning Toner 30%",
    label2: "30 ml",
    parentTitle: "SKIN1004 Madagascar Centella Toning Toner",
    parentSlug: "skin1004-madagascar-centella-toning-toner",
    optionName: "Presentación"
  });

  // B. SKIN1004 Poremizing Fresh Ampoule
  await unifyPair({
    search1: "%Poremizing Fresh Ampoule 100%",
    label1: "100 ml",
    search2: "%Poremizing Fresh Ampoule 50%",
    label2: "50 ml",
    parentTitle: "SKIN1004 Madagascar Centella Poremizing Fresh Ampoule",
    parentSlug: "skin1004-madagascar-centella-poremizing-fresh-ampoule",
    optionName: "Presentación"
  });

  // C. SKIN1004 Hyalu-Cica Sleeping Pack
  await unifyPair({
    search1: "%Hyalu-Cica Sleeping Pack 100%",
    label1: "100 ml",
    search2: "%Hyalu-Cica Sleeping Pack 30%",
    label2: "30 ml",
    parentTitle: "SKIN1004 Madagascar Centella Hyalu-Cica Sleeping Pack",
    parentSlug: "skin1004-madagascar-centella-hyalu-cica-sleeping-pack",
    optionName: "Presentación"
  });

  // D. SKIN1004 Hyalu-Cica Water-Fit Sun Serum
  await unifyPair({
    search1: "%Water-Fit Sun Serum 50%",
    label1: "50 ml",
    search2: "%Water-Fit Sun Serum 15%",
    label2: "15 ml",
    parentTitle: "SKIN1004 Madagascar Centella Hyalu-Cica Water-Fit Sun Serum",
    parentSlug: "skin1004-madagascar-centella-hyalu-cica-water-fit-sun-serum",
    optionName: "Presentación"
  });

  // E. Medicube Hypochlorous Acid Daily Facial Spray
  await unifyPair({
    search1: "%Hypochlorous Acid Daily Facial Spray 125%",
    label1: "125 ml",
    search2: "%Hypochlorous Acid Daily Facial Spray 50%",
    label2: "50 ml",
    parentTitle: "Medicube Hypochlorous Acid Daily Facial Spray",
    parentSlug: "medicube-hypochlorous-acid-daily-facial-spray",
    optionName: "Presentación"
  });

  // F. Medicube Collagen Jelly Cream
  await unifyPair({
    search1: "%Collagen Jelly Cream 110%",
    label1: "110 ml",
    search2: "%Collagen Jelly Cream 50%",
    label2: "50 ml",
    parentTitle: "Medicube Collagen Jelly Cream",
    parentSlug: "medicube-collagen-jelly-cream",
    optionName: "Presentación"
  });

  // 2. Herramientas:
  // A. Total Medidor láser de distancia
  await unifyPair({
    search1: "%Total Medidor l%ser%35m%",
    label1: "35 metros",
    search2: "%Total Medidor l%ser%85m%",
    label2: "85 metros",
    parentTitle: "Total Medidor láser de distancia",
    parentSlug: "total-medidor-laser-de-distancia",
    optionName: "Alcance"
  });

  // B. Total Soldadora inverter MMA
  await unifyPair({
    search1: "%Soldadora inverter MMA 160A%",
    label1: "160A",
    search2: "%Soldadora inverter MMA 250A%",
    label2: "250A",
    parentTitle: "Total Soldadora inverter MMA Industrial",
    parentSlug: "total-soldadora-inverter-mma-industrial",
    optionName: "Corriente"
  });

  // C. Total Taladro percutor y atornillador brushless 20V
  await unifyPair({
    search1: "%Taladro percutor y atornillador brushless 20V 55Nm%",
    label1: "55 Nm",
    search2: "%Taladro percutor y atornillador brushless 20V 66Nm%",
    label2: "66 Nm",
    parentTitle: "Total Taladro percutor y atornillador brushless 20V",
    parentSlug: "total-taladro-percutor-y-atornillador-brushless-20v",
    optionName: "Torque"
  });

  // D. Wadfow Aspiradora seco y húmedo
  await unifyPair({
    search1: "%Wadfow Aspiradora seco y h%medo 30L%",
    label1: "30 Litros (1200W)",
    search2: "%Wadfow Aspiradora seco y h%medo 35L%",
    label2: "35 Litros (1100W)",
    parentTitle: "Wadfow Aspiradora seco y húmedo",
    parentSlug: "wadfow-aspiradora-seco-y-humedo",
    optionName: "Capacidad"
  });

  // E. Wadfow Sierra caladora
  await unifyPair({
    search1: "%Wadfow Sierra caladora 400W%",
    label1: "400 W",
    search2: "%Wadfow Sierra caladora 570W%",
    label2: "570 W Pendular",
    parentTitle: "Wadfow Sierra caladora",
    parentSlug: "wadfow-sierra-caladora",
    optionName: "Potencia"
  });

  // F. Total Rotomartillo brushless 20V
  await unifyPair({
    search1: "%Rotomartillo brushless 20V 2,4J%",
    label1: "2,4 Joules",
    search2: "%Rotomartillo brushless 20V 4,5J%",
    label2: "4,5 Joules",
    parentTitle: "Total Rotomartillo brushless 20V SDS Plus",
    parentSlug: "total-rotomartillo-brushless-20v-sds-plus",
    optionName: "Impacto"
  });

  console.log("\n✓ Todas las unificaciones dinámicas se completaron.");
}

run().catch(console.error);
