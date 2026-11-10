import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const db = createClient(url, serviceKey);

async function runSimulation() {
  console.log('=== SIMULACIÓN DE AUDITORÍA Y LIMPIEZA DE CATÁLOGO ===\n');

  // 1. Fetch active suppliers
  const { data: suppliers } = await db.from('suppliers').select('id, name, is_active, archived_at').eq('is_active', true);
  const activeSupplierIds = new Set((suppliers || []).map(s => s.id));
  console.log(`Proveedores activos autorizados: ${activeSupplierIds.size}`);

  // 2. Fetch all products (paginated)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allProducts: any[] = [];
  let from = 0;
  while (true) {
    const { data: page, error: pErr } = await db
      .from('products')
      .select('id, slug, title, brand, is_active, deleted_at, stock, stock_verified_at, fulfillment_mode, supplier_available, source_url, retail_price, wholesale_price, created_at')
      .order('id')
      .range(from, from + 999);
    if (pErr) throw pErr;
    if (!page || page.length === 0) break;
    allProducts.push(...page);
    if (page.length < 1000) break;
    from += 1000;
  }
  console.log(`Total productos en BD: ${allProducts.length}`);

  const activeProducts = allProducts.filter(p => p.is_active && !p.deleted_at);
  console.log(`Productos activos actuales: ${activeProducts.length}`);

  // 3. Fetch variants
  const { data: allVariants } = await db
    .from('product_variants')
    .select('id, product_id, title, is_active, stock, stock_verified_at, fulfillment_mode, supplier_available, retail_price, wholesale_price');
  
  const variantsByProduct = new Map<string, typeof allVariants>();
  (allVariants || []).forEach(v => {
    const list = variantsByProduct.get(v.product_id) || [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  });

  // 4. Fetch product USD prices
  const { data: allUsdPrices } = await db
    .from('product_usd_prices')
    .select('product_id, variant_id, retail_usd, wholesale_usd, total_cost_usd, state, cost_basis, costs_updated_at');
  
  const usdPriceByProduct = new Map<string, NonNullable<typeof allUsdPrices>[0]>();
  (allUsdPrices || []).forEach(u => {
    if (!u.variant_id) usdPriceByProduct.set(u.product_id, u);
  });

  // 5. Fetch supplier offers from active suppliers
  const { data: allOffers } = await db
    .from('supplier_offers')
    .select('id, product_id, variant_id, supplier_id, verification, availability, origin_cost, currency, source_url, cost_checked_at, availability_checked_at, last_error, archived_at')
    .is('archived_at', null);

  const offersByProduct = new Map<string, typeof allOffers>();
  (allOffers || []).forEach(o => {
    if (activeSupplierIds.has(o.supplier_id)) {
      const list = offersByProduct.get(o.product_id) || [];
      list.push(o);
      offersByProduct.set(o.product_id, list);
    }
  });

  // Evaluate each active product
  interface Evaluation {
    id: string;
    slug: string;
    title: string;
    brand: string;
    currentActive: boolean;
    hasOwnStock: boolean;
    supplierStatus: 'in_stock' | 'out_of_stock' | 'unknown' | 'no_supplier';
    sourceUrlValid: boolean;
    hasPriceLoss: boolean;
    marginFloorViolation: boolean;
    staleCheckHours: number | null;
    commercialStatus: 'AVAILABLE' | 'OUT_OF_STOCK' | 'UNKNOWN' | 'STALE' | 'HIDDEN' | 'ARCHIVED' | 'REVIEW_REQUIRED';
    reasons: string[];
  }

  const evaluations: Evaluation[] = [];
  const now = Date.now();

  for (const p of activeProducts) {
    const pVariants = variantsByProduct.get(p.id) || [];
    const activeVariants = pVariants.filter(v => v.is_active);
    const usd = usdPriceByProduct.get(p.id);
    const offers = offersByProduct.get(p.id) || [];

    const reasons: string[] = [];
    const hasOwnStock = p.fulfillment_mode !== 'supplier' && p.stock > 0;

    // Supplier availability evaluation
    let supplierStatus: Evaluation['supplierStatus'] = 'no_supplier';
    if (offers.length > 0) {
      const inStockOffers = offers.filter(o => o.availability === 'in_stock' && o.verification === 'verified' && !o.last_error);
      const outOffers = offers.filter(o => o.availability === 'out_of_stock' || o.last_error);
      if (inStockOffers.length > 0) {
        supplierStatus = 'in_stock';
      } else if (outOffers.length === offers.length) {
        supplierStatus = 'out_of_stock';
      } else {
        supplierStatus = 'unknown';
      }
    } else if (p.fulfillment_mode === 'supplier') {
      if (p.supplier_available === false) {
        supplierStatus = 'out_of_stock';
      } else if (p.supplier_available === true) {
        supplierStatus = 'in_stock';
      } else {
        supplierStatus = 'unknown';
      }
    }

    // Source URL check
    const sourceUrlValid = !!(p.source_url && p.source_url.trim().length > 10);
    if (!sourceUrlValid && !hasOwnStock) {
      reasons.push('Sin URL de origen y sin stock propio');
    }

    // Price vs Cost check
    let hasPriceLoss = false;
    let marginFloorViolation = false;
    if (usd) {
      const retailUsd = Number(usd.retail_usd);
      const wholesaleUsd = usd.wholesale_usd ? Number(usd.wholesale_usd) : null;
      const totalCostUsd = Number(usd.total_cost_usd);

      if (retailUsd && totalCostUsd && retailUsd < totalCostUsd) {
        hasPriceLoss = true;
        reasons.push(`Precio minorista ($${retailUsd}) < Costo ($${totalCostUsd})`);
      }
      if (wholesaleUsd && totalCostUsd && wholesaleUsd < totalCostUsd) {
        hasPriceLoss = true;
        reasons.push(`Precio mayorista ($${wholesaleUsd}) < Costo ($${totalCostUsd})`);
      }
      if (retailUsd && totalCostUsd && retailUsd > 0) {
        const margin = ((retailUsd - totalCostUsd) / retailUsd) * 100;
        if (margin < 10 && !hasPriceLoss) {
          marginFloorViolation = true;
          reasons.push(`Margen minorista (${margin.toFixed(1)}%) inferior al piso 10%`);
        }
      }
    }

    // Freshness check
    let staleCheckHours: number | null = null;
    if (p.stock_verified_at) {
      staleCheckHours = Math.round((now - new Date(p.stock_verified_at).getTime()) / 3600000);
    }

    // Commercial status determination
    let commercialStatus: Evaluation['commercialStatus'] = 'AVAILABLE';

    if (hasPriceLoss) {
      commercialStatus = 'REVIEW_REQUIRED';
    } else if (!sourceUrlValid && !hasOwnStock) {
      commercialStatus = 'REVIEW_REQUIRED';
    } else if (supplierStatus === 'out_of_stock' && !hasOwnStock) {
      commercialStatus = 'OUT_OF_STOCK';
      reasons.push('Proveedor confirma sin stock y stock propio = 0');
    } else if (supplierStatus === 'unknown' && !hasOwnStock && (!offers.length || offers.every(o => o.last_error))) {
      commercialStatus = 'UNKNOWN';
      reasons.push('Disponibilidad desconocida o error continuo de scraping');
    } else if (p.supplier_available === false && !hasOwnStock) {
      commercialStatus = 'OUT_OF_STOCK';
      reasons.push('supplier_available marcado en false');
    } else if (marginFloorViolation) {
      commercialStatus = 'REVIEW_REQUIRED';
    }

    evaluations.push({
      id: p.id,
      slug: p.slug,
      title: p.title,
      brand: p.brand || 'Sin marca',
      currentActive: p.is_active,
      hasOwnStock,
      supplierStatus,
      sourceUrlValid,
      hasPriceLoss,
      marginFloorViolation,
      staleCheckHours,
      commercialStatus,
      reasons,
    });
  }

  // Summary counts
  const available = evaluations.filter(e => e.commercialStatus === 'AVAILABLE');
  const outOfStock = evaluations.filter(e => e.commercialStatus === 'OUT_OF_STOCK');
  const reviewRequired = evaluations.filter(e => e.commercialStatus === 'REVIEW_REQUIRED');
  const unknown = evaluations.filter(e => e.commercialStatus === 'UNKNOWN');

  console.log('\n--- RESULTADOS DE LA SIMULACIÓN ---');
  console.log(`Total productos evaluados: ${evaluations.length}`);
  console.log(`✅ Permanecen AVAILABLE (Publicados inmediatamente): ${available.length} (${((available.length/evaluations.length)*100).toFixed(1)}%)`);
  console.log(`⛔ Pasan a OUT_OF_STOCK (Ocultados por falta de stock - Día 0): ${outOfStock.length}`);
  console.log(`⚠️ Pasan a REVIEW_REQUIRED (Requieren revisión de costo/precio/URL): ${reviewRequired.length}`);
  console.log(`❓ Pasan a UNKNOWN (Sin evidencia suficiente): ${unknown.length}`);

  console.log('\n--- DETALLE: PRODUCTOS OUT_OF_STOCK (OCULTADOS DÍA 0) ---');
  outOfStock.forEach((e, idx) => {
    console.log(`${idx + 1}. [${e.brand}] ${e.title} (${e.slug}) -> Motivo: ${e.reasons.join(' | ')}`);
  });

  console.log('\n--- DETALLE: PRODUCTOS EN REVIEW_REQUIRED ---');
  reviewRequired.forEach((e, idx) => {
    console.log(`${idx + 1}. [${e.brand}] ${e.title} -> Motivo: ${e.reasons.join(' | ')}`);
  });

  // Check tools classification
  console.log('\n--- CLASIFICACIÓN DE HERRAMIENTAS: TORNILLOS / CONSUMIBLES ---');
  const toolWordsExcluded = ['tornillo', 'arandela', 'tuerca', 'clavo', 'remache'];
  const toolProducts = evaluations.filter(e => e.brand.toLowerCase() === 'total' || e.brand.toLowerCase() === 'wadfow' || e.title.toLowerCase().includes('total') || e.title.toLowerCase().includes('wadfow'));
  console.log(`Total productos de herramientas activos: ${toolProducts.length}`);
  
  const consumableCandidates = toolProducts.filter(t => {
    const titleLower = t.title.toLowerCase();
    const hasConsumableWord = toolWordsExcluded.some(w => titleLower.includes(w));
    const isKitOrSet = titleLower.includes('kit') || titleLower.includes('set') || titleLower.includes('juego') || titleLower.includes('atornillador') || titleLower.includes('inalambrico');
    return hasConsumableWord && !isKitOrSet;
  });

  console.log(`Consumibles sueltos candidatos a descarte/exclusión comercial: ${consumableCandidates.length}`);
  consumableCandidates.forEach(c => {
    console.log(`- ${c.title}`);
  });
}

runSimulation().catch(console.error);
