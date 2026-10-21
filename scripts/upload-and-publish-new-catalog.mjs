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
      console.error(`Failed to fetch ${remoteUrl}: ${res.status}`);
      return null;
    }
    const contentType = res.headers.get("content-type") || fallbackContentType;
    const buffer = Buffer.from(await res.arrayBuffer());
    console.log(`Downloaded ${storagePath} (${buffer.length} bytes)`);

    const { data, error } = await supabase.storage
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
    console.log(`✓ Uploaded to Supabase Storage: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error(`Exception uploading ${storagePath}:`, err.message);
    return null;
  }
}

async function testUpload() {
  const testUrl = "https://atacadousa.com.py/2644-large_default/perfume-lattafa-asad-eau-de-parfum-masculino-100ml.jpg";
  const uploaded = await uploadFromUrl(testUrl, "perfumes/lattafa-asad-100ml.jpg");
  console.log("Result:", uploaded);
}

testUpload();
