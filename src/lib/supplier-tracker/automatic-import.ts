import type {SupabaseClient} from '@supabase/supabase-js';
import {planCatalogImport} from '../catalog-import-plan';
import {readAdminProducts} from '../admin-catalog-read';
import {readAllPages} from '../read-all-pages';
import {matchTargets,type MatchProduct,type MatchVariant} from '../supplier-matching';
import {parseObservation,type SupplierOffer,type IntelligenceSupplier} from '../supplier-intelligence';

/** Explicit category opt-in only. Reuses the private draft pipeline; never publishes. */
export async function runTrackerAutomaticDrafts(db:SupabaseClient){
 const sources=await db.from('supplier_tracker_sources').select('*').eq('enabled',true).eq('auto_import',true).not('import_category_id','is',null).order('created_at').limit(4);
 if(sources.error)throw Error('No se pudieron consultar las categorías con importación habilitada.');
 if(!sources.data.length)return{enabled:0,queued:0};
 const [products,variants]=await Promise.all([
  readAllPages<Record<string,unknown>>((from,to)=>readAdminProducts(db,{from,size:to-from+1})),
  readAllPages<MatchVariant>((from,to)=>db.from('product_variants').select('id,product_id,title,sku,options').order('id').range(from,to))
 ]);
 const targets=matchTargets(products as unknown as MatchProduct[],variants);let queued=0;
 for(const source of sources.data){
  const supplier=await db.from('suppliers').select('*').eq('id',source.supplier_id).eq('is_active',true).eq('monitor_enabled',true).single();
  if(supplier.error)continue;
  const candidates=await db.rpc('tracker_auto_candidates_v1',{source_input:source.id});
  if(candidates.error)throw Error('No se pudieron consultar los candidatos de la categoría.');
  const selected:SupplierOffer[]=[],itemIds:string[]=[];
   for(const item of candidates.data){
    if(selected.length===5)break;
    let offerId=item.offer_id as string|null;
    if(!offerId){
     const observation=parseObservation({external_id:item.external_id,variant_key:`listing:${item.external_id}`,title:item.title,brand:item.brand,model:item.model,gtin:item.gtin,source_url:item.url,origin_cost:item.origin_cost,currency:item.currency,availability:'unknown',verification:'pending',observed_at:item.last_seen_at},supplier.data as IntelligenceSupplier);
     const saved=await db.rpc('record_supplier_observation_v1',{p:{...observation,evidence:{sourceTitle:item.title,availabilityBasis:'listing_unknown',trackerItemId:item.id}}});
     if(saved.error)throw Error('No se pudo preparar el candidato privado.');offerId=String(saved.data);
     const link=await db.rpc('tracker_link_offer_v1',{item_input:item.id,offer_input:offerId});if(link.error)throw Error('No se pudo relacionar el candidato.');
    }
    const previous=await db.from('catalog_import_items').select('id').eq('offer_id',offerId).limit(1);
    if(previous.error)throw Error('No se pudo comprobar la importación anterior.');if(previous.data.length)continue;
    const offer=await db.from('supplier_offers').select('*').eq('id',offerId).is('product_id',null).single();
    if(offer.error)continue;selected.push(offer.data as SupplierOffer);itemIds.push(item.id);
   }
  if(!selected.length)continue;
  // Price zero is a private draft requiring review, never an invented public sale price.
  const rows=planCatalogImport(selected,targets,source.import_category_id,()=>null);
  for(const row of rows)if(row.payload.action==='link'){row.payload.action='review';row.payload.reason='Coincidencia exacta: confirmar el vínculo en el comparador de proveedores.';delete row.payload.target;}
  const job=await db.rpc('tracker_queue_drafts_v1',{source_input:source.id,item_ids_input:itemIds,rows_input:rows});
  if(job.error)throw Error('No se pudo encolar el lote privado de borradores.');queued+=rows.length;
 }
 return{enabled:sources.data.length,queued};
}
