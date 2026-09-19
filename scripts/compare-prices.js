const fs = require('fs');
const scraped = JSON.parse(fs.readFileSync('sample_scraped_10_pages.json', 'utf8'));
const tools = JSON.parse(fs.readFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/tools_products.json', 'utf8'));

const toolMap = new Map();
for (const t of tools) {
  const m = t.slug.match(/-(\d+)$/);
  if (m) toolMap.set(m[1], t);
}

for (const s of scraped.slice(0, 10)) {
  const match = toolMap.get(s.sku);
  if (match) {
    const ratio = match.wholesale_price / s.priceUsd;
    console.log(`SKU ${s.sku}: ${s.title}`);
    console.log(`  Scraped USD: $${s.priceUsd}, Existing Wholesale: $${match.wholesale_price}, Ratio: ${ratio.toFixed(2)}`);
  } else {
    console.log(`SKU ${s.sku}: not in existing tools.`);
  }
}
