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

const BASE_URL = "https://gqcdurxndbeeugjfworx.supabase.co/storage/v1/object/public/product-images/electronics-2026-10-08/";

async function run() {
  console.log("=== CORRIGIENDO IMÁGENES EXACTAS DE PRODUCTOS DE ELECTRÓNICA ===");

  // 1. Samsung Galaxy A57 5G
  console.log("\n1. Corrigiendo Samsung Galaxy A57 5G...");
  const { data: a57 } = await supabase.from("products").select("id").eq("slug", "samsung-galaxy-a57").single();
  if (a57) {
    const a57Main = `${BASE_URL}005c6317aaa9324db738.jpg`;
    const a57Gallery = [
      `${BASE_URL}005c6317aaa9324db738.jpg`, // Azul hielo
      `${BASE_URL}791f5338aa4c19106b27.jpg`, // Azul marino
      `${BASE_URL}6cd51cccf8b40d5eb5ba.jpg`, // Gris
      `${BASE_URL}c5c50580baf7d6f307d7.jpg`  // Violeta
    ];
    await supabase.from("products").update({
      image_url: a57Main,
      image_urls: a57Gallery
    }).eq("id", a57.id);

    await supabase.from("product_variants").update({ image_url: `${BASE_URL}005c6317aaa9324db738.jpg` }).eq("product_id", a57.id).eq("title", "Azul hielo");
    await supabase.from("product_variants").update({ image_url: `${BASE_URL}791f5338aa4c19106b27.jpg` }).eq("product_id", a57.id).eq("title", "Azul marino");
    await supabase.from("product_variants").update({ image_url: `${BASE_URL}6cd51cccf8b40d5eb5ba.jpg` }).eq("product_id", a57.id).eq("title", "Gris");
    await supabase.from("product_variants").update({ image_url: `${BASE_URL}c5c50580baf7d6f307d7.jpg` }).eq("product_id", a57.id).eq("title", "Violeta");
    console.log("  ✓ Samsung Galaxy A57 5G corregido con imágenes de Galaxy A57 (Azul hielo, Azul marino, Gris, Violeta).");
  }

  // 2. Samsung Galaxy A16
  console.log("\n2. Corrigiendo Samsung Galaxy A16...");
  const { data: a16 } = await supabase.from("products").select("id").eq("slug", "samsung-galaxy-a16").single();
  if (a16) {
    const a16Main = `${BASE_URL}05717800b0c644607c72.jpg`;
    const a16Gallery = [
      `${BASE_URL}05717800b0c644607c72.jpg`, // Gris
      `${BASE_URL}2bcffd565abeaaa2f156.jpg`, // Negro
      `${BASE_URL}b6f8d7ac372da3faeecf.jpg`  // Verde
    ];
    await supabase.from("products").update({
      image_url: a16Main,
      image_urls: a16Gallery
    }).eq("id", a16.id);

    await supabase.from("product_variants").update({ image_url: `${BASE_URL}05717800b0c644607c72.jpg` }).eq("product_id", a16.id).eq("title", "Gris");
    await supabase.from("product_variants").update({ image_url: `${BASE_URL}2bcffd565abeaaa2f156.jpg` }).eq("product_id", a16.id).eq("title", "Negro");
    await supabase.from("product_variants").update({ image_url: `${BASE_URL}b6f8d7ac372da3faeecf.jpg` }).eq("product_id", a16.id).eq("title", "Verde");
    console.log("  ✓ Samsung Galaxy A16 corregido con imágenes de Galaxy A16 (Gris, Negro, Verde).");
  }

  // 3. Apple iPhone 17
  console.log("\n3. Corrigiendo Apple iPhone 17...");
  const { data: iph17 } = await supabase.from("products").select("id").eq("slug", "apple-iphone-17").single();
  if (iph17) {
    const iph17Main = `${BASE_URL}3a1ec8d18ad3056fdd5e.jpg`;
    const iph17Gallery = [
      `${BASE_URL}3a1ec8d18ad3056fdd5e.jpg`, // Azul neblina
      `${BASE_URL}85e888c24b6ebb5a5b10.jpg`, // Blanco
      `${BASE_URL}c87919d1bb9dcb558f93.jpg`, // Lavanda
      `${BASE_URL}fd50dc7be56e8827e5e5.jpg`, // Negro
      `${BASE_URL}9f4b3eacacb0a260e2e3.jpg`  // Verde salvia
    ];
    await supabase.from("products").update({
      image_url: iph17Main,
      image_urls: iph17Gallery
    }).eq("id", iph17.id);

    await supabase.from("product_variants").update({ image_url: `${BASE_URL}3a1ec8d18ad3056fdd5e.jpg` }).eq("product_id", iph17.id).eq("title", "Azul neblina · 256 GB");
    await supabase.from("product_variants").update({ image_url: `${BASE_URL}85e888c24b6ebb5a5b10.jpg` }).eq("product_id", iph17.id).eq("title", "Blanco · 256 GB");
    await supabase.from("product_variants").update({ image_url: `${BASE_URL}c87919d1bb9dcb558f93.jpg` }).eq("product_id", iph17.id).eq("title", "Lavanda · 256 GB");
    await supabase.from("product_variants").update({ image_url: `${BASE_URL}fd50dc7be56e8827e5e5.jpg` }).eq("product_id", iph17.id).eq("title", "Negro · 256 GB");
    await supabase.from("product_variants").update({ image_url: `${BASE_URL}9f4b3eacacb0a260e2e3.jpg` }).eq("product_id", iph17.id).eq("title", "Verde salvia · 256 GB");
    console.log("  ✓ Apple iPhone 17 corregido con imágenes oficiales de iPhone 17 (Azul neblina, Blanco, Lavanda, Negro, Verde salvia).");
  }

  // 4. Apple iPhone 17 Pro Max
  console.log("\n4. Corrigiendo Apple iPhone 17 Pro Max...");
  const { data: iph17pm } = await supabase.from("products").select("id").eq("slug", "apple-iphone-17-pro-max").single();
  if (iph17pm) {
    const iph17pmMain = `${BASE_URL}abe24b7cdaf8b5d047e2.jpg`;
    const iph17pmGallery = [
      `${BASE_URL}abe24b7cdaf8b5d047e2.jpg`, // Naranja cósmico
      `${BASE_URL}226092249fb594f062d7.jpg`, // Azul profundo
      `${BASE_URL}4161c6445e6314ad8cb7.jpg`  // Plata
    ];
    await supabase.from("products").update({
      image_url: iph17pmMain,
      image_urls: iph17pmGallery
    }).eq("id", iph17pm.id);

    await supabase.from("product_variants").update({ image_url: `${BASE_URL}abe24b7cdaf8b5d047e2.jpg` }).eq("product_id", iph17pm.id).ilike("title", "%Naranja cósmico%");
    await supabase.from("product_variants").update({ image_url: `${BASE_URL}226092249fb594f062d7.jpg` }).eq("product_id", iph17pm.id).ilike("title", "%Azul profundo%");
    await supabase.from("product_variants").update({ image_url: `${BASE_URL}4161c6445e6314ad8cb7.jpg` }).eq("product_id", iph17pm.id).ilike("title", "%Plata%");
    console.log("  ✓ Apple iPhone 17 Pro Max corregido con imágenes de iPhone 17 Pro Max (Naranja cósmico, Azul profundo, Plata).");
  }

  // 5. Apple iPhone 15
  console.log("\n5. Corrigiendo Apple iPhone 15...");
  const { data: iph15 } = await supabase.from("products").select("id").eq("slug", "apple-iphone-15").single();
  if (iph15) {
    const iph15Main = `${BASE_URL}2e5771331e0d317f7b89.jpg`;
    const iph15Gallery = [
      `${BASE_URL}2e5771331e0d317f7b89.jpg`, // Negro
      `${BASE_URL}fb222eb20e4581653082.jpg`  // Verde
    ];
    await supabase.from("products").update({
      image_url: iph15Main,
      image_urls: iph15Gallery
    }).eq("id", iph15.id);

    await supabase.from("product_variants").update({ image_url: `${BASE_URL}2e5771331e0d317f7b89.jpg` }).eq("product_id", iph15.id).ilike("title", "%Negro%");
    await supabase.from("product_variants").update({ image_url: `${BASE_URL}fb222eb20e4581653082.jpg` }).eq("product_id", iph15.id).ilike("title", "%Verde%");
    console.log("  ✓ Apple iPhone 15 corregido con imágenes reales de iPhone 15 (Negro, Verde).");
  }

  console.log("\n=== CORRECCIÓN DE IMÁGENES FINALIZADA CON ÉXITO ===");
}

run().catch(console.error);
