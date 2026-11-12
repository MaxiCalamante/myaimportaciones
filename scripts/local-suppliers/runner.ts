import { randomUUID } from 'node:crypto';
import { mkdir, appendFile, writeFile, readdir, readFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { SupabaseClient } from '@supabase/supabase-js';
import { chromium, type Browser } from '@playwright/test';
import { readCrosslinkCatalog, type CrosslinkCatalog, type TrackedOffer, type PublicCard } from '../../src/lib/supplier-crosslinks';
import { readAllPages } from '../../src/lib/read-all-pages';
import { publicReadRules } from '../../src/lib/supplier-automation';
import { fetchSupplierPage, readSupplierHtml } from '../../src/lib/supplier-url';
import { inspectRegisteredSupplierProduct, registeredProductIdentityMatches, supplierEvidenceGap } from '../../src/lib/supplier-offer-adapters';
import { observationFromPublic, titleIdentity, parsePublicAmount, type PublicProduct } from '../../src/lib/supplier-public-data';
import { parseObservation, supplierSourceUrl, type IntelligenceSupplier } from '../../src/lib/supplier-intelligence';
import { collectPublicCatalog } from '../lib/supplier-browser.mjs';
import { authorizedSupplier, localIdentity, publicLocalError, reviewedIds, type LocalOptions } from './core';
import { syncSupplierMarginPrice } from '../../src/lib/supplier-margin-prices';

export interface LocalRow {
  id: string; supplier: string; title: string; myaTitle?: string; variant?: string; url: string;
  status: 'ready' | 'review' | 'error' | 'candidate' | 'existing' | 'saved'; message: string;
  availability?: string; originCost?: number | null; currency?: string | null; previousAvailability?: string;
  at: string; productId?: string; variantId?: string | null; offerId?: string;
  syncError?: boolean; priceStatus?: string; priceMessage?: string; retailPrice?: number; wholesalePrice?: number;
  proposedRetail?: number; proposedWholesale?: number;
}
type Event = { seq: number; at: string; kind: 'log' | 'row'; message?: string; row?: LocalRow };
type Pending = { row: LocalRow; supplier: IntelligenceSupplier; found: PublicProduct; prior?: TrackedOffer; basis?: string; observedUrl?: string };
type ProductState = { id: string; is_active: boolean; deleted_at: string | null };
export class LocalSupplierRunner {
  state = { runId: '', phase: 'idle', mode: '' as string, current: '', checked: 0, total: 0, saved: 0, errors: 0, startedAt: '', finishedAt: '', logFile: '' };
  events: Event[] = [];
  rows = new Map<string, LocalRow>();
  private pending = new Map<string, Pending>();
  private controller = new AbortController();
  private browser?: Browser;
  private catalog?: CrosslinkCatalog;
  private logging: Promise<unknown> = Promise.resolve();
  private task: Promise<void> = Promise.resolve();
  private seq = 0;
  private applying = false;
  private starting = false;
  private closing = false;
  private finishing = false;
  private checkpointing: Promise<void> = Promise.resolve();
  private options?: LocalOptions;
  private lastSync = 0;
  constructor(private db: SupabaseClient, private folder: string, private runtime: { launch?: () => Promise<Browser>; collect?: typeof collectPublicCatalog } = {}) {}
  busy() { return ['running', 'paused', 'stopping'].includes(this.state.phase) || this.applying || this.starting || this.finishing; }
  snapshot(after = 0) { return { ...this.state, finishing: this.finishing, syncEnabled: this.options?.sync === true, pricesEnabled: this.options?.prices === true, applying: this.applying, cursor: this.seq, events: this.events.filter(e => e.seq > after) }; }
  private emit(kind: Event['kind'], value: string | LocalRow) {
    const event: Event = { seq: ++this.seq, at: new Date().toISOString(), kind, ...(typeof value === 'string' ? { message: value } : { row: { ...value } }) };
    this.events.push(event);
    if (this.state.logFile) this.logging = this.logging.then(() => appendFile(this.state.logFile, JSON.stringify(event) + '\n')).catch(() => { this.state.current = 'No se pudo escribir el historial local.'; });
  }
  private log(message: string) { this.state.current = message; this.emit('log', message); }
  private result(row: LocalRow, pending?: Omit<Pending, 'row'>) { this.rows.set(row.id, row); if (pending) this.pending.set(row.id, { row, ...pending }); this.emit('row', row); }
  private async checkpoint() {
    if (!this.state.runId) return;
    const path = join(this.folder, this.state.runId + '.json');
    const data = JSON.stringify({ ...this.state, results: [...this.rows.values()] }, null, 2);
    this.checkpointing = this.checkpointing.catch(() => {}).then(async () => { await this.logging; await writeFile(path + '.tmp', data); await rename(path + '.tmp', path); });
    await this.checkpointing;
  }
  private async boundary() {
    this.controller.signal.throwIfAborted();
    while (this.state.phase === 'paused') { await delay(200, undefined, { signal: this.controller.signal }); }
    this.controller.signal.throwIfAborted();
  }
  private async reserve(supplier: IntelligenceSupplier, url: string) {
    await this.boundary();
    authorizedSupplier(supplier); supplierSourceUrl(url, supplier);
    const rules = await publicReadRules(url);
    const slot = await this.db.rpc('reserve_supplier_source_slot_v1', { supplier_input: supplier.id, delay_input: rules.delay });
    if (slot.error) throw new Error('No se pudo coordinar la cadencia con el respaldo en la nube.');
    const wait = Math.max(0, Number(slot.data) || 0);
    if (wait > 0) { this.log('Esperando ' + Math.ceil(wait / 1000) + ' s para consultar ' + supplier.name); await delay(wait, undefined, { signal: this.controller.signal }); }
    await this.boundary(); return rules.delay;
  }
  async suppliers() {
    const r = await this.db.from('suppliers').select('id,name,official_key,website,is_active,automation_authorized,query_mode,capabilities,freshness_hours').order('name');
    if (r.error) throw new Error('No se pudo leer el registro de proveedores.');
    return r.data as IntelligenceSupplier[];
  }
  async connection() {
    const r = await this.db.from('supplier_tracking_settings').select('config').eq('id', true).single();
    if (r.error) throw Error('No se pudo verificar la conexión con la base compartida.');
    return { version: 2, site: 'https://myaimportaciones.com', autoStock: r.data.config.enabled === true && r.data.config.autoStock === true, marginPrices: r.data.config.localMarginPrices === true, message: 'La PC, el panel web y la tienda usan la misma base. Los cambios guardados se ven al actualizar la página.' };
  }
  async webState(id: string) {
    const row = this.rows.get(id); if (!row) throw Error('Resultado no disponible en este recorrido.');
    let productId = row.productId;
    if (row.offerId) {
      const offer = await this.db.from('supplier_offers').select('product_id').eq('id', row.offerId).maybeSingle();
      if (offer.error) throw Error('No se pudo verificar el vínculo en el panel web.');
      productId = offer.data?.product_id ?? productId;
    }
    if (!productId) return { state: row.offerId ? 'candidate' : 'pending', message: row.offerId ? 'Guardado en Oportunidades. Completá la ficha y aprobá su publicación para que aparezca en la tienda.' : 'Todavía no fue guardado en la base compartida.', importUrl: 'https://myaimportaciones.com/admin/oportunidades/importacion' };
    const r = await this.db.from('products').select('slug,is_active,deleted_at,retail_price,wholesale_price,supplier_available,fulfillment_mode').eq('id', productId).single();
    if (r.error) throw Error('No se pudo verificar el producto compartido.');
    let prices = r.data;
    if (row.variantId) {
      const v = await this.db.from('product_variants').select('retail_price,wholesale_price,supplier_available,fulfillment_mode,is_active').eq('id', row.variantId).eq('product_id', productId).single();
      if (v.error) throw Error('No se pudo verificar la variante exacta.');
      prices = { ...r.data, ...v.data, is_active: r.data.is_active && v.data.is_active };
    }
    return { state: r.data.deleted_at ? 'archived' : prices.is_active ? 'active' : 'draft', ...prices, editUrl: 'https://myaimportaciones.com/admin?editProduct=' + encodeURIComponent(productId), publicUrl: r.data.deleted_at || !prices.is_active ? null : 'https://myaimportaciones.com/producto/' + encodeURIComponent(r.data.slug), importUrl: 'https://myaimportaciones.com/admin/oportunidades/importacion?producto=' + encodeURIComponent(productId) };
  }
  async recoverLatest(sync: boolean, prices: boolean) {
    if (this.busy() || this.closing) throw Error('Esperá que termine el recorrido actual antes de recuperar resultados.');
    const files = (await readdir(this.folder).catch(() => [] as string[])).filter(f => /^\d{4}-\d{2}-\d{2}T[\dTZ-]+-[a-f0-9]{8}\.json$/.test(f)).sort().reverse();
    for (const name of files) {
      const report = JSON.parse(await readFile(join(this.folder, name), 'utf8')) as { mode: string; results: LocalRow[] };
      if (report.mode !== 'stock' || !Array.isArray(report.results)) continue;
      const ids = [...new Set(report.results.filter(r => r.status === 'ready' && r.offerId && /^[0-9a-f-]{36}$/i.test(r.offerId)).map(r => r.offerId!))];
      if (!ids.length) continue;
      const suppliers = (await this.suppliers()).filter(s => s.official_key !== 'madrid-center' && s.is_active && s.automation_authorized).map(s => s.official_key!);
      await this.start({ mode: 'stock', suppliers, query: '', limit: 5000, pages: 1, visible: false, sync, prices, onlyOffers: ids });
      this.log('Resultados pendientes recuperados del informe anterior. Se consultan otra vez para verificar datos vigentes; no se aplica evidencia vencida.');
      return;
    }
    throw Error('No hay resultados de stock pendientes para recuperar. Los guardados siguen en la base compartida.');
  }
  async start(options: LocalOptions) {
    if (this.busy() || this.closing) throw new Error('Ya hay un recorrido en curso o la herramienta se está cerrando.');
    this.starting = true;
    try {
    const all = await this.suppliers();
    if (this.closing) throw new Error('La herramienta se está cerrando.');
    const selected = options.suppliers.map(key => { const s = all.find(s => s.official_key === key); if (!s) throw new Error('Proveedor desconocido.'); return authorizedSupplier(s); });
    await mkdir(this.folder, { recursive: true });
    this.controller = new AbortController(); this.rows.clear(); this.pending.clear(); this.events = []; this.seq = 0; this.options = options; this.lastSync = Date.now();
    const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);
    this.state = { runId, phase: 'running', mode: options.mode, current: 'Preparando recorrido', checked: 0, total: 0, saved: 0, errors: 0, startedAt: new Date().toISOString(), finishedAt: '', logFile: join(this.folder, runId + '.jsonl') };
    this.log('Consulta iniciada manualmente en esta PC. La nube conserva su respaldo.');
    this.log(options.sync ? 'Sincronización habilitada: evidencia y disponibilidad comprobadas se guardan durante el recorrido.' : 'Modo revisión: nada se sincroniza hasta Guardar selección.');
    this.task = this.execute(options, selected);
    } finally { this.starting = false; }
  }
  pause() { if (this.state.phase === 'running') { this.state.phase = 'paused'; this.log('Pausado. La consulta que ya empezó puede finalizar; no se inicia otra.'); } }
  resume() { if (this.state.phase === 'paused') { this.state.phase = 'running'; this.log('Recorrido reanudado.'); } }
  async stop() { if (['running', 'paused'].includes(this.state.phase)) { this.state.phase = 'stopping'; this.controller.abort(); await this.browser?.close().catch(() => {}); } }
  async close() { this.closing = true; await this.stop(); while (this.starting || this.applying) await delay(50); await this.stop(); await this.task; await this.checkpoint(); }
  private async execute(options: LocalOptions, suppliers: IntelligenceSupplier[]) {
    this.finishing = true;
    try {
      this.catalog = await readCrosslinkCatalog(this.db);
      await this.boundary();
      if (options.mode === 'stock') await this.stock(options, suppliers); else await this.discover(options, suppliers);
      await this.flushAutomatic(true);
      this.state.phase = this.controller.signal.aborted ? 'cancelled' : this.state.errors ? 'partial' : 'completed';
      this.log('Recorrido ' + (this.state.phase === 'cancelled' ? 'detenido' : this.state.errors ? 'terminado con ' + this.state.errors + ' incidencias' : 'terminado') + '. Los resultados quedan disponibles para revisar y guardar.');
    } catch (e) { this.state.phase = this.controller.signal.aborted ? 'cancelled' : 'error'; this.log(this.state.phase === 'cancelled' ? 'Recorrido detenido por vos.' : publicLocalError(e)); }
    finally { await this.browser?.close().catch(() => {}); this.browser = undefined; this.state.finishedAt = new Date().toISOString(); await this.checkpoint().catch(() => {}); this.finishing = false; }
  }
  private async flushAutomatic(force = false) {
    if (!this.options?.sync || this.closing || this.controller.signal.aborted) return;
    const ids = [...this.pending.values()].filter(p => !p.row.syncError && ['ready','candidate'].includes(p.row.status)).map(p => p.row.id);
    if (!ids.length || (!force && ids.length < 10 && Date.now() - this.lastSync < 60000)) return;
    for (let i = 0; i < ids.length; i += 20) { await this.boundary(); await this.savePending(ids.slice(i, i + 20), true); }
    this.lastSync = Date.now();
  }
  private async stock(options: LocalOptions, suppliers: IntelligenceSupplier[]) {
    const catalog = this.catalog!;
    const states = await readAllPages<ProductState>((from, to) => this.db.from('products').select('id,is_active,deleted_at').order('id').range(from, to));
    const live = new Set(states.filter(p => !p.deleted_at).map(p => p.id));
    const queue = catalog.offers.filter(o => (!options.onlyOffers || options.onlyOffers.includes(o.id)) && o.product_id && live.has(o.product_id) && o.verification === 'verified' && suppliers.some(s => s.id === o.supplier_id)
      && (!options.query || (catalog.products.find(p => p.id === o.product_id)?.title + ' ' + o.title).toLowerCase().includes(options.query.toLowerCase())))
      .sort((a, b) => a.title.localeCompare(b.title)).slice(0, options.limit);
    this.state.total = queue.length;
    if (!queue.length) this.log('No hay fichas vinculadas verificadas para esa selección. Probá explorar oportunidades.');
    for (const prior of queue) {
      await this.boundary();
      const supplier = suppliers.find(s => s.id === prior.supplier_id)!;
      const product = catalog.products.find(p => p.id === prior.product_id);
      const variant = catalog.variants.find(v => v.id === prior.variant_id);
      const row: LocalRow = { id: randomUUID(), supplier: supplier.name, title: prior.title, myaTitle: product?.title, variant: variant?.title, url: prior.source_url, status: 'review', message: '', at: new Date().toISOString(), productId: prior.product_id!, variantId: prior.variant_id, offerId: prior.id, previousAvailability: prior.availability };
      this.log('Consultando ' + (this.state.checked + 1) + '/' + queue.length + ': ' + (product?.title ?? prior.title) + ' · ' + supplier.name);
      try {
        const target = catalog.targets.find(t => t.productId === prior.product_id && t.variantId === prior.variant_id);
        const registered = localIdentity({ ...prior, title: prior.evidence?.sourceTitle ?? prior.title }, target, supplier, prior);
        if (!registered.ok) { row.message = registered.reason; this.result(row); }
        else {
          await this.reserve(supplier, prior.source_url);
          const response = await fetchSupplierPage(prior.source_url, 'MYA-LocalMonitor/1.0');
          if (!response.ok) throw new Error('HTTP ' + response.status + ': se conserva la disponibilidad anterior.');
          const html = await readSupplierHtml(response);
          const inspected = await inspectRegisteredSupplierProduct(html, prior.source_url, supplier, prior, async native => {
            await this.reserve(supplier, native);
            const nativeResponse = await fetchSupplierPage(native, 'MYA-LocalMonitor/1.0');
            if (!nativeResponse.ok) throw new Error('HTTP ' + nativeResponse.status + ' en ficha nativa; se conserva la evidencia anterior.');
            return readSupplierHtml(nativeResponse);
          });
          const found = inspected.product;
          if (!found) throw new Error(supplierEvidenceGap(html, supplier) ?? 'La ficha no ofrece evidencia primaria compatible; no equivale a agotado.');
          if (registeredProductIdentityMatches(inspected.html, prior.source_url, supplier, prior, found)) found.variant_key = prior.variant_key;
          const identity = localIdentity(found, target, supplier, prior);
          row.title = found.title; row.at = new Date().toISOString(); row.availability = found.availability; row.originCost = found.origin_cost; row.currency = found.currency;
          if (!identity.ok || found.availability === 'unknown') { row.message = identity.ok ? 'La ficha no confirma disponibilidad explícita.' : identity.reason; this.result(row); }
          else if (prior.evidence?.sourceTitle && titleIdentity(prior.evidence.sourceTitle) !== titleIdentity(found.title)) { row.message = 'Cambió el nombre de la fuente; requiere revisión del vínculo.'; this.result(row); }
          else { row.status = 'ready'; row.message = 'Identidad y disponibilidad comprobadas. Pendiente de tu selección para guardar.'; this.result(row, { supplier, found, prior, observedUrl: inspected.observedUrl }); }
        }
      } catch (e) { this.state.errors++; row.status = 'error'; row.message = publicLocalError(e); this.result(row); }
      this.state.checked++; await this.flushAutomatic(); await this.checkpoint();
    }
  }
  private async discover(options: LocalOptions, suppliers: IntelligenceSupplier[]) {
    this.browser = this.runtime.launch ? await this.runtime.launch() : await chromium.launch({ channel: 'chrome', headless: !options.visible, timeout: 45000 });
    this.state.total = suppliers.length * options.pages;
    let collected = 0;
    for (const supplier of suppliers) {
      const seen = new Set<string>(), seenCards = new Set<string>(); let next: string | null = null;
      for (let pageNo = 1; pageNo <= options.pages && collected < options.limit; pageNo++) {
        await this.boundary();
        try {
          const source = supplierSourceUrl(next ?? supplier.website!, supplier);
          if (seen.has(source)) break; seen.add(source);
          this.log(supplier.name + ' · página ' + pageNo + ' · ' + (options.query || 'catálogo público'));
          const cadence = await this.reserve(supplier, source);
          const page = await (this.runtime.collect ?? collectPublicCatalog)(this.browser, supplier, options.query, cadence, next, () => this.reserve(supplier, supplier.website!), url => publicReadRules(supplierSourceUrl(url, supplier)));
          await this.boundary();
          if (!page.records.length) this.log(supplier.name + ': sin tarjetas legibles en esta vista. No prueba catálogo vacío ni agotamiento.');
          for (const card of page.records as PublicCard[]) {
            await this.boundary(); if (collected >= options.limit) break;
            if (supplier.official_key === 'atacado-connect' && /iphone/i.test(card.title) && /\b(cpo|outlet|usado|seminovo|ativo|activado|refurbished)\b/i.test(card.title)) continue;
            const url = supplierSourceUrl(card.url, supplier);
            const found: PublicProduct = { external_id: card.id, variant_key: 'listing:' + card.id, title: card.title, brand: card.brand ?? '', model: '', source_url: url, origin_cost: card.currency ? parsePublicAmount(card.price ?? '') : null, currency: card.currency ?? null, availability: card.basis === 'explicit' ? card.availability : 'unknown', gtin: card.gtin ?? null };
            const identityKey = found.external_id + '|' + found.variant_key;
            if (seenCards.has(identityKey)) continue; seenCards.add(identityKey);
            const duplicate = [...this.pending.values()].some(x => x.supplier.id === supplier.id && x.found.external_id === found.external_id && x.found.variant_key === found.variant_key);
            if (duplicate) continue;
            const prior = this.catalog!.offers.find(o => o.supplier_id === supplier.id && o.external_id === found.external_id && o.variant_key === found.variant_key);
            const row: LocalRow = { id: randomUUID(), supplier: supplier.name, title: card.title, url, at: new Date().toISOString(), status: prior ? 'existing' : 'candidate', message: prior ? 'Ya existe una oferta privada; no se sobrescribe su vínculo.' : 'Candidato privado. La tarjeta no confirma por sí sola stock, identidad MYA ni permiso de publicación.', availability: found.availability, originCost: found.origin_cost, currency: found.currency, ...(prior ? { offerId: prior.id, productId: prior.product_id ?? undefined, variantId: prior.variant_id } : {}) };
            this.result(row, prior ? undefined : { supplier, found, basis: card.basis }); collected++;
          }
          this.state.checked++; await this.flushAutomatic(true); await this.checkpoint();
          next = page.nextUrl ? supplierSourceUrl(page.nextUrl, supplier) : null;
          if (!next || page.limited) { this.log(supplier.name + (page.limited ? ': límite de tarjetas de la vista alcanzado; cobertura parcial.' : ': sin enlace siguiente visible. La vista puede ser una muestra o tener carga dinámica.')); break; }
        } catch (e) { this.state.errors++; this.log(supplier.name + ': ' + publicLocalError(e)); this.state.checked++; break; }
      }
    }
  }
  async apply(input: unknown) {
    return this.savePending(input);
  }
  private async savePending(input: unknown, automatic = false) {
    const ids = reviewedIds(input);
    if ((!automatic && this.busy()) || this.applying || this.closing) throw new Error('Terminá o detené el recorrido antes de guardar.');
    const pending = ids.map(id => this.pending.get(id));
    if (pending.some(p => !p || !['ready', 'candidate'].includes(p.row.status))) throw new Error('La selección contiene resultados que no se pueden guardar.');
    if (pending.some(p => Date.now() - Date.parse(p!.row.at) > 15 * 60000)) throw new Error('La revisión venció (15 minutos). Volvé a consultar antes de guardar.');
    this.applying = true;
    try {
      const catalog = await readCrosslinkCatalog(this.db);
      for (const item of pending as Pending[]) {
        try {
          const supplier = authorizedSupplier(catalog.suppliers.find(s => s.id === item.supplier.id)!);
          const { found, prior, row } = item;
          let payload;
          if (prior) {
            const current = catalog.offers.find(o => o.id === prior.id);
            if (!current || current.product_id !== prior.product_id || current.variant_id !== prior.variant_id || current.source_url !== prior.source_url || current.verification !== 'verified' || current.external_id !== found.external_id || current.variant_key !== found.variant_key) throw new Error('El vínculo cambió desde la revisión. Volvé a consultar.');
            if (item.observedUrl && item.observedUrl !== found.source_url && current.evidence?.observedUrl !== item.observedUrl) throw new Error('La ficha nativa revisada cambió desde la consulta. Volvé a consultar.');
            const target = catalog.targets.find(t => t.productId === current.product_id && t.variantId === current.variant_id);
            const identity = localIdentity(found, target, supplier, current);
            if (!identity.ok) throw new Error(identity.reason);
            if (current.evidence?.sourceTitle && titleIdentity(current.evidence.sourceTitle) !== titleIdentity(found.title)) throw new Error('La identidad registrada cambió mientras revisabas.');
            if (current.gtin && found.gtin && current.gtin !== found.gtin) throw new Error('El GTIN no coincide con la revisión.');
            payload = { ...parseObservation({ ...observationFromPublic(found, supplier, current.product_id), variant_id: current.variant_id, title: current.title, brand: current.brand, model: current.model, gtin: current.gtin ?? found.gtin, verification: current.verification, observed_at: row.at }, supplier, 'product_page'), evidence: { ...current.evidence, sourceTitle: found.title, observedUrl: item.observedUrl ?? found.source_url, availabilityBasis: 'explicit', localRun: this.state.runId } };
          } else {
            if (catalog.offers.some(o => o.supplier_id === supplier.id && o.external_id === found.external_id && o.variant_key === found.variant_key)) throw new Error('Esta oferta fue registrada mientras revisabas. No se sobrescribe.');
            payload = { ...parseObservation({ ...observationFromPublic(found, supplier, null), verification: 'pending', observed_at: row.at }, supplier, 'product_page'), evidence: { sourceTitle: found.title, availabilityBasis: item.basis, localRun: this.state.runId } };
          }
          const saved = await this.db.rpc('record_supplier_observation_v1', { p: payload });
          if (saved.error) throw new Error(saved.error.message);
          row.status = 'saved'; row.syncError = false; row.offerId = String(saved.data); this.state.saved++;
          row.message = prior ? 'Evidencia guardada. ' : 'Oportunidad guardada como candidato privado sin producto publicado.';
          if (prior?.product_id) {
            const productOffers = catalog.offers.filter(o => o.product_id === prior.product_id);
            const allExact = productOffers.length > 0 && productOffers.every(o => {
              const s = catalog.suppliers.find(s => s.id === o.supplier_id);
              const t = catalog.targets.find(t => t.productId === o.product_id && t.variantId === o.variant_id);
              try { return !!s && o.verification === 'verified' && localIdentity({ ...o, title: o.evidence?.sourceTitle ?? o.title }, t, s, o).ok; } catch { return false; }
            });
            if (allExact) {
              const refresh = await this.db.rpc('refresh_supplier_availability_v1', { product_input: prior.product_id });
              if (refresh.error) row.message += 'La disponibilidad no se pudo refrescar: ' + publicLocalError(new Error(refresh.error.message));
              else row.message += refresh.data === true ? 'Disponibilidad de proveedor sincronizada; inventario físico conservado.' : 'La política actual no aplicó cambios de disponibilidad.';
              if (this.options?.prices) {
                const price = await syncSupplierMarginPrice(this.db, prior.product_id, prior.id, prior.variant_id, { title: found.title, originCost: found.origin_cost, at: row.at, url: found.source_url });
                row.priceStatus = price.status; row.priceMessage = price.reason; row.retailPrice = price.retail; row.wholesalePrice = price.wholesale;
                row.proposedRetail = price.proposedRetail; row.proposedWholesale = price.proposedWholesale;
              }
            } else { row.message += 'Disponibilidad conservada: hay otros vínculos del producto pendientes de identidad exacta.'; if (this.options?.prices) { row.priceStatus = 'blocked'; row.priceMessage = 'Primero hay que corregir los vínculos incompatibles de este producto.'; } }
          }
          this.result(row); this.pending.delete(row.id);
        } catch (e) { this.state.errors++; item.row.syncError = true; item.row.message = 'No se completó la sincronización: ' + publicLocalError(e); this.result(item.row); }
        await this.checkpoint();
      }
    } finally { this.applying = false; await this.checkpoint(); }
  }
}
