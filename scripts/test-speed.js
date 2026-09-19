async function testSpeed() {
  const start = Date.now();
  const pages = [1, 2, 3, 4, 5];
  const promises = pages.map(p =>
    fetch(`https://www.totalherramientasoficial.com.py/produtos?pagina=${p}`)
      .then(r => r.text())
      .then(t => ({ p, len: t.length }))
  );
  const results = await Promise.all(promises);
  console.log(`Fetched 5 pages in ${Date.now() - start}ms:`, results.map(r => `p${r.p}:${r.len}`).join(', '));
}
testSpeed().catch(console.error);
