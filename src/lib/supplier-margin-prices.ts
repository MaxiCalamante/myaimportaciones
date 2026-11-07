import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateImport, classifyImport, type ImportPolicy } from './import-costs';
import { acquisitionFxFresh } from './supplier-usdt';
import type { TrackingConfig } from './supplier-automation';
import { calculateProductProfit, type ProductCost } from './product-profit';
import { titleIdentity } from './supplier-public-data';
import { matchSupplierProduct, matchTargets } from './supplier-matching';

export interface MarginBase { retail: number; wholesale: number; cost: ProductCost; policyId: string; policyConfig?: ImportPolicy; carrierRule?: string }
export function projectSupplierMargin(base: MarginBase, origin: number, config: TrackingConfig, policy: ImportPolicy, title: string, brand: string, now = Date.now()) {
  const cost = base.cost;
  if (!cost.expenses_confirmed || !cost.source_document?.trim() || !cost.verified_at || cost.currency !== 'USD') throw Error('Falta una base USD con gastos y evidencia documental confirmados.');
  if (!acquisitionFxFresh(config, now)) throw Error('La cotización de adquisición está vencida.');
  const today = new Date(now).toISOString().slice(0, 10);
  const ownerRule = config.localMarginCarrier === 'goods_20pct_usdt';
  if (!ownerRule && (!policy.confirmed || policy.effectiveFrom > today || policy.carrierFxDate !== today || cost.verified_at.slice(0, 10) < policy.effectiveFrom)) throw Error('Confirmá la vigencia de tarifas y el cambio del pasador; la base debe corresponder a esa política.');
  if (!Number.isFinite(origin) || origin <= 0) throw Error('Costo de proveedor inválido.');
  const profit = calculateProductProfit(Number(base.retail), cost);
  if (!profit?.complete || profit.contribution <= 0 || (base.wholesale > 0 && (calculateProductProfit(base.wholesale, cost)?.contribution ?? -1) <= 0)) throw Error('El margen actual no es positivo o no se puede comprobar.');
  const carrier = (usd: number) => {
    const result = calculateImport({ lines: [{ id: cost.product_id, productId: cost.product_id, title, quantity: 1, currency: 'USD', origin: usd, acquisitionArsPerUnit: config.acquisitionArsPerUsd, originUnitsPerUsd: 1, kind: classifyImport(title, brand), inches: Number(title.match(/\b(\d{2,3})\s*(?:pulgadas|polegadas|["″])/i)?.[1]) || undefined, sourceConfirmed: true, sourceReference: cost.supplier_url ?? '', observedAt: cost.verified_at! }], expenses: [], expensesConfirmed: true, targetMargin: 0 }, { ...policy, volumeConfirmed: false }, today);
    if (result.warnings.length || result.lines[0].carrierArs === null) throw Error(result.warnings.join(' ') || 'Tarifa incompleta.');
    return result.lines[0].carrierArs;
  };
  let landed: number;
  if (ownerRule) {
    if (config.acquisitionFxMode !== 'usdt') throw Error('El ajuste requiere la cotización de compra USDT del día.');
    const other = Number(cost.other_landed_cost), included = other === 0 && /(?:pasador|pasero|pase|flete).{0,80}incluid|incluid.{0,80}(?:pasador|pasero|pase|flete)/i.test(cost.source_document!);
    if (!included && Math.abs(other - profit.purchase * .2) > 1) throw Error('Desglosá el pasador y los otros gastos de la base; no se puede deducir su composición.');
    // Owner confirmed: USD100 goods + USD20 carrier = 120 USDT, valued at the day's purchase quote.
    landed = Math.round((origin * config.acquisitionArsPerUsd * 1.2 + Number(cost.freight_per_unit)) * 100) / 100;
  } else {
    const oldCarrier = carrier(Number(cost.origin_cost));
    const fixed = profit.landed - profit.purchase - oldCarrier;
    if (fixed < -0.01) throw Error('El costo registrado no contiene la tarifa documentada del pasador.');
    landed = Math.round((origin * config.acquisitionArsPerUsd + carrier(origin) + Math.max(0, fixed)) * 100) / 100;
  }
  const factor = (landed + Number(cost.variable_cost)) / (profit.landed + Number(cost.variable_cost));
  if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(config.roundArs) || config.roundArs <= 0) throw Error('Proyección de margen inválida.');
  // Fixed baseline avoids cumulative rounding; fixed expenses and payment fee stay separate.
  return { landed, retail: Math.ceil(base.retail * factor / config.roundArs) * config.roundArs, wholesale: base.wholesale > 0 ? Math.ceil(base.wholesale * factor / config.roundArs) * config.roundArs : 0 };
}

export async function syncSupplierMarginPrice(db: SupabaseClient, productId: string, offerId: string, variantId: string | null, expected: { title: string; originCost: number | null; at: string; url: string }): Promise<{status:string;reason:string;retail?:number;wholesale?:number;proposedRetail?:number;proposedWholesale?:number}> {
  const policyV2=await db.from('store_profitability_policy').select('id').eq('id',true).maybeSingle();
  if(policyV2.data){const result=await db.rpc('store_refresh_supplier_usd_v1',{offer_input:offerId});return{status:result.error?'blocked':result.data?.status??'review',reason:result.error?'Revisión de rentabilidad USD pendiente.':result.data?.reason??'Propuesta de rentabilidad USD preparada; revisar el modo de la política.'};}
  if (variantId) return { status: 'blocked', reason: 'Precio pendiente: falta una base de costos de la variante exacta.' };
  const [settings, policy, product, costs, baseline, offer] = await Promise.all([
    db.from('supplier_tracking_settings').select('config').eq('id', true).single(),
    db.from('import_cost_policies').select('id,config').order('created_at', { ascending: false }).limit(1).single(),
    db.from('products').select('id,title,brand,model,sku,source_url,specifications,retail_price,wholesale_price,has_variants,fulfillment_mode,is_active,deleted_at').eq('id', productId).single(),
    db.from('product_costs').select('*').eq('product_id', productId).maybeSingle(),
    db.from('supplier_margin_price_bases').select('*').eq('product_id', productId).maybeSingle(),
    db.from('supplier_offers').select('*').eq('id', offerId).single(),
  ]);
  if (settings.error || policy.error || product.error || costs.error || baseline.error || offer.error) return { status: 'blocked', reason: 'No se pudo leer la base de precios; disponibilidad y evidencia se conservan.' };
  const config = settings.data.config as TrackingConfig;
  if (!config.localMarginPrices) return { status: 'disabled', reason: 'Ajuste por margen deshabilitado en la base compartida.' };
  const p = product.data, o = offer.data;
  if (o.source_url !== expected.url || Number(o.origin_cost) !== expected.originCost || Date.parse(o.cost_checked_at) !== Date.parse(expected.at) || Date.parse(o.availability_checked_at) !== Date.parse(expected.at) || titleIdentity(o.evidence?.sourceTitle ?? o.title) !== titleIdentity(expected.title) || matchSupplierProduct({ ...o, title: o.evidence?.sourceTitle ?? o.title }, matchTargets([p], [])).status !== 'exact') return { status: 'blocked', reason: 'La evidencia o identidad cambió después de la consulta local. Se conserva el precio.' };
  const usdPrice=await db.from('product_usd_prices').select('id').eq('product_id',productId).maybeSingle();
  if(usdPrice.data){const usd=await db.rpc('tracker_reprice_offer_v1',{offer_input:offerId});return {status:usd.error?'blocked':usd.data?.status??'blocked',reason:usd.error?'El ajuste USD requiere revisión.':usd.data?.reason??'Costo USD revisado; precios manuales protegidos.'};}
  if (p.has_variants || p.fulfillment_mode !== 'supplier' || !p.is_active || p.deleted_at) return { status: 'blocked', reason: 'Requiere producto activo por proveedor y costo de presentación simple.' };
  if (!costs.data || costs.data.supplier_url !== o.source_url || o.product_id !== productId || o.variant_id || o.verification !== 'verified' || o.currency !== 'USD' || o.availability !== 'in_stock' || o.last_error || ![o.cost_checked_at, o.availability_checked_at].every(t => { const age = Date.now() - Date.parse(t); return age >= -60000 && age < 15 * 60000; }) || o.evidence?.costScope === 'supplier_quote_inclusions_unconfirmed') return { status: 'blocked', reason: 'Falta costo documentado de esta misma fuente o evidencia exacta vigente de disponibilidad y USD.' };
  const cost = costs.data as ProductCost;
  const base: MarginBase = baseline.data?.base ?? { retail: Number(p.retail_price), wholesale: Number(p.wholesale_price), cost, policyId: policy.data.id, policyConfig: policy.data.config, carrierRule: config.localMarginCarrier ?? 'policy' };
  try {
    if (base.carrierRule !== (config.localMarginCarrier ?? 'policy') || base.policyId !== policy.data.id) throw Error('La política cambió; revisá la base antes de ajustar el margen.');
    const quote = projectSupplierMargin(base, Number(o.origin_cost), config, policy.data.config, p.title, p.brand ?? '');
    const r = await db.rpc('apply_supplier_margin_price_v1', { p: { productId, offerId, base, quote, config, policyId: policy.data.id, policyConfig: policy.data.config, cost, identity: { title: p.title, brand: p.brand }, offer: { source_url: o.source_url, origin_cost: o.origin_cost, cost_checked_at: o.cost_checked_at, availability_checked_at: o.availability_checked_at, sourceTitle: o.evidence?.sourceTitle ?? o.title } } });
    if (r.error) throw Error(r.error.message);
    const result = r.data as { status: string; reason: string; retail?: number; wholesale?: number };
    return { ...result, ...(result.status === 'review' ? { proposedRetail: quote.retail, proposedWholesale: quote.wholesale } : {}) };
  } catch (e) { return { status: 'blocked', reason: e instanceof Error ? e.message : 'No se pudo comprobar el margen.' }; }
}
