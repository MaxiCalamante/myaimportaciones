const fs = require('fs');

async function scrapeAtacado() {
  const pages = [1, 2, 3];
  const allProducts = [];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,pt-BR;q=0.8,pt;q=0.7,en;q=0.6',
  };

  for (const page of pages) {
    const url = page === 1 
      ? 'https://atacadousa.com.py/20-cosmeticos'
      : `https://atacadousa.com.py/20-cosmeticos?page=${page}`;

    console.log(`Fetching ${url}...`);
    const res = await fetch(url, { headers });
    const html = await res.text();
    console.log(`HTTP ${res.status}, Length: ${html.length}`);

    const cardRegex = /<article[^>]*class="[^"]*product-miniature[^"]*"[\s\S]*?<\/article>/gi;
    const cards = [...html.matchAll(cardRegex)];
    console.log(`Page ${page}: found ${cards.length} cards`);

    for (const match of cards) {
      const card = match[0];

      // ID
      const idMatch = card.match(/data-id-product="(\d+)"/i);
      const productId = idMatch ? idMatch[1] : null;

      // Brand
      const brandMatch = card.match(/class="manufacturer"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
      const brand = brandMatch ? brandMatch[1].trim() : 'General';

      // Title & Link
      const linkMatch = card.match(/<a[^>]+href="([^"]*atacadousa\.com\.py\/cosmeticos\/[^"]+)"[^>]*class="product_name[^"]*"[^>]*title="([^"]*)"/i)
        || card.match(/<h3[^>]*>[\s\S]*?<a[^>]+href="([^"]*atacadousa\.com\.py\/cosmeticos\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      
      const prodUrl = linkMatch ? linkMatch[1] : '';
      let title = linkMatch ? (linkMatch[2] || linkMatch[1]).replace(/<[^>]+>/g, '').trim() : '';

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

  console.log(`\nTotal scraped cosmetics: ${allProducts.length}`);
  fs.writeFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/atacado_cosmetics.json', JSON.stringify(allProducts, null, 2));
  console.log('Saved to scratch/atacado_cosmetics.json');
}

scrapeAtacado().catch(console.error);
