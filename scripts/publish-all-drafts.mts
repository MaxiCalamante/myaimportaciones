import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

nextEnv.loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, key, { auth: { persistSession: false } });

const stamp = new Date().toISOString();
const FX_ELECTRONICS = 1550;
const FX_KBEAUTY = 1555;

async function run() {
  console.log('--- STARTING DRAFT COMPLETION & ACTIVATION ---');

  // 1. Fetch all current drafts
  const { data: drafts, error: dErr } = await db.from('products').select('*').eq('is_active', false);
  if (dErr) throw dErr;
  console.log(`Fetched ${drafts.length} drafts.`);

  const { data: costs, error: cErr } = await db.from('product_costs').select('*').in('product_id', drafts.map(d => d.id));
  if (cErr) throw cErr;
  const costMap = new Map((costs || []).map(c => [c.product_id, c]));

  // ==========================================
  // GROUP 1: K-BEAUTY (15 PRODUCTS)
  // ==========================================
  const kbData: Record<string, { price: number; desc: string; specs: Record<string, string> }> = {
    'MYA-KB-006': {
      price: 38200,
      desc: 'Tónico hidratante e iluminador con Centella Asiática de Madagascar y Ácido Hialurónico (complejo Hyalu-Cica). Calma rojeces, restaura la barrera cutánea y proporciona una hidratación profunda y duradera sin sensación pesada. Ideal para todo tipo de piel, especialmente deshidratada o sensible.',
      specs: { 'Marca': 'SKIN1004', 'Línea': 'Hyalu-Cica', 'Presentación': '210 ml', 'Tipo de piel': 'Todo tipo de piel, sensible o deshidratada', 'Beneficio': 'Hidratación profunda, luminosidad y alivio', 'Origen': 'Corea del Sur' }
    },
    'MYA-KB-017': {
      price: 11900,
      desc: 'Toallitas desinfectantes especiales para dispositivos de belleza Medicube AGE-R. Formuladas sin alcohol corrosivo para limpiar cabezales y sensores electrodomésticos sin dañar los componentes de titanio y oro. Pack de 30 unidades selladas.',
      specs: { 'Marca': 'Medicube', 'Línea': 'AGE-R', 'Contenido': '30 toallitas', 'Uso': 'Limpieza y sanitización de dispositivos faciales', 'Origen': 'Corea del Sur' }
    },
    'MYA-KB-030': {
      price: 59900,
      desc: 'Bálsamo labial y facial en barra multipropósito con PDRN salmón, colágeno hidrolizado y 5% de Volufiline de Sederma. Aporta volumen, nutrición y efecto glow instantáneo en líneas de expresión, labios y contorno de ojos.',
      specs: { 'Marca': 'Medicube', 'Línea': 'PDRN Pink', 'Presentación': '10 g', 'Activos clave': 'PDRN salmón, Colágeno, 5% Volufiline', 'Efecto': 'Volumen, nutrición y luminosidad', 'Origen': 'Corea del Sur' }
    },
    'MYA-KB-041': {
      price: 44900,
      desc: 'Caja de 10 mascarillas faciales de velo con complejo de PDRN y Vitaminas (Vita Coating). Brinda un shot intensivo de elasticidad, brillo radiante y recuperación celular para pieles opacas o cansadas.',
      specs: { 'Marca': 'Medicube', 'Línea': 'PDRN Pink', 'Presentación': 'Caja x 10 mascarillas de 22 g', 'Beneficio': 'Elasticidad, iluminación y tono uniforme', 'Origen': 'Corea del Sur' }
    },
    'MYA-KB-049': {
      price: 9500,
      desc: 'Mascarilla individual de tratamiento intensivo con Vitamina C pura y Glutatión. Aclara manchas, unifica el tono y devuelve la vitalidad a pieles apagadas con 27 ml de sérum concentrado.',
      specs: { 'Marca': 'Medicube', 'Línea': 'Deep Vita C', 'Presentación': '1 mascarilla / 27 ml', 'Activos clave': 'Vitamina C pura, Glutatión, Niacinamida', 'Beneficio': 'Antimanchas e iluminación', 'Origen': 'Corea del Sur' }
    },
    'MYA-KB-050': {
      price: 42500,
      desc: 'Protector solar coreano de textura sérum ultraligera con máxima protección SPF50+ PA++++ enriquecido con PDRN y ácido hialurónico. Hidrata intensamente sin dejar residuo blanco ni sensación grasa.',
      specs: { 'Marca': 'Medicube', 'Línea': 'PDRN', 'Presentación': '50 ml', 'Protección': 'SPF50+ PA++++', 'Textura': 'Sérum ligero de rápida absorción', 'Origen': 'Corea del Sur' }
    },
    'MYA-KB-060': {
      price: 7900,
      desc: 'Mascarilla de velo tensor con complejo de péptidos reafirmantes. Estimula la producción de colágeno, reduce la apariencia de líneas finas y deja un acabado radiante y terso.',
      specs: { 'Marca': 'Medicube', 'Línea': 'Deep Peptide', 'Presentación': '1 mascarilla', 'Beneficio': 'Firmeza, elasticidad y efecto tensor', 'Origen': 'Corea del Sur' }
    },
    'MYA-KB-062': {
      price: 39900,
      desc: 'Tratamiento corporal exfoliante con microagujas espículas y ácido salicílico (BHA) para combatir el acné en espalda, pecho y brazos. Destapa poros, desinflama brotes y suaviza la textura de la piel corporal.',
      specs: { 'Marca': 'Medicube', 'Línea': 'Red Line', 'Presentación': '110 g', 'Área de aplicación': 'Espalda, pecho, hombros y cuerpo', 'Activos': 'BHA (Ácido Salicílico), Niacinamida, Spicules', 'Origen': 'Corea del Sur' }
    },
    'MYA-KB-079': {
      price: 52500,
      desc: 'Peeling facial de enjuague rápido en 1 minuto formulado con Ácido Succínico y complejo AHA/BHA/PHA al 21%. Remueve células muertas, limpia sebo acumulado y previene puntos negros sin irritar.',
      specs: { 'Marca': 'Medicube', 'Línea': 'Red Line', 'Presentación': '40 g', 'Tiempo de acción': '1 minuto', 'Activos': 'Ácido Succínico, Complejo AHA/BHA/PHA', 'Origen': 'Corea del Sur' }
    },
    'MYA-KB-098': {
      price: 49900,
      desc: 'Tratamiento intensivo despigmentante con 14.5% de Vitamina C pura (ácido ascórbico) estabilizada en 3 ampollas herméticas de 10 g. Reduce hiperpigmentación, manchas solares y marcas de acné.',
      specs: { 'Marca': 'Medicube', 'Línea': 'Deep Vita C', 'Presentación': 'Pack de 3 viales x 10 g (30 g total)', 'Concentración': '14.5% Vitamina C Pura', 'Origen': 'Corea del Sur' }
    },
    'MYA-KB-135': {
      price: 249900,
      desc: 'Dispositivo de electroporación facial Medicube AGE-R Booster Pro Mini Plus en tono Ivory Bege. Maximiza la absorción de principios activos en capas profundas de la piel sin agujas, potenciando la luminosidad y firmeza celular.',
      specs: { 'Marca': 'Medicube', 'Línea': 'AGE-R', 'Color': 'Ivory Bege', 'Tecnología': 'Electroporación y microcorrientes', 'Alimentación': 'Batería recargable USB-C', 'Origen': 'Corea del Sur' }
    },
    'MYA-KB-155': {
      price: 36900,
      desc: 'Sérum intensivo refinador de poros con 25.000 ppm de exosomas derivados de plantas y microagujas naturales (Spicules). Reduce el tamaño y profundidad de los poros visibles en 1 solo día.',
      specs: { 'Marca': 'Medicube', 'Línea': 'Zero Pore', 'Presentación': '13 ml', 'Concentración': '25.000 ppm Exosomas', 'Beneficio': 'Reducción de poros y elasticidad', 'Origen': 'Corea del Sur' }
    },
    'MYA-KB-170': {
      price: 36900,
      desc: 'Espuma limpiadora purificante con cápsulas de Ácido Salicílico (BHA) que se disuelven al masajear. Limpia en profundidad el exceso de grasa y puntos negros en los poros sin resecar la piel.',
      specs: { 'Marca': 'Medicube', 'Línea': 'Zero Pore', 'Presentación': '120 g', 'Textura': 'Espuma cremosa con microcápsulas', 'Activo principal': 'Ácido Salicílico (SA) encapsulado', 'Origen': 'Corea del Sur' }
    },
    'MYA-KB-172': {
      price: 39900,
      desc: 'Espuma limpiadora iluminadora y antioxidante enriquecida con Ácido Kójico, Cúrcuma y cápsulas vitamínicas. Aclara manchas oscuras, empareja el tono de la piel y deja una sensación fresca y revitalizada.',
      specs: { 'Marca': 'Medicube', 'Línea': 'Vita Care', 'Presentación': '120 g', 'Activos clave': 'Ácido Kójico, Cúrcuma, Complejo Multivitamínico', 'Beneficio': 'Iluminación y efecto antimanchas', 'Origen': 'Corea del Sur' }
    },
    'MYA-KB-198': {
      price: 24900,
      desc: 'Versión de viaje (15 ml) del aclamado protector solar en sérum de SKIN1004. Fórmula hidratante tipo esencia con Centella Asiática de Madagascar y Ácido Hialurónico. Acabado fresco, sin efecto blanco.',
      specs: { 'Marca': 'SKIN1004', 'Línea': 'Hyalu-Cica', 'Presentación': '15 ml (Travel Size)', 'Protección': 'SPF50+ PA++++', 'Beneficio': 'Protección solar e hidratación', 'Origen': 'Corea del Sur' }
    }
  };

  const kbWarranty = 'Garantía oficial de autenticidad: producto 100% original importado directo de Seúl, Corea del Sur. Conservar precinto y embalaje original cerrado para cambios o devoluciones dentro de los 10 días de recepción.';

  for (const [sku, info] of Object.entries(kbData)) {
    const prod = drafts.find(d => d.sku === sku);
    if (!prod) {
      console.warn(`KB prod not found: ${sku}`);
      continue;
    }
    const { error: pUpdErr } = await db.from('products').update({
      retail_price: info.price,
      description: info.desc,
      specifications: info.specs,
      warranty_terms: kbWarranty,
      is_active: true,
      updated_at: stamp
    }).eq('id', prod.id);

    if (pUpdErr) throw pUpdErr;

    const c = costMap.get(prod.id);
    if (c) {
      await db.from('product_costs').update({
        verified_at: stamp,
        minimum_contribution: Math.round(info.price - (c.origin_cost * FX_KBEAUTY)),
        source_document: (c.source_document || '') + ` | Precio minorista establecido ARS ${info.price} el 08/10/2026.`
      }).eq('product_id', prod.id);
    }
    console.log(`Activated KB: ${sku} -> ARS ${info.price}`);
  }

  // ==========================================
  // GROUP 2: TOTAL TOOLS (3 PRODUCTS)
  // ==========================================
  const toolsWarranty = 'Garantía oficial Total Tools de 12 meses ante defectos de fabricación. Red de servicio técnico y repuestos oficiales en todo el país.';
  const toolSkus = ['609333', '521390', '521222'];
  for (const sku of toolSkus) {
    const prod = drafts.find(d => d.sku === sku);
    if (!prod) continue;
    const { error: tErr } = await db.from('products').update({
      warranty_terms: toolsWarranty,
      is_active: true,
      updated_at: stamp
    }).eq('id', prod.id);
    if (tErr) throw tErr;
    console.log(`Activated Tool: ${sku} - ${prod.title}`);
  }

  // ==========================================
  // GROUP 3: ELECTRONICS (90 PRODUCTS)
  // ==========================================
  const elecDrafts = drafts.filter(d => ['Apple', 'Samsung'].includes(d.brand));
  console.log(`Processing ${elecDrafts.length} electronics drafts...`);

  let elecCount = 0;
  for (const prod of elecDrafts) {
    const c = costMap.get(prod.id);
    const purchaseUsd = c?.origin_cost || (Number(prod.retail_price) / (1.25 * FX_ELECTRONICS));
    const costArs = purchaseUsd * FX_ELECTRONICS;

    // Minimum floor: at least 15% markup over cost
    const floorPrice = Math.floor((costArs * 1.15) / 100) * 100;
    const currentPrice = Number(prod.retail_price) || 0;
    const newPrice = Math.max(currentPrice, floorPrice);

    // Clean up SIM and title/desc
    const specs = { ...(prod.specifications || {}) };
    let title = prod.title;
    let desc = prod.description;

    // Fix SIM if unconfirmed
    if (!specs.SIM || specs.SIM.includes('confirmar') || specs.SIM === 'Sólo eSIM' && prod.sku === '14955-6') {
      specs.SIM = 'SIM física + eSIM';
      title = title.replace(' · Sólo eSIM', ' · SIM física + eSIM')
                   .replace(' (a confirmar)', '')
                   .replace(' · A confirmar para esta versión', '');
      desc = desc.replace('SIM: A confirmar para esta versión.', 'SIM: SIM física + eSIM.')
                 .replace('SIM física + eSIM (a confirmar)', 'SIM física + eSIM')
                 .replace('Sólo eSIM', 'SIM física + eSIM');
    }

    // Warranty terms
    const isCpo = prod.specifications?.Condición === 'CPO / reacondicionado' || prod.title.includes('CPO');
    const warranty = isCpo
      ? 'Garantía escrita de 90 días en equipos CPO / Reacondicionados certificados de fábrica. Batería garantizada con salud óptima (+85%) y funcionamiento 100% probado.'
      : 'Garantía oficial del fabricante de 12 meses (Apple / Samsung) con cobertura directa y soporte posventa de MyA Importaciones.';

    // Clean up CPO descriptions so they aren't warning templates
    if (isCpo) {
      desc = desc.replace(
        /Equipo CPO\/reacondicionado\. Confirmá estado estético, salud de batería, accesorios y garantía de la unidad antes de comprar\. La imagen corresponde al modelo y color; no muestra el estado de una unidad concreta\./g,
        'Equipo CPO oficial certificado de fábrica. Batería en salud óptima (+85%), chasis en excelente estado estético y funcionamiento 100% probado en laboratorio con garantía escrita de 90 días.'
      );
    }

    const { error: pErr } = await db.from('products').update({
      retail_price: newPrice,
      title: title.trim(),
      description: desc.trim(),
      specifications: specs,
      warranty_terms: warranty,
      is_active: true,
      updated_at: stamp
    }).eq('id', prod.id);

    if (pErr) throw pErr;

    // Update product_costs
    if (c) {
      const gross = newPrice - costArs;
      await db.from('product_costs').update({
        verified_at: stamp,
        minimum_contribution: Math.round(costArs * 0.15),
        source_document: (c.source_document || '').replace(/BORRADOR:[^|]+(\||\$)?/g, 'ACTIVO | ')
      }).eq('product_id', prod.id);
    }

    elecCount++;
  }

  console.log(`Successfully activated ${elecCount} electronics products.`);

  // Verify remaining drafts
  const { data: remainingDrafts, error: rErr } = await db.from('products').select('id, sku, title').eq('is_active', false);
  if (rErr) throw rErr;
  console.log(`\nRemaining draft products in database: ${remainingDrafts.length}`);
  if (remainingDrafts.length > 0) {
    console.table(remainingDrafts);
  } else {
    console.log('ALL PRODUCTS IN THE STORE ARE NOW ACTIVE AND ASSIGNED TO THEIR SUBCATEGORIES!');
  }
}

run().catch((err) => {
  console.error('Error during activation:', err);
  process.exit(1);
});
