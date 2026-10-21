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

async function main() {
  console.log("Fetching Dr. Althea image...");
  const res = await fetch("https://atacadousa.com.py/3630-large_default/creme-facial-dralthea-345-relief-cream-50ml256221.jpg");
  if (!res.ok) throw new Error("Failed to download image: " + res.status);
  const buffer = Buffer.from(await res.arrayBuffer());
  console.log("Image downloaded, bytes:", buffer.length);

  const fileName = "dr-althea-345-relief-cream-50ml.jpg";
  const { data, error } = await supabase.storage
    .from("product-images")
    .upload(fileName, buffer, {
      contentType: "image/jpeg",
      upsert: true
    });

  if (error) {
    console.error("Storage upload error:", error);
    return;
  }
  console.log("Storage upload success:", data);

  const publicUrl = `${env["NEXT_PUBLIC_SUPABASE_URL"]}/storage/v1/object/public/product-images/${fileName}`;
  console.log("New Public URL:", publicUrl);

  const { error: updErr } = await supabase
    .from("products")
    .update({
      image_url: publicUrl,
      image_urls: [publicUrl],
      updated_at: new Date().toISOString()
    })
    .eq("id", "07574043-cd93-5462-85c5-da1acab90f07");

  if (updErr) console.error("Error updating product:", updErr);
  else console.log("✓ Dr. Althea 345 Relief Cream updated with Supabase Storage image!");
}

main().catch(console.error);
