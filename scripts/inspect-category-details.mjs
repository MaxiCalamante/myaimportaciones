import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("Tienda WEB/scripts/audit_output.json", "utf-8"));

function inspectCategory(catName) {
  const prods = data[catName] || [];
  console.log(`\n================== ${catName.toUpperCase()} (${prods.length} productos) ==================`);
  prods.forEach((p, idx) => {
    console.log(`${(idx + 1).toString().padStart(3, " ")}. [${p.id.slice(0, 8)}] ${p.title}`);
    console.log(`     SKU: ${p.sku || "N/A"} | Brand: ${p.brand || "N/A"} | Price: $${p.retail_price?.toLocaleString("es-AR")} | HasVariants: ${p.has_variants} (${p.variants?.length || 0})`);
    console.log(`     Image: ${p.image_url ? p.image_url.slice(0, 90) : "NO IMAGE"}`);
    if (p.variants && p.variants.length > 0) {
      p.variants.forEach(v => {
        console.log(`       -> Variant: "${v.title}" | SKU: ${v.sku} | Price: $${v.retail_price} | Options: ${JSON.stringify(v.options)} | Img: ${v.image_url ? v.image_url.slice(0, 60) : "SAME"}`);
      });
    }
  });
}

const target = process.argv[2] || "cuidado-capilar";
inspectCategory(target);
