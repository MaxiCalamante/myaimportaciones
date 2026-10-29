import type { SupabaseClient } from "@supabase/supabase-js";
import { readAllPages } from "./read-all-pages";

export interface UsdtSettings {
  acquisitionFxMode?: "manual" | "usdt";
  acquisitionArsPerUsd: number;
  usdtQuoteId?: string;
  usdtQuotedAt?: string;
  usdtAutoPrices?: boolean;
}

export function acquisitionFxFresh(config: UsdtSettings & { fxConfirmedOn?: string; fxValidityHours?: number }, now = Date.now()) {
  const stamp = config.acquisitionFxMode === "usdt" ? Date.parse(config.usdtQuotedAt ?? "") : Date.parse(`${config.fxConfirmedOn}T00:00:00Z`);
  const hours = config.acquisitionFxMode === "usdt" ? 24 : (config.fxValidityHours ?? 72);
  return Number.isFinite(stamp) && stamp <= now + 60_000 && now - stamp <= hours * 3_600_000 && config.acquisitionArsPerUsd > 0;
}

/** Purchase side, including the feed's trading fee. Network withdrawal charges remain separate. */
export function parseUsdtQuote(feed: unknown, spot: unknown, now = Date.now()) {
  const f = (feed as Record<string, { ask?: number; totalAsk?: number; time?: number }>)?.binance;
  const b = spot as { symbol?: string; askPrice?: string };
  const rate = Number(f?.totalAsk), ask = Number(f?.ask), primaryAsk = Number(b?.askPrice), at = Number(f?.time) * 1000;
  if (b?.symbol !== "USDTARS" || ![rate, ask, primaryAsk, at].every(Number.isFinite) || rate < 100 || rate > 100_000 || ask <= 0 || primaryAsk <= 0 || rate < ask || rate / ask > 1.03 || Math.abs(ask / primaryAsk - 1) > 0.02 || at > now + 60_000 || now - at > 15 * 60_000) {
    throw new Error("Cotización USDT inválida, vencida o sin coincidencia entre fuentes; se conserva la anterior.");
  }
  return { rateArs: Math.ceil(rate * 100) / 100, quotedAt: new Date(at).toISOString(), source: "criptoya-binance-totalAsk", evidence: { ask, totalAsk: rate, primaryAsk, purchaseParity: "1 USD proveedor = 1 USDT", tradingFeeIncluded: true, networkFeeIncluded: false } };
}

export async function refreshSupplierUsdtQuote(db: SupabaseClient, fetcher: typeof fetch = fetch) {
  const get = async (url: string) => {
    const response = await fetcher(url, { signal: AbortSignal.timeout(12_000), redirect: "error", cache: "no-store" });
    if (!response.ok) throw new Error(`Cotización USDT respondió HTTP ${response.status}.`);
    const raw = await response.text();
    if (raw.length > 100_000) throw new Error("Respuesta de cotización demasiado grande.");
    return JSON.parse(raw) as unknown;
  };
  const [feed, spot] = await Promise.all([get("https://criptoya.com/api/usdt/ars/250"), get("https://api.binance.com/api/v3/ticker/bookTicker?symbol=USDTARS")]);
  const quote = parseUsdtQuote(feed, spot);
  const saved = await db.rpc("record_supplier_usdt_quote_v1", { quote_input: quote });
  if (saved.error) throw new Error(saved.error.message);
  return { ...quote, id: saved.data as string };
}

export interface FxPriceBase {
  product_id: string;
  origin_usd: number;
  base_fx: number;
  base_landed: number;
  base_retail: number;
  base_wholesale: number;
  last_retail: number;
  last_wholesale: number;
}

/** Fixed baseline prevents compounding rounding drift. Only acquisition changes; carrier costs stay separate. */
export function projectFxPrice(base: FxPriceBase, rate: number, round = 100) {
  const origin = Number(base.origin_usd), oldFx = Number(base.base_fx), landed = Number(base.base_landed);
  if (![origin, oldFx, landed, rate, round].every(n => Number.isFinite(n) && n > 0) || landed + 0.01 < origin * oldFx) throw new Error("Falta una base de costos USD consistente.");
  const newLanded = Math.round((landed + origin * (rate - oldFx)) * 100) / 100;
  if (newLanded <= 0) throw new Error("Costo proyectado inválido.");
  const factor = newLanded / landed;
  return { landedArs: newLanded, retail: Math.ceil(Number(base.base_retail) * factor / round) * round, wholesale: Number(base.base_wholesale) > 0 ? Math.ceil(Number(base.base_wholesale) * factor / round) * round : 0 };
}

