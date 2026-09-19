const fs = require('fs');

const html = fs.readFileSync('sample_listing.html', 'utf8');

// Split by <div class="product">
const cards = html.split('<div class="product">').slice(1);
console.log(`Found ${cards.length} cards in listing.`);

const parsed = [];

for (const card of cards) {
  // Extract SKU
  const skuMatch = card.match(/#SKU\s*(\d+)/i) || card.match(/data-item_codigo="(\d+)"/i);
  const sku = skuMatch ? skuMatch[1] : null;

  // Extract Title / Name
  const nameMatch = card.match(/class="product-name"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
  let title = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  title = title.replace(/\s+/g, ' ');

  // Extract Price in USD
  const usdMatch = card.match(/data-item_preco="([\d\.]+)"/i) || card.match(/<ins class="new-price"[^>]*>\s*([\d\.,]+)<\/ins>/i);
  let priceUsd = usdMatch ? parseFloat(usdMatch[1].replace(',', '.')) : 0;

  // Extract Price in Gs
  const gsMatch = card.match(/Gs\s*([\d\.]+)/i);
  const priceGs = gsMatch ? parseInt(gsMatch[1].replace(/\./g, '')) : 0;

  // Extract Image URL
  const imgMatch = card.match(/<img[^>]+src="([^">]+)"/i);
  let imgUrl = imgMatch ? imgMatch[1] : '';

  // Extract Product Link
  const linkMatch = card.match(/href="([^"]*\/produto\/[^"]+)"/i);
  const prodUrl = linkMatch ? linkMatch[1] : '';

  parsed.push({ sku, title, priceUsd, priceGs, imgUrl, prodUrl });
}

console.log('Parsed sample (first 5):');
console.log(parsed.slice(0, 5));
