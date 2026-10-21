import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("Tienda WEB/scripts/audit_output.json", "utf-8"));

console.log("=== CHECKING REUSED / DUPLICATE IMAGES ACROSS DIFFERENT PRODUCTS ===");

const imageToProducts = new Map();

for (const [catName, prods] of Object.entries(data)) {
  for (const p of prods) {
    if (!p.image_url) continue;
    const cleanUrl = p.image_url.trim();
    if (!imageToProducts.has(cleanUrl)) imageToProducts.set(cleanUrl, []);
    imageToProducts.get(cleanUrl).push({ cat: catName, id: p.id, title: p.title, sku: p.sku });

    if (p.variants) {
      for (const v of p.variants) {
        if (!v.image_url) continue;
        const vUrl = v.image_url.trim();
        if (vUrl !== cleanUrl) {
          if (!imageToProducts.has(vUrl)) imageToProducts.set(vUrl, []);
          imageToProducts.get(vUrl).push({ cat: catName, id: p.id, title: `${p.title} (${v.title})`, sku: v.sku });
        }
      }
    }
  }
}

let reusedCount = 0;
for (const [url, prods] of imageToProducts.entries()) {
  if (prods.length > 1) {
    console.log(`\nReused Image: ${url}`);
    prods.forEach(p => console.log(`   - [${p.cat}] ${p.title} (${p.sku})`));
    reusedCount++;
  }
}
console.log(`\nTotal reused images: ${reusedCount}`);
