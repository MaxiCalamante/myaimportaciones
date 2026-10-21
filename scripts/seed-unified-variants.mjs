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
  console.log("Starting unified variants loading...");

  // 1. Get Categories
  const { data: subcatSmartphones } = await supabase.from("categories").select("id").eq("slug", "electronica-smartphones").single();
  const { data: catElectronica } = await supabase.from("categories").select("id").eq("slug", "electronica").single();

  const smartphonesId = subcatSmartphones?.id || catElectronica?.id;
  const electronicaId = catElectronica?.id;

  const UNIFIED_PRODUCTS = [
    // -------------------------------------------------------------
    // APPLE IPHONE 16
    // -------------------------------------------------------------
    {
      slug: "apple-iphone-16",
      title: "Apple iPhone 16",
      brand: "Apple",
      model: "iPhone 16",
      category_id: smartphonesId,
      description: "Apple iPhone 16 con chip A18, Control de Cámara, cámara Fusion de 48 MP y diseño de aluminio de grado aeroespacial. Disponible en colores exclusivos y distintas capacidades de almacenamiento.",
      retail_price: 1348500,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ed662c82a4a05d39e5a.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ed662c82a4a05d39e5a.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/1037ecac543bbac7fcdc.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4da30af02bbfdd685255.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Azul ultramar", "Blanco", "Negro", "Rosa", "Verde azulado"] },
        { name: "Capacidad", values: ["128 GB", "256 GB"] }
      ],
      variants: [
        {
          title: "Azul ultramar · 128 GB",
          options: { Color: "Azul ultramar", Capacidad: "128 GB" },
          retail_price: 1503500,
          sku: "IPH16-128-BLU",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ed662c82a4a05d39e5a.jpg"
        },
        {
          title: "Blanco · 128 GB",
          options: { Color: "Blanco", Capacidad: "128 GB" },
          retail_price: 1532500,
          sku: "IPH16-128-WHT",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg"
        },
        {
          title: "Negro · 128 GB",
          options: { Color: "Negro", Capacidad: "128 GB" },
          retail_price: 1532500,
          sku: "IPH16-128-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg"
        },
        {
          title: "Rosa · 128 GB",
          options: { Color: "Rosa", Capacidad: "128 GB" },
          retail_price: 1416300,
          sku: "IPH16-128-PNK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/1037ecac543bbac7fcdc.jpg"
        },
        {
          title: "Verde azulado · 128 GB",
          options: { Color: "Verde azulado", Capacidad: "128 GB" },
          retail_price: 1503500,
          sku: "IPH16-128-TEL",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4da30af02bbfdd685255.jpg"
        },
        {
          title: "Negro · 256 GB",
          options: { Color: "Negro", Capacidad: "256 GB" },
          retail_price: 1445300,
          sku: "IPH16-256-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg"
        }
      ]
    },

    // -------------------------------------------------------------
    // APPLE IPHONE 17
    // -------------------------------------------------------------
    {
      slug: "apple-iphone-17",
      title: "Apple iPhone 17",
      brand: "Apple",
      model: "iPhone 17",
      category_id: smartphonesId,
      description: "Apple iPhone 17 con chip A19 Bionic, pantalla Super Retina XDR y acabado de cristal infundido. Nueva gama de colores pastel y conectividad eSIM de última generación.",
      retail_price: 1630900,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ed662c82a4a05d39e5a.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ed662c82a4a05d39e5a.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4da30af02bbfdd685255.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Azul neblina", "Blanco", "Lavanda", "Negro", "Verde salvia"] },
        { name: "Capacidad", values: ["256 GB"] }
      ],
      variants: [
        {
          title: "Azul neblina · 256 GB",
          options: { Color: "Azul neblina", Capacidad: "256 GB" },
          retail_price: 1695100,
          sku: "IPH17-256-BLU",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ed662c82a4a05d39e5a.jpg"
        },
        {
          title: "Blanco · 256 GB",
          options: { Color: "Blanco", Capacidad: "256 GB" },
          retail_price: 1861900,
          sku: "IPH17-256-WHT",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg"
        },
        {
          title: "Lavanda · 256 GB",
          options: { Color: "Lavanda", Capacidad: "256 GB" },
          retail_price: 1712900,
          sku: "IPH17-256-LAV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/1037ecac543bbac7fcdc.jpg"
        },
        {
          title: "Negro · 256 GB",
          options: { Color: "Negro", Capacidad: "256 GB" },
          retail_price: 1861900,
          sku: "IPH17-256-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg"
        },
        {
          title: "Verde salvia · 256 GB",
          options: { Color: "Verde salvia", Capacidad: "256 GB" },
          retail_price: 1842500,
          sku: "IPH17-256-GRN",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4da30af02bbfdd685255.jpg"
        }
      ]
    },

    // -------------------------------------------------------------
    // APPLE IPHONE 17 PRO MAX
    // -------------------------------------------------------------
    {
      slug: "apple-iphone-17-pro-max",
      title: "Apple iPhone 17 Pro Max",
      brand: "Apple",
      model: "iPhone 17 Pro Max",
      category_id: smartphonesId,
      description: "El máximo rendimiento de Apple con chip A19 Pro, titanio de grado 5 y lente periscópico de 10x. Pantalla de 6,9 pulgadas OLED ProMotion a 120 Hz.",
      retail_price: 2176400,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/1037ecac543bbac7fcdc.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/1037ecac543bbac7fcdc.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ed662c82a4a05d39e5a.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Naranja cósmico", "Azul profundo", "Plata"] },
        { name: "Capacidad", values: ["256 GB", "512 GB", "1 TB"] }
      ],
      variants: [
        {
          title: "Naranja cósmico · 256 GB",
          options: { Color: "Naranja cósmico", Capacidad: "256 GB" },
          retail_price: 2233400,
          sku: "IPH17PM-256-ORG",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/1037ecac543bbac7fcdc.jpg"
        },
        {
          title: "Azul profundo · 256 GB",
          options: { Color: "Azul profundo", Capacidad: "256 GB" },
          retail_price: 2233400,
          sku: "IPH17PM-256-BLU",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ed662c82a4a05d39e5a.jpg"
        },
        {
          title: "Plata · 256 GB",
          options: { Color: "Plata", Capacidad: "256 GB" },
          retail_price: 2233400,
          sku: "IPH17PM-256-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg"
        },
        {
          title: "Plata · 512 GB",
          options: { Color: "Plata", Capacidad: "512 GB" },
          retail_price: 2746800,
          sku: "IPH17PM-512-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg"
        },
        {
          title: "Naranja cósmico · 1 TB",
          options: { Color: "Naranja cósmico", Capacidad: "1 TB" },
          retail_price: 3450600,
          sku: "IPH17PM-1TB-ORG",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/1037ecac543bbac7fcdc.jpg"
        }
      ]
    },

    // -------------------------------------------------------------
    // APPLE MACBOOK AIR M5
    // -------------------------------------------------------------
    {
      slug: "apple-macbook-air-m5",
      title: "Apple MacBook Air M5",
      brand: "Apple",
      model: "MacBook Air M5",
      category_id: electronicaId,
      description: "La notebook más popular del mundo, ahora con la potencia revolucionaria del chip M5. Chasis de aluminio 100% reciclado ultradelgado, pantalla Liquid Retina y hasta 18 horas de autonomía.",
      retail_price: 2405600,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ed662c82a4a05d39e5a.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg"
      ],
      options_config: [
        { name: "Pantalla", values: ["13,6″", "15,3″"] },
        { name: "Color", values: ["Azul cielo", "Blanco estrella", "Medianoche", "Plata"] }
      ],
      variants: [
        {
          title: "13,6″ · Azul cielo",
          options: { Pantalla: "13,6″", Color: "Azul cielo" },
          retail_price: 2443800,
          sku: "MBA-13-BLU",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ed662c82a4a05d39e5a.jpg"
        },
        {
          title: "13,6″ · Blanco estrella",
          options: { Pantalla: "13,6″", Color: "Blanco estrella" },
          retail_price: 2452700,
          sku: "MBA-13-STR",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg"
        },
        {
          title: "13,6″ · Medianoche",
          options: { Pantalla: "13,6″", Color: "Medianoche" },
          retail_price: 2405600,
          sku: "MBA-13-MID",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg"
        },
        {
          title: "13,6″ · Plata",
          options: { Pantalla: "13,6″", Color: "Plata" },
          retail_price: 2405600,
          sku: "MBA-13-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg"
        },
        {
          title: "15,3″ · Azul cielo",
          options: { Pantalla: "15,3″", Color: "Azul cielo" },
          retail_price: 2800300,
          sku: "MBA-15-BLU",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ed662c82a4a05d39e5a.jpg"
        },
        {
          title: "15,3″ · Blanco estrella",
          options: { Pantalla: "15,3″", Color: "Blanco estrella" },
          retail_price: 2844800,
          sku: "MBA-15-STR",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg"
        },
        {
          title: "15,3″ · Medianoche",
          options: { Pantalla: "15,3″", Color: "Medianoche" },
          retail_price: 2800300,
          sku: "MBA-15-MID",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg"
        },
        {
          title: "15,3″ · Plata",
          options: { Pantalla: "15,3″", Color: "Plata" },
          retail_price: 2844800,
          sku: "MBA-15-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg"
        }
      ]
    },

    // -------------------------------------------------------------
    // SAMSUNG GALAXY A57 5G
    // -------------------------------------------------------------
    {
      slug: "samsung-galaxy-a57",
      title: "Samsung Galaxy A57 5G",
      brand: "Samsung",
      model: "Galaxy A57",
      category_id: smartphonesId,
      description: "Samsung Galaxy A57 5G con pantalla Super AMOLED de 120 Hz, cámara principal de 50 MP con OIS, resistencia al agua IP67 y batería de 5000 mAh. Disponible en 4 colores exclusivos.",
      retail_price: 699600,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ed662c82a4a05d39e5a.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ed662c82a4a05d39e5a.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/1037ecac543bbac7fcdc.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Azul hielo", "Azul marino", "Gris", "Violeta"] }
      ],
      variants: [
        {
          title: "Azul hielo",
          options: { Color: "Azul hielo" },
          retail_price: 699600,
          sku: "SAM-A57-ICE",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ed662c82a4a05d39e5a.jpg"
        },
        {
          title: "Azul marino",
          options: { Color: "Azul marino" },
          retail_price: 764200,
          sku: "SAM-A57-NAV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg"
        },
        {
          title: "Gris",
          options: { Color: "Gris" },
          retail_price: 699600,
          sku: "SAM-A57-GRY",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg"
        },
        {
          title: "Violeta",
          options: { Color: "Violeta" },
          retail_price: 706700,
          sku: "SAM-A57-VIO",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/1037ecac543bbac7fcdc.jpg"
        }
      ]
    },

    // -------------------------------------------------------------
    // SAMSUNG GALAXY A16
    // -------------------------------------------------------------
    {
      slug: "samsung-galaxy-a16",
      title: "Samsung Galaxy A16",
      brand: "Samsung",
      model: "Galaxy A16",
      category_id: smartphonesId,
      description: "Samsung Galaxy A16 con pantalla de 6,7 pulgadas FHD+ Super AMOLED, cámara triple de 50 MP y procesador octa-core. Batería de 5000 mAh para todo el día.",
      retail_price: 277000,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4da30af02bbfdd685255.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Gris", "Negro", "Verde"] }
      ],
      variants: [
        {
          title: "Gris",
          options: { Color: "Gris" },
          retail_price: 277000,
          sku: "SAM-A16-GRY",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4580c881d0b3899c0982.jpg"
        },
        {
          title: "Negro",
          options: { Color: "Negro" },
          retail_price: 277000,
          sku: "SAM-A16-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg"
        },
        {
          title: "Verde",
          options: { Color: "Verde" },
          retail_price: 277000,
          sku: "SAM-A16-GRN",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4da30af02bbfdd685255.jpg"
        }
      ]
    }
  ];

  for (const item of UNIFIED_PRODUCTS) {
    console.log(`\nProcessing unified product "${item.title}" (${item.slug})...`);

    // Check if product exists
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("slug", item.slug)
      .maybeSingle();

    let productId = existing?.id;

    if (!productId) {
      console.log(`Creating product "${item.title}"...`);
      const { data: inserted, error: insertErr } = await supabase
        .from("products")
        .insert({
          title: item.title,
          slug: item.slug,
          brand: item.brand,
          model: item.model,
          category_id: item.category_id,
          description: item.description,
          retail_price: item.retail_price,
          wholesale_price: 0,
          wholesale_min_qty: 1,
          stock: 10,
          stock_verified_at: new Date().toISOString(),
          fulfillment_mode: "supplier",
          supplier_available: true,
          is_active: true,
          is_featured: true,
          image_url: item.image_url,
          image_urls: item.image_urls,
          has_variants: true,
          options_config: item.options_config,
          tags: ["importado", item.brand.toLowerCase(), "tecnologia"]
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error(`Error inserting product ${item.slug}:`, insertErr.message);
        continue;
      }
      productId = inserted.id;
    } else {
      console.log(`Updating existing product "${item.title}" (${productId})...`);
      const { error: updateErr } = await supabase
        .from("products")
        .update({
          has_variants: true,
          options_config: item.options_config,
          image_urls: item.image_urls,
          is_active: true,
          is_featured: true,
          fulfillment_mode: "supplier",
          supplier_available: true,
          stock: 10,
          stock_verified_at: new Date().toISOString()
        })
        .eq("id", productId);

      if (updateErr) {
        console.error(`Error updating product ${item.slug}:`, updateErr.message);
        continue;
      }
    }

    // Upsert variants
    let order = 1;
    for (const v of item.variants) {
      const { data: existingVar } = await supabase
        .from("product_variants")
        .select("id")
        .eq("product_id", productId)
        .eq("title", v.title)
        .maybeSingle();

      if (existingVar) {
        console.log(`  Updating variant "${v.title}"...`);
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
        console.log(`  Inserting variant "${v.title}"...`);
        const { error: varErr } = await supabase
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
        if (varErr) {
          console.error(`  Error creating variant ${v.title}:`, varErr.message);
        }
      }
    }
  }

  console.log("\nFinished loading unified variants!");
}

run();
