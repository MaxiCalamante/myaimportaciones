import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";

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
  console.log("=== AUDITORÍA COMPLETA DE CATEGORÍAS RESTANTES ===");

  // 1. Categorías
  const { data: categories } = await supabase.from("categories").select("*");
  const catMap = new Map(categories.map(c => [c.id, c]));

  // 2. Traer todos los productos activos
  const { data: products, error } = await supabase
    .from("products")
    .select("id, title, slug, brand, model, sku, retail_price, category_id, image_url, image_urls, is_active, has_variants")
    .eq("is_active", true)
    .order("title");

  if (error) {
    console.error("Error fetching products:", error);
    return;
  }

  // Traer todas las variantes de productos activos
  const productIds = products.map(p => p.id);
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, product_id, title, sku, retail_price, options, is_active, image_url")
    .in("product_id", productIds);

  const variantsByProd = new Map();
  for (const v of (variants || [])) {
    if (!variantsByProd.has(v.product_id)) variantsByProd.set(v.product_id, []);
    variantsByProd.get(v.product_id).push(v);
  }

  // Agrupar productos por root category
  const byCategory = {};
  for (const p of products) {
    const cat = catMap.get(p.category_id);
    let rootSlug = cat?.slug || "uncategorized";
    if (cat?.parent_id) {
      const parent = catMap.get(cat.parent_id);
      if (parent) rootSlug = parent.slug;
    }
    // Si el slug empieza con prefijo conocido
    if (rootSlug.startsWith("cosmetica") || rootSlug.includes("belleza") || cat?.slug?.includes("cosmetica")) {
      rootSlug = "cosmetica-coreana";
    } else if (rootSlug.startsWith("cuidado") || cat?.slug?.includes("capilar")) {
      rootSlug = "cuidado-capilar";
    } else if (rootSlug.startsWith("herramientas") || cat?.slug?.includes("herramientas")) {
      rootSlug = "herramientas-equipamiento";
    } else if (rootSlug.startsWith("electronica") || cat?.slug?.includes("electronica")) {
      rootSlug = "electronica";
    }

    if (!byCategory[rootSlug]) byCategory[rootSlug] = [];
    byCategory[rootSlug].push({
      ...p,
      category_name: cat?.name || "Desconocida",
      category_slug: cat?.slug || "unknown",
      variants: variantsByProd.get(p.id) || []
    });
  }

  console.log("Conteo de productos activos por categoría raíz:");
  for (const [slug, prods] of Object.entries(byCategory)) {
    console.log(`- ${slug}: ${prods.length} productos activos`);
  }

  writeFileSync("Tienda WEB/scripts/audit_output.json", JSON.stringify(byCategory, null, 2), "utf-8");
  console.log("Reporte guardado en Tienda WEB/scripts/audit_output.json");
}

main().catch(console.error);
