import { createClient } from "@supabase/supabase-js";
import { readFileSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import process from "node:process";
process.loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Find the exact Karseell file in ../Cosmeticos
  const cosmeticosDir = resolve(process.cwd(), "..", "Cosmeticos");
  const files = readdirSync(cosmeticosDir);
  const karseellFile = files.find(f => f.includes("Karseell Collagen Hair Mask"));
  if (!karseellFile) {
    console.error("Karseell file not found in Cosmeticos");
    process.exit(1);
  }

  const filePath = resolve(cosmeticosDir, karseellFile);
  console.log(`Found file: ${filePath}`);
  const fileBytes = readFileSync(filePath);

  // 1. Copy locally to public/products
  const publicProductsDir = resolve(process.cwd(), "public", "products");
  mkdirSync(publicProductsDir, { recursive: true });
  
  // Both with hyphen and en-dash to be 100% safe
  copyFileSync(filePath, resolve(publicProductsDir, karseellFile));
  copyFileSync(filePath, resolve(publicProductsDir, "Karseell Collagen Hair Mask 500ml – Mascarilla Capilar Colágeno.webp"));
  copyFileSync(filePath, resolve(publicProductsDir, "cuidado-capilar.webp"));
  console.log("Copied locally to public/products/");

  // 2. Upload to Supabase Storage in 'product-images' bucket
  const remoteFileName = "cuidado-capilar-karseell.webp";
  const { data: uploadData, error: uploadErr } = await db.storage
    .from("product-images")
    .upload(remoteFileName, fileBytes, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadErr) {
    console.error("Upload error:", uploadErr);
    process.exit(1);
  }
  console.log("Uploaded to Supabase storage successfully:", uploadData);

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${remoteFileName}`;
  console.log("Public URL:", publicUrl);

  // 3. Test the public URL
  const testRes = await fetch(publicUrl);
  console.log("HTTP test public URL:", testRes.status, testRes.headers.get("content-type"));

  // 4. Update the category 'Cuidado del cabello' (id: 10000000-0000-0000-0000-000000000004)
  const { data: catUpdate, error: catErr } = await db
    .from("categories")
    .update({ image_url: publicUrl })
    .eq("id", "10000000-0000-0000-0000-000000000004")
    .select();

  if (catErr) {
    console.error("Category update error:", catErr);
    process.exit(1);
  }
  console.log("Updated category Cuidado del cabello:", catUpdate);
}

main();
