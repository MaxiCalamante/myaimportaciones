const fs = require('fs');
const html = fs.readFileSync('sample_listing.html', 'utf8');

const start = html.indexOf('<div class="product">');
console.log(html.substring(start + 4500, start + 7000));
