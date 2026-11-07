import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readAllPages } from '../src/lib/read-all-pages';
import { matchSupplierProduct, matchTargets, type MatchProduct, type MatchVariant } from '../src/lib/supplier-matching';
import { sourceUrl, supplierKeyForUrl } from '../src/lib/supplier-url-policy';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || new URL(url).hostname !== 'gqcdurxndbeeugjfworx.supabase.co') throw new Error('Supabase MYA target not verified');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const at = new Date().toISOString();
const output = resolve('scratch/suppliers-private/release-final-2026-11-07', at.replace(/[:.]/g, '-'));
await mkdir(output, { recursive: true });
interface Row extends MatchProduct, MatchVariant {
  [column: string]: unknown;
  id: string;
  supplier_id: string;
  variant_id: string | null;
  product_id: string;
  website: string;
  official_key: string;
  source_url: string;
  freshness_hours: number;
  evidence?: { sourceTitle?: string; identityReview?: unknown };
  last_success_at: string | null;
  cost_checked_at: string | null;
  availability_checked_at: string | null;
}
const tables = { products: 'id', product_variants: 'id', suppliers: 'id', supplier_offers: 'id', supplier_link_decisions: 'id', categories: 'id', favorites: 'profile_id,product_id', cart_items: 'profile_id,product_id,customer_tier', account_carts: 'profile_id', email_saved_carts: 'profile_id', orders: 'id', order_items: 'id', stock_logs: 'id', supplier_sync_queue: 'id', supplier_discovery_jobs: 'id', product_costs: 'product_id', supplier_tracking_settings: 'id', product_usd_prices: 'id' };
const backup: Record<string, Row[]> = {};
const manifest: Record<string, { rows: number; sha256: string }> = {};
const digest = (raw: string) => createHash('sha256').update(raw).digest('hex');
await Promise.all(Object.entries(tables).map(async ([table, order]) => {
  const rows = await readAllPages<Row>((from, to) => {
    let q = db.from(table).select('*');
    for (const column of order.split(',')) q = q.order(column);
    return q.range(from, to);
  });
  const raw = JSON.stringify(rows);
  const file = resolve(output, `${table}.json`);
  await writeFile(file, raw);
  const stored = await readFile(file, 'utf8');
  if (digest(stored) !== digest(raw) || JSON.parse(stored).length !== rows.length) throw new Error(`Backup verification failed: ${table}`);
  backup[table] = rows;
  manifest[table] = { rows: rows.length, sha256: digest(stored) };
}));

