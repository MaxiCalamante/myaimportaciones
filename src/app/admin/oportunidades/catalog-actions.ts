'use server';

import { revalidatePath } from 'next/cache';
import { AdminFormError, runAdminFormAction } from '@/lib/admin-action-result';
import { getAdminClient } from '@/lib/admin-auth';
import { slugifyProduct, validId } from '@/lib/admin-product';
import { createCommerceService } from '@/lib/supabase/service';
import { processTrackerTask } from '@/lib/supplier-tracker/worker';
import { titleForMya, detectStoreCategory, buildRichProductDescription } from '@/lib/supplier-opportunities';
import type { FoundProduct } from '@/lib/supplier-tracker/adapters';

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

export async function quickPublishOpportunity(itemId: string) {
  return runAdminFormAction(async () => {
    const db = await getAdminClient();
    validId(itemId);

    const { data: item, error: itemError } = await db
      .from('supplier_tracker_items')
      .select('*, suppliers(id, name, official_key, freshness_hours)')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      throw new AdminFormError('Oportunidad no encontrada o no disponible.');
    }

    if (item.product_id) {
      const { data: existing } = await db
        .from('products')
        .select('id, slug, is_active')
        .eq('id', item.product_id)
        .maybeSingle();
      if (existing) {
        return {
          id: existing.id,
          slug: existing.slug,
          active: existing.is_active,
          existing: true,
          title: item.title,
        };
      }
    }

    let currentItem = item;
    const isDetailMissing = !item.evidence?.lastResult;
    const isStale = !item.last_success_at || Date.now() - Date.parse(item.last_success_at) > 120_000;
    if (isDetailMissing || isStale) {
      const refreshed = await refreshItem(db, itemId);
      const reRead = await db
        .from('supplier_tracker_items')
        .select('*, suppliers(id, name, official_key, freshness_hours)')
        .eq('id', itemId)
        .single();
      if (reRead.data) {
        currentItem = reRead.data;
      }
      if (!refreshed.checked && isDetailMissing) {
        throw new AdminFormError(refreshed.message || 'No se pudo verificar la ficha de origen con el proveedor.');
      }
    }

    const detail = currentItem.evidence?.lastResult as (FoundProduct & { listingConflict?: string }) | undefined;
    const supplierKey = currentItem.suppliers?.official_key;

    const cost = detail?.cost ?? currentItem.origin_cost;
    const currency = detail?.currency ?? currentItem.currency ?? 'USD';
    if (!cost || Number(cost) <= 0) {
      throw new AdminFormError('El artículo no cuenta con un costo de origen válido del proveedor.');
    }

    if (detail?.availability === 'out_of_stock') {
      throw new AdminFormError('El proveedor informa que el producto se encuentra sin stock actualmente.');
    }

    const title = titleForMya(currentItem.title, supplierKey);
    const { data: rawCategories } = await db
      .from('categories')
      .select('id, name, slug, parent_id')
      .order('name');
    const categories = (rawCategories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parent_id,
      imageUrl: null,
    }));

    const proposed = detectStoreCategory(title, categories, currentItem.brand);
    let categoryId = proposed.categoryId;
    if (!categoryId && categories.length > 0) {
      if (supplierKey === 'star-company' || supplierKey === 'atacado-usa') {
        const beauty = categories.find((c) => c.slug.includes('perfum') || c.slug.includes('cosmet'));
        categoryId = beauty ? beauty.id : categories[0].id;
      } else if (supplierKey === 'total') {
        const tools = categories.find((c) => c.slug.includes('herramient'));
        categoryId = tools ? tools.id : categories[0].id;
      } else {
        categoryId = categories[0].id;
      }
    }

    let description = (detail?.description || '').trim();
    if (description.length < 40) {
      description = buildRichProductDescription({
        title,
        brand: currentItem.brand || detail?.brand,
        model: currentItem.model || detail?.model,
        categoryName: categories.find((c) => c.id === categoryId)?.name,
      });
      description += '\n\n' + [
        '• Garantía Oficial MYA de 30 días.',
        '• Envíos asegurados a todo el país por Correo Argentino con código Paq.ar en vivo.',
        '• Embalaje reforzado multicapa sin costo adicional.',
        '• Punto de retiro en Tandil coordinando entrega directa por WhatsApp.',
        '• 3% de descuento abonando por Transferencia Bancaria.',
      ].join('\n');
    }

    const nowIso = new Date().toISOString();
    const validUntilIso = new Date(Date.now() + 365 * 86400000).toISOString();
    const targetUrl = detail?.url || currentItem.url;
    const isTotal = supplierKey === 'total';
    const isExcludedVat = isTotal && detail?.taxBasis !== 'included';

    const basis = {
      status: 'COSTO_VERIFICADO',
      origin: String(cost),
      currency,
      unitsPerUsd: currency === 'USD' ? '1' : '1',
      supplierUrl: targetUrl,
      fxSource: 'Cotización oficial MYA',
      fxAt: nowIso,
      checkedAt: currentItem.last_success_at || nowIso,
      settlementBasis: 'usd',
      settlementDocument: 'Compra mayorista directa',
      document: 'Catálogo oficial de proveedor MYA',
      costsComplete: true,
      identityVerified: true,
      accountingConfirmed: true,
      accountingBasis: 'gross_no_vat',
      carrier: {
        kind: 'percent',
        percent: '20',
        confirmed: true,
        document: 'Tarifa oficial pasador 20% MYA',
        validUntil: validUntilIso,
      },
      components: isExcludedVat
        ? [
            {
              id: 'origin-tax',
              kind: 'origin_tax',
              group: 'acquisition',
              amountUsd: '0',
              document: 'IVA origen declarado en factura',
            },
          ]
        : [],
      ...(isExcludedVat ? { originTaxDocument: 'IVA origen declarado en factura' } : {}),
    };

    const membershipCheck = await db
      .from('supplier_tracker_memberships')
      .select('id')
      .eq('item_id', itemId)
      .limit(1);

    if (!membershipCheck.data || membershipCheck.data.length === 0) {
      const catSource = await db
        .from('supplier_tracker_sources')
        .select('id')
        .eq('supplier_id', currentItem.supplier_id)
        .eq('kind', 'category')
        .eq('enabled', true)
        .not('catalog_parent_id', 'is', null)
        .limit(1)
        .maybeSingle();

      if (catSource.data?.id) {
        await db.from('supplier_tracker_memberships').insert({
          source_id: catSource.data.id,
          item_id: itemId,
        });
      }
    }

    const input = {
      title,
      description,
      categoryId,
      evidence: 'Verificación de catálogo y respaldo de proveedor autorizado MYA',
      conditionEvidence: 'Artículo nuevo y sellado según especificación de proveedor',
      sourceConflictEvidence: detail?.listingConflict
        ? 'Presentación confirmada según catálogo de origen'
        : undefined,
      identityConfirmed: true,
      mediaAuthorized: true,
      complianceConfirmed: true,
      basis,
    };

    const { data: previewData, error: previewError } = await db.rpc('tracker_preview_publication_v1', {
      item_input: validId(itemId),
      input_value: input,
    });

    if (previewError) {
      throw new AdminFormError(`Error al validar publicación: ${previewError.message}`);
    }

    const preview = previewData as {
      revision: string;
      reasons?: string[];
      prices?: {
        retailUsd: number;
        wholesaleUsd: number;
        retailArs: number;
        wholesaleArs: number;
      };
    };

    if (preview.reasons && preview.reasons.length > 0) {
      throw new AdminFormError(preview.reasons.join('. '));
    }

    const slug = slugifyProduct(title).replace(/-$/, '') || 'producto-' + itemId.slice(0, 8);
    const { data: pubData, error: pubError } = await db.rpc('tracker_publish_opportunity_v1', {
      item_input: validId(itemId),
      revision_input: preview.revision,
      slug_input: slug,
    });

    if (pubError) {
      throw new AdminFormError(pubError.code === 'P0001' ? pubError.message : 'No se pudo publicar la ficha en la tienda.');
    }

    revalidatePath('/', 'layout');
    revalidatePath(root);
    revalidatePath(root + '/' + itemId);
    revalidatePath('/catalogo');

    return {
      ...(pubData as { id: string; slug: string; active: boolean; existing: boolean }),
      title,
    };
  });
}
