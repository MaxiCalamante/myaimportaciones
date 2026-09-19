const fs = require('fs');

const html = fs.readFileSync('C:/Users/maxim/.gemini/antigravity/brain/173bd0b6-6e8f-42e3-bad1-497fc462f95b/.system_generated/steps/1744/content.md', 'utf8');

// Look for product items or articles
const cards = [...html.matchAll(/<article[^>]*class="[^"]*product-miniature[^"]*"[\s\S]*?<\/article>/gi)];
console.log('Product miniatures found:', cards.length);

if (cards.length > 0) {
  console.log('Sample card:');
  console.log(cards[0][0]);
} else {
  // Let's search for price or product links
  const matches = [...html.matchAll(/class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  console.log('Prices found:', matches.slice(0, 10));
}
