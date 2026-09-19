const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { createClient } = require(path.join(__dirname, '../node_modules/@supabase/supabase-js'));

const supabase = createClient(
  'https://gqcdurxndbeeugjfworx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxY2R1cnhuZGJlZXVnamZ3b3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM3NTAsImV4cCI6MjA5NzI3OTc1MH0.dpdv4l25RNr0DKp7MmI5c6PQDfQ5ahqtfhxOdEsalbo'
);

const rawCosmetics = JSON.parse(fs.readFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/atacado_cosmetics.json', 'utf8'));

const CATS = {
  serums: '10000000-0000-0000-0000-000000000005',
  cremas: '10000000-0000-0000-0000-000000000006',
  limpieza: '10000000-0000-0000-0000-000000000007',
  kits: '10000000-0000-0000-0000-000000000008',
  tonicos: '10000000-0000-0000-0000-000000000038',
  lociones: '10000000-0000-0000-0000-000000000039',
  mascarillas_capilares: '10000000-0000-0000-0000-000000000040',
  shampoos_acondicionadores: '10000000-0000-0000-0000-000000000041',
  aceites_capilares: '10000000-0000-0000-0000-000000000042',
};

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function classifyCosmetic(title, brand) {
  const t = title.toUpperCase();

  // Capilar
  if (t.includes('KARSEELL') || t.includes('HAIR') || t.includes('CAPILAR') || t.includes('SHAMPOO') || t.includes('CONDITIONER')) {
    if (t.includes('SHAMPOO') || t.includes('CONDITIONER')) return CATS.shampoos_acondicionadores;
    if (t.includes('OIL') || t.includes('LEAVE IN') || t.includes('OLEO')) return CATS.aceites_capilares;
    return CATS.mascarillas_capilares;
  }

  // Lociones y Fragancias
  if (brand.toUpperCase().includes('VICTORIA') || brand.toUpperCase().includes('DEAR BODY') || t.includes('LOCAO') || t.includes('BODY CREAM')) {
    return CATS.lociones;
  }

  // Tónicos & Toner Pads
  if (t.includes('TONER') || t.includes('TONICO') || t.includes('PAD') || t.includes('PADS')) {
    return CATS.tonicos;
  }

  // Limpieza & Exfoliantes
  if (t.includes('CLEANSING') || t.includes('PEELING') || t.includes('FOAM') || t.includes('LIMPIADOR') || t.includes('OLEO FACIAL')) {
    return CATS.limpieza;
  }

  // Kits
  if (t.includes('KIT') || t.includes('SET') || t.includes('TRAVEL')) {
    return CATS.kits;
  }

  // Sérums & Ampollas
  if (t.includes('SERUM') || t.includes('AMPOULE') || t.includes('AMPOLLA') || t.includes('REEDLE') || t.includes('SHOT')) {
    return CATS.serums;
  }

  // Cremas por defecto
  return CATS.cremas;
}

function cleanTitle(rawTitle) {
  return rawTitle
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/\s*no\.\d+.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateCosmeticDescription(title, brand, sku, prodUrl) {
  return `${brand} - ${title}.
• Origen: 100% Original Garantizado. Skincare coreano y cosmética de alta gama importada directamente.
• Formulación: Tratamiento dermatológico avanzado de absorción rápida y alta concentración de activos.
• Garantía y Calidad: Producto sellado de fábrica con precinto de seguridad.
• Compra Mayorista & Minorista: Disponible por unidad y con precios preferenciales por bulto cerrado para revendedores y profesionales.
• Envíos: Despachos protegidos a todo el país con Factura A o B.`;
}

const EXCHANGE_RATE = 1300;
const processed = [];

for (const item of rawCosmetics) {
  const title = cleanTitle(item.title);
  const brand = item.brand;
  const priceUsd = item.priceUsd;
  const costArs = Math.round(priceUsd * EXCHANGE_RATE);
  const retailPrice = Math.round((costArs * 2.0) / 100) * 100;
  const wholesalePrice = Math.round((costArs * 1.15) / 100) * 100;

  const categoryId = classifyCosmetic(title, brand);
  const slug = `${slugify(brand)}-${slugify(title)}-${item.sku || item.productId}`;
  const id = crypto.createHash('md5').update(`atacado-${item.productId}-${slug}`).digest('hex');
  const uuid = `${id.substring(0,8)}-${id.substring(8,12)}-5${id.substring(13,16)}-a${id.substring(17,20)}-${id.substring(20,32)}`;

  const isViral = /MEDICUBE|KARSEELL|SKIN1004|ANUA|REEDLE|345 RELIEF|PDRN/i.test(title);

  processed.push({
    id: uuid,
    category_id: categoryId,
    title: `${brand} ${title}`,
    slug: slug,
    description: generateCosmeticDescription(title, brand, item.sku, item.prodUrl),
    image_url: item.imageUrl,
    retail_price: retailPrice,
    wholesale_price: wholesalePrice,
    wholesale_min_qty: 3,
    stock: item.stock || 15,
    payment_methods: ['transferencia', 'tarjeta', 'mercado_pago', 'efectivo'],
    tags: ['cosmetica', 'skincare', slugify(brand), isViral ? 'viral' : 'importado'],
    is_featured: isViral,
    is_wholesale_only: false,
    is_active: true,
  });
}

console.log(`Processed ${processed.length} cosmetics from Atacado USA.`);
fs.writeFileSync('c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/scratch/processed_cosmetics.json', JSON.stringify(processed, null, 2));

async function uploadToDb() {
  console.log('Upserting cosmetics to Supabase products table...');
  const batchSize = 25;
  let count = 0;

  for (let i = 0; i < processed.length; i += batchSize) {
    const batch = processed.slice(i, i + batchSize);
    const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`Error in batch ${i}:`, error.message);
    } else {
      count += batch.length;
      console.log(`Uploaded ${count}/${processed.length} cosmetics...`);
    }
  }

  console.log(`Done! Uploaded ${count} cosmetics.`);
}

uploadToDb().catch(console.error);
