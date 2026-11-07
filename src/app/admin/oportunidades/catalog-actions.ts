'use server';

import { revalidatePath } from 'next/cache';
import { AdminFormError, runAdminFormAction } from '@/lib/admin-action-result';
import { getAdminClient } from '@/lib/admin-auth';
import { slugifyProduct, validId } from '@/lib/admin-product';
import { createCommerceService } from '@/lib/supabase/service';
import { processTrackerTask } from '@/lib/supplier-tracker/worker';

const root = '/admin/oportunidades';

async function requestTick(db: Awaited<ReturnType<typeof getAdminClient>>) {
  const tick = await db.rpc('tracker_request_tick_v1');
  return !tick.error;
}

export async function syncCatalog(supplierId?: string, sourceId?: string) {
  return runAdminFormAction(async () => {
    const db = await getAdminClient();
    const result = await db.rpc('tracker_start_catalog_v1', {
      supplier_input: supplierId ? validId(supplierId) : null,
      source_input: sourceId ? validId(sourceId) : null,
    });
    if (result.error) throw new AdminFormError('No se pudo encolar el recorrido. Revisá si la fuente y su proveedor están habilitados.');
    const started = await requestTick(db);
    revalidatePath(root);
    return { runs: result.data as string[], started };
  });
}

async function refreshItem(db: Awaited<ReturnType<typeof getAdminClient>>, itemId: string) {
  const queued = await db.rpc('tracker_queue_catalog_item_v1', { item_input: itemId });
  if (queued.error) throw new AdminFormError('No se pudo encolar la ficha. Revisá si la referencia y su proveedor están habilitados.');
  const worker = createCommerceService();
  const claimed = await worker.rpc('tracker_claim_catalog_item_v1', { item_input: itemId });
  if (claimed.error || !claimed.data?.[0]) {
    await requestTick(db);
    return { checked: false, queued: true, message: 'Verificación en cola. El proveedor está ocupado o en espera entre solicitudes.' };
  }
  const result = await processTrackerTask(worker, claimed.data[0]);
  return {
    checked: result.ok && !result.missing,
    queued: false,
    message: result.ok && !result.missing ? 'Ficha consultada. Revisá los campos confirmados en origen.'
      : 'La ficha de origen requiere revisión. Se conserva la última evidencia y queda registrada la incidencia.',
  };
}

export async function syncOpportunity(itemId: string) {
  return runAdminFormAction(async () => {
    const db = await getAdminClient();
    const result = await refreshItem(db, validId(itemId));
    revalidatePath(root);
    revalidatePath(root + '/' + itemId);
    return result;
  });
}

export async function previewOpportunity(itemId: string, form: FormData) {
  return runAdminFormAction(async () => {
    const db = await getAdminClient();
    const string = (name: string) => String(form.get(name) ?? '').trim();
    let basis: unknown = null;
    if (string('basis')) {
      try { basis = JSON.parse(string('basis')); }
      catch { throw new AdminFormError('La base de costos debe ser JSON válido.'); }
    }
    const input = {
      title: string('title'), description: string('description'), categoryId: string('categoryId'),
      evidence: string('evidence'), conditionEvidence: string('conditionEvidence'), sourceConflictEvidence: string('sourceConflictEvidence'), basis,
      identityConfirmed: form.get('identity') === 'on', mediaAuthorized: form.get('media') === 'on',
      complianceConfirmed: form.get('compliance') === 'on',
    };
    const { data, error } = await db.rpc('tracker_preview_publication_v1', { item_input: validId(itemId), input_value: input });
    if (error) throw new AdminFormError('No se guardó la vista previa. Revisá los campos y la base de costos.');
    revalidatePath(root);
    return data as {
      revision: string; reasons: string[];
      prices: null | { retailUsd: number; wholesaleUsd: number; retailArs: number; wholesaleArs: number;
        acquisitionUsd: number; totalCostUsd: number; retailMargin: number; wholesaleMargin: number;
        results: Record<string,{contributionUsd: string; effectiveMargin: string; feesUsd: string}> };
    };
  });
}

export async function publishOpportunity(itemId: string, revision: string, title: string) {
  return runAdminFormAction(async () => {
    const db = await getAdminClient();
    validId(itemId);
    validId(revision);
    const item = await db.from('supplier_tracker_items').select('last_success_at,product_id').eq('id',itemId).single();
    if (item.error) throw new AdminFormError('La oportunidad ya no está disponible.');
    if (!item.data.product_id && (!item.data.last_success_at || Date.now() - Date.parse(item.data.last_success_at) > 120_000)) {
      const refresh = await refreshItem(db,itemId);
      if (!refresh.checked) throw new AdminFormError(refresh.message);
    }
    const { data, error } = await db.rpc('tracker_publish_opportunity_v1', {
      item_input: itemId, revision_input: revision, slug_input: slugifyProduct(title).replace(/-$/, '') || 'producto-' + itemId.slice(0,8),
    });
    if (error) throw new AdminFormError(error.code === 'P0001' ? error.message : 'No se publicó la ficha. Revisá la vista previa e intentá de nuevo.');
    revalidatePath('/', 'layout');
    revalidatePath(root);
    revalidatePath(root + '/' + itemId);
    return data as { id: string; slug: string; active: boolean; existing: boolean };
  });
}
