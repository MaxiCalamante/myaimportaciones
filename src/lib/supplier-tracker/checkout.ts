import type { SupabaseClient } from '@supabase/supabase-js';
import { processTrackerTask } from './worker';

/** Only verified assisted publications can trigger a supplier request from checkout. */
export async function refreshCheckoutSupplierCatalog(db: SupabaseClient, items: {productId:string;variantId?:string|null}[]) {
  const lookup = await db.rpc('tracker_checkout_items_v1', { items_input:items });
  if (lookup.error) {
    // Legacy environments still use the existing checkout checks before the additive migration.
    if (['PGRST202','42883'].includes(lookup.error.code)) return;
    throw Error('No pudimos verificar las referencias del proveedor.');
  }
  const references = lookup.data as {id:string;supplier_id:string}[];
  const suppliers = new Set<string>();
  await Promise.all(references.map(async reference => {
    if (suppliers.has(reference.supplier_id)) return;
    suppliers.add(reference.supplier_id);
    const claim = await db.rpc('tracker_claim_catalog_item_v1', { item_input:reference.id });
    if (!claim.error && claim.data?.[0]) await processTrackerTask(db,claim.data[0]);
  }));
}
