const fs = require('fs');

const pagePaths = [
  'C:/Users/maxim/.gemini/antigravity/brain/173bd0b6-6e8f-42e3-bad1-497fc462f95b/.system_generated/steps/1744/content.md',
  'C:/Users/maxim/.gemini/antigravity/brain/173bd0b6-6e8f-42e3-bad1-497fc462f95b/.system_generated/steps/1766/content.md',
  'C:/Users/maxim/.gemini/antigravity/brain/173bd0b6-6e8f-42e3-bad1-497fc462f95b/.system_generated/steps/1768/content.md'
];

const allProducts = [];
const seenIds = new Set();

for (let i = 0; i < pagePaths.length; i++) {
  const filePath = pagePaths[i];
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    continue;
  }
  const html = fs.readFileSync(filePath, 'utf8');

  const cardRegex = /<article[^>]*class="[^"]*product-miniature[^"]*"[\s\S]*?<\/article>/gi;
  const cards = [...html.matchAll(cardRegex)];
  console.log(`Page ${i + 1}: parsed ${cards.length} cards`);

  for (const match of cards) {
    const card = match[0];

    // ID
    const idMatch = card.match(/data-id-product="(\d+)"/i);
    const productId = idMatch ? idMatch[1] : null;

    if (productId && seenIds.has(productId)) continue;
    if (productId) seenIds.add(productId);

    // Brand
    const brandMatch = card.match(/class="manufacturer"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
    let brand = brandMatch ? brandMatch[1].trim() : '';

    // Title & Link
    const linkMatch = card.match(/<a[^>]+href="([^"]*atacadousa\.com\.py\/cosmeticos\/[^"]+)"[^>]*class="product_name[^"]*"[^>]*title="([^"]*)"/i)
      || card.match(/<h3[^>]*>[\s\S]*?<a[^>]+href="([^"]*atacadousa\.com\.py\/cosmeticos\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    
    const prodUrl = linkMatch ? linkMatch[1] : '';
    let title = linkMatch ? (linkMatch[2] || linkMatch[1]).replace(/<[^>]+>/g, '').trim() : '';
    title = title.replace(/\s+/g, ' ').trim();

    // Infer brand from title if missing
    if (!brand || brand === 'General' || brand === 'GERAL') {
      if (title.toUpperCase().includes('MEDICUBE')) brand = 'Medicube';
      else if (title.toUpperCase().includes('KARSEELL')) brand = 'Karseell';
      else if (title.toUpperCase().includes('SKIN1004') || title.toUpperCase().includes('CENTELLA')) brand = 'SKIN1004';
      else if (title.toUpperCase().includes('CELIMAX')) brand = 'Celimax';
      else if (title.toUpperCase().includes('ANUA')) brand = 'Anua';
      else if (title.toUpperCase().includes('NUMBUZIN')) brand = 'Numbuzin';
      else if (title.toUpperCase().includes('DR.ALTHEA') || title.toUpperCase().includes('DR ALTHEA')) brand = 'Dr. Althea';
      else if (title.toUpperCase().includes('VT COSMETICS') || title.toUpperCase().includes('REEDLE')) brand = 'VT Cosmetics';
      else if (title.toUpperCase().includes("VICTORIA'S SECRET") || title.toUpperCase().includes('VICTORIA')) brand = "Victoria's Secret";
      else if (title.toUpperCase().includes('DEAR BODY')) brand = 'Dear Body';
      else brand = 'K-Beauty';
    }

    // Image
    const imgMatch = card.match(/data-full-size-image-url\s*=\s*"([^"]+)"/i) 
      || card.match(/data-src\s*=\s*"([^"]+)"/i)
      || card.match(/<img[^>]+src="([^">]+)"/i);
    const imageUrl = imgMatch ? imgMatch[1] : '';

    // Price USD
    const priceMatch = card.match(/class="price[^"]*"[^>]*>[\s\S]*?\$[^\d]*([\d\.,]+)/i);
    let priceUsd = 0;
    if (priceMatch) {
      priceUsd = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Stock
    const stockMatch = card.match(/class="availability-list[^"]*"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i);
    const stockText = stockMatch ? stockMatch[1].replace(/<[^>]+>/g, '').trim() : 'In Stock';
    const stockNumMatch = stockText.match(/(\d+)/);
    const stock = stockNumMatch ? parseInt(stockNumMatch[1], 10) : 15;

    // SKU
    const skuMatch = title.match(/\((\d+)\)/) || prodUrl.match(/-(\d+)\.html/);
    const sku = skuMatch ? skuMatch[1] : productId;

    if (title && priceUsd > 0) {
      allProducts.push({
        productId,
        sku,
        brand,
        title,
        priceUsd,
        imageUrl,
        prodUrl,
        stock,
        stockText,
      });
    }
  }
}

console.log(`\nTotal unique cosmetics parsed: ${allProducts.length}`);
console.log('Sample parsed (3):', JSON.stringify(allProducts.slice(0, 3), null, 2));

fs.writeFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/atacado_cosmetics.json', JSON.stringify(allProducts, null, 2));
console.log('Saved to scratch/atacado_cosmetics.json');
