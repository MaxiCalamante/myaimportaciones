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

async function uploadFromUrl(remoteUrl, storagePath, fallbackContentType = "image/jpeg") {
  try {
    const res = await fetch(remoteUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) {
      console.warn(`Failed to fetch ${remoteUrl}: ${res.status}`);
      return null;
    }
    const contentType = res.headers.get("content-type") || fallbackContentType;
    const buffer = Buffer.from(await res.arrayBuffer());

    const { error } = await supabase.storage
      .from("product-images")
      .upload(storagePath, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error(`Error uploading ${storagePath}:`, error);
      return null;
    }
    const publicUrl = `${env["NEXT_PUBLIC_SUPABASE_URL"]}/storage/v1/object/public/product-images/${storagePath}`;
    console.log(`✓ Subido a Supabase Storage: ${storagePath}`);
    return publicUrl;
  } catch (err) {
    console.error(`Exception uploading ${storagePath}:`, err.message);
    return null;
  }
}

async function run() {
  console.log("======================================================================");
  console.log("=== PUBLICANDO CATEGORÍA PERFUMERÍA Y PRODUCTOS DE ALTO MARGEN ===");
  console.log("======================================================================\n");

  const now = new Date().toISOString();

  // -------------------------------------------------------------------
  // 1. CREAR CATEGORÍA PERFUMERÍA Y SUBCATEGORÍAS
  // -------------------------------------------------------------------
  console.log("--- 1. Creando Categoría Raíz 'Perfumería' ---");
  const perfumeriaId = "10000000-0000-0000-0000-000000000007";
  const subArabesId = "10000000-0000-0000-0000-000000000071";
  const subMistsId = "10000000-0000-0000-0000-000000000072";

  // Subir imagen de portada de Perfumería
  const bannerYaraUrl = await uploadFromUrl(
    "https://atacadousa.com.py/2797-large_default/perfume-lattafa-yara-eau-de-parfum-femenino-100ml.jpg",
    "perfumes/categoria-perfumeria-yara.jpg"
  );

  const catRows = [
    {
      id: perfumeriaId,
      parent_id: null,
      name: "Perfumería",
      slug: "perfumeria",
      description: "Perfumes árabes de alta gama, fragancias virales y body mists importados de Dubai.",
      image_url: bannerYaraUrl,
      is_wholesale_only: false,
      display_order: 5,
      updated_at: now
    },
    {
      id: subArabesId,
      parent_id: perfumeriaId,
      name: "Perfumes árabes",
      slug: "perfumes-arabes",
      description: "Eau de Parfum Lattafa de Dubai: fragancias gourmand, amaderadas y especiadas.",
      image_url: bannerYaraUrl,
      is_wholesale_only: false,
      display_order: 1,
      updated_at: now
    },
    {
      id: subMistsId,
      parent_id: perfumeriaId,
      name: "Body mists y brumas",
      slug: "body-mists-brumas",
      description: "Brumas corporales perfumadas de alta duración para uso diario.",
      image_url: "https://www.starcompany-py.com/7338-large_default/lattafa-perfume-mist-body-splash-yara-pink-250ml.jpg",
      is_wholesale_only: false,
      display_order: 2,
      updated_at: now
    }
  ];

  for (const c of catRows) {
    const { error: catErr } = await supabase.from("categories").upsert(c, { onConflict: "id" });
    if (catErr) console.error("Error upserting category:", c.name, catErr);
    else console.log(`✓ Categoría '${c.name}' registrada.`);
  }

  // -------------------------------------------------------------------
  // 2. SUBIR IMÁGENES A SUPABASE STORAGE
  // -------------------------------------------------------------------
  console.log("\n--- 2. Subiendo imágenes a Supabase Storage ---");

  // Mists
  const imgYaraPinkMist = await uploadFromUrl("https://www.starcompany-py.com/7338-large_default/lattafa-perfume-mist-body-splash-yara-pink-250ml.jpg", "perfumes/lattafa-mist-yara-pink.jpg");
  const imgYaraTousMist = await uploadFromUrl("https://www.starcompany-py.com/4783-large_default/lattafa-perfume-mist-yara-tous-250ml-fem.jpg", "perfumes/lattafa-mist-yara-tous.jpg");
  const imgMayarMist = await uploadFromUrl("https://www.starcompany-py.com/7336-large_default/lattafa-perfume-mist-body-splash-mayar-natural-intense-250ml.jpg", "perfumes/lattafa-mist-mayar.jpg");
  const imgHayaMist = await uploadFromUrl("https://www.starcompany-py.com/7334-large_default/lattafa-perfume-mist-body-splash-haya-250ml.jpg", "perfumes/lattafa-mist-haya.jpg");
  const imgFakharMist = await uploadFromUrl("https://www.starcompany-py.com/4782-large_default/lattafa-perfume-mist-fakhar-250ml-fem.jpg", "perfumes/lattafa-mist-fakhar.jpg");
  const imgNobleBlushMist = await uploadFromUrl("https://www.starcompany-py.com/4780-large_default/lattafa-perfume-mist-badee-al-oud-noble-blush-250ml.jpg", "perfumes/lattafa-mist-noble-blush.jpg");

  // EDPs
  const imgYaraRosa = await uploadFromUrl("https://atacadousa.com.py/2797-large_default/perfume-lattafa-yara-eau-de-parfum-femenino-100ml.jpg", "perfumes/lattafa-yara-rosa-100ml.jpg");
  const imgYaraMoi = await uploadFromUrl("https://atacadousa.com.py/1549-large_default/perfume-lattafa-yara-moi-eau-de-parfum-femenino-100ml.jpg", "perfumes/lattafa-yara-moi-100ml.jpg");
  const imgYaraTousEdp = imgYaraTousMist; // fallback

  const imgAsadClasico = `${env["NEXT_PUBLIC_SUPABASE_URL"]}/storage/v1/object/public/product-images/perfumes/lattafa-asad-100ml.jpg`;
  const imgAsadZanzibar = await uploadFromUrl("https://www.atlanticoshop.com.py/image/cache/catalog/perfume%20lattafa%20asad%20zanzibar--800x800.webp", "perfumes/lattafa-asad-zanzibar-100ml.webp");

  const imgBadeeGlory = await uploadFromUrl("https://atacadousa.com.py/2322-large_default/perfume-lattafa-badee-al-oud-for-glory-eau-de-parfum-unissex-100ml-ng.jpg", "perfumes/lattafa-badee-glory-100ml.jpg");
  const imgBadeeHonor = await uploadFromUrl("https://atacadousa.com.py/2321-large_default/perfume-lattafa-badee-al-oud-honor-and-gloryblanco-100ml.jpg", "perfumes/lattafa-badee-honor-100ml.jpg");
  const imgBadeeAmethyst = await uploadFromUrl("https://www.starcompany-py.com/9558-large_default/perf-uni-lattafa-badee-al-oud-amethyst-fusion-edp-100ml.jpg", "perfumes/lattafa-badee-amethyst-100ml.jpg");

  // Electrónica y otros
  const imgApple20w = await uploadFromUrl("https://www.atlanticoshop.com.py/image/cache/catalog/apple-adapter-ucbc-redondo-800x800.webp", "electronics-2026-10-08/apple-20w-usb-c-power-adapter.webp");
  const imgAppleEarpods = await uploadFromUrl("https://www.atlanticoshop.com.py/image/cache/catalog/MYQY3ZE-A-1-800x800.webp", "electronics-2026-10-08/apple-earpods-usb-c.webp");
  const imgJbl530 = await uploadFromUrl("https://www.atlanticoshop.com.py/image/cache/catalog/tune-530bt-lavande-1-800x800.webp", "electronics-2026-10-08/jbl-tune-530bt-lavande.webp");

  // Tree Hut y Anua
  const imgTreeHut = "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-kbeauty-20261001-42.png";
  const imgAnuaToner = "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/mya-cosmetics-20261001-43.jpg";

  // Helper para insertar producto con variantes
  async function publishProductWithVariants(productDef) {
    console.log(`\n--- Publicando: "${productDef.title}" ---`);

    // 1. Upsert product
    const { data: existingProd } = await supabase.from("products").select("id").eq("slug", productDef.slug).maybeSingle();
    let productId = existingProd?.id;

    const prodPayload = {
      title: productDef.title,
      slug: productDef.slug,
      brand: productDef.brand,
      model: productDef.model,
      category_id: productDef.category_id,
      description: productDef.description,
      retail_price: Math.min(...productDef.variants.map(v => v.price)),
      image_url: productDef.variants[0].image,
      image_urls: productDef.variants.map(v => v.image).filter(Boolean),
      has_variants: productDef.variants.length > 1,
      options_config: productDef.options_config,
      is_active: true,
      is_wholesale_only: false,
      updated_at: now
    };

    if (productId) {
      await supabase.from("products").update(prodPayload).eq("id", productId);
    } else {
      const { data: newProd, error: pErr } = await supabase.from("products").insert(prodPayload).select("id").single();
      if (pErr) {
        console.error("Error creating product:", productDef.title, pErr);
        return;
      }
      productId = newProd.id;
    }

    // 2. Clear existing variants
    await supabase.from("product_variants").delete().eq("product_id", productId);

    // 3. Insert variants
    const varRows = productDef.variants.map((v, i) => ({
      product_id: productId,
      title: v.title,
      sku: v.sku,
      retail_price: v.price,
      stock: v.stock || 5,
      fulfillment_mode: "own_stock",
      stock_verified_at: now,
      supplier_available: false,
      image_url: v.image,
      is_active: true,
      options: v.options,
      display_order: i,
      updated_at: now
    }));

    const { error: vErr } = await supabase.from("product_variants").insert(varRows);
    if (vErr) console.error("Error inserting variants:", vErr);
    else console.log(`✓ Insertadas ${varRows.length} variantes para "${productDef.title}".`);
  }

  // -------------------------------------------------------------------
  // 3. PUBLICAR PERFUMES Y BODY MISTS (PERFUMERÍA)
  // -------------------------------------------------------------------

  // A. Lattafa Body Splash Mist 250 ml
  await publishProductWithVariants({
    title: "Lattafa Body Splash Mist 250 ml",
    slug: "lattafa-body-splash-mist-250-ml",
    brand: "Lattafa",
    model: "Perfume Mist 250 ml",
    category_id: subMistsId,
    description: "Brumas corporales perfumadas Lattafa Perfumes Dubai de 250 ml. Fragancias árabes virales con excelente fijación y proyección. Notas gourmand, dulces, avainilladas y florales para uso diario.",
    options_config: [{ name: "Fragancia", values: ["Yara Pink", "Yara Tous", "Mayar Natural", "Haya", "Fakhar Women", "Bade'e Al Oud Noble Blush"] }],
    variants: [
      {
        title: "Yara Pink",
        price: 32900,
        sku: "LAT-MST-YAR-PNK",
        image: imgYaraPinkMist,
        options: { Fragancia: "Yara Pink" }
      },
      {
        title: "Yara Tous",
        price: 32900,
        sku: "LAT-MST-YAR-TOUS",
        image: imgYaraTousMist,
        options: { Fragancia: "Yara Tous" }
      },
      {
        title: "Mayar Natural",
        price: 32900,
        sku: "LAT-MST-MAY-NAT",
        image: imgMayarMist,
        options: { Fragancia: "Mayar Natural" }
      },
      {
        title: "Haya",
        price: 32900,
        sku: "LAT-MST-HAY-250",
        image: imgHayaMist,
        options: { Fragancia: "Haya" }
      },
      {
        title: "Fakhar Women",
        price: 32900,
        sku: "LAT-MST-FAK-FEM",
        image: imgFakharMist,
        options: { Fragancia: "Fakhar Women" }
      },
      {
        title: "Bade'e Al Oud Noble Blush",
        price: 32900,
        sku: "LAT-MST-NOB-BLS",
        image: imgNobleBlushMist,
        options: { Fragancia: "Bade'e Al Oud Noble Blush" }
      }
    ]
  });

  // B. Lattafa Yara Eau de Parfum 100 ml
  await publishProductWithVariants({
    title: "Lattafa Yara Eau de Parfum 100 ml",
    slug: "lattafa-yara-eau-de-parfum-100-ml",
    brand: "Lattafa",
    model: "Yara EDP 100 ml",
    category_id: subArabesId,
    description: "Lattafa Yara Eau de Parfum de 100 ml original de Dubai. Frasco icónico y estuche de lujo con sello de autenticidad. Acorde cremoso de orquídea, heliotropo, frutas tropicales, vainilla y sándalo. Duración prolongada en piel y ropa.",
    options_config: [{ name: "Edición", values: ["Yara Rosa (Clásico Gourmand)", "Yara Moi (Caramelo & Flores Blancas)", "Yara Tous (Mango & Coco Tropical)"] }],
    variants: [
      {
        title: "Yara Rosa (Clásico Gourmand)",
        price: 59900,
        sku: "LAT-EDP-YAR-ROSA",
        image: imgYaraRosa,
        options: { Edición: "Yara Rosa (Clásico Gourmand)" }
      },
      {
        title: "Yara Moi (Caramelo & Flores Blancas)",
        price: 59900,
        sku: "LAT-EDP-YAR-MOI",
        image: imgYaraMoi,
        options: { Edición: "Yara Moi (Caramelo & Flores Blancas)" }
      },
      {
        title: "Yara Tous (Mango & Coco Tropical)",
        price: 59900,
        sku: "LAT-EDP-YAR-TOUS",
        image: imgYaraTousEdp,
        options: { Edición: "Yara Tous (Mango & Coco Tropical)" }
      }
    ]
  });

  // C. Lattafa Asad Eau de Parfum 100 ml
  await publishProductWithVariants({
    title: "Lattafa Asad Eau de Parfum 100 ml",
    slug: "lattafa-asad-eau-de-parfum-100-ml",
    brand: "Lattafa",
    model: "Asad EDP 100 ml",
    category_id: subArabesId,
    description: "Lattafa Asad Eau de Parfum de 100 ml original de Dubai. Fragancia masculina imponente y seductora con salida de pimienta negra, piña y tabaco, corazón de café tostado, iris y pachulí, sobre fondo de ámbar seco, vainilla y benjuí.",
    options_config: [{ name: "Edición", values: ["Asad Clásico (Pimienta & Tabaco)", "Asad Zanzibar (Sal Marina & Agua de Coco)"] }],
    variants: [
      {
        title: "Asad Clásico (Pimienta & Tabaco)",
        price: 64900,
        sku: "LAT-EDP-ASD-BLK",
        image: imgAsadClasico,
        options: { Edición: "Asad Clásico (Pimienta & Tabaco)" }
      },
      {
        title: "Asad Zanzibar (Sal Marina & Agua de Coco)",
        price: 67900,
        sku: "LAT-EDP-ASD-ZNZ",
        image: imgAsadZanzibar || imgAsadClasico,
        options: { Edición: "Asad Zanzibar (Sal Marina & Agua de Coco)" }
      }
    ]
  });

  // D. Lattafa Bade'e Al Oud (Oud for Glory) 100 ml
  await publishProductWithVariants({
    title: "Lattafa Bade'e Al Oud Eau de Parfum 100 ml",
    slug: "lattafa-badee-al-oud-eau-de-parfum-100-ml",
    brand: "Lattafa",
    model: "Bade'e Al Oud 100 ml",
    category_id: subArabesId,
    description: "Colección exclusiva Bade'e Al Oud de Lattafa Perfumes. Estuche premium de alta gama y frasco ornamentado. Fragancias de autor con acordes orientales complejos de oud, maderas nobles y frutas caramelizadas.",
    options_config: [{ name: "Edición", values: ["Oud for Glory (Clásico Negro)", "Honor & Glory (Cremé Brûlée & Piña)", "Amethyst Fusion (Rosas & Vainilla)"] }],
    variants: [
      {
        title: "Oud for Glory (Clásico Negro)",
        price: 64900,
        sku: "LAT-EDP-BAO-GLR",
        image: imgBadeeGlory,
        options: { Edición: "Oud for Glory (Clásico Negro)" }
      },
      {
        title: "Honor & Glory (Cremé Brûlée & Piña)",
        price: 64900,
        sku: "LAT-EDP-BAO-HNR",
        image: imgBadeeHonor,
        options: { Edición: "Honor & Glory (Cremé Brûlée & Piña)" }
      },
      {
        title: "Amethyst Fusion (Rosas & Vainilla)",
        price: 64900,
        sku: "LAT-EDP-BAO-AMT",
        image: imgBadeeAmethyst,
        options: { Edición: "Amethyst Fusion (Rosas & Vainilla)" }
      }
    ]
  });

  // -------------------------------------------------------------------
  // 4. PUBLICAR PRODUCTOS DE ALTO MARGEN EN OTRAS CATEGORÍAS
  // -------------------------------------------------------------------
  const { data: catElectronica } = await supabase.from("categories").select("id").eq("slug", "electronica").single();
  const { data: catCosmetica } = await supabase.from("categories").select("id").eq("slug", "cosmetica-coreana").single();

  // E. Apple Adaptador de Corriente USB-C 20W Original
  await publishProductWithVariants({
    title: "Apple Adaptador de Corriente USB-C 20W",
    slug: "apple-adaptador-de-corriente-usb-c-20w",
    brand: "Apple",
    model: "Adaptador USB-C 20W (MD3J4ZM/A)",
    category_id: catElectronica.id,
    description: "Adaptador de corriente USB-C de 20 W original de Apple. Proporciona una carga rápida y eficiente para iPhone, iPad y Apple Watch. Compatible con tecnología Power Delivery.",
    options_config: [],
    variants: [
      {
        title: "20 W · Blanco",
        price: 54900,
        sku: "APP-CHG-20W-USB-C",
        image: imgApple20w,
        options: {}
      }
    ]
  });

  // F. Apple EarPods con Conector USB-C Original
  await publishProductWithVariants({
    title: "Apple EarPods con Conector USB-C",
    slug: "apple-earpods-conector-usb-c",
    brand: "Apple",
    model: "EarPods USB-C (MYQY3ZE/A)",
    category_id: catElectronica.id,
    description: "Auriculares Apple EarPods originales con conector USB-C. Diseñados por Apple con ingeniería acústica superior que minimiza la pérdida y maximiza la salida del sonido. Incluye control integrado en el cable para volumen, reproducción y llamadas.",
    options_config: [],
    variants: [
      {
        title: "Blanco · USB-C",
        price: 52900,
        sku: "APP-EAR-USB-C",
        image: imgAppleEarpods,
        options: {}
      }
    ]
  });

  // G. JBL Tune 520BT Auriculares Inalámbricos Bluetooth
  await publishProductWithVariants({
    title: "JBL Tune 520BT Auriculares Inalámbricos Bluetooth",
    slug: "jbl-tune-520bt-auriculares-inalambricos-bluetooth",
    brand: "JBL",
    model: "Tune 520BT",
    category_id: catElectronica.id,
    description: "Auriculares supraaurales inalámbricos JBL Tune 520BT con el legendario sonido JBL Pure Bass. Hasta 57 horas de reproducción de batería, llamadas manos libres con VoiceAware y diseño ligero y plegable.",
    options_config: [{ name: "Color", values: ["Lavanda"] }],
    variants: [
      {
        title: "Lavanda",
        price: 88900,
        sku: "JBL-T520BT-LAV",
        image: imgJbl530,
        options: { Color: "Lavanda" }
      }
    ]
  });

  // H. Tree Hut Shea Sugar Scrub Exfoliante Corporal 510 g
  await publishProductWithVariants({
    title: "Tree Hut Shea Sugar Scrub Exfoliante Corporal 510 g",
    slug: "tree-hut-shea-sugar-scrub-exfoliante-corporal-510-g",
    brand: "Tree Hut",
    model: "Shea Sugar Scrub 510 g",
    category_id: "10000000-0000-0000-0000-000000000039",
    description: "Exfoliante corporal de azúcar de karité Tree Hut Shea Sugar Scrub 510 g original de Estados Unidos. Remueve células muertas, restaura la luminosidad de la piel y aporta nutrición profunda con manteca de karité certificada y aceites naturales.",
    options_config: [{ name: "Fragancia", values: ["Coco Colada (Coco & Piña)", "Moroccan Rose (Rosa Marroquí)", "Desert Haze (Cactus & Frambuesa)"] }],
    variants: [
      {
        title: "Coco Colada (Coco & Piña)",
        price: 39900,
        sku: "TH-SCR-COC-510",
        image: imgTreeHut,
        options: { Fragancia: "Coco Colada (Coco & Piña)" }
      },
      {
        title: "Moroccan Rose (Rosa Marroquí)",
        price: 39900,
        sku: "TH-SCR-ROS-510",
        image: imgTreeHut,
        options: { Fragancia: "Moroccan Rose (Rosa Marroquí)" }
      },
      {
        title: "Desert Haze (Cactus & Frambuesa)",
        price: 39900,
        sku: "TH-SCR-DHA-510",
        image: imgTreeHut,
        options: { Fragancia: "Desert Haze (Cactus & Frambuesa)" }
      }
    ]
  });

  // I. Anua Heartleaf 77% Soothing Toner 250 ml
  await publishProductWithVariants({
    title: "Anua Heartleaf 77% Soothing Toner 250 ml",
    slug: "anua-heartleaf-77-soothing-toner-250-ml",
    brand: "Anua",
    model: "Heartleaf 77% Soothing Toner 250 ml",
    category_id: catCosmetica.id,
    description: "Tónico calmante e hidratante Anua Heartleaf 77% Soothing Toner 250 ml. Reconocido internacionalmente como el tónico N°1 de Corea (Olive Young Awards). Formulado con 77% de extracto de Heartleaf (Houttuynia Cordata) para calmar irritaciones, controlar rojeces y proteger la barrera cutánea sin obstruir poros.",
    options_config: [],
    variants: [
      {
        title: "250 ml",
        price: 53900,
        sku: "ANUA-HL77-TON-250",
        image: imgAnuaToner,
        options: {}
      }
    ]
  });

  console.log("\n======================================================================");
  console.log("=== PUBLICACIÓN Y CREACIÓN DE PERFUMERÍA FINALIZADA CON ÉXITO ===");
  console.log("======================================================================\n");
}

run().catch(console.error);
