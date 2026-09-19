const fs = require('fs');

async function scrapePages(startPage, endPage) {
  const allProducts = [];

  for (let p = startPage; p <= endPage; p++) {
    const url = `https://www.totalherramientasoficial.com.py/produtos?pagina=${p}`;
    try {
      const res = await fetch(url);
      const html = await res.text();
      const cards = html.split('<div class="product">').slice(1);

      for (const card of cards) {
        // Extract SKU
        const skuMatch = card.match(/#SKU\s*(\d+)/i) || card.match(/data-item_codigo="(\d+)"/i);
        const sku = skuMatch ? skuMatch[1] : null;

        // Extract Title / Name
        const nameMatch = card.match(/class="product-name"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
        let title = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ') : '';

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

        if (sku && title) {
          allProducts.push({ sku, title, priceUsd, priceGs, imgUrl, prodUrl });
        }
      }
      console.log(`Page ${p}/${endPage}: found ${cards.length} cards, total: ${allProducts.length}`);
    } catch (e) {
      console.error(`Page ${p} error:`, e.message);
    }
  }

  console.log(`Finished scraping ${startPage}..${endPage}. Total products: ${allProducts.length}`);
  fs.writeFileSync('sample_scraped_10_pages.json', JSON.stringify(allProducts, null, 2));
}

scrapePages(1, 10).catch(console.error);
