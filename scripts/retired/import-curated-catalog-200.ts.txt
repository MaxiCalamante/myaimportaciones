import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

// Load .env.local
const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
const envVars: Record<string, string> = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envVars[key] = val;
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const isDryRun = process.argv.includes('--dry-run');
const EXCHANGE_RATE = 1555;

function round(val: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function cleanTitle(raw: string): string {
  let t = raw.trim().replace(/\s+/g, ' ');
  t = t.replace(/\bPERF FEM\b/gi, 'Perfume Femenino');
  t = t.replace(/\bPERF MASC\b/gi, 'Perfume Masculino');
  t = t.replace(/\bPERF UNI\b/gi, 'Perfume Unisex');
  t = t.replace(/\bPERFUME\b/gi, 'Perfume');
  t = t.replace(/\bJEAN PAUL G\b/gi, 'Jean Paul Gaultier');
  t = t.replace(/\bEDP\b/gi, 'EDP');
  t = t.replace(/\bEDT\b/gi, 'EDT');
  t = t.replace(/\bPARFUM\b/gi, 'Parfum');
  t = t.replace(/(\d+)\s*ML\b/gi, '$1ml');
  t = t.replace(/(\d+)\s*G\b/gi, '$1g');
  return t.trim();
}

function extractBrand(title: string, rawBrand?: string): string {
  if (rawBrand && rawBrand.trim().length > 1 && !rawBrand.match(/generico|importado/i)) {
    return rawBrand.trim().toUpperCase();
  }
  const upper = title.toUpperCase();
  if (upper.includes('TOTAL')) return 'TOTAL';
  if (upper.includes('WADFOW')) return 'WADFOW';
  if (upper.includes('MEDICUBE')) return 'MEDICUBE';
  if (upper.includes('ELRAVIE')) return 'ELRAVIE';
  if (upper.includes('DERMALINE')) return 'DERMALINE';
  if (upper.includes('LILYEVE')) return 'LILYEVE';
  if (upper.includes('SKIN1004') || upper.includes('CENTELLA')) return 'SKIN1004';
  if (upper.includes('BEAUTY OF JOSEON')) return 'BEAUTY OF JOSEON';
  if (upper.includes('KARSEELL')) return 'KARSEELL';
  if (upper.includes('AMUSE')) return 'AMUSE';
  if (upper.includes('MUGLER')) return 'THIERRY MUGLER';
  if (upper.includes('ISABELLE LA BELLE')) return 'ISABELLE LA BELLE';
  if (upper.includes('PACO RABANNE')) return 'PACO RABANNE';
  if (upper.includes('CAROLINA HERRERA')) return 'CAROLINA HERRERA';
  if (upper.includes('JEAN PAUL') || upper.includes('GAULTIER')) return 'JEAN PAUL GAULTIER';
  if (upper.includes('VERSACE')) return 'VERSACE';
  if (upper.includes('AL HARAMAIN')) return 'AL HARAMAIN';
  if (upper.includes('LATTAFA')) return 'LATTAFA';
  if (upper.includes('ARMAF')) return 'ARMAF';
  if (upper.includes('AFNAN')) return 'AFNAN';
  if (upper.includes('MAISON ALHAMBRA')) return 'MAISON ALHAMBRA';
  if (upper.includes('JO MILANO')) return 'JO MILANO';
  if (upper.includes('XIAOMI')) return 'XIAOMI';
  if (upper.includes('JBL')) return 'JBL';
  if (upper.includes('NINJA')) return 'NINJA';
  if (upper.includes('DJI')) return 'DJI';
  if (upper.includes('VIEWSONIC')) return 'VIEWSONIC';
  if (upper.includes('ACER')) return 'ACER';
  if (upper.includes('CREALITY')) return 'CREALITY';
  if (upper.includes('APPLE')) return 'APPLE';
  if (upper.includes('SONY')) return 'SONY';
  if (upper.includes('TCL')) return 'TCL';
  if (upper.includes('DELL') || upper.includes('ALIENWARE')) return 'DELL';
  if (upper.includes('AOC')) return 'AOC';
  if (upper.includes('RAY-BAN')) return 'RAY-BAN';
  if (upper.includes('OAKLEY')) return 'OAKLEY';
  if (upper.includes('NINTENDO')) return 'NINTENDO';
  if (upper.includes('MICROSOFT') || upper.includes('XBOX')) return 'MICROSOFT';
  if (upper.includes('WANBO')) return 'WANBO';
  if (upper.includes('PHILIPS')) return 'PHILIPS';
  if (upper.includes('MONDIAL')) return 'MONDIAL';
  if (upper.includes('BRITANIA')) return 'BRITÂNIA';
  return 'MYA SELECTION';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface CuratedCandidate {
  categoryKey: 'herramientas' | 'electro' | 'perfumeria' | 'cosmetica';
  categoryId: string;
  categoryName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any;
  supplierName: string;
}

async function fetchCuratedCandidates(): Promise<CuratedCandidate[]> {
  const result: CuratedCandidate[] = [];

  // ==========================================
  // 1. HERRAMIENTAS (50 items)
  // Supplier: Total Herramientas Oficial
  // ==========================================
  const { data: rawTools, error: errTools } = await supabase
    .from('supplier_tracker_items')
    .select('id, supplier_id, external_id, title, brand, model, sku, normalized_usd, image_url, url, description')
    .eq('supplier_id', '4e1121db-dd8c-4b18-817e-2d7fdd5534b2')
    .is('product_id', null)
    .eq('excluded', false)
    .gte('normalized_usd', 25)
    .lte('normalized_usd', 350)
    .not('image_url', 'is', null)
    .neq('image_url', '')
    .not('image_url', 'like', '%semfoto%')
    .order('normalized_usd', { ascending: false })
    .limit(100);

  if (errTools) throw errTools;

  const validTools = (rawTools || []).filter(t => 
    !t.title.match(/tornillo|tuerca|arandela|carbones|mecha individual|disco de corte individual|buje|junta|parafuso|porca|broca unitaria/i)
  ).slice(0, 50);

  for (const t of validTools) {
    let catId = '10000000-0000-0000-0000-000000000003'; // default Herramientas
    const lower = t.title.toLowerCase();
    if (lower.match(/solda|mig|tig|mma|plasma/)) catId = '10000000-0000-0000-0000-000000000017'; // Soldadoras
    else if (lower.match(/taladro|martelete|rotomartillo|demolidor|percutor/)) catId = '10000000-0000-0000-0000-000000000011'; // Taladros
    else if (lower.match(/esmerilhadeira|amoladora|pulidora|polidora/)) catId = '10000000-0000-0000-0000-000000000012'; // Amoladoras
    else if (lower.match(/serra|sierra|caladora|circular/)) catId = '10000000-0000-0000-0000-000000000014'; // Sierras
    else if (lower.match(/lavadora|hidrolavadora|alta pressao/)) catId = '10000000-0000-0000-0000-000000000018'; // Hidrolavadoras
    else if (lower.match(/compresor|compressor|pneumat/)) catId = '10000000-0000-0000-0000-000000000016'; // Compresores
    else if (lower.match(/macaco|gato hidraulico|prensa/)) catId = '10000000-0000-0000-0000-000000000015'; // Gatos
    else if (lower.match(/bomba|motobomba/)) catId = '10000000-0000-0000-0000-000000000030'; // Construcción
    else if (lower.match(/grama|cesped|jardin|podadora|cortador de grama/)) catId = '10000000-0000-0000-0000-000000000024'; // Jardinería
    else if (lower.match(/aspirador|soprador|aspiradora|ventilador/)) catId = '5271e318-79e0-4937-9f57-d389ec71f0fe'; // Aspiradoras
    else if (lower.match(/parafusadeira|chave de impacto|atornillador|impacto/)) catId = '10000000-0000-0000-0000-000000000013'; // Atornilladores
    else if (lower.match(/nivel|laser|trena/)) catId = '10000000-0000-0000-0000-000000000020'; // Medición
    else if (lower.match(/caixa|maleta|kit|jogo/)) catId = '10000000-0000-0000-0000-000000000021'; // Cajas

    result.push({
      categoryKey: 'herramientas',
      categoryId: catId,
      categoryName: 'Herramientas y equipamiento',
      item: t,
      supplierName: 'Total Herramientas Oficial'
    });
  }

  // ==========================================
  // 2. ELECTRO (50 items)
  // Supplier: Atacado Connect
  // ==========================================
  const { data: rawElectro, error: errElectro } = await supabase
    .from('supplier_tracker_items')
    .select('id, supplier_id, external_id, title, brand, model, sku, normalized_usd, image_url, url, description')
    .eq('supplier_id', 'fa6b4374-1d5c-4292-b4d5-c5aee09ae22e')
    .is('product_id', null)
    .eq('excluded', false)
    .gte('normalized_usd', 35)
    .lte('normalized_usd', 500)
    .not('image_url', 'is', null)
    .neq('image_url', '')
    .not('image_url', 'like', '%semfoto%')
    .order('normalized_usd', { ascending: false })
    .limit(150);

  if (errElectro) throw errElectro;

  const validElectro = (rawElectro || []).filter(t => 
    !t.title.match(/capa para|pelicula|cabo usb|cabo hdmi|adaptador|suporte|pulseira individual|placa mae|memoria ram|gabinete/i)
  ).slice(0, 50);

  for (const t of validElectro) {
    let catId = '9d64c87a-12d6-4501-afbd-f35b5f9e4a99'; // default Electrodomésticos y Hogar
    const lower = t.title.toLowerCase();
    if (lower.match(/som|soundbar|speaker|partybox|fone|headset|headphone|earphone/)) catId = 'c3da472b-0343-43ec-b693-dadc6ce9188e'; // Audio
    else if (lower.match(/tv|smart tv|monitor/)) catId = 'bbfae57c-6a63-44bc-8c70-34eb80d0f5cf'; // Monitores/TVs
    else if (lower.match(/drone|camera|microfone|dji|gopro|insta360/)) catId = 'aef4788a-ef3d-4c2d-a53b-d6f870b92732'; // Drones y Cámaras
    else if (lower.match(/console|game|ps5|xbox|nintendo|gamer/)) catId = 'bd2b5c34-d3a7-44d1-abb8-999cd87d90ed'; // Gaming
    else if (lower.match(/tablet|ipad/)) catId = '9486dac3-29c0-438b-befd-707606c52b6f'; // Tablets
    else if (lower.match(/smartphone|celular|redmi|iphone|galaxy/)) catId = 'cfa5bcfb-99e3-48cf-ab99-3e8c728dfb27'; // Smartphones

    result.push({
      categoryKey: 'electro',
      categoryId: catId,
      categoryName: 'Electrónica',
      item: t,
      supplierName: 'Atacado Connect'
    });
  }

  // ==========================================
  // 3. PERFUMERÍA (50 items)
  // Suppliers: Star Company & Atacado USA
  // ==========================================
  const { data: rawPerfumes, error: errPerfumes } = await supabase
    .from('supplier_tracker_items')
    .select('id, supplier_id, external_id, title, brand, model, sku, normalized_usd, image_url, url, description')
    .in('supplier_id', ['0a205148-e80f-4321-ab89-e9974e5f473d', 'c646bd67-0928-4dda-8fe1-0136fa941464'])
    .is('product_id', null)
    .eq('excluded', false)
    .gte('normalized_usd', 20)
    .lte('normalized_usd', 150)
    .not('image_url', 'is', null)
    .neq('image_url', '')
    .not('image_url', 'like', '%semfoto%')
    .order('normalized_usd', { ascending: false })
    .limit(200);

  if (errPerfumes) throw errPerfumes;

  const validPerfumes = (rawPerfumes || []).filter(t => 
    (t.title.match(/perf|eau de parfum|edp|eau de toilette|edt|parfum|cologne/i) ||
     t.title.match(/lattafa|afnan|armaf|al haramain|maison alhambra|carolina herrera|paco rabanne|calvin klein|versace|jean paul|montblanc|jo milano|club de nuit|khamrah|asad|yara/i)) &&
    !t.title.match(/amostra|sample|decant|desodorante roll|sabonete unitario|body cream|creme corporal/i)
  ).slice(0, 50);

  for (const t of validPerfumes) {
    let catId = '494dd1a5-6891-4122-aca3-0281f6ae5efd'; // default Unisex / Autor
    const lower = t.title.toLowerCase();
    if (lower.match(/lattafa|afnan|armaf|al haramain|maison alhambra|khamrah|asad|yara|club de nuit|orientica/)) catId = '10000000-0000-0000-0000-000000000071'; // Árabes
    else if (lower.match(/fem|feminino|women|pour femme|her|girl|dylan blush|la bomba|divine/)) catId = 'fccc6773-6521-4522-8438-62a8457e226a'; // Femeninos
    else if (lower.match(/masc|masculino|men|pour homme|him|invictus|one million|le male|le beau/)) catId = '33ee9def-9699-43c8-8e06-0a45c6bc1bb6'; // Masculinos
    else if (lower.match(/body mist|bruma|mist/)) catId = '10000000-0000-0000-0000-000000000072'; // Body mists

    const suppName = t.supplier_id === '0a205148-e80f-4321-ab89-e9974e5f473d' ? 'Star Company' : 'Atacado USA';

    result.push({
      categoryKey: 'perfumeria',
      categoryId: catId,
      categoryName: 'Perfumería',
      item: t,
      supplierName: suppName
    });
  }

  // ==========================================
  // 4. COSMÉTICA (50 items)
  // Suppliers: Star Company & Atacado USA
  // ==========================================
  // Query 1: Atacado USA K-beauty & skincare
  const { data: usaCosmetics } = await supabase
    .from('supplier_tracker_items')
    .select('id, supplier_id, external_id, title, brand, model, sku, normalized_usd, image_url, url, description')
    .eq('supplier_id', 'c646bd67-0928-4dda-8fe1-0136fa941464')
    .is('product_id', null)
    .eq('excluded', false)
    .gte('normalized_usd', 8)
    .lte('normalized_usd', 150)
    .not('image_url', 'is', null)
    .neq('image_url', '')
    .not('image_url', 'like', '%semfoto%')
    .or('title.ilike.%medicube%,title.ilike.%skin1004%,title.ilike.%beauty of joseon%,title.ilike.%karseell%,title.ilike.%anua%,title.ilike.%cosrx%,title.ilike.%torriden%,title.ilike.%pad%,title.ilike.%cream%,title.ilike.%serum%')
    .limit(100);

  // Query 2: Star Company K-Beauty lines (Elravie, Medicube, Dermaline, Karseell, Amuse, Lilyeve)
  const { data: starCosmetics } = await supabase
    .from('supplier_tracker_items')
    .select('id, supplier_id, external_id, title, brand, model, sku, normalized_usd, image_url, url, description')
    .eq('supplier_id', '0a205148-e80f-4321-ab89-e9974e5f473d')
    .is('product_id', null)
    .eq('excluded', false)
    .gte('normalized_usd', 8)
    .lte('normalized_usd', 150)
    .not('image_url', 'is', null)
    .neq('image_url', '')
    .not('image_url', 'like', '%semfoto%')
    .or('title.ilike.%medicube%,title.ilike.%elravie%,title.ilike.%karseell%,title.ilike.%dermaline%,title.ilike.%amuse%,title.ilike.%lilyeve%')
    .limit(100);

  const combinedCosmetics = [...(usaCosmetics || []), ...(starCosmetics || [])];

  const validCosmetics = combinedCosmetics.filter(t => 
    (t.title.match(/skin1004|anua|beauty of joseon|cosrx|torriden|medicube|round lab|karseell|tocobo|haruharu|axis-y|laneige|cerave|la roche|isntree|mixsoon|bioderma|numbuzin|purito|d'alba|heimish|elravie|dermaline|lilyeve|amuse/i) ||
     t.title.match(/serum|ampoule|creme|cream|toner|tonico|cleanser|gel de limpeza|protetor|solar|sunscreen|pad|ampola|rejuvenescedor|hidratante|mascara capilar|body cream|body splash/i)) &&
    !t.title.match(/perfume|eau de parfum|edp|edt|cologne|eau de toilette|game of spades|al haramain|lattafa|afnan|armaf|parfum|jo milano/i)
  ).slice(0, 50);

  for (const t of validCosmetics) {
    let catId = '10000000-0000-0000-0000-000000000006'; // default Cremas e hidratantes
    const lower = t.title.toLowerCase();
    if (lower.match(/solar|sunscreen|protetor|sun/)) catId = '723474f6-2026-5662-aba5-6dd363018de5'; // Protección solar
    else if (lower.match(/serum|ampoule|ampola|pdrn/)) catId = '10000000-0000-0000-0000-000000000005'; // Sérums
    else if (lower.match(/toner|tonico|pad|bruma facial/)) catId = '10000000-0000-0000-0000-000000000038'; // Tónicos
    else if (lower.match(/cleanser|limpeza|espuma|sabonete facial|gel de limpeza|cleansing/)) catId = '10000000-0000-0000-0000-000000000007'; // Limpieza
    else if (lower.match(/device|booster pro|massageador|rejuvenescedor/)) catId = '1e91b925-e7c7-5164-a214-54be36a14c46'; // Dispositivos
    else if (lower.match(/body cream|creme corporal|locao|body splash/)) catId = '10000000-0000-0000-0000-000000000039'; // Cuidado corporal
    else if (lower.match(/capilar|shampoo|mascara capilar|cabelo|hair/)) catId = '10000000-0000-0000-0000-000000000040'; // Tratamientos capilares

    const suppName = t.supplier_id === '0a205148-e80f-4321-ab89-e9974e5f473d' ? 'Star Company' : 'Atacado USA';

    result.push({
      categoryKey: 'cosmetica',
      categoryId: catId,
      categoryName: 'Cosmética facial y corporal',
      item: t,
      supplierName: suppName
    });
  }

  return result;
}

async function main() {
  console.log('Fetching 50 curated candidates per category...');
  const candidates = await fetchCuratedCandidates();

  const byCat = {
    herramientas: candidates.filter(c => c.categoryKey === 'herramientas'),
    electro: candidates.filter(c => c.categoryKey === 'electro'),
    perfumeria: candidates.filter(c => c.categoryKey === 'perfumeria'),
    cosmetica: candidates.filter(c => c.categoryKey === 'cosmetica'),
  };

  console.log(`\nCandidate counts:`);
  console.log(`- Herramientas: ${byCat.herramientas.length}`);
  console.log(`- Electro:      ${byCat.electro.length}`);
  console.log(`- Perfumería:   ${byCat.perfumeria.length}`);
  console.log(`- Cosmética:    ${byCat.cosmetica.length}`);
  console.log(`Total:          ${candidates.length}`);

  if (byCat.herramientas.length !== 50 || byCat.electro.length !== 50 || 
      byCat.perfumeria.length !== 50 || byCat.cosmetica.length !== 50) {
    console.error('Error: Did not get exactly 50 per category!');
    process.exit(1);
  }

  console.log('\n--- SAMPLE CALCULATION VERIFICATION ---');
  for (const key of ['herramientas', 'electro', 'perfumeria', 'cosmetica'] as const) {
    const sample = byCat[key][0];
    const originCost = Number(sample.item.normalized_usd);
    const landedCost = round(originCost * 1.20, 2);
    const retailUsd = round(landedCost / 0.70, 2);
    const wholesaleUsd = round(landedCost / 0.82, 2);
    const retailArs = Math.round(retailUsd * EXCHANGE_RATE);
    const wholesaleArs = Math.round(wholesaleUsd * EXCHANGE_RATE);
    const retailMargin = round((retailUsd - landedCost) / retailUsd * 100, 1);
    const wholesaleMargin = round((wholesaleUsd - landedCost) / wholesaleUsd * 100, 1);

    console.log(`[${key.toUpperCase()}] Sample: "${cleanTitle(sample.item.title)}"`);
    console.log(`  Origin: $${originCost} USD | Landed (20% pasero): $${landedCost} USD`);
    console.log(`  Retail: $${retailUsd} USD ($${retailArs.toLocaleString('es-AR')} ARS) -> Margin: ${retailMargin}%`);
    console.log(`  Wholesale: $${wholesaleUsd} USD ($${wholesaleArs.toLocaleString('es-AR')} ARS) -> Margin: ${wholesaleMargin}%`);
    console.log(`  Supplier: ${sample.supplierName} | Category ID: ${sample.categoryId}`);
  }

  if (isDryRun) {
    console.log('\n[DRY-RUN] Completed without database modifications.');
    return;
  }

  console.log('\n--- EXECUTING BATCH INSERT (200 PRODUCTS) ---');

  let insertedCount = 0;
  const batchSize = 25;

  for (let i = 0; i < candidates.length; i += batchSize) {
    const chunk = candidates.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(candidates.length / batchSize)} (items ${i + 1}-${i + chunk.length})...`);

    for (const c of chunk) {
      const productId = randomUUID();
      const originCost = Number(c.item.normalized_usd);
      const landedCost = round(originCost * 1.20, 2);
      const retailUsd = round(landedCost / 0.70, 2);
      const wholesaleUsd = round(landedCost / 0.82, 2);
      const retailArs = Math.round(retailUsd * EXCHANGE_RATE);
      const wholesaleArs = Math.round(wholesaleUsd * EXCHANGE_RATE);
      const retailMargin = round((retailUsd - landedCost) / retailUsd * 100, 2);
      const wholesaleMargin = round((wholesaleUsd - landedCost) / wholesaleUsd * 100, 2);

      const title = cleanTitle(c.item.title);
      const brand = extractBrand(title, c.item.brand);
      const model = c.item.model || c.item.sku || '';
      const baseSlug = slugify(title);
      const slug = `${baseSlug}-${productId.slice(0, 8)}`;
      const sku = `MYA-${c.categoryKey.slice(0, 3).toUpperCase()}-${(c.item.external_id || productId.slice(0, 6)).toUpperCase()}`;

      const customDesc = c.item.description && c.item.description.trim().length > 30 
        ? `${title}. ${c.item.description.trim()}` 
        : `${title}. Producto original importado de primera calidad provisto por ${c.supplierName}. Cuenta con garantía oficial de MYA Importaciones, control de calidad y soporte posventa garantizado.`;

      const specifications = {
        origen: 'Importación directa oficial',
        proveedor: c.supplierName,
        garantia: 'Garantía oficial MYA Importaciones',
        condicion: 'Nuevo original en caja sellada',
        ...(c.item.sku ? { codigo_fabricante: c.item.sku } : {}),
        ...(brand ? { marca: brand } : {}),
        ...(model ? { modelo: model } : {})
      };

      // 1. Insert into products
      const { error: errP } = await supabase.from('products').insert({
        id: productId,
        category_id: c.categoryId,
        title,
        slug,
        description: customDesc,
        image_url: c.item.image_url,
        image_urls: [c.item.image_url],
        retail_price: retailArs,
        wholesale_price: wholesaleArs,
        wholesale_min_qty: 3,
        stock: 0,
        brand,
        model,
        sku,
        source_url: c.item.url,
        fulfillment_mode: 'supplier',
        supplier_available: true,
        supplier_last_checked_at: new Date().toISOString(),
        supplier_stock_status: 'in_stock',
        commercial_status: 'AVAILABLE',
        is_active: true,
        specifications
      });

      if (errP) {
        console.error(`Failed to insert product ${title}:`, errP);
        throw errP;
      }

      // 2. Insert into product_usd_prices
      const { error: errPup } = await supabase.from('product_usd_prices').insert({
        product_id: productId,
        retail_usd: retailUsd,
        wholesale_usd: wholesaleUsd,
        total_cost_usd: landedCost,
        acquisition_cost_usd: originCost,
        retail_margin: retailMargin,
        wholesale_margin: wholesaleMargin,
        state: 'active',
        retail_source: 'automatic',
        wholesale_source: 'automatic',
        costs_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (errPup) {
        console.error(`Failed to insert usd price for ${productId}:`, errPup);
        throw errPup;
      }

      // 3. Insert into product_costs
      const otherLandedCostArs = Math.round(originCost * 0.20 * EXCHANGE_RATE);
      const { error: errPc } = await supabase.from('product_costs').insert({
        product_id: productId,
        origin_cost: originCost,
        currency: 'USD',
        exchange_rate: EXCHANGE_RATE,
        other_landed_cost: otherLandedCostArs,
        expenses_confirmed: true,
        verified_at: new Date().toISOString(),
        source_document: c.supplierName,
        supplier_url: c.item.url
      });

      if (errPc) {
        console.error(`Failed to insert product_costs for ${productId}:`, errPc);
        throw errPc;
      }

      // 4. Insert into supplier_offers
      const offerId = randomUUID();
      const { error: errSo } = await supabase.from('supplier_offers').insert({
        id: offerId,
        supplier_id: c.item.supplier_id,
        product_id: productId,
        external_id: c.item.external_id || productId,
        variant_key: 'source',
        title: c.item.title,
        brand,
        model,
        source_url: c.item.url,
        origin_cost: originCost,
        currency: 'USD',
        availability: 'in_stock',
        verification: 'verified',
        cost_checked_at: new Date().toISOString(),
        availability_checked_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        evidence: {
          source: 'curated_catalog_import',
          status: 'in_stock',
          imported_at: new Date().toISOString()
        }
      });

      if (errSo) {
        console.error(`Failed to insert supplier_offers for ${productId}:`, errSo);
        throw errSo;
      }

      // 5. Update supplier_tracker_items link
      const { error: errTi } = await supabase
        .from('supplier_tracker_items')
        .update({
          product_id: productId,
          offer_id: offerId,
          status: 'linked'
        })
        .eq('id', c.item.id);

      if (errTi) {
        console.error(`Failed to update tracker item ${c.item.id}:`, errTi);
      }

      insertedCount++;
    }
  }

  console.log(`\nSUCCESS: Successfully imported and published ${insertedCount} curated products across 4 categories!`);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
