const fs = require('fs');
const html = fs.readFileSync('sample_product.html', 'utf8');

const tabIdx = html.indexOf('id="product-tab-description"');
if (tabIdx !== -1) {
  console.log(html.substring(tabIdx, tabIdx + 1200));
}
