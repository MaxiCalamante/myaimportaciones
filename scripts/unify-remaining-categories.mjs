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

async function executeUnification() {
  console.log("=================================================================");
  console.log("=== INICIANDO UNIFICACIÓN DE VARIANTES E IMÁGENES EN TIENDA ===");
  console.log("=================================================================\n");

  const now = new Date().toISOString();

  // ===================================================================
  // 1. CORRECCIONES DE IMAGEN Y DUPLICADOS EN COSMÉTICA COREANA
  // ===================================================================
  console.log("--- 1. Victoria's Secret Bare Vanilla: corregir imagen y desactivar duplicado ---");
  // A. Actualizar imagen de Bare Vanilla en el producto padre de mists
  const { data: mistParent } = await supabase
    .from("products")
    .select("id")
    .eq("slug", "victorias-secret-body-splash-mist-250-ml")
    .single();

  if (mistParent) {
    const realBareVanillaImg = "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-f12c98ec-b2c0-5d56-9288-46582b2693ec.jpg";
    const { error: bareErr } = await supabase
      .from("product_variants")
      .update({ image_url: realBareVanillaImg, updated_at: now })
      .eq("product_id", mistParent.id)
      .eq("title", "Bare Vanilla");

    if (bareErr) console.error("Error updating Bare Vanilla variant image:", bareErr);
    else console.log("✓ Variante Bare Vanilla actualizada con su foto exacta de Bare Vanilla.");
  }

  // B. Desactivar producto individual duplicado Bare Vanilla
  await supabase
    .from("products")
    .update({ is_active: false, updated_at: now })
    .eq("id", "ee047303-00c9-40fd-8ba0-b42c1fef6175");
  console.log("✓ Producto redundante 'BODY SPLASH VICTORIA\'S SECRET BARE VANILLA 250ML' desactivado.");

  // C. Desactivar duplicado Medicube Zero Pore One Day Cream
  await supabase
    .from("products")
    .update({ is_active: false, updated_at: now })
    .eq("id", "394724b8-38e6-50d2-9aa3-657700c4b613");
  console.log("✓ Producto redundante 'Medicube Zero Pore One Day Cream 50 ml' (394724b8) desactivado.");

  // D. Desactivar duplicado Celimax The Vita-A Retinal Shot
  await supabase
    .from("products")
    .update({ is_active: false, updated_at: now })
    .eq("id", "26d02aab-ef55-5058-ad83-6abce5fc4bb0");
  console.log("✓ Producto redundante 'Celimax The Vita-A Retinal Shot' (26d02aab) desactivado.");

  // ===================================================================
  // 2. AGRUPAR VICTORIA'S SECRET SHIMMER BODY LOTION (3 FRAGANCIAS)
  // ===================================================================
  console.log("\n--- 2. Agrupar Victoria's Secret Shimmer Loción Corporal Body Lotion 236 ml ---");
  const vsShimmerLotions = [
    {
      title: "Beach",
      sku: "MYA-VS-17478",
      price: 40500,
      image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-66588f19-bb25-5228-9d80-165601da16f8.jpg"
    },
    {
      title: "Bikini",
      sku: "MYA-VS-17479",
      price: 40500,
      image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-5ca81a57-3d44-5e54-8dc0-001038d8b1f9.jpg"
    },
    {
      title: "Tidal",
      sku: "MYA-VS-17480",
      price: 40500,
      image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-b740130b-d490-5616-a041-2224fbd598a8.jpg"
    }
  ];

  const parentVsShimmerId = "66588f19-bb25-5228-9d80-165601da16f8";
  await supabase
    .from("products")
    .update({
      title: "Victoria's Secret Shimmer Loción Corporal Body Lotion 236 ml",
      slug: "victorias-secret-shimmer-locion-corporal-body-lotion-236-ml",
      has_variants: true,
      options_config: [{ name: "Fragancia", values: ["Beach", "Bikini", "Tidal"] }],
      retail_price: 40500,
      image_urls: vsShimmerLotions.map(v => v.image),
      is_active: true,
      updated_at: now
    })
    .eq("id", parentVsShimmerId);

  await supabase.from("product_variants").delete().eq("product_id", parentVsShimmerId);

  const vsShimmerVarRows = vsShimmerLotions.map((v, i) => ({
    product_id: parentVsShimmerId,
    title: v.title,
    sku: v.sku,
    retail_price: v.price,
    stock: 5,
    fulfillment_mode: "own_stock",
    stock_verified_at: now,
    supplier_available: false,
    image_url: v.image,
    is_active: true,
    options: { Fragancia: v.title },
    display_order: i,
    updated_at: now
  }));
  await supabase.from("product_variants").insert(vsShimmerVarRows);
  await supabase.from("products").update({ is_active: false, updated_at: now }).in("id", [
    "5ca81a57-3d44-5e54-8dc0-001038d8b1f9",
    "b740130b-d490-5616-a041-2224fbd598a8"
  ]);
  console.log("✓ Victoria's Secret Shimmer Loción Corporal agrupada con Beach, Bikini y Tidal.");

  // Helper para agrupar dos presentaciones (ej. 30ml / 200ml)
  async function unifySizes({ parentId, redundantId, parentTitle, parentSlug, optionName, variants }) {
    console.log(`\n--- Unificando tamaños: ${parentTitle} ---`);
    await supabase
      .from("products")
      .update({
        title: parentTitle,
        slug: parentSlug,
        has_variants: true,
        options_config: [{ name: optionName, values: variants.map(v => v.label) }],
        retail_price: Math.min(...variants.map(v => v.price)),
        image_url: variants[0].image,
        image_urls: variants.map(v => v.image),
        is_active: true,
        updated_at: now
      })
      .eq("id", parentId);

    await supabase.from("product_variants").delete().eq("product_id", parentId);

    const rows = variants.map((v, i) => ({
      product_id: parentId,
      title: v.label,
      sku: v.sku,
      retail_price: v.price,
      stock: v.stock || 5,
      fulfillment_mode: "own_stock",
      stock_verified_at: now,
      supplier_available: false,
      image_url: v.image,
      is_active: true,
      options: { [optionName]: v.label },
      display_order: i,
      updated_at: now
    }));

    const { error: insErr } = await supabase.from("product_variants").insert(rows);
    if (insErr) console.error(`Error inserting variants for ${parentTitle}:`, insErr);
    else console.log(`✓ Insertadas ${rows.length} variantes para ${parentTitle}.`);

    if (redundantId) {
      await supabase.from("products").update({ is_active: false, updated_at: now }).eq("id", redundantId);
      console.log(`✓ Desactivado producto individual redundante (${redundantId}).`);
    }
  }

  // ===================================================================
  // 3. AGRUPAR MULTI-TAMAÑOS EN COSMÉTICA COREANA
  // ===================================================================
  // A. SKIN1004 Madagascar Centella Light Cleansing Oil
  await unifySizes({
    parentId: "753b73f6-1ac4-5eea-a107-410bc854bca2",
    redundantId: "f6d809c0-dc2e-5f99-a9c1-7cf6eb949b28",
    parentTitle: "SKIN1004 Madagascar Centella Light Cleansing Oil",
    parentSlug: "skin1004-madagascar-centella-light-cleansing-oil",
    optionName: "Presentación",
    variants: [
      {
        label: "30 ml",
        price: 32400,
        sku: "MYA-KB-202",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-kbeauty-20261001-202.jpg"
      },
      {
        label: "200 ml",
        price: 39800,
        sku: "MYA-KB-054",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-cosmetics-fix-20261001-54.jpg"
      }
    ]
  });

  // B. SKIN1004 Madagascar Centella Toning Toner
  await unifySizes({
    parentId: "b259650b-9c4c-5674-8b2b-586fa6efd1b9",
    redundantId: "024b3fe4-0e31-5be0-a33f-f903746c1e55",
    parentTitle: "SKIN1004 Madagascar Centella Toning Toner",
    parentSlug: "skin1004-madagascar-centella-toning-toner",
    optionName: "Presentación",
    variants: [
      {
        label: "30 ml",
        price: 18100,
        sku: "MYA-KB-201",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-kbeauty-20261001-201.jpg"
      },
      {
        label: "210 ml",
        price: 38200,
        sku: "MYA-KB-001",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-kbeauty-20261001-1.jpg"
      }
    ]
  });

  // C. SKIN1004 Madagascar Centella Poremizing Fresh Ampoule
  await unifySizes({
    parentId: "c5ec63c1-0c57-55e1-872f-5b65f4d1e27a",
    redundantId: "1908c445-562a-5b1d-ad16-1f7481fec3b5",
    parentTitle: "SKIN1004 Madagascar Centella Poremizing Fresh Ampoule",
    parentSlug: "skin1004-madagascar-centella-poremizing-fresh-ampoule",
    optionName: "Presentación",
    variants: [
      {
        label: "50 ml",
        price: 43100,
        sku: "MYA-KB-195",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-kbeauty-20261001-195.jpg"
      },
      {
        label: "100 ml",
        price: 48500,
        sku: "MYA-KB-057",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-kbeauty-20261001-57.jpg"
      }
    ]
  });

  // D. SKIN1004 Madagascar Centella Hyalu-Cica Sleeping Pack
  await unifySizes({
    parentId: "aa6f28bc-589f-52ad-bb7f-71ca33f675bc",
    redundantId: "fb38b0cd-a2d5-5cf0-9b4e-e17ee869ba0f",
    parentTitle: "SKIN1004 Madagascar Centella Hyalu-Cica Sleeping Pack",
    parentSlug: "skin1004-madagascar-centella-hyalu-cica-sleeping-pack",
    optionName: "Presentación",
    variants: [
      {
        label: "30 ml",
        price: 18990,
        sku: "MYA-KB-009",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-kbeauty-20261001-9.jpg"
      },
      {
        label: "100 ml",
        price: 48200,
        sku: "MYA-KB-010",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-kbeauty-20261001-10.jpg"
      }
    ]
  });

  // E. SKIN1004 Madagascar Centella Hyalu-Cica Water-Fit Sun Serum
  await unifySizes({
    parentId: "c91003f0-fc96-5fc1-aa9c-b3a6a1a1f0a1",
    redundantId: "7c209919-61f2-51e0-bdf1-b8423f5b2b2b",
    parentTitle: "SKIN1004 Madagascar Centella Hyalu-Cica Water-Fit Sun Serum",
    parentSlug: "skin1004-madagascar-centella-hyalu-cica-water-fit-sun-serum",
    optionName: "Presentación",
    variants: [
      {
        label: "15 ml",
        price: 24900,
        sku: "MYA-KB-198",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-kbeauty-20261001-198.jpg"
      },
      {
        label: "50 ml",
        price: 61750,
        sku: "MYA-KB-184",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-kbeauty-20261001-184.jpg"
      }
    ]
  });

  // F. Medicube Hypochlorous Acid Daily Facial Spray
  await unifySizes({
    parentId: "62cc3221-50e8-5a21-995b-2401bc6086f6",
    redundantId: "2eebc109-7d8d-5654-8e39-16e6f494f6f7",
    parentTitle: "Medicube Hypochlorous Acid Daily Facial Spray",
    parentSlug: "medicube-hypochlorous-acid-daily-facial-spray",
    optionName: "Presentación",
    variants: [
      {
        label: "50 ml",
        price: 37700,
        sku: "MYA-KB-086",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-kbeauty-20261001-86.jpg"
      },
      {
        label: "125 ml",
        price: 48600,
        sku: "MYA-KB-087",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-kbeauty-20261001-87.jpg"
      }
    ]
  });

  // G. Medicube Collagen Jelly Cream
  await unifySizes({
    parentId: "d74e93dd-0ec0-53ef-b31c-b26a6b8f1c84",
    redundantId: "5e259db6-bb9b-5775-8025-a6a3b2fba642",
    parentTitle: "Medicube Collagen Jelly Cream",
    parentSlug: "medicube-collagen-jelly-cream",
    optionName: "Presentación",
    variants: [
      {
        label: "50 ml",
        price: 45400,
        sku: "MYA-KB-081",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-kbeauty-20261001-81.jpg"
      },
      {
        label: "110 ml",
        price: 58900,
        sku: "MYA-KB-082",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-kbeauty-20261001-82.jpg"
      }
    ]
  });

  // ===================================================================
  // 4. CUIDADO CAPILAR: DUPLICADOS Y VARIANTES
  // ===================================================================
  console.log("\n--- 4. Cuidado Capilar: desactivar duplicado Tsubaki Kit Cool Repair ---");
  await supabase
    .from("products")
    .update({ is_active: false, updated_at: now })
    .eq("id", "90f0ed0d-8fef-5248-bf70-a62c43c78073");
  console.log("✓ Producto redundante 'Shiseido Tsubaki Kit Premium Cool Repair' (90f0ed0d) desactivado.");

  // Shiseido Fino Premium Touch Hair Oil (Clásico vs Airy Smooth)
  await unifySizes({
    parentId: "15f1c8e0-a8f9-54f2-a5a3-1ced2f00d739",
    redundantId: "eb5b18a3-704b-529b-a6f2-ad018cedbb77",
    parentTitle: "Shiseido Fino Premium Touch Hair Oil Aceite Capilar 70 ml",
    parentSlug: "shiseido-fino-premium-touch-hair-oil-aceite-capilar-70-ml",
    optionName: "Tipo",
    variants: [
      {
        label: "Clásico Reparador",
        price: 57100,
        sku: "MYA-SHIS-17098",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-15f1c8e0-a8f9-54f2-a5a3-1ced2f00d739.jpg"
      },
      {
        label: "Airy Smooth (Toque Ligero)",
        price: 71100,
        sku: "MYA-SHIS-16216",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-eb5b18a3-704b-529b-a6f2-ad018cedbb77.jpg"
      }
    ]
  });

  // Shiseido Tsubaki Moist & Repair Shampoo (Botella vs Repuesto)
  await unifySizes({
    parentId: "43595d1d-b2da-59a9-a406-aa046be07c28",
    redundantId: "f3f8da86-e3e3-5e8a-a09e-dc6167c1ed0e",
    parentTitle: "Shiseido Tsubaki Premium Moist & Repair Shampoo",
    parentSlug: "shiseido-tsubaki-premium-moist-repair-shampoo",
    optionName: "Presentación",
    variants: [
      {
        label: "Repuesto Recarga 300 ml",
        price: 40500,
        sku: "MYA-SHIS-17150",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-f3f8da86-e3e3-5e8a-a09e-dc6167c1ed0e.jpg"
      },
      {
        label: "Botella con Dosificador 450 ml",
        price: 119700,
        sku: "MYA-SHIS-15779",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-43595d1d-b2da-59a9-a406-aa046be07c28.jpg"
      }
    ]
  });

  // Shiseido Tsubaki Moist & Repair Conditioner (Botella vs Repuesto)
  await unifySizes({
    parentId: "5e61c1d5-1e2d-5de9-a29b-1668755512a7",
    redundantId: "71c5cdc8-77b8-52da-a100-a7ce267fdd8f",
    parentTitle: "Shiseido Tsubaki Premium Moist & Repair Conditioner",
    parentSlug: "shiseido-tsubaki-premium-moist-repair-conditioner",
    optionName: "Presentación",
    variants: [
      {
        label: "Repuesto Recarga 300 ml",
        price: 40500,
        sku: "MYA-SHIS-17151",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-71c5cdc8-77b8-52da-a100-a7ce267fdd8f.jpg"
      },
      {
        label: "Botella con Dosificador 450 ml",
        price: 71100,
        sku: "MYA-SHIS-15780",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-5e61c1d5-1e2d-5de9-a29b-1668755512a7.jpg"
      }
    ]
  });

  // Shiseido Tsubaki EX Repair Shampoo (Botella vs Repuesto)
  await unifySizes({
    parentId: "376d2384-3859-58b2-9838-999a21b18dcf",
    redundantId: "a00d6cb2-7524-55e4-8423-1b38686296c9",
    parentTitle: "Shiseido Tsubaki Premium EX Damage Care & Repair Shampoo",
    parentSlug: "shiseido-tsubaki-premium-ex-damage-care-repair-shampoo",
    optionName: "Presentación",
    variants: [
      {
        label: "Repuesto Recarga 300 ml",
        price: 40500,
        sku: "MYA-SHIS-17149",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-a00d6cb2-7524-55e4-8423-1b38686296c9.jpg"
      },
      {
        label: "Botella con Dosificador 450 ml",
        price: 119700,
        sku: "MYA-SHIS-15774",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-376d2384-3859-58b2-9838-999a21b18dcf.jpg"
      }
    ]
  });

  // Shiseido Tsubaki EX Repair Conditioner (Botella vs Repuesto)
  await unifySizes({
    parentId: "88821e08-4e72-5368-8446-53fed101fa90",
    redundantId: "f5394e3d-2ec9-5c7a-83f6-574166455943",
    parentTitle: "Shiseido Tsubaki Premium EX Damage Care & Repair Conditioner",
    parentSlug: "shiseido-tsubaki-premium-ex-damage-care-repair-conditioner",
    optionName: "Presentación",
    variants: [
      {
        label: "Repuesto Recarga 300 ml",
        price: 40500,
        sku: "MYA-SHIS-17148",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-f5394e3d-2ec9-5c7a-83f6-574166455943.jpg"
      },
      {
        label: "Botella con Dosificador 450 ml",
        price: 71100,
        sku: "MYA-SHIS-15775",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-88821e08-4e72-5368-8446-53fed101fa90.jpg"
      }
    ]
  });

  // Shiseido Tsubaki Volume & Repair Shampoo (Botella vs Repuesto)
  await unifySizes({
    parentId: "90fdc4ae-e480-5e47-a9fc-351d0c0e2bcb",
    redundantId: "cb00c531-84ac-5d4f-893f-7e48137d4a6b",
    parentTitle: "Shiseido Tsubaki Premium Volume & Repair Shampoo",
    parentSlug: "shiseido-tsubaki-premium-volume-repair-shampoo",
    optionName: "Presentación",
    variants: [
      {
        label: "Repuesto Recarga 300 ml",
        price: 40500,
        sku: "MYA-SHIS-17152",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-cb00c531-84ac-5d4f-893f-7e48137d4a6b.jpg"
      },
      {
        label: "Botella con Dosificador 450 ml",
        price: 119700,
        sku: "MYA-SHIS-15778",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-90fdc4ae-e480-5e47-a9fc-351d0c0e2bcb.jpg"
      }
    ]
  });

  // Shiseido Tsubaki Volume & Repair Conditioner (Botella vs Repuesto)
  await unifySizes({
    parentId: "1fd92c05-ee1c-5b5e-bcde-b24cf0b77b16",
    redundantId: "3b7245e5-f156-5e29-9077-8861c04eb22f",
    parentTitle: "Shiseido Tsubaki Premium Volume & Repair Conditioner",
    parentSlug: "shiseido-tsubaki-premium-volume-repair-conditioner",
    optionName: "Presentación",
    variants: [
      {
        label: "Repuesto Recarga 300 ml",
        price: 40500,
        sku: "MYA-SHIS-17153",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-3b7245e5-f156-5e29-9077-8861c04eb22f.jpg"
      },
      {
        label: "Botella con Dosificador 450 ml",
        price: 71100,
        sku: "MYA-SHIS-16546",
        image: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-import-20261007-1fd92c05-ee1c-5b5e-bcde-b24cf0b77b16.jpg"
      }
    ]
  });

  // ===================================================================
  // 5. HERRAMIENTAS Y EQUIPAMIENTO: UNIFICACIÓN DE ESPECIFICACIONES
  // ===================================================================
  console.log("\n--- 5. Herramientas y Equipamiento: agrupar por potencia/alcance/capacidad ---");

  // A. Total Medidor láser de distancia (35m vs 85m)
  await unifySizes({
    parentId: "5b4d4bb3-2e46-5dd9-a5c7-9892c9082ef2",
    redundantId: "8a4a5fbf-4a9f-50b3-9eb1-71ec508770d1",
    parentTitle: "Total Medidor láser de distancia",
    parentSlug: "total-medidor-laser-de-distancia",
    optionName: "Alcance",
    variants: [
      {
        label: "35 metros",
        price: 45900,
        sku: "TMT53055",
        image: "https://www.totalherramientasoficial.com.py/img/50204/produtos/1500/a08067ba1476e2990e3c4dce7549251e.jpg"
      },
      {
        label: "85 metros",
        price: 77400,
        sku: "TMT570268",
        image: "https://www.totalherramientasoficial.com.py/img/50204/produtos/1500/a4b6832a4e7c093187f15256184a077b.jpg"
      }
    ]
  });

  // B. Total Soldadora inverter MMA (160A vs 250A)
  await unifySizes({
    parentId: "cb3322d8-bf97-5dbf-9b2f-ce100a0be3b3",
    redundantId: "ccbb28bd-9730-5ce5-92fa-0c15ae726354",
    parentTitle: "Total Soldadora inverter MMA Industrial",
    parentSlug: "total-soldadora-inverter-mma-industrial",
    optionName: "Corriente",
    variants: [
      {
        label: "160A",
        price: 337900,
        sku: "TW216069",
        image: "https://www.totalherramientasoficial.com.py/img/38318/produtos/1500/4266e5aa5fac770e5aafa0be1bf78deb.jpg"
      },
      {
        label: "250A",
        price: 378000,
        sku: "TW225069",
        image: "https://www.totalherramientasoficial.com.py/img/38318/produtos/1500/eeadbc1f67d3d9a6a2ec9a94b4ec8968.jpg"
      }
    ]
  });

  // C. Total Taladro percutor y atornillador brushless 20V (55Nm vs 66Nm)
  await unifySizes({
    parentId: "5e7b4e78-017e-52b0-b5bc-3079da674f1b",
    redundantId: "24fc326e-ff3a-5f8e-a9ba-7b79488e040c",
    parentTitle: "Total Taladro percutor y atornillador brushless 20V",
    parentSlug: "total-taladro-percutor-y-atornillador-brushless-20v",
    optionName: "Torque",
    variants: [
      {
        label: "55 Nm",
        price: 166900,
        sku: "TIDLI20558",
        image: "https://www.totalherramientasoficial.com.py/img/37994/produtos/1500/8fea9799b2b5365e2f816d3629336f72.jpg"
      },
      {
        label: "66 Nm",
        price: 185900,
        sku: "TIDLI20668",
        image: "https://www.totalherramientasoficial.com.py/img/37994/produtos/1500/d9498222c15e45ef674f33c66da9f9fe.jpg"
      }
    ]
  });

  // D. Wadfow Aspiradora seco y húmedo (30L vs 35L)
  await unifySizes({
    parentId: "3459fa6a-6052-54a8-9d89-434057e0fa8f",
    redundantId: "fcf4a47f-8ec0-53b0-bd5b-088f1ae8d75a",
    parentTitle: "Wadfow Aspiradora seco y húmedo",
    parentSlug: "wadfow-aspiradora-seco-y-humedo",
    optionName: "Capacidad",
    variants: [
      {
        label: "30 Litros · 1200W",
        price: 183900,
        sku: "WVR2A30",
        image: "https://www.totalherramientasoficial.com.py/img/37996/produtos/1500/0b040e5405ab3e5618fc638ebb89a325.jpg"
      },
      {
        label: "35 Litros · 1100W",
        price: 203900,
        sku: "WVR4A35",
        image: "https://www.totalherramientasoficial.com.py/img/37996/produtos/1500/5e4b0472641571670ff72a0f23436673.jpg"
      }
    ]
  });

  // E. Wadfow Sierra caladora (400W vs 570W)
  await unifySizes({
    parentId: "db5251b6-a67b-5c8e-a901-b755a9b73673",
    redundantId: "1b407cf7-8d07-5b2d-a2f0-e692a87515cf",
    parentTitle: "Wadfow Sierra caladora",
    parentSlug: "wadfow-sierra-caladora",
    optionName: "Potencia",
    variants: [
      {
        label: "400 W",
        price: 69900,
        sku: "WJS15401",
        image: "https://www.totalherramientasoficial.com.py/img/37996/produtos/1500/7d923947a44b8e3bff3c6b1d24a8004a.jpg"
      },
      {
        label: "570 W Pendular",
        price: 83600,
        sku: "WJS15571",
        image: "https://www.totalherramientasoficial.com.py/img/37996/produtos/1500/c8f9bc99d882efb64b5a0780b73090dd.jpg"
      }
    ]
  });

  // F. Total Rotomartillo brushless 20V (2,4J vs 4,5J)
  await unifySizes({
    parentId: "3bd43741-f703-5188-b4b1-b938501e7e44",
    redundantId: "db279b83-b26a-5431-a20c-7b7952aeb809",
    parentTitle: "Total Rotomartillo brushless 20V SDS Plus",
    parentSlug: "total-rotomartillo-brushless-20v-sds-plus",
    optionName: "Impacto",
    variants: [
      {
        label: "2,4 Joules",
        price: 343900,
        sku: "TRHLI202482",
        image: "https://www.totalherramientasoficial.com.py/img/37994/produtos/1500/1a72d66b014c750d36c9c2c0c284c04e.jpg"
      },
      {
        label: "4,5 Joules",
        price: 424900,
        sku: "TRHLI202862",
        image: "https://www.totalherramientasoficial.com.py/img/37994/produtos/1500/273857594e22f94abce1976d03dc7938.jpg"
      }
    ]
  });

  console.log("\n=================================================================");
  console.log("=== UNIFICACIÓN DE TODAS LAS CATEGORÍAS COMPLETADA CON ÉXITO ===");
  console.log("=================================================================\n");
}

executeUnification().catch(console.error);