const products = new Map(backup.products.map(p => [p.id, p]));
const variants = new Map(backup.product_variants.map(v => [v.id, v]));
const suppliers = new Map(backup.suppliers.map(s => [s.id, s]));
const byProduct = new Map<string, Row[]>();
for (const v of variants.values()) byProduct.set(v.product_id, [...(byProduct.get(v.product_id) ?? []), v]);
const approved: Array<{ id: string; identity: unknown[]; method: string }> = [];
const rejected: Array<{ id: string; product: string; variant: string | null; reason: string }> = [];
const fresh = new Map<string, Set<string>>();
const checkedAt = Date.parse(at);
for (const offer of backup.supplier_offers) {
  if (!offer.product_id || offer.verification !== 'verified' || offer.archived_at) continue;
  const p = products.get(offer.product_id);
  const v = offer.variant_id ? variants.get(offer.variant_id) : null;
  const s = suppliers.get(offer.supplier_id);
  let reason = '';
  let method = '';
  const sourceTitle = offer.evidence?.sourceTitle || offer.title;
  try {
    if (!p || (offer.variant_id && v?.product_id !== p.id) || !s?.is_active || !s.automation_authorized || s.archived_at || offer.evidence?.identityReview) throw new Error('Identidad o proveedor no elegible');
    const supplierKey = supplierKeyForUrl(s.website);
    if (supplierKey !== s.official_key || supplierKeyForUrl(offer.source_url) !== supplierKey) throw new Error('Dominio no autorizado');
    sourceUrl(offer.source_url, offer.source_url, supplierKey);
    const targets = matchTargets([p], v ? [v] : byProduct.get(p.id) ?? []);
    const matched = matchSupplierProduct({ ...offer, title: sourceTitle, supplierKey }, targets);
    if (matched.status !== 'exact' || !matched.method || matched.target?.variantId !== (offer.variant_id ?? null)) throw new Error(matched.reason);
    method = matched.method;
  } catch (error) {
    reason = error instanceof Error ? error.message : String(error);
  }
  if (reason) {
    rejected.push({ id: offer.id, product: offer.product_id, variant: offer.variant_id, reason });
    continue;
  }
  approved.push({ id: offer.id, method, identity: [offer.product_id, offer.variant_id, offer.supplier_id,
    offer.source_url, offer.external_id, offer.variant_key, sourceTitle, offer.model, offer.brand, offer.gtin,
    p!.title, p!.brand, p!.model, p!.sku, p!.specifications, v?.title, v?.sku, v?.options].map(value => value ?? null) });
  const checked = Math.max(...[offer.last_success_at, offer.cost_checked_at, offer.availability_checked_at].map(value => value ? Date.parse(value) : -Infinity));
  if (offer.last_error || checked < checkedAt - s!.freshness_hours * 3600000 || checked > checkedAt + 300000) continue;
  const identity = `${offer.product_id}:${offer.variant_id ?? ''}`;
  const sources = fresh.get(identity) ?? new Set();
  sources.add(offer.supplier_id);
  fresh.set(identity, sources);
}
const retiringProducts = backup.products.filter(p => !p.deleted_at && !p.supplier_archived_at && !(p.has_variants || byProduct.has(p.id)
  ? (byProduct.get(p.id) ?? []).some(v => v.is_active && !v.supplier_archived_at && fresh.has(`${p.id}:${v.id}`))
  : fresh.has(`${p.id}:`)));
const retiringIds = new Set(retiringProducts.map(p => p.id));
const retiringVariants = backup.product_variants.filter(v => !v.supplier_archived_at && (retiringIds.has(v.product_id) || !fresh.has(`${v.product_id}:${v.id}`)));
const retiringVariantIds = new Set(retiringVariants.map(v => v.id));
const affectedCart = (items: unknown) => Array.isArray(items) && items.some(i => retiringIds.has(i?.productId ?? i?.product_id ?? i?.product?.id) || retiringVariantIds.has(i?.variantId ?? i?.variant_id));
const result = {
  at, manifest, checks: approved, rejected, products: retiringProducts.map(p => p.id).sort(), variants: retiringVariants.map(v => v.id).sort(),
  summary: { products: backup.products.length, variants: backup.product_variants.length, exactOffers: approved.length, rejectedOffers: rejected.length,
    retiringProducts: retiringProducts.length, retiringPublished: retiringProducts.filter(p => p.is_active).length, retiringVariants: retiringVariants.length,
    retainedPublished: backup.products.filter(p => p.is_active && !p.deleted_at && !retiringIds.has(p.id)).length,
    affectedCategories: new Set(retiringProducts.filter(p => p.is_active).map(p => p.category_id)).size,
    affectedFavorites: backup.favorites.filter(f => retiringIds.has(f.product_id)).length,
    affectedCartRows: backup.cart_items.filter(c => retiringIds.has(c.product_id)).length,
    affectedAccountCarts: backup.account_carts.filter(c => affectedCart(c.items)).length,
    affectedEmailCarts: backup.email_saved_carts.filter(c => affectedCart(c.items)).length,
    multipleAuthorizedSuppliers: [...fresh.values()].filter(x => x.size > 1).length },
};
const plan = JSON.stringify(result);
await writeFile(resolve(output, 'plan.json'), plan);
await writeFile(resolve(output, 'plan.sha256'), digest(plan));
console.log(JSON.stringify({ output, ...result.summary }, null, 2));
