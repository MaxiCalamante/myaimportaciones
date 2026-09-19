const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://gqcdurxndbeeugjfworx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxY2R1cnhuZGJlZXVnamZ3b3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM3NTAsImV4cCI6MjA5NzI3OTc1MH0.dpdv4l25RNr0DKp7MmI5c6PQDfQ5ahqtfhxOdEsalbo"
);

function slugifyFilename(name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  const cleanBase = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-") // replace en-dash and em-dash
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${cleanBase}${ext.toLowerCase()}`;
}

async function sanitize() {
  const dir = path.join(process.cwd(), "public", "products");
  const files = fs.readdirSync(dir).filter((f) => !fs.statSync(path.join(dir, f)).isDirectory());

  const fileMap = new Map();

  for (const file of files) {
    const clean = slugifyFilename(file);
    const oldPath = path.join(dir, file);
    const newPath = path.join(dir, clean);

    // Copy to new clean filename
    fs.copyFileSync(oldPath, newPath);
    console.log(`Copied: "${file}" -> "${clean}"`);

    fileMap.set(`/products/${file}`, `/products/${clean}`);
  }

  // Update Supabase products
  const { data: products } = await supabase
    .from("products")
    .select("id, image_url")
    .like("image_url", "/products/%");

  console.log(`Checking ${products.length} products in Supabase...`);

  for (const p of products) {
    if (fileMap.has(p.image_url)) {
      const newUrl = fileMap.get(p.image_url);
      const { error } = await supabase
        .from("products")
        .update({ image_url: newUrl })
        .eq("id", p.id);

      if (error) {
        console.error(`Error updating product ${p.id}:`, error);
      } else {
        console.log(`Updated product ${p.id}: ${p.image_url} -> ${newUrl}`);
      }
    }
  }

  // Update Supabase categories
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, image_url")
    .like("image_url", "/products/%");

  console.log(`Checking ${categories.length} categories in Supabase...`);

  for (const c of categories) {
    if (fileMap.has(c.image_url)) {
      const newUrl = fileMap.get(c.image_url);
      const { error } = await supabase
        .from("categories")
        .update({ image_url: newUrl })
        .eq("id", c.id);

      if (error) {
        console.error(`Error updating category ${c.id}:`, error);
      } else {
        console.log(`Updated category ${c.name}: ${c.image_url} -> ${newUrl}`);
      }
    }
  }

  console.log("✅ Limpieza y sincronización de nombres de imágenes completada con éxito!");
}

sanitize().catch(console.error);
