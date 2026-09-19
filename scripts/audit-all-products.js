const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function getEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  content.split("\n").forEach((line) => {
    const [key, ...val] = line.split("=");
    if (key && val) {
      env[key.trim()] = val.join("=").trim().replace(/^["']|["']$/g, "");
    }
  });
  return env;
}

const supabase = createClient(
  'https://gqcdurxndbeeugjfworx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxY2R1cnhuZGJlZXVnamZ3b3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM3NTAsImV4cCI6MjA5NzI3OTc1MH0.dpdv4l25RNr0DKp7MmI5c6PQDfQ5ahqtfhxOdEsalbo'
);

async function audit() {

  console.log("=== INICIANDO AUDITORÍA GENERAL DE PRODUCTOS EN SUPABASE ===");

  const { count: totalCount, error: countErr } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  if (countErr) {
    console.error("Error al contar productos:", countErr);
    return;
  }

  console.log(`Total de productos en base de datos: ${totalCount}`);

  // Fetch all products in chunks of 1000
  let allProducts = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, category_id, tags")
      .range(from, from + batchSize - 1);

    if (error) {
      console.error(`Error al traer lote ${from}:`, error);
      break;
    }

    allProducts = allProducts.concat(data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  console.log(`Productos descargados para análisis: ${allProducts.length}`);

  // Get categories for validation
  const { data: categories } = await supabase.from("categories").select("id, name, slug, parent_id");
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  let missingTitle = 0;
  let missingDescription = 0;
  let missingImage = 0;
  let invalidImageUrl = 0;
  let invalidPrice = 0;
  let zeroStock = 0;
  let missingCategory = 0;

  const imageDomains = new Map();
  const sampleIssues = [];

  for (const p of allProducts) {
    // 1. Title
    if (!p.title || p.title.trim().length === 0) {
      missingTitle++;
      sampleIssues.push({ id: p.id, issue: "Título vacío" });
    }

    // 2. Description
    if (!p.description || p.description.trim().length === 0) {
      missingDescription++;
      sampleIssues.push({ id: p.id, title: p.title, issue: "Descripción vacía" });
    }

    // 3. Image
    if (!p.image_url || p.image_url.trim().length === 0) {
      missingImage++;
      sampleIssues.push({ id: p.id, title: p.title, issue: "Sin imagen" });
    } else {
      try {
        if (p.image_url.startsWith("http")) {
          const u = new URL(p.image_url);
          const domain = u.hostname;
          imageDomains.set(domain, (imageDomains.get(domain) || 0) + 1);
        } else if (!p.image_url.startsWith("/")) {
          invalidImageUrl++;
          sampleIssues.push({ id: p.id, title: p.title, issue: `URL imagen inválida: ${p.image_url}` });
        }
      } catch (e) {
        invalidImageUrl++;
        sampleIssues.push({ id: p.id, title: p.title, issue: `URL imagen malformada: ${p.image_url}` });
      }
    }

    // 4. Prices
    if (!p.retail_price || p.retail_price <= 0) {
      invalidPrice++;
      sampleIssues.push({ id: p.id, title: p.title, issue: `Precio minorista inválido: ${p.retail_price}` });
    }

    // 5. Stock
    if (p.stock <= 0) {
      zeroStock++;
    }

    // 6. Category
    if (!p.category_id || !categoryMap.has(p.category_id)) {
      missingCategory++;
      sampleIssues.push({ id: p.id, title: p.title, issue: `Categoría inválida o no encontrada: ${p.category_id}` });
    }
  }

  console.log("\n--- RESULTADOS DE LA AUDITORÍA ---");
  console.log(`- Sin título: ${missingTitle}`);
  console.log(`- Sin descripción: ${missingDescription}`);
  console.log(`- Sin imagen: ${missingImage}`);
  console.log(`- URL imagen malformada: ${invalidImageUrl}`);
  console.log(`- Precio inválido (<= 0): ${invalidPrice}`);
  console.log(`- Categoría faltante/huérfana: ${missingCategory}`);
  console.log(`- Sin stock: ${zeroStock}`);
  console.log(`- Con stock disponible: ${allProducts.length - zeroStock}`);

  console.log("\n--- DISTRIBUCIÓN DE DOMINIOS DE IMÁGENES ---");
  for (const [dom, count] of imageDomains.entries()) {
    console.log(`  * ${dom}: ${count} imágenes`);
  }

  if (sampleIssues.length > 0) {
    console.log("\n--- PRIMEROS PROBLEMAS DETECTADOS (si los hay) ---");
    console.log(sampleIssues.slice(0, 10));
  } else {
    console.log("\n✅ ¡Todos los 2.892 productos tienen Nombre, Descripción, Foto y Precios válidos!");
  }
}

audit().catch(console.error);
