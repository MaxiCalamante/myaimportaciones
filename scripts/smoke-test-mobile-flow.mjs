import http from 'http';

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function runSmokeTest() {
  console.log('--- INICIANDO SMOKE TEST DE FLUJO MÓVIL ---');

  // 1. Home
  const home = await get('/');
  console.log(`1. GET / -> Status: ${home.status}`);
  if (home.status !== 200) throw new Error('Home no devolvió 200');
  const hasCarousel = home.data.includes('Total Tools') || home.data.includes('K-Beauty') || home.data.includes('Herramientas');
  console.log(`   - Carrusel contiene rubros clave: ${hasCarousel}`);

  // 2. Catálogo Cosmética Coreana
  const catCosmetica = await get('/catalogo?category=cosmetica-coreana');
  console.log(`2. GET /catalogo?category=cosmetica-coreana -> Status: ${catCosmetica.status}`);
  if (catCosmetica.status !== 200) throw new Error('Catálogo de cosmética no devolvió 200');

  // 3. Ficha de producto estrella (Medicube Collagen Jelly Cream)
  const productRes = await get('/producto/medicube-collagen-jelly-cream-110ml-769903-81624e60');
  console.log(`3. GET /producto/medicube-collagen-jelly-cream-110ml-769903-81624e60 -> Status: ${productRes.status}`);
  if (productRes.status !== 200) throw new Error('Ficha de Medicube no devolvió 200');
  const hasPrice = productRes.data.includes('$') || productRes.data.includes('ARS');
  const hasStock = productRes.data.includes('Stock disponible') || productRes.data.includes('InStock');
  console.log(`   - Contiene precio visible: ${hasPrice}`);
  console.log(`   - Contiene disponibilidad verificada: ${hasStock}`);

  // 4. Catálogo Herramientas
  const catTools = await get('/catalogo?category=herramientas-equipamiento');
  console.log(`4. GET /catalogo?category=herramientas-equipamiento -> Status: ${catTools.status}`);
  if (catTools.status !== 200) throw new Error('Catálogo de herramientas no devolvió 200');

  // 5. Ficha de herramienta estrella (Soldadora Total 200A)
  const toolRes = await get('/producto/total-maquina-de-soldar-200a-mig-mag-mma-tig-utmgt20058-dd7f64f1');
  console.log(`5. GET /producto/total-maquina-de-soldar-200a-mig-mag-mma-tig-utmgt20058-dd7f64f1 -> Status: ${toolRes.status}`);
  if (toolRes.status !== 200) throw new Error('Ficha de Soldadora no devolvió 200');
  const toolHasPrice = toolRes.data.includes('$') || toolRes.data.includes('ARS');
  console.log(`   - Soldadora contiene precio visible: ${toolHasPrice}`);

  // 6. Ficha de audio estrella (JBL PartyBox 520)
  const jblRes = await get('/producto/caixa-de-som-jbl-party-box-520-bluetooth-bivolt-preto-53b29eea');
  console.log(`6. GET /producto/caixa-de-som-jbl-party-box-520-bluetooth-bivolt-preto-53b29eea -> Status: ${jblRes.status}`);
  if (jblRes.status !== 200) throw new Error('Ficha de JBL PartyBox no devolvió 200');

  // 7. Checkout
  const checkoutRes = await get('/checkout');
  console.log(`7. GET /checkout -> Status: ${checkoutRes.status}`);
  if (checkoutRes.status !== 200) throw new Error('Checkout no devolvió 200');

  // 8. Mayorista público
  const mayoristaRes = await get('/mayorista');
  console.log(`8. GET /mayorista -> Status: ${mayoristaRes.status}`);
  if (mayoristaRes.status !== 200) throw new Error('Mayorista no devolvió 200');

  // 9. Sitemap
  const sitemapRes = await get('/sitemap.xml');
  console.log(`9. GET /sitemap.xml -> Status: ${sitemapRes.status}`);
  if (sitemapRes.status !== 200) throw new Error('Sitemap no devolvió 200');

  console.log('--- SMOKE TEST COMPLETADO CON ÉXITO ---');
}

runSmokeTest().catch((err) => {
  console.error('Smoke test falló:', err);
  process.exit(1);
});
