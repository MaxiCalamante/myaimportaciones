const fs = require('fs');

const tools = JSON.parse(fs.readFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/tools_products.json', 'utf8'));

// Department Category Mapping
const CATEGORIES = {
  taladros: '10000000-0000-0000-0000-000000000011',
  atornilladores: '10000000-0000-0000-0000-000000000013',
  amoladoras: '10000000-0000-0000-0000-000000000012',
  sierras: '10000000-0000-0000-0000-000000000014',
  lijadoras: '10000000-0000-0000-0000-000000000027',
  pistolas: '10000000-0000-0000-0000-000000000028',
  compresores: '10000000-0000-0000-0000-000000000016',
  hidrolavadoras: '10000000-0000-0000-0000-000000000018',
  bombas: '10000000-0000-0000-0000-000000000029',
  generadores: '10000000-0000-0000-0000-000000000025',
  maquinas_industriales: '10000000-0000-0000-0000-000000000030',
  soldadoras: '10000000-0000-0000-0000-000000000017',
  gatos_hidraulicos: '10000000-0000-0000-0000-000000000015',
  morsas: '10000000-0000-0000-0000-000000000031',
  cortadoras_piso: '10000000-0000-0000-0000-000000000032',
  kits_herramientas: '10000000-0000-0000-0000-000000000021',
  herramientas_manuales: '10000000-0000-0000-0000-000000000010',
  niveles_medicion: '10000000-0000-0000-0000-000000000020',
  baterias_cargadores: '10000000-0000-0000-0000-000000000033',
  agro_jardineria: '10000000-0000-0000-0000-000000000024',
  guinches_balanzas: '10000000-0000-0000-0000-000000000034',
  escaleras: '10000000-0000-0000-0000-000000000035',
  cajas_fuertes: '10000000-0000-0000-0000-000000000036',
  seguridad_epi: '10000000-0000-0000-0000-000000000022',
  automotrices: '10000000-0000-0000-0000-000000000037',
};

// Filter out small consumables
function isSmallItem(title, priceUsd) {
  const t = title.toUpperCase();

  // Screws, bolts, fasteners, rivets, anchors
  if (/\b(TORNILLO|TORNILLOS|PARAFUSO|PARAFUSOS|BULON|BULONES|REMACHE|REMACHES|TARUGO|TARUGOS|ARANDELA|ARANDELAS|TUERCA|TUERCAS|ABRAZADERA|ABRAZADERAS)\b/.test(t)) {
    return true;
  }

  // Grinder discs, cutting wheels, flap discs (unless it's an angle grinder machine)
  if (/\b(DISCO|DISCOS)\b/.test(t) && !/\b(AMOLADORA|ESMERIL|SIERRA CIRCULAR|INGLETADORA)\b/.test(t)) {
    return true;
  }

  // Sandpaper
  if (/\b(LIJA|LIJAS|LIXA|LIXAS)\b/.test(t) && !/\b(LIJADORA|LIXADEIRA)\b/.test(t)) {
    return true;
  }

  // Wire brushes
  if (/\b(ESCOVA|ESCOVAS|CEPILLO DE ALAMBRE)\b/.test(t)) {
    return true;
  }

  // Single drill bits
  if (/\b(BROCA|BROCAS|MECHA|MECHAS)\b/.test(t) && !/\b(JUEGO|SET|KIT)\b/.test(t) && priceUsd < 15) {
    return true;
  }

  // Single driver bits
  if (/\b(BIT|BITS)\b/.test(t) && !/\b(JUEGO|SET|KIT|ATORNILLADOR|TALADRO)\b/.test(t) && priceUsd < 10) {
    return true;
  }

  // Saw blades sueltas
  if (/\b(HOJA DE SIERRA|HOJAS DE SIERRA|LAMINA DE SIERRA|SEGUETA)\b/.test(t) && priceUsd < 10) {
    return true;
  }

  // Tiny accessories / consumables under $4.50 USD unless real hand tool
  if (priceUsd < 4.50) {
    const isRealHandTool = /\b(PINZA|ALICATE|DESTORNILLADOR|MARTILLO|LLAVE|CUTTER|CINTA METRICA|TRENA|NIVEL|CANDADO)\b/.test(t);
    if (!isRealHandTool) return true;
  }

  return false;
}

// Classify tool into one of the 25 subcategories
function classifyTool(title) {
  const t = title.toUpperCase();

  // 1. Cajas fuertes
  if (/\b(COFRE|CAJA FUERTE|CAIXA FORTE)\b/.test(t)) return CATEGORIES.cajas_fuertes;

  // 2. Máquinas industriales
  if (/\b(HORMIGONERA|BETONEIRA|ALISADOR|COMPACTADOR|CHIPEADOR|TRITURADOR|VIBRADOR DE CONCRETO|SERRA DE CHAO|CORTADORA DE PAVIMENTO)\b/.test(t)) {
    return CATEGORIES.maquinas_industriales;
  }

  // 3. Generadores
  if (/\b(GENERADOR|GERADOR|GRUPO ELECTROGENO)\b/.test(t)) return CATEGORIES.generadores;

  // 4. Hidrolavadoras
  if (/\b(HIDROLAVADORA|LAVA JATO|HIDROLIMPIADORA)\b/.test(t)) return CATEGORIES.hidrolavadoras;

  // 5. Bombas de agua
  if (/\b(BOMBA DE AGUA|MOTOBOMBA|SUMERGIBLE|PERIFERICA|CENTRIFUGA|PRESURIZADORA)\b/.test(t)) return CATEGORIES.bombas;

  // 6. Compresores & neumática
  if (/\b(COMPRESOR|COMPRESSOR|NEUMAT|PNEUMAT|CLAVADORA|ENGRASADORA NEUMATICA)\b/.test(t)) return CATEGORIES.compresores;

  // 7. Soldadoras
  if (/\b(SOLDAD|SOLDA|INVERTER|MMA|MIG|TIG|PLASMA|ELECTRODO)\b/.test(t) && !/\b(MASCARA|CARETA)\b/.test(t)) {
    return CATEGORIES.soldadoras;
  }

  // 8. Seguridad & Máscaras de soldar
  if (/\b(MASCARA|CARETA|CASCO|LENTES DE SEGURIDAD|GUANTE|BOTA DE SEGURIDAD|PROTECCION FACIAL)\b/.test(t)) {
    return CATEGORIES.seguridad_epi;
  }

  // 9. Gatos hidráulicos & criques
  if (/\b(GATO HIDRAULICO|MACACO|CRIQUE|CABALLETE|CAVALETE|ELEVADOR HIDRAULICO|PRENSA HIDRAULICA)\b/.test(t)) {
    return CATEGORIES.gatos_hidraulicos;
  }

  // 10. Morsas & banco
  if (/\b(MORSA|TORNILLO DE BANCO|YUNQUE|BIGORNA)\b/.test(t)) return CATEGORIES.morsas;

  // 11. Cortadoras de piso
  if (/\b(CORTADOR DE PISO|CORTADOR DE AZULEJO|CORTADORA CERAMICA)\b/.test(t)) return CATEGORIES.cortadoras_piso;

  // 12. Baterías & cargadores
  if (/\b(BATERIA|CARREGADOR|CARGADOR)\b/.test(t) && /\b(20V|12V|LI-ION|LITIO)\b/.test(t) && !/\b(TALADRO|ATORNILLADOR|AMOLADORA|ROTOMARTILLO)\b/.test(t)) {
    return CATEGORIES.baterias_cargadores;
  }

  // 13. Agro & jardinería
  if (/\b(MOTOSIERRA|MOTOSSERRA|DESBROZADORA|ROÇADEIRA|CORTACESPED|FUMIGADOR|PULVERIZADOR|PODADORA|JARDINAGEM)\b/.test(t)) {
    return CATEGORIES.agro_jardineria;
  }

  // 14. Guinches, aparejos & balanzas
  if (/\b(GUINCHE|GUINCHO|MALACATE|APAREJO|TALHA|BALANZA|BALANÇA)\b/.test(t)) return CATEGORIES.guinches_balanzas;

  // 15. Escaleras
  if (/\b(ESCALERA|ESCADA|ANDAMIO)\b/.test(t)) return CATEGORIES.escaleras;

  // 16. Automotrices
  if (/\b(DESFORCIMETRO|EXTRACTOR|COMPRESOR DE RESORTE|PURGADOR|AUTOMOTIV)\b/.test(t)) return CATEGORIES.automotrices;

  // 17. Niveles & medición
  if (/\b(NIVEL LASER|DISTANCIOMETRO|CINTA METRICA|TRENA|CALIBRE|PAQUIMETRO|MULTIMETRO|TESTER|TERMOMETRO)\b/.test(t)) {
    return CATEGORIES.niveles_medicion;
  }

  // 18. Atornilladores & llaves de impacto
  if (/\b(ATORNILLADOR|PARAFUSADEIRA|LLAVE DE IMPACTO|CHAVE DE IMPACTO)\b/.test(t)) return CATEGORIES.atornilladores;

  // 19. Taladros & rotomartillos
  if (/\b(TALADRO|FURADEIRA|ROTOMARTILLO|MARTELETE|DEMOLEDOR)\b/.test(t)) return CATEGORIES.taladros;

  // 20. Amoladoras, pulidoras & rectificadores
  if (/\b(AMOLADORA|ESMERIL|PULIDORA|POLIDORA|RECTIFICADOR|RETIFICADOR|MINI TORNO)\b/.test(t)) return CATEGORIES.amoladoras;

  // 21. Sierras & corte
  if (/\b(SIERRA|SERRA|CALADORA|TICO TICO|INGLETADORA|CIRCULAR|SABLE)\b/.test(t)) return CATEGORIES.sierras;

  // 22. Lijadoras & mezcladores
  if (/\b(LIJADORA|LIXADEIRA|MEZCLADOR|MISTURADOR|CEPILLO ELECTRICO)\b/.test(t)) return CATEGORIES.lijadoras;

  // 23. Pistolas pintura & calor
  if (/\b(PISTOLA DE PINTURA|PISTOLA DE CALOR|SOPLADOR TERMICO|PISTOLA PINTAR)\b/.test(t)) return CATEGORIES.pistolas;

  // 24. Kits & cajas de herramientas
  if (/\b(KIT DE FERRAMENTAS|JUEGO DE HERRAMIENTAS|VALIJA|MALETIN|CAJA DE HERRAMIENTAS|CAIXA DE FERRAMENTAS|BOLSAS)\b/.test(t)) {
    return CATEGORIES.kits_herramientas;
  }

  // Default to herramientas manuales
  return CATEGORIES.herramientas_manuales;
}

// Generate structured description
function generateDescription(title, sku, brand, retailPrice, wholesalePrice) {
  const brandName = title.toUpperCase().includes('WADFOW') ? 'Wadfow' : 'Total Tools';
  const cleanTitle = title.replace(/^(TOTAL|WADFOW)\s+/i, '').trim();

  return `${brandName.toUpperCase()} - ${cleanTitle} (Ref. SKU #${sku}).
• Calidad: Línea Profesional / Industrial de alta resistencia y durabilidad.
• Garantía: Garantía oficial de fábrica Total Tools / Wadfow.
• Suministro: Producto 100% original importado directamente por MYA Importaciones.
• Disponibilidad: Venta por unidad a precio minorista y precios especiales por bulto cerrado para compras mayoristas.
• Facturación y Envíos: Emitimos Factura A y B. Envíos protegidos a todo el territorio argentino.`;
}

// Main processing
const EXCHANGE_RATE = 1300; // 1300 ARS per USD
const processed = [];
let excludedCount = 0;

for (const p of tools) {
  const skuMatch = p.slug.match(/-(\d+)$/);
  const sku = skuMatch ? skuMatch[1] : p.slug;

  // Cost in USD
  const priceUsd = p.wholesale_price / 1667.41;

  if (isSmallItem(p.title, priceUsd)) {
    excludedCount++;
    continue;
  }

  // Base ARS Cost
  const costArs = Math.round(priceUsd * EXCHANGE_RATE);

  // Retail Price ("el doble")
  const retailPrice = Math.round((costArs * 2.0) / 100) * 100;

  // Wholesale Price (B2B margin ~15%)
  const wholesalePrice = Math.round((costArs * 1.15) / 100) * 100;

  // Category
  const categoryId = classifyTool(p.title);

  // Description
  const description = generateDescription(p.title, sku, p.brand, retailPrice, wholesalePrice);

  processed.push({
    id: p.id,
    category_id: categoryId,
    title: p.title,
    slug: p.slug,
    description: description,
    image_url: p.image_url,
    retail_price: retailPrice,
    wholesale_price: wholesalePrice,
    wholesale_min_qty: 2,
    stock: 35,
    payment_methods: p.payment_methods,
    tags: p.tags,
    is_featured: p.is_featured || false,
    is_wholesale_only: false,
    is_active: true,
  });
}

console.log(`Original count: ${tools.length}`);
console.log(`Excluded small items: ${excludedCount}`);
console.log(`Kept tools: ${processed.length}`);

// Category breakdown
const catCounts = {};
for (const item of processed) {
  catCounts[item.category_id] = (catCounts[item.category_id] || 0) + 1;
}

console.log('\nDistribution across 25 subcategories:');
for (const [k, v] of Object.entries(CATEGORIES)) {
  console.log(`  ${k}: ${catCounts[v] || 0} products`);
}

fs.writeFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/processed_tools.json', JSON.stringify(processed, null, 2));
console.log('\nSaved c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/processed_tools.json');
