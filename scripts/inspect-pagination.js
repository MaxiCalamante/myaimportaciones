const fs = require('fs');
const html = fs.readFileSync('sample_listing.html', 'utf8');

const pagMatch = html.match(/class="[^"]*pagination[^"]*"[\s\S]*?<\/ul>/i);
if (pagMatch) {
  console.log('Pagination found:');
  console.log(pagMatch[0]);
} else {
  // search page= or p= or similar
  const pageLinks = [...html.matchAll(/href="([^"]*[\?&]p(?:age)?=\d+[^"]*)"/gi)].map(m => m[1]);
  console.log('Page links:', pageLinks);
}
