const fs = require('fs');

const html = fs.readFileSync('sample_product.html', 'utf8');

// Find navigation links / departments
const deptMatches = html.matchAll(/href="([^"]*\/produtos\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi);
const categories = new Map();

for (const match of deptMatches) {
  const url = match[1];
  const name = match[2].replace(/<[^>]+>/g, '').trim();
  if (name && !categories.has(url) && !name.toLowerCase().includes('ver')) {
    categories.set(url, name);
  }
}

console.log('Categories found:', categories.size);
for (const [url, name] of categories.entries()) {
  console.log(`${name} -> ${url}`);
}
