const fs = require('fs');

const html = fs.readFileSync('C:/Users/maxim/.gemini/antigravity/brain/173bd0b6-6e8f-42e3-bad1-497fc462f95b/.system_generated/steps/1744/content.md', 'utf8');

// Subcategories / categories menu
const catMatches = [...html.matchAll(/href="([^"]*atacadousa\.com\.py\/(\d+-[^"]+))"[^>]*>([\s\S]*?)<\/a>/gi)];
const subcats = new Map();

for (const m of catMatches) {
  const url = m[1];
  const name = m[3].replace(/<[^>]+>/g, '').trim();
  if (name && !subcats.has(url) && url.includes('cosmetico')) {
    subcats.set(url, name);
  }
}

console.log('Cosmetics subcategories found:', subcats.size);
for (const [url, name] of subcats.entries()) {
  console.log(`${name} -> ${url}`);
}

// Pagination
const pagMatches = [...html.matchAll(/class="[^"]*pagination[^"]*"[\s\S]*?<\/ul>/gi)];
console.log('Pagination matches:', pagMatches.length);
if (pagMatches[0]) {
  console.log(pagMatches[0][0]);
}

// Total product count
const countMatch = html.match(/Mostrando\s*(\d+)\s*-\s*(\d+)\s*de\s*(\d+)\s*item/i) || html.match(/(\d+)\s*produtos/i) || html.match(/Há\s*(\d+)\s*produtos/i);
console.log('Product count match:', countMatch ? countMatch[0] : 'None');
