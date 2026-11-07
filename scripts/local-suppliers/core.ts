import type { MatchTarget } from '../../src/lib/supplier-matching';
import { matchSupplierProduct } from '../../src/lib/supplier-matching';
import type { IntelligenceSupplier, SupplierOffer } from '../../src/lib/supplier-intelligence';
import { supplierSourceUrl } from '../../src/lib/supplier-intelligence';
import type { PublicProduct } from '../../src/lib/supplier-public-data';

export type LocalOptions = { mode: 'stock' | 'discover'; suppliers: string[]; query: string; limit: number; pages: number; visible: boolean; sync?: boolean; prices?: boolean; onlyOffers?: string[] };
export function localOptions(input: unknown): LocalOptions {
  if (!input || typeof input !== 'object') throw new Error('Elegí qué querés revisar.');
  const x = input as Record<string, unknown>;
  if (!['stock', 'discover'].includes(String(x.mode)) || !Array.isArray(x.suppliers) || !x.suppliers.length || x.suppliers.length > 9 || x.suppliers.some(s => typeof s !== 'string' || !/^[a-z-]+$/.test(s))) throw new Error('Seleccioná proveedores oficiales.');
  if (typeof x.query !== 'string' || x.query.length > 100 || !Number.isInteger(x.limit) || Number(x.limit) < 1 || Number(x.limit) > 5000 || !Number.isInteger(x.pages) || Number(x.pages) < 1 || Number(x.pages) > 100 || typeof x.visible !== 'boolean') throw new Error('Revisá los límites de productos y páginas.');
  for (const k of ['sync','prices']) if (x[k] !== undefined && typeof x[k] !== 'boolean') throw Error('Revisá las opciones de sincronización.');
  if (x.prices && !x.sync) throw Error('El ajuste de precios requiere sincronizar los resultados.');
  return { mode: x.mode as LocalOptions['mode'], suppliers: [...new Set(x.suppliers as string[])], query: x.query.trim(), limit: Number(x.limit), pages: Number(x.pages), visible: x.visible, sync: x.sync === true, prices: x.prices === true };
}
export function authorizedSupplier(s: IntelligenceSupplier) {
  if (!s || !s.is_active || !s.automation_authorized || !s.website || !['product_page', 'public_browser'].includes(s.query_mode)) throw new Error('Este proveedor no tiene consultas públicas habilitadas.');
  if (s.official_key === 'madrid-center') throw new Error('Madrid Center requiere una lista autorizada o carga manual; no se evitan sus restricciones.');
  return s;
}
export function localIdentity(found: PublicProduct, target: MatchTarget | undefined, supplier: IntelligenceSupplier, prior?: SupplierOffer) {
  authorizedSupplier(supplier);
  supplierSourceUrl(found.source_url, supplier);
  if (!target) return { ok: false, reason: 'Falta la presentación exacta del producto MYA.' };
  if (prior && (prior.external_id !== found.external_id || prior.variant_key !== found.variant_key)) return { ok: false, reason: 'Cambió el identificador o la variante del proveedor.' };
  const condition = (s: string) => /\b(tester|cpo|outlet|refurbished|reacondicionado|usado|seminovo|ativo|activado)\b/i.test(s);
  if (condition(found.title) !== condition(target.title)) return { ok: false, reason: 'La condición de la unidad es diferente (tester/usado/etc.).' };
  const match = matchSupplierProduct({ ...found, supplierKey: supplier.official_key ?? '' }, [target]);
  return { ok: match.status === 'exact', reason: match.status === 'exact' ? match.reason : 'Identidad no confirmada: ' + match.reason };
}
export function reviewedIds(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > 20 || value.some(v => typeof v !== 'string') || new Set(value).size !== value.length) throw new Error('Seleccioná entre 1 y 20 resultados concretos para guardar.');
  return value as string[];
}
export function sameLocalRequest(headers: { host?: string; origin?: string; 'sec-fetch-site'?: string }, origin: string) {
  return headers.host === new URL(origin).host && (!headers.origin || headers.origin === origin) && headers['sec-fetch-site'] !== 'cross-site';
}
export function publicLocalError(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).replace(/(?:sb_secret_|eyJ)[A-Za-z0-9._-]+/g, '[credencial oculta]').slice(0, 700);
}
