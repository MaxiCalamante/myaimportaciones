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
  console.log("=== UNIFICANDO IPHONE 17E, 17 PRO, 18 PRO, 18 PRO MAX ===");
  const { data: subcatSmartphones } = await supabase.from("categories").select("id").eq("slug", "electronica-smartphones").maybeSingle();
  const { data: catElectronica } = await supabase.from("categories").select("id").eq("slug", "electronica").single();
  const smartphonesId = subcatSmartphones?.id || catElectronica.id;

  const GROUPS = [
    // 1. Apple iPhone 17e
    {
      slug: "apple-iphone-17e",
      title: "Apple iPhone 17e",
      brand: "Apple",
      model: "iPhone 17e",
      category_id: smartphonesId,
      description: "Apple iPhone 17e con pantalla OLED de 6,1 pulgadas, chip A19 y acabado mate refinado. Gran autonomía y cámara Fusion de 48 MP.",
      retail_price: 1277900,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6b3403efd4138904afb3.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6b3403efd4138904afb3.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/13517108728ed455bbab.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/76117965fd4c1dc9c523.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Blanco", "Negro", "Rosa suave"] },
        { name: "Capacidad", values: ["256 GB"] }
      ],
      variants: [
        {
          title: "Blanco · 256 GB",
          options: { Color: "Blanco", Capacidad: "256 GB" },
          retail_price: 1285100,
          sku: "IPH17E-256-WHT",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6b3403efd4138904afb3.jpg"
        },
        {
          title: "Negro · 256 GB",
          options: { Color: "Negro", Capacidad: "256 GB" },
          retail_price: 1277900,
          sku: "IPH17E-256-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/13517108728ed455bbab.jpg"
        },
        {
          title: "Rosa suave · 256 GB",
          options: { Color: "Rosa suave", Capacidad: "256 GB" },
          retail_price: 1277900,
          sku: "IPH17E-256-PNK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/76117965fd4c1dc9c523.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().startsWith("apple iphone 17e ·")
    },

    // 2. Apple iPhone 17 Pro
    {
      slug: "apple-iphone-17-pro",
      title: "Apple iPhone 17 Pro",
      brand: "Apple",
      model: "iPhone 17 Pro",
      category_id: smartphonesId,
      description: "Apple iPhone 17 Pro con chasis de titanio forjado, chip A19 Pro y cámara Pro con teleobjetivo 5x y sensor quad-pixel. Pantalla ProMotion 120 Hz de máxima fluidez.",
      retail_price: 2105100,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/38dfecab65437b56d264.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/38dfecab65437b56d264.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Naranja cósmico"] },
        { name: "Capacidad", values: ["256 GB"] }
      ],
      variants: [
        {
          title: "Naranja cósmico · 256 GB",
          options: { Color: "Naranja cósmico", Capacidad: "256 GB" },
          retail_price: 2105100,
          sku: "IPH17P-256-ORG",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/38dfecab65437b56d264.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().startsWith("apple iphone 17 pro ·")
    },

    // 3. Apple iPhone 18 Pro
    {
      slug: "apple-iphone-18-pro",
      title: "Apple iPhone 18 Pro",
      brand: "Apple",
      model: "iPhone 18 Pro",
      category_id: smartphonesId,
      description: "Apple iPhone 18 Pro con chip A20 Pro, sistema de cámaras de estudio cinematográfico y diseño de titanio aeroespacial. Disponible en acabados Borgoña y Plata.",
      retail_price: 2570300,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6115d56bc79085f6bfba.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6115d56bc79085f6bfba.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/27342125e13750c6fdb6.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Borgoña", "Plata"] },
        { name: "Capacidad", values: ["256 GB", "512 GB"] }
      ],
      variants: [
        {
          title: "Borgoña · 256 GB",
          options: { Color: "Borgoña", Capacidad: "256 GB" },
          retail_price: 2584600,
          sku: "IPH18P-256-BUR",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6115d56bc79085f6bfba.jpg"
        },
        {
          title: "Plata · 256 GB",
          options: { Color: "Plata", Capacidad: "256 GB" },
          retail_price: 2570300,
          sku: "IPH18P-256-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/27342125e13750c6fdb6.jpg"
        },
        {
          title: "Borgoña · 512 GB",
          options: { Color: "Borgoña", Capacidad: "512 GB" },
          retail_price: 3080100,
          sku: "IPH18P-512-BUR",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6115d56bc79085f6bfba.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().startsWith("apple iphone 18 pro ·")
    },

    // 4. Apple iPhone 18 Pro Max
    {
      slug: "apple-iphone-18-pro-max",
      title: "Apple iPhone 18 Pro Max",
      brand: "Apple",
      model: "iPhone 18 Pro Max",
      category_id: smartphonesId,
      description: "Apple iPhone 18 Pro Max con pantalla OLED Super Retina XDR de 6,9 pulgadas, lente telefoto periscópica 10x y chip A20 Pro. La máxima expresión de tecnología móvil de Apple.",
      retail_price: 3078300,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/75e316d996a6c8674c81.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/75e316d996a6c8674c81.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/2aa813598cf16e550c92.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/b20f09043900fba0efcc.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/0dbfa8ee53a473ebfa1a.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Borgoña", "Glaciar", "Negro", "Plata"] },
        { name: "Capacidad", values: ["256 GB", "512 GB"] }
      ],
      variants: [
        {
          title: "Borgoña · 256 GB",
          options: { Color: "Borgoña", Capacidad: "256 GB" },
          retail_price: 3155000,
          sku: "IPH18PM-256-BUR",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/2aa813598cf16e550c92.jpg"
        },
        {
          title: "Negro · 256 GB",
          options: { Color: "Negro", Capacidad: "256 GB" },
          retail_price: 3078300,
          sku: "IPH18PM-256-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/75e316d996a6c8674c81.jpg"
        },
        {
          title: "Plata · 256 GB",
          options: { Color: "Plata", Capacidad: "256 GB" },
          retail_price: 3078300,
          sku: "IPH18PM-256-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/b20f09043900fba0efcc.jpg"
        },
        {
          title: "Glaciar · 512 GB",
          options: { Color: "Glaciar", Capacidad: "512 GB" },
          retail_price: 3319000,
          sku: "IPH18PM-512-GLA",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/0dbfa8ee53a473ebfa1a.jpg"
        },
        {
          title: "Negro · 512 GB",
          options: { Color: "Negro", Capacidad: "512 GB" },
          retail_price: 3319000,
          sku: "IPH18PM-512-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/75e316d996a6c8674c81.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().startsWith("apple iphone 18 pro max ·")
    }
  ];

  for (const group of GROUPS) {
    console.log(`\nProcesando grupo "${group.title}" (${group.slug})...`);

    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("slug", group.slug)
      .maybeSingle();

    let productId = existing?.id;

    if (!productId) {
      console.log(`  Creando producto padre "${group.title}"...`);
      const { data: inserted, error: insErr } = await supabase
        .from("products")
        .insert({
          title: group.title,
          slug: group.slug,
          brand: group.brand,
          model: group.model,
          category_id: group.category_id,
          description: group.description,
          retail_price: group.retail_price,
          wholesale_price: 0,
          wholesale_min_qty: 1,
          stock: 10,
          stock_verified_at: new Date().toISOString(),
          fulfillment_mode: "supplier",
          supplier_available: true,
          is_active: true,
          is_featured: true,
          image_url: group.image_url,
          image_urls: group.image_urls,
          has_variants: true,
          options_config: group.options_config,
          tags: ["importado", group.brand.toLowerCase(), "tecnologia"]
        })
        .select("id")
        .single();

      if (insErr) {
        console.error(`  Error creando producto padre:`, insErr.message);
        continue;
      }
      productId = inserted.id;
    } else {
      console.log(`  Actualizando producto padre existente [${productId}]...`);
      await supabase
        .from("products")
        .update({
          title: group.title,
          brand: group.brand,
          model: group.model,
          description: group.description,
          retail_price: group.retail_price,
          has_variants: true,
          options_config: group.options_config,
          image_url: group.image_url,
          image_urls: group.image_urls,
          is_active: true,
          fulfillment_mode: "supplier",
          supplier_available: true,
          stock: 10,
          stock_verified_at: new Date().toISOString()
        })
        .eq("id", productId);
    }

    let order = 1;
    for (const v of group.variants) {
      const { data: existingVar } = await supabase
        .from("product_variants")
        .select("id")
        .eq("product_id", productId)
        .eq("title", v.title)
        .maybeSingle();

      if (existingVar) {
        await supabase
          .from("product_variants")
          .update({
            retail_price: v.retail_price,
            sku: v.sku,
            options: v.options,
            image_url: v.image_url,
            is_active: true,
            stock: 5,
            stock_verified_at: new Date().toISOString(),
            fulfillment_mode: "supplier",
            supplier_available: true,
            display_order: order++
          })
          .eq("id", existingVar.id);
      } else {
        await supabase
          .from("product_variants")
          .insert({
            product_id: productId,
            title: v.title,
            retail_price: v.retail_price,
            wholesale_price: 0,
            stock: 5,
            stock_verified_at: new Date().toISOString(),
            fulfillment_mode: "supplier",
            supplier_available: true,
            sku: v.sku,
            image_url: v.image_url,
            is_active: true,
            options: v.options,
            display_order: order++
          });
      }
    }
    console.log(`  ✓ ${group.variants.length} variantes cargadas correctamente.`);

    if (group.redundantFilter) {
      const { data: allProds } = await supabase.from("products").select("id, title, is_active").neq("id", productId);
      const redundant = allProds.filter(p => group.redundantFilter(p));
      if (redundant.length > 0) {
        console.log(`  Desactivando ${redundant.length} publicaciones individuales redundantes...`);
        const redIds = redundant.map(p => p.id);
        await supabase.from("products").update({ is_active: false }).in("id", redIds);
        console.log(`  ✓ Desactivadas: ${redundant.map(p => `"${p.title}"`).join(", ")}`);
      }
    }
  }

  console.log("\n=== FINALIZADA UNIFICACIÓN ADICIONAL ===");
}

run().catch(console.error);
