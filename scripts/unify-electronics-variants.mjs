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
  console.log("=== INICIANDO UNIFICACIÓN DE ELECTRÓNICA EN VARIANTES ===");

  // 1. Obtener categorías
  const { data: subcatSmartphones } = await supabase.from("categories").select("id").eq("slug", "electronica-smartphones").maybeSingle();
  const { data: subcatComputacion } = await supabase.from("categories").select("id").eq("slug", "electronica-computacion").maybeSingle();
  const { data: catElectronica } = await supabase.from("categories").select("id").eq("slug", "electronica").single();

  const smartphonesId = subcatSmartphones?.id || catElectronica.id;
  const computacionId = subcatComputacion?.id || catElectronica.id;
  const electronicaId = catElectronica.id;

  // -------------------------------------------------------------------
  // A. NUEVAS PUBLICACIONES AGRUPADAS CON VARIANTES
  // -------------------------------------------------------------------
  const NEW_UNIFIED_GROUPS = [
    // 1. APPLE IMAC M4 24″
    {
      slug: "apple-imac-m4-24",
      title: "Apple iMac 24″ M4",
      brand: "Apple",
      model: "iMac 24″ M4",
      category_id: computacionId,
      description: "Apple iMac de 24 pulgadas con pantalla Retina 4.5K y la potencia revolucionaria del chip M4. Cámara Center Stage de 12 MP con Desk View, hasta cuatro puertos Thunderbolt 4 y diseño ultradelgado en vibrantes colores con Magic Keyboard y Magic Mouse a tono.",
      retail_price: 3232500,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/417d45a7d480ff3edf4a.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/417d45a7d480ff3edf4a.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/e9d9b30fffb84b2fd4aa.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/bddc2db949c51668730e.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Azul", "Plata", "Verde"] },
        { name: "Configuración", values: [
          "16 GB · 256 GB (2 puertos)",
          "16 GB · 256 GB (4 puertos)",
          "16 GB · 512 GB (4 puertos)",
          "24 GB · 512 GB (4 puertos)"
        ] }
      ],
      variants: [
        {
          title: "Azul · 16 GB · 256 GB (2 puertos)",
          options: { Color: "Azul", Configuración: "16 GB · 256 GB (2 puertos)" },
          retail_price: 3232500,
          sku: "IMAC24-M4-BLU-16-256-2P",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/417d45a7d480ff3edf4a.jpg"
        },
        {
          title: "Azul · 16 GB · 256 GB (4 puertos)",
          options: { Color: "Azul", Configuración: "16 GB · 256 GB (4 puertos)" },
          retail_price: 3608400,
          sku: "IMAC24-M4-BLU-16-256-4P",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/417d45a7d480ff3edf4a.jpg"
        },
        {
          title: "Azul · 16 GB · 512 GB (4 puertos)",
          options: { Color: "Azul", Configuración: "16 GB · 512 GB (4 puertos)" },
          retail_price: 4065800,
          sku: "IMAC24-M4-BLU-16-512-4P",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/417d45a7d480ff3edf4a.jpg"
        },
        {
          title: "Azul · 24 GB · 512 GB (4 puertos)",
          options: { Color: "Azul", Configuración: "24 GB · 512 GB (4 puertos)" },
          retail_price: 4510500,
          sku: "IMAC24-M4-BLU-24-512-4P",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/417d45a7d480ff3edf4a.jpg"
        },
        {
          title: "Plata · 16 GB · 256 GB (2 puertos)",
          options: { Color: "Plata", Configuración: "16 GB · 256 GB (2 puertos)" },
          retail_price: 3232500,
          sku: "IMAC24-M4-SLV-16-256-2P",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/e9d9b30fffb84b2fd4aa.jpg"
        },
        {
          title: "Plata · 16 GB · 256 GB (4 puertos)",
          options: { Color: "Plata", Configuración: "16 GB · 256 GB (4 puertos)" },
          retail_price: 3608400,
          sku: "IMAC24-M4-SLV-16-256-4P",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/e9d9b30fffb84b2fd4aa.jpg"
        },
        {
          title: "Plata · 16 GB · 512 GB (4 puertos)",
          options: { Color: "Plata", Configuración: "16 GB · 512 GB (4 puertos)" },
          retail_price: 4083700,
          sku: "IMAC24-M4-SLV-16-512-4P",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/e9d9b30fffb84b2fd4aa.jpg"
        },
        {
          title: "Verde · 16 GB · 256 GB (2 puertos)",
          options: { Color: "Verde", Configuración: "16 GB · 256 GB (2 puertos)" },
          retail_price: 3232500,
          sku: "IMAC24-M4-GRN-16-256-2P",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/bddc2db949c51668730e.jpg"
        },
        {
          title: "Verde · 16 GB · 256 GB (4 puertos)",
          options: { Color: "Verde", Configuración: "16 GB · 256 GB (4 puertos)" },
          retail_price: 3566900,
          sku: "IMAC24-M4-GRN-16-256-4P",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/bddc2db949c51668730e.jpg"
        },
        {
          title: "Verde · 16 GB · 512 GB (4 puertos)",
          options: { Color: "Verde", Configuración: "16 GB · 512 GB (4 puertos)" },
          retail_price: 4065800,
          sku: "IMAC24-M4-GRN-16-512-4P",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/bddc2db949c51668730e.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().includes("imac m4")
    },

    // 2. APPLE MACBOOK NEO 13″
    {
      slug: "apple-macbook-neo-13",
      title: "Apple MacBook Neo 13″",
      brand: "Apple",
      model: "MacBook Neo 13″",
      category_id: computacionId,
      description: "Apple MacBook Neo de 13 pulgadas, liviana, ágil y versátil para el día a día con diseño unibody elegante, pantalla Retina y batería de larga duración. Disponible en acabado Cítrico y Plata.",
      retail_price: 1353100,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/fa23b39f6a4226d14afc.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/fa23b39f6a4226d14afc.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/c1b61b8e302e84c3fad6.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Cítrico", "Plata"] },
        { name: "Capacidad", values: ["256 GB", "512 GB"] }
      ],
      variants: [
        {
          title: "Cítrico · 256 GB",
          options: { Color: "Cítrico", Capacidad: "256 GB" },
          retail_price: 1353100,
          sku: "NEO13-256-CIT",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/fa23b39f6a4226d14afc.jpg"
        },
        {
          title: "Cítrico · 512 GB",
          options: { Color: "Cítrico", Capacidad: "512 GB" },
          retail_price: 1503500,
          sku: "NEO13-512-CIT",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/fa23b39f6a4226d14afc.jpg"
        },
        {
          title: "Plata · 512 GB",
          options: { Color: "Plata", Capacidad: "512 GB" },
          retail_price: 1653800,
          sku: "NEO13-512-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/c1b61b8e302e84c3fad6.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().includes("macbook neo")
    },

    // 3. APPLE MACBOOK PRO M5 (14″ / 16″)
    {
      slug: "apple-macbook-pro-m5",
      title: "Apple MacBook Pro M5 (14″ / 16″)",
      brand: "Apple",
      model: "MacBook Pro M5",
      category_id: computacionId,
      description: "Apple MacBook Pro con la potencia colosal de los chips M5, M5 Pro y M5 Max. Pantalla Liquid Retina XDR de referencia con ProMotion 120 Hz, hasta 36 GB de memoria unificada y conectividad profesional completa.",
      retail_price: 3608400,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6160e1c9d4120bccb619.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6160e1c9d4120bccb619.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6e4292fa6849998fafd2.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/22b9bfd5919c5bb1b7c8.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/d94f9a1350439a436a3e.jpg"
      ],
      options_config: [
        { name: "Pantalla y Chip", values: ["14,2″ · Chip M5", "14,2″ · Chip M5 Pro", "16,2″ · Chip M5 Max"] },
        { name: "Configuración", values: ["16 GB / 1 TB", "24 GB / 1 TB", "24 GB / 2 TB", "36 GB / 2 TB"] },
        { name: "Color", values: ["Plata", "Negro espacial"] }
      ],
      variants: [
        {
          title: "14,2″ M5 · 16 GB / 1 TB · Plata",
          options: { "Pantalla y Chip": "14,2″ · Chip M5", "Configuración": "16 GB / 1 TB", "Color": "Plata" },
          retail_price: 3608400,
          sku: "MBP14-M5-16-1TB-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6160e1c9d4120bccb619.jpg"
        },
        {
          title: "14,2″ M5 · 24 GB / 1 TB · Negro espacial",
          options: { "Pantalla y Chip": "14,2″ · Chip M5", "Configuración": "24 GB / 1 TB", "Color": "Negro espacial" },
          retail_price: 3984200,
          sku: "MBP14-M5-24-1TB-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6e4292fa6849998fafd2.jpg"
        },
        {
          title: "14,2″ M5 · 24 GB / 1 TB · Plata",
          options: { "Pantalla y Chip": "14,2″ · Chip M5", "Configuración": "24 GB / 1 TB", "Color": "Plata" },
          retail_price: 3984200,
          sku: "MBP14-M5-24-1TB-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6160e1c9d4120bccb619.jpg"
        },
        {
          title: "14,2″ M5 Pro · 24 GB / 1 TB · Plata",
          options: { "Pantalla y Chip": "14,2″ · Chip M5 Pro", "Configuración": "24 GB / 1 TB", "Color": "Plata" },
          retail_price: 4552500,
          sku: "MBP14-PRO-24-1TB-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6160e1c9d4120bccb619.jpg"
        },
        {
          title: "14,2″ M5 Pro · 24 GB / 2 TB · Negro espacial",
          options: { "Pantalla y Chip": "14,2″ · Chip M5 Pro", "Configuración": "24 GB / 2 TB", "Color": "Negro espacial" },
          retail_price: 5187000,
          sku: "MBP14-PRO-24-2TB-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6e4292fa6849998fafd2.jpg"
        },
        {
          title: "14,2″ M5 Pro · 24 GB / 2 TB · Plata",
          options: { "Pantalla y Chip": "14,2″ · Chip M5 Pro", "Configuración": "24 GB / 2 TB", "Color": "Plata" },
          retail_price: 5187000,
          sku: "MBP14-PRO-24-2TB-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6160e1c9d4120bccb619.jpg"
        },
        {
          title: "16,2″ M5 Max · 36 GB / 2 TB · Negro espacial",
          options: { "Pantalla y Chip": "16,2″ · Chip M5 Max", "Configuración": "36 GB / 2 TB", "Color": "Negro espacial" },
          retail_price: 7675400,
          sku: "MBP16-MAX-36-2TB-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/d94f9a1350439a436a3e.jpg"
        },
        {
          title: "16,2″ M5 Max · 36 GB / 2 TB · Plata",
          options: { "Pantalla y Chip": "16,2″ · Chip M5 Max", "Configuración": "36 GB / 2 TB", "Color": "Plata" },
          retail_price: 7675400,
          sku: "MBP16-MAX-36-2TB-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/22b9bfd5919c5bb1b7c8.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().includes("macbook pro m5")
    },

    // 4. APPLE IPAD A16 (11.ª GENERACIÓN)
    {
      slug: "apple-ipad-a16-11th-gen",
      title: "Apple iPad A16 (11.ª generación)",
      brand: "Apple",
      model: "iPad 11.ª gen",
      category_id: electronicaId,
      description: "Apple iPad de 11.ª generación con potente chip A16 Bionic, pantalla Liquid Retina de 10,9 pulgadas, compatibilidad con Apple Pencil y Magic Keyboard Folio. Disponible en atractivos colores y capacidades de 128 GB y 256 GB.",
      retail_price: 826900,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/44284f521ca87b27abbd.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/44284f521ca87b27abbd.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/102efd6d7f45e7b9aeba.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/c9323e6baf2ad4037261.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/13505de53c216cd6d952.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Amarillo", "Azul", "Plata", "Rosa"] },
        { name: "Capacidad", values: ["128 GB", "256 GB"] }
      ],
      variants: [
        {
          title: "Amarillo · 128 GB",
          options: { Color: "Amarillo", Capacidad: "128 GB" },
          retail_price: 826900,
          sku: "IPAD11-128-YEL",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/102efd6d7f45e7b9aeba.jpg"
        },
        {
          title: "Azul · 128 GB",
          options: { Color: "Azul", Capacidad: "128 GB" },
          retail_price: 826900,
          sku: "IPAD11-128-BLU",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/44284f521ca87b27abbd.jpg"
        },
        {
          title: "Plata · 128 GB",
          options: { Color: "Plata", Capacidad: "128 GB" },
          retail_price: 830600,
          sku: "IPAD11-128-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/c9323e6baf2ad4037261.jpg"
        },
        {
          title: "Rosa · 128 GB",
          options: { Color: "Rosa", Capacidad: "128 GB" },
          retail_price: 826900,
          sku: "IPAD11-128-PNK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/13505de53c216cd6d952.jpg"
        },
        {
          title: "Azul · 256 GB",
          options: { Color: "Azul", Capacidad: "256 GB" },
          retail_price: 1052400,
          sku: "IPAD11-256-BLU",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/44284f521ca87b27abbd.jpg"
        },
        {
          title: "Plata · 256 GB",
          options: { Color: "Plata", Capacidad: "256 GB" },
          retail_price: 1052400,
          sku: "IPAD11-256-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/c9323e6baf2ad4037261.jpg"
        },
        {
          title: "Rosa · 256 GB",
          options: { Color: "Rosa", Capacidad: "256 GB" },
          retail_price: 1052400,
          sku: "IPAD11-256-PNK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/13505de53c216cd6d952.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().includes("ipad a16")
    },

    // 5. APPLE IPAD AIR 11″ M4
    {
      slug: "apple-ipad-air-11-m4",
      title: "Apple iPad Air 11″ M4",
      brand: "Apple",
      model: "iPad Air 11″ M4",
      category_id: electronicaId,
      description: "Apple iPad Air de 11 pulgadas con la increíble velocidad del chip Apple M4, pantalla Liquid Retina antirreflejo y compatibilidad con Apple Pencil Pro y Magic Keyboard.",
      retail_price: 1353100,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/7eb93aa12d4d1af6b544.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/7eb93aa12d4d1af6b544.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/3ea977529063fe6140b9.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/2e149a63e1afafc2a449.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Azul", "Gris espacial", "Violeta"] },
        { name: "Capacidad", values: ["128 GB"] }
      ],
      variants: [
        {
          title: "Azul · 128 GB",
          options: { Color: "Azul", Capacidad: "128 GB" },
          retail_price: 1353100,
          sku: "IPADAIR11-M4-BLU",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/7eb93aa12d4d1af6b544.jpg"
        },
        {
          title: "Gris espacial · 128 GB",
          options: { Color: "Gris espacial", Capacidad: "128 GB" },
          retail_price: 1353100,
          sku: "IPADAIR11-M4-GRY",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/3ea977529063fe6140b9.jpg"
        },
        {
          title: "Violeta · 128 GB",
          options: { Color: "Violeta", Capacidad: "128 GB" },
          retail_price: 1353100,
          sku: "IPADAIR11-M4-VIO",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/2e149a63e1afafc2a449.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().includes("ipad air 11″ m4")
    },

    // 6. APPLE IPHONE 15
    {
      slug: "apple-iphone-15",
      title: "Apple iPhone 15",
      brand: "Apple",
      model: "iPhone 15",
      category_id: smartphonesId,
      description: "Apple iPhone 15 con Dynamic Island, cámara principal de 48 MP y chip A16 Bionic. Puerto USB-C y diseño duradero con vidrio tintado en masa.",
      retail_price: 1319400,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4da30af02bbfdd685255.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Negro", "Verde"] },
        { name: "Capacidad", values: ["256 GB"] }
      ],
      variants: [
        {
          title: "Negro · 256 GB",
          options: { Color: "Negro", Capacidad: "256 GB" },
          retail_price: 1319400,
          sku: "IPH15-256-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4ab6845cda694d2fd984.jpg"
        },
        {
          title: "Verde · 256 GB",
          options: { Color: "Verde", Capacidad: "256 GB" },
          retail_price: 1319400,
          sku: "IPH15-256-GRN",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/4da30af02bbfdd685255.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().startsWith("apple iphone 15 ·")
    },

    // 7. SAMSUNG GALAXY A07
    {
      slug: "samsung-galaxy-a07",
      title: "Samsung Galaxy A07",
      brand: "Samsung",
      model: "Galaxy A07",
      category_id: smartphonesId,
      description: "Samsung Galaxy A07 con pantalla inmersiva de 6,5″, batería de 5000 mAh de larga duración y cámara dual. Excelente balance precio-calidad para el uso diario.",
      retail_price: 218800,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/32cb72786ec2905a8dd5.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/32cb72786ec2905a8dd5.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6e7ae227283d4f5c9379.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Negro", "Verde"] },
        { name: "Capacidad", values: ["64 GB", "128 GB"] }
      ],
      variants: [
        {
          title: "Negro · 64 GB",
          options: { Color: "Negro", Capacidad: "64 GB" },
          retail_price: 218800,
          sku: "SAM-A07-64-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/32cb72786ec2905a8dd5.jpg"
        },
        {
          title: "Verde · 64 GB",
          options: { Color: "Verde", Capacidad: "64 GB" },
          retail_price: 218800,
          sku: "SAM-A07-64-GRN",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6e7ae227283d4f5c9379.jpg"
        },
        {
          title: "Negro · 128 GB",
          options: { Color: "Negro", Capacidad: "128 GB" },
          retail_price: 258400,
          sku: "SAM-A07-128-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/32cb72786ec2905a8dd5.jpg"
        },
        {
          title: "Verde · 128 GB",
          options: { Color: "Verde", Capacidad: "128 GB" },
          retail_price: 250400,
          sku: "SAM-A07-128-GRN",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6e7ae227283d4f5c9379.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().includes("galaxy a07")
    },

    // 8. SAMSUNG GALAXY A17
    {
      slug: "samsung-galaxy-a17",
      title: "Samsung Galaxy A17",
      brand: "Samsung",
      model: "Galaxy A17",
      category_id: smartphonesId,
      description: "Samsung Galaxy A17 con pantalla fluida de 90 Hz, cámara principal de alta definición y batería de 5000 mAh. Disponible en terminaciones Azul, Gris y Negro.",
      retail_price: 281100,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/937febc95e5136cbd04f.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/937febc95e5136cbd04f.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/20dd743dab13f29901a2.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/a0793496ab0c6ece4d31.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Azul", "Gris", "Negro"] },
        { name: "Capacidad", values: ["128 GB", "256 GB"] }
      ],
      variants: [
        {
          title: "Azul · 128 GB",
          options: { Color: "Azul", Capacidad: "128 GB" },
          retail_price: 281100,
          sku: "SAM-A17-128-BLU",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/20dd743dab13f29901a2.jpg"
        },
        {
          title: "Gris · 128 GB",
          options: { Color: "Gris", Capacidad: "128 GB" },
          retail_price: 305600,
          sku: "SAM-A17-128-GRY",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/a0793496ab0c6ece4d31.jpg"
        },
        {
          title: "Negro · 128 GB",
          options: { Color: "Negro", Capacidad: "128 GB" },
          retail_price: 299400,
          sku: "SAM-A17-128-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/937febc95e5136cbd04f.jpg"
        },
        {
          title: "Azul · 256 GB",
          options: { Color: "Azul", Capacidad: "256 GB" },
          retail_price: 430400,
          sku: "SAM-A17-256-BLU",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/20dd743dab13f29901a2.jpg"
        },
        {
          title: "Gris · 256 GB",
          options: { Color: "Gris", Capacidad: "256 GB" },
          retail_price: 430400,
          sku: "SAM-A17-256-GRY",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/a0793496ab0c6ece4d31.jpg"
        },
        {
          title: "Negro · 256 GB",
          options: { Color: "Negro", Capacidad: "256 GB" },
          retail_price: 430400,
          sku: "SAM-A17-256-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/937febc95e5136cbd04f.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().includes("galaxy a17")
    },

    // 9. SAMSUNG GALAXY A27
    {
      slug: "samsung-galaxy-a27",
      title: "Samsung Galaxy A27",
      brand: "Samsung",
      model: "Galaxy A27",
      category_id: smartphonesId,
      description: "Samsung Galaxy A27 con 8 GB de RAM y 256 GB de almacenamiento. Pantalla AMOLED ultra vibrante, triple cámara trasera y batería con carga rápida.",
      retail_price: 610200,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/98dfe7ed77855ccee7a5.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/98dfe7ed77855ccee7a5.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/b3a335b95dadd8e83755.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/397cd63800e21b88bbad.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Azul", "Negro", "Rosa"] },
        { name: "Capacidad", values: ["256 GB"] }
      ],
      variants: [
        {
          title: "Azul · 256 GB",
          options: { Color: "Azul", Capacidad: "256 GB" },
          retail_price: 610200,
          sku: "SAM-A27-256-BLU",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/b3a335b95dadd8e83755.jpg"
        },
        {
          title: "Negro · 256 GB",
          options: { Color: "Negro", Capacidad: "256 GB" },
          retail_price: 616600,
          sku: "SAM-A27-256-BLK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/98dfe7ed77855ccee7a5.jpg"
        },
        {
          title: "Rosa · 256 GB",
          options: { Color: "Rosa", Capacidad: "256 GB" },
          retail_price: 619900,
          sku: "SAM-A27-256-PNK",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/397cd63800e21b88bbad.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().includes("galaxy a27")
    },

    // 10. SAMSUNG GALAXY A37
    {
      slug: "samsung-galaxy-a37",
      title: "Samsung Galaxy A37",
      brand: "Samsung",
      model: "Galaxy A37",
      category_id: smartphonesId,
      description: "Samsung Galaxy A37 con pantalla Super AMOLED de 120 Hz, cámara OIS avanzada y certificación IP67 contra agua y polvo. Disponible en cuatro refinados acabados y opciones de 128 GB y 256 GB.",
      retail_price: 502600,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/e61e836492d220a992a5.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/e61e836492d220a992a5.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/abf1eb2b300b4972719e.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/856921282850a36a065d.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6cabab05a3791c0708cf.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Blanco", "Gris carbón", "Lavanda", "Verde grisáceo"] },
        { name: "Capacidad", values: ["128 GB", "256 GB"] }
      ],
      variants: [
        {
          title: "Blanco · 128 GB",
          options: { Color: "Blanco", Capacidad: "128 GB" },
          retail_price: 502600,
          sku: "SAM-A37-128-WHT",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/e61e836492d220a992a5.jpg"
        },
        {
          title: "Gris carbón · 128 GB",
          options: { Color: "Gris carbón", Capacidad: "128 GB" },
          retail_price: 502600,
          sku: "SAM-A37-128-GRY",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/abf1eb2b300b4972719e.jpg"
        },
        {
          title: "Lavanda · 128 GB",
          options: { Color: "Lavanda", Capacidad: "128 GB" },
          retail_price: 502600,
          sku: "SAM-A37-128-LAV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/856921282850a36a065d.jpg"
        },
        {
          title: "Verde grisáceo · 128 GB",
          options: { Color: "Verde grisáceo", Capacidad: "128 GB" },
          retail_price: 502600,
          sku: "SAM-A37-128-GRN",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6cabab05a3791c0708cf.jpg"
        },
        {
          title: "Blanco · 256 GB",
          options: { Color: "Blanco", Capacidad: "256 GB" },
          retail_price: 658800,
          sku: "SAM-A37-256-WHT",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/e61e836492d220a992a5.jpg"
        },
        {
          title: "Gris carbón · 256 GB",
          options: { Color: "Gris carbón", Capacidad: "256 GB" },
          retail_price: 658800,
          sku: "SAM-A37-256-GRY",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/abf1eb2b300b4972719e.jpg"
        },
        {
          title: "Lavanda · 256 GB",
          options: { Color: "Lavanda", Capacidad: "256 GB" },
          retail_price: 658800,
          sku: "SAM-A37-256-LAV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/856921282850a36a065d.jpg"
        },
        {
          title: "Verde grisáceo · 256 GB",
          options: { Color: "Verde grisáceo", Capacidad: "256 GB" },
          retail_price: 658800,
          sku: "SAM-A37-256-GRN",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6cabab05a3791c0708cf.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().includes("galaxy a37")
    },

    // 11. SAMSUNG GALAXY TAB A11 & A11+
    {
      slug: "samsung-galaxy-tab-a11",
      title: "Samsung Galaxy Tab A11",
      brand: "Samsung",
      model: "Galaxy Tab A11",
      category_id: electronicaId,
      description: "Tablet Samsung Galaxy Tab A11 con pantalla de 8,7 pulgadas, altavoces duales Dolby Atmos y cuerpo metálico refinado. Ideal para entretenimiento y estudio.",
      retail_price: 286700,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/d8a5a4f06a00e5683978.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/d8a5a4f06a00e5683978.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/08eba553f1643d1c440d.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Gris", "Plata"] },
        { name: "Capacidad", values: ["64 GB"] }
      ],
      variants: [
        {
          title: "Gris · 64 GB",
          options: { Color: "Gris", Capacidad: "64 GB" },
          retail_price: 436400,
          sku: "TAB-A11-64-GRY",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/d8a5a4f06a00e5683978.jpg"
        },
        {
          title: "Plata · 64 GB",
          options: { Color: "Plata", Capacidad: "64 GB" },
          retail_price: 286700,
          sku: "TAB-A11-64-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/08eba553f1643d1c440d.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().startsWith("samsung galaxy tab a11 ·")
    },

    {
      slug: "samsung-galaxy-tab-a11-plus",
      title: "Samsung Galaxy Tab A11+",
      brand: "Samsung",
      model: "Galaxy Tab A11+",
      category_id: electronicaId,
      description: "Tablet Samsung Galaxy Tab A11+ con pantalla expansiva de 11 pulgadas a 90 Hz, cuatro altavoces estéreo y rendimiento fluido para productividad y multitarea.",
      retail_price: 509500,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/b0835199b7304b0c7fff.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/b0835199b7304b0c7fff.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/185a376867514ee8ea77.jpg"
      ],
      options_config: [
        { name: "Color", values: ["Gris", "Plata"] },
        { name: "Capacidad", values: ["128 GB"] }
      ],
      variants: [
        {
          title: "Gris · 128 GB",
          options: { Color: "Gris", Capacidad: "128 GB" },
          retail_price: 509500,
          sku: "TAB-A11P-128-GRY",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/b0835199b7304b0c7fff.jpg"
        },
        {
          title: "Plata · 128 GB",
          options: { Color: "Plata", Capacidad: "128 GB" },
          retail_price: 562500,
          sku: "TAB-A11P-128-SLV",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/185a376867514ee8ea77.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().startsWith("samsung galaxy tab a11+ ·")
    },

    // 12. SAMSUNG GALAXY TAB S10 LITE
    {
      slug: "samsung-galaxy-tab-s10-lite",
      title: "Samsung Galaxy Tab S10 Lite",
      brand: "Samsung",
      model: "Galaxy Tab S10 Lite",
      category_id: electronicaId,
      description: "Tablet Samsung Galaxy Tab S10 Lite con 6 GB de RAM y 128 GB de almacenamiento. Pantalla de alta resolución y soporte para S-Pen para máxima productividad.",
      retail_price: 580200,
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/9ef7608f817edd29bfe6.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/9ef7608f817edd29bfe6.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/670880f9ef7e77d2687a.jpg"
      ],
      options_config: [
        { name: "Versión", values: ["Wi-Fi + S-Pen (SM-X400)", "LTE / 4G (SM-X406B)"] }
      ],
      variants: [
        {
          title: "Wi-Fi + S-Pen · 128 GB",
          options: { Versión: "Wi-Fi + S-Pen (SM-X400)" },
          retail_price: 580200,
          sku: "TAB-S10L-WIFI",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/9ef7608f817edd29bfe6.jpg"
        },
        {
          title: "LTE 4G · 128 GB",
          options: { Versión: "LTE / 4G (SM-X406B)" },
          retail_price: 812800,
          sku: "TAB-S10L-LTE",
          image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/670880f9ef7e77d2687a.jpg"
        }
      ],
      redundantFilter: (p) => p.title.toLowerCase().startsWith("samsung galaxy tab s10 lite ·")
    }
  ];

  // Ejecutar creación/actualización de los grupos nuevos
  for (const group of NEW_UNIFIED_GROUPS) {
    console.log(`\nProcesando grupo unificado: "${group.title}" (${group.slug})...`);

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

    // Upsert variants
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

    // Desactivar individuales redundantes
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

  // -------------------------------------------------------------------
  // B. ACTUALIZAR PRODUCTOS AGRUPADOS PREVIOS Y DESACTIVAR REDUNDANTES
  // -------------------------------------------------------------------
  console.log("\n--- B. Limpieza y consolidación de grupos existentes ---");

  // 1. Apple MacBook Air M5
  console.log("\nConsolidando Apple MacBook Air M5...");
  const { data: mbaParent } = await supabase.from("products").select("id").eq("slug", "apple-macbook-air-m5").single();
  if (mbaParent) {
    // Actualizar variantes completas con fotos nítidas por color
    const mbaVariants = [
      {
        title: "13,6″ · Azul cielo",
        options: { Pantalla: "13,6″", Color: "Azul cielo" },
        retail_price: 2443800,
        sku: "MBA-13-BLU",
        image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/028269f84800bfe16ff2.jpg"
      },
      {
        title: "13,6″ · Blanco estrella",
        options: { Pantalla: "13,6″", Color: "Blanco estrella" },
        retail_price: 2452700,
        sku: "MBA-13-STR",
        image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6e50525d14a81cc7922b.jpg"
      },
      {
        title: "13,6″ · Medianoche",
        options: { Pantalla: "13,6″", Color: "Medianoche" },
        retail_price: 2405600,
        sku: "MBA-13-MID",
        image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/26b0e3102c5e80435237.jpg"
      },
      {
        title: "13,6″ · Plata",
        options: { Pantalla: "13,6″", Color: "Plata" },
        retail_price: 2405600,
        sku: "MBA-13-SLV",
        image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/aefd31861da96a765042.jpg"
      },
      {
        title: "15,3″ · Azul cielo",
        options: { Pantalla: "15,3″", Color: "Azul cielo" },
        retail_price: 2800300,
        sku: "MBA-15-BLU",
        image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/7bb2653a08f89b7c1866.jpg"
      },
      {
        title: "15,3″ · Blanco estrella",
        options: { Pantalla: "15,3″", Color: "Blanco estrella" },
        retail_price: 2844800,
        sku: "MBA-15-STR",
        image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/b61dbe0e328fac1882ca.jpg"
      },
      {
        title: "15,3″ · Medianoche",
        options: { Pantalla: "15,3″", Color: "Medianoche" },
        retail_price: 2800300,
        sku: "MBA-15-MID",
        image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/818969408cbdddecf3b1.jpg"
      },
      {
        title: "15,3″ · Plata",
        options: { Pantalla: "15,3″", Color: "Plata" },
        retail_price: 2844800,
        sku: "MBA-15-SLV",
        image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/02c98b9e174723e6fa46.jpg"
      }
    ];

    await supabase.from("products").update({
      image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/aefd31861da96a765042.jpg",
      image_urls: [
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/aefd31861da96a765042.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/028269f84800bfe16ff2.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/26b0e3102c5e80435237.jpg",
        "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6e50525d14a81cc7922b.jpg"
      ]
    }).eq("id", mbaParent.id);

    for (const v of mbaVariants) {
      await supabase.from("product_variants").update({
        image_url: v.image_url,
        retail_price: v.retail_price
      }).eq("product_id", mbaParent.id).eq("title", v.title);
    }

    // Desactivar los 10 productos individuales de MacBook Air M5
    const { data: allMBA } = await supabase.from("products")
      .select("id, title")
      .neq("id", mbaParent.id)
      .ilike("title", "%macbook air m5%");
    if (allMBA?.length) {
      await supabase.from("products").update({ is_active: false }).in("id", allMBA.map(p => p.id));
      console.log(`  ✓ Desactivadas ${allMBA.length} publicaciones individuales de MacBook Air.`);
    }
  }

  // 2. Apple iPhone 16
  console.log("\nConsolidando Apple iPhone 16...");
  const { data: iph16Parent } = await supabase.from("products").select("id").eq("slug", "apple-iphone-16").single();
  if (iph16Parent) {
    const { data: redIph16 } = await supabase.from("products")
      .select("id, title")
      .neq("id", iph16Parent.id)
      .ilike("title", "%iphone 16 ·%");
    if (redIph16?.length) {
      await supabase.from("products").update({ is_active: false }).in("id", redIph16.map(p => p.id));
      console.log(`  ✓ Desactivadas ${redIph16.length} publicaciones individuales de iPhone 16.`);
    }
  }

  // 3. Apple iPhone 17
  console.log("\nConsolidando Apple iPhone 17...");
  const { data: iph17Parent } = await supabase.from("products").select("id").eq("slug", "apple-iphone-17").single();
  if (iph17Parent) {
    const { data: redIph17 } = await supabase.from("products")
      .select("id, title")
      .neq("id", iph17Parent.id)
      .ilike("title", "%iphone 17 ·%");
    if (redIph17?.length) {
      await supabase.from("products").update({ is_active: false }).in("id", redIph17.map(p => p.id));
      console.log(`  ✓ Desactivadas ${redIph17.length} publicaciones individuales de iPhone 17.`);
    }
  }

  // 4. Apple iPhone 17 Pro Max
  console.log("\nConsolidando Apple iPhone 17 Pro Max...");
  const { data: iph17pmParent } = await supabase.from("products").select("id").eq("slug", "apple-iphone-17-pro-max").single();
  if (iph17pmParent) {
    const { data: redIph17pm } = await supabase.from("products")
      .select("id, title")
      .neq("id", iph17pmParent.id)
      .ilike("title", "%iphone 17 pro max ·%");
    if (redIph17pm?.length) {
      await supabase.from("products").update({ is_active: false }).in("id", redIph17pm.map(p => p.id));
      console.log(`  ✓ Desactivadas ${redIph17pm.length} publicaciones individuales de iPhone 17 Pro Max.`);
    }
  }

  // 5. Samsung Galaxy A16
  console.log("\nConsolidando Samsung Galaxy A16...");
  const { data: a16Parent } = await supabase.from("products").select("id").eq("slug", "samsung-galaxy-a16").single();
  if (a16Parent) {
    // Actualizar fotos reales por variante
    await supabase.from("product_variants").update({ image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/05717800b0c644607c72.jpg" }).eq("product_id", a16Parent.id).eq("title", "Gris");
    await supabase.from("product_variants").update({ image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/2bcffd565abeaaa2f156.jpg" }).eq("product_id", a16Parent.id).eq("title", "Negro");
    await supabase.from("product_variants").update({ image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/b6f8d7ac372da3faeecf.jpg" }).eq("product_id", a16Parent.id).eq("title", "Verde");

    const { data: redA16 } = await supabase.from("products")
      .select("id, title")
      .neq("id", a16Parent.id)
      .ilike("title", "%galaxy a16 ·%");
    if (redA16?.length) {
      await supabase.from("products").update({ is_active: false }).in("id", redA16.map(p => p.id));
      console.log(`  ✓ Desactivadas ${redA16.length} publicaciones individuales de Galaxy A16.`);
    }
  }

  // 6. Samsung Galaxy A57 5G
  console.log("\nConsolidando Samsung Galaxy A57 5G...");
  const { data: a57Parent } = await supabase.from("products").select("id").eq("slug", "samsung-galaxy-a57").single();
  if (a57Parent) {
    // Actualizar fotos reales por variante
    await supabase.from("product_variants").update({ image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/005c6317aaa9324db738.jpg" }).eq("product_id", a57Parent.id).eq("title", "Azul hielo");
    await supabase.from("product_variants").update({ image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/791f5338aa4c19106b27.jpg" }).eq("product_id", a57Parent.id).eq("title", "Azul marino");
    await supabase.from("product_variants").update({ image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/6cd51cccf8b40d5eb5ba.jpg" }).eq("product_id", a57Parent.id).eq("title", "Gris");
    await supabase.from("product_variants").update({ image_url: "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/c5c50580baf7d6f307d7.jpg" }).eq("product_id", a57Parent.id).eq("title", "Violeta");

    const { data: redA57 } = await supabase.from("products")
      .select("id, title")
      .neq("id", a57Parent.id)
      .ilike("title", "%galaxy a57 ·%");
    if (redA57?.length) {
      await supabase.from("products").update({ is_active: false }).in("id", redA57.map(p => p.id));
      console.log(`  ✓ Desactivadas ${redA57.length} publicaciones individuales de Galaxy A57.`);
    }
  }

  console.log("\n=== UNIFICACIÓN DE ELECTRÓNICA COMPLETADA CON ÉXITO ===");
}

run().catch(console.error);
