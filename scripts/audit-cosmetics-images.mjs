import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("Tienda WEB/scripts/audit_output.json", "utf-8"));
const cosm = data["cosmetica-coreana"];

console.log("=== AUDITORÍA SEMÁNTICA DE IMÁGENES EN COSMÉTICA COREANA ===");

// 1. Verificar si hay imágenes compartidas entre productos con diferente título base
const imgMap = new Map();
cosm.forEach(p => {
  const img = p.image_url;
  if (!img) return;
  if (!imgMap.has(img)) imgMap.set(img, []);
  imgMap.get(img).push(p);
});

for (const [img, prods] of imgMap.entries()) {
  if (prods.length > 1) {
    console.log(`\nImágen compartida entre ${prods.length} productos: ${img}`);
    prods.forEach(p => console.log(`   - [${p.id.slice(0, 8)}] ${p.title} ($${p.retail_price})`));
  }
}

// 2. Verificar títulos con palabras clave de presentación o tipo vs la imagen o especificación
console.log("\nTotal productos cosmética revisados:", cosm.length);