export async function runSupplierFxPrices(db: SupabaseClient, limit = 40) {
  const settings = await db.from("supplier_tracking_settings").select("config").eq("id", true).single();
  if (settings.error) throw new Error("No se pudo leer la configuración USDT.");
  const config = settings.data.config as UsdtSettings;
  if (config.acquisitionFxMode !== "usdt" || !config.usdtAutoPrices || !acquisitionFxFresh(config)) return { checked: 0, applied: 0, enabled: false };
  // Least recently checked first, so a bounded cycle cannot starve the rest of the catalog.
  const bases = await db.from("supplier_fx_price_bases").select("product_id").order("last_checked_at", { ascending: true, nullsFirst: true }).limit(limit);
  if (bases.error) throw new Error("No se pudieron leer las bases de precios USDT.");
  let applied = 0;
  for (const base of bases.data ?? []) {
    const result = await db.rpc("apply_supplier_fx_price_v1", { product_input: base.product_id, quote_input: config.usdtQuoteId });
    if (result.error) throw new Error(result.error.message);
    if (result.data === "applied") applied++;
  }
  return { checked: bases.data?.length ?? 0, applied, enabled: true };
}

export async function readSupplierFxPreview(db: SupabaseClient) {
  const [settings, products, costs, bases, offers] = await Promise.all([
    db.from("supplier_tracking_settings").select("config").eq("id", true).single(),
    readAllPages<{ id: string; title: string; retail_price: number; wholesale_price: number; has_variants: boolean; fulfillment_mode: string }>((from, to) => db.from("products").select("id,title,retail_price,wholesale_price,has_variants,fulfillment_mode").eq("is_active", true).is("deleted_at", null).order("id").range(from, to)),
    readAllPages<{ product_id: string; currency: string; origin_cost: number; exchange_rate: number; landed_cost: number }>((from, to) => db.from("product_costs").select("product_id,currency,origin_cost,exchange_rate,landed_cost").order("product_id").range(from, to)),
    readAllPages<FxPriceBase>((from, to) => db.from("supplier_fx_price_bases").select("*").order("product_id").range(from, to)),
    readAllPages<{product_id:string;origin_cost:number;cost_checked_at:string;availability_checked_at:string;evidence?:{costScope?:string}}>((from,to)=>db.from('supplier_offers').select('product_id,origin_cost,cost_checked_at,availability_checked_at,evidence').eq('verification','verified').eq('currency','USD').eq('availability','in_stock').is('last_error',null).is('variant_id',null).not('product_id','is',null).order('id').range(from,to)),
  ]);
  if (settings.error) throw new Error("No se pudo leer la cotización USDT.");
  const config = settings.data.config;
  const costMap = new Map(costs.map(c => [c.product_id, c])), baseMap = new Map(bases.map(b => [b.product_id, b]));
  return { config, rows: products.map(p => {
    const c = costMap.get(p.id), base = baseMap.get(p.id);
    let reason = config.acquisitionFxMode!=='usdt'||!config.usdtQuoteId ? "Activá el modo USDT y consultá la cotización" : p.has_variants ? "Requiere costo y base por variante exacta" : p.fulfillment_mode !== "supplier" ? "Stock propio: no se ajusta por reposición automáticamente" : !c || c.currency !== "USD" ? "Sin costo histórico USD" : !acquisitionFxFresh(config) ? "Cotización USDT vencida o no disponible" : "";
    let projection: ReturnType<typeof projectFxPrice> | null = null;
    if (!reason && c) {
      try { projection = projectFxPrice(base ?? { product_id: p.id, origin_usd: c.origin_cost, base_fx: c.exchange_rate, base_landed: c.landed_cost, base_retail: p.retail_price, base_wholesale: p.wholesale_price, last_retail: p.retail_price, last_wholesale: p.wholesale_price }, Number(config.acquisitionArsPerUsd), Number(config.roundArs)); }
      catch { reason = "Base de costos incompleta o inconsistente"; }
    }
    if(!reason&&!offers.some(o=>o.product_id===p.id&&Number(o.origin_cost)===Number(base?.origin_usd??c?.origin_cost)&&o.evidence?.costScope!=='supplier_quote_inclusions_unconfirmed'&&[o.cost_checked_at,o.availability_checked_at].every(t=>{const stamp=Date.parse(t);return Number.isFinite(stamp)&&stamp<=Date.now()+60000&&Date.now()-stamp<86400000;})))reason='Sin oferta exacta vigente con el mismo costo USD de la base';
    if(!reason&&projection&&projection.retail<projection.landedArs/(1-Number(config.targetMarginPercent)/100))reason='Margen registrado insuficiente: revisar precio';
    return { productId: p.id, title: p.title, oldRetail: Number(p.retail_price), oldWholesale: Number(p.wholesale_price), newRetail: projection?.retail ?? null, newWholesale: projection?.wholesale ?? null, landedArs: projection?.landedArs ?? null, costSnapshot:c?{origin_cost:Number(c.origin_cost),currency:c.currency,exchange_rate:Number(c.exchange_rate),landed_cost:Number(c.landed_cost)}:null, reason };
  }) };
}
