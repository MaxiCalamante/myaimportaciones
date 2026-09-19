const fs = require('fs');

async function checkDepts() {
  const depts = [
    { id: 4, name: 'Herramientas Eléctricas', slug: 'herramientas-electricas', url: 'https://www.totalherramientasoficial.com.py/produtos/ferramentas-electricas/filter?d=4' },
    { id: 3, name: 'Herramientas Manuales', slug: 'herramientas-manuales', url: 'https://www.totalherramientasoficial.com.py/produtos/ferramentas-manuais/filter?d=3' },
    { id: 66, name: 'Atornilladores & Llaves de Impacto', slug: 'atornilladores-llaves-impacto', url: 'https://www.totalherramientasoficial.com.py/produtos/parafusadeira/filter?d=66' },
    { id: 37, name: 'Taladros & Rotomartillos', slug: 'taladros-rotomartillos', url: 'https://www.totalherramientasoficial.com.py/produtos/furadeira-/filter?d=37' },
    { id: 52, name: 'Sierras Circulares & de Banco', slug: 'sierras-corte', url: 'https://www.totalherramientasoficial.com.py/produtos/serra-/filter?d=52' },
    { id: 39, name: 'Lijadoras Eléctricas', slug: 'lijadoras-electricas', url: 'https://www.totalherramientasoficial.com.py/produtos/lixadeiras/filter?d=39' },
    { id: 49, name: 'Pulidoras & Abrillantadoras', slug: 'pulidoras-abrillantadoras', url: 'https://www.totalherramientasoficial.com.py/produtos/polidoras/filter?d=49' },
    { id: 51, name: 'Rectificadoras & Mini Tornos', slug: 'rectificadoras-mini-tornos', url: 'https://www.totalherramientasoficial.com.py/produtos/retificador/filter?d=51' },
    { id: 53, name: 'Sierras Caladoras (Tico Tico)', slug: 'sierras-caladoras', url: 'https://www.totalherramientasoficial.com.py/produtos/tico-tico/filter?d=53' },
    { id: 46, name: 'Mezcladoras de Cemento & Pintura', slug: 'mezcladoras-cemento-pintura', url: 'https://www.totalherramientasoficial.com.py/produtos/misturador/filter?d=46' },
    { id: 59, name: 'Pistolas de Pintura & Calor', slug: 'pistolas-pintura-calor', url: 'https://www.totalherramientasoficial.com.py/produtos/pistolas/filter?d=59' },
    { id: 56, name: 'Herramientas Neumáticas', slug: 'herramientas-neumaticas', url: 'https://www.totalherramientasoficial.com.py/produtos/pneumatica/filter?d=56' },
    { id: 68, name: 'Máquinas Industriales & Construcción', slug: 'maquinas-industriales-construccion', url: 'https://www.totalherramientasoficial.com.py/produtos/maquinas-profissionais-e-industriais/filter?d=68' },
    { id: 13, name: 'Bombas de Agua & Presurizadoras', slug: 'bombas-agua-presurizadoras', url: 'https://www.totalherramientasoficial.com.py/produtos/bomba-de-agua/filter?d=13' },
    { id: 6, name: 'Compresores de Aire', slug: 'compresores-aire', url: 'https://www.totalherramientasoficial.com.py/produtos/compresor-de-ar/filter?d=6' },
    { id: 7, name: 'Generadores Eléctricos & Grupos Electrógenos', slug: 'generadores-energia', url: 'https://www.totalherramientasoficial.com.py/produtos/gerador-de-energia/filter?d=7' },
    { id: 9, name: 'Hidrolavadoras de Alta Presión', slug: 'hidrolavadoras-alta-presion', url: 'https://www.totalherramientasoficial.com.py/produtos/lava-jato-/filter?d=9' },
    { id: 36, name: 'Gatos Hidráulicos, Criques & Soporte', slug: 'gatos-hidraulicos-criques', url: 'https://www.totalherramientasoficial.com.py/produtos/macaco-hidraulico--chave-desforcimetro/filter?d=36' },
    { id: 41, name: 'Morsas & Tornillos de Banco', slug: 'morsas-banco', url: 'https://www.totalherramientasoficial.com.py/produtos/morsa-de-bancada/filter?d=41' },
    { id: 71, name: 'Cortadoras de Piso & Cerámica', slug: 'cortadoras-piso-ceramica', url: 'https://www.totalherramientasoficial.com.py/produtos/corte-de-piso/filter?d=71' },
    { id: 8, name: 'Guinches, Malacates & Aparejos', slug: 'guinches-malacates-aparejos', url: 'https://www.totalherramientasoficial.com.py/produtos/guinchos/filter?d=8' },
    { id: 17, name: 'Talhas & Balanzas Industriales', slug: 'talhas-balanzas-industriales', url: 'https://www.totalherramientasoficial.com.py/produtos/-balanca--talhas/filter?d=17' },
    { id: 12, name: 'Escaleras de Aluminio & Andamios', slug: 'escaleras-aluminio', url: 'https://www.totalherramientasoficial.com.py/produtos/escada/filter?d=12' },
    { id: 5, name: 'Cajas Fuertes & Cofres Digitales', slug: 'cajas-fuertes-cofres', url: 'https://www.totalherramientasoficial.com.py/produtos/cofres/filter?d=5' },
    { id: 77, name: 'Kits & Cajas de Herramientas Completas', slug: 'kits-cajas-herramientas', url: 'https://www.totalherramientasoficial.com.py/produtos/kit-de-ferramentas/filter?d=77' },
    { id: 10, name: 'Multímetros & Medidores Eléctricos', slug: 'multimetros-medidores-electricos', url: 'https://www.totalherramientasoficial.com.py/produtos/multimetro-multitester/filter?d=10' },
    { id: 31, name: 'Baterías & Cargadores 20V Li-Ion', slug: 'baterias-cargadores-litio', url: 'https://www.totalherramientasoficial.com.py/produtos/bateria--e-carregadores/filter?d=31' },
    { id: 63, name: 'Agro & Jardinería (Desbrozadoras, Motosierras)', slug: 'agro-jardineria', url: 'https://www.totalherramientasoficial.com.py/produtos/agro--jardinagem/filter?d=63' },
    { id: 76, name: 'Cortadoras Hidráulicas & Crimpeadoras', slug: 'hidraulico-corta-acero-crimpado', url: 'https://www.totalherramientasoficial.com.py/produtos/hidraulico-corta-aco-crimpagem/filter?d=76' },
    { id: 27, name: 'Niveles Láser & Cintas Métricas', slug: 'niveles-laser-medicion', url: 'https://www.totalherramientasoficial.com.py/produtos/metros-trena-nivel/filter?d=27' },
    { id: 366, name: 'Herramientas Automotrices Especiales', slug: 'herramientas-automotrices', url: 'https://www.totalherramientasoficial.com.py/produtos/automotivos/filter?d=366' },
    { id: 361, name: 'Máscaras de Soldar & Seguridad (EPI)', slug: 'mascaras-soldar-seguridad-epi', url: 'https://www.totalherramientasoficial.com.py/produtos/epi---equipamento-de-protecao-individual/filter?d=361' },
    { id: 191, name: 'Aspiradoras Industriales & Sopladores', slug: 'aspiradoras-industriales-sopladores', url: 'https://www.totalherramientasoficial.com.py/produtos/aspirador/filter?d=191' },
  ];

  for (const dept of depts) {
    try {
      const res = await fetch(dept.url);
      const text = await res.text();
      const match = text.match(/class="show-info"><span>(\d+)\s+de\s+(\d+)\s*<\/span>\s*item/i);
      console.log(`${dept.name} (d=${dept.id}): ${match ? match[2] : '0'} items`);
    } catch (e) {
      console.log(`${dept.name}: error ${e.message}`);
    }
  }
}

checkDepts().catch(console.error);
