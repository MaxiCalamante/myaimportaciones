async function main() {
  for (const q of ['?limite=100', '?itens=100', '?per_page=100', '?limit=100', '?qtd=100', '?por_pagina=100']) {
    try {
      const res = await fetch('https://www.totalherramientasoficial.com.py/produtos' + q);
      const text = await res.text();
      const match = text.match(/class="show-info"><span>(\d+)\s+de\s+(\d+)\s*<\/span>\s*item/i);
      console.log(q, match ? match[1] + ' of ' + match[2] : 'none');
    } catch (e) {
      console.error(q, e.message);
    }
  }
}
main().catch(console.error);
