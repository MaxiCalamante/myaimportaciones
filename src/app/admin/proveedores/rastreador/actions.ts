'use server';
import{AdminFormError,runAdminFormAction}from'@/lib/admin-action-result';
import{getAdminClient}from'@/lib/admin-auth';import{createCommerceService}from'@/lib/supabase/service';import{revalidatePath}from'next/cache';
import{supplierAdapter}from'@/lib/supplier-tracker/adapters';import{categoryIdentity,sourceUrl}from'@/lib/supplier-tracker/adapters/shared';
import{fetchTrackerHtml}from'@/lib/supplier-tracker/network';import type{TrackerWorkspace,TrackerFilters}from'@/lib/supplier-tracker/types';
import{previewCatalogImport}from'@/lib/supplier-catalog-import';import{parseObservation,type IntelligenceSupplier}from'@/lib/supplier-intelligence';
const id=(value:unknown)=>{if(typeof value!=='string'||!/^([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i.test(value))throw new AdminFormError('Identificador inválido.');return value;};
async function tick(db:Awaited<ReturnType<typeof getAdminClient>>){const r=await db.rpc('tracker_request_tick_v1');if(r.error&&!['PGRST202','42883'].includes(r.error.code))throw new AdminFormError('El trabajo quedó en cola; no se pudo adelantar el ciclo.');}
export async function readTracker(filters:TrackerFilters={}):Promise<TrackerWorkspace>{const db=await getAdminClient();const r=await db.rpc('tracker_workspace_v1',{filters_input:filters});if(r.error)throw new AdminFormError('No se pudo leer el rastreador.');return r.data as TrackerWorkspace;}
async function saveTrackerSourcesImpl(form:FormData){
 const db=await getAdminClient(),supplierId=id(form.get('supplierId'));const r=await db.from('suppliers').select('*').eq('id',supplierId).eq('is_active',true).single();if(r.error)throw new AdminFormError('Proveedor no disponible.');
 const adapter=supplierAdapter(r.data.official_key),urls=String(form.get('urls')??'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(!urls.length||urls.length>20)throw new AdminFormError('Ingresá entre una y 20 URLs.');
 const exclusions=String(form.get('exclusions')??'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(url=>sourceUrl(url,url,adapter.key));
 const normalization=form.get('fxCurrency')?{currency:String(form.get('fxCurrency')),unitsPerUsd:String(form.get('unitsPerUsd')),source:String(form.get('fxSource')),quotedAt:String(form.get('fxAt'))}:{};
 if(form.get('autoImport')==='on'&&!form.get('categoryId'))throw new AdminFormError('Elegí la categoría MYA para habilitar borradores automáticos.');
 const validated=urls.map(raw=>{const normalized=sourceUrl(raw,raw,adapter.key),kind=adapter.category(normalized)?'category':adapter.product(normalized)?'product':null;if(!kind)throw new AdminFormError('La URL no corresponde a una categoría o ficha reconocida del proveedor.');return{normalized,kind};});
 const registered:string[]=[];
 for(const {normalized,kind} of validated){
  const saved=await db.rpc('tracker_save_source_v1',{config_input:{supplierId,url:kind==='category'?categoryIdentity(normalized,adapter.key):normalized,kind,label:String(form.get('label')??''),discoverySeconds:Number(form.get('discoverySeconds')),monitorSeconds:Number(form.get('monitorSeconds')),maxPages:Number(form.get('maxPages')),maxItems:100000,exclusions,autoImport:form.get('autoImport')==='on',categoryId:form.get('categoryId')||null,mediaAuthorized:form.get('mediaAuthorized')==='on',normalization}});
  if(saved.error)throw new AdminFormError('No se guardó la fuente. Revisá URL, intervalos, exclusiones y categoría de importación.');registered.push(String(saved.data));
 }
 revalidatePath('/admin/proveedores/rastreador');return{registered};
}
async function startTrackerSourceImpl(sourceId:string){const db=await getAdminClient();const r=await db.rpc('tracker_start_source_v1',{source_input:id(sourceId)});if(r.error)throw new AdminFormError('No se pudo iniciar el recorrido.');await tick(db);return{runId:String(r.data)};}
async function controlTrackerImpl(kind:'item'|'source',ids:string[],action:string){const db=await getAdminClient();if(!['item','source'].includes(kind)||!ids.length||ids.length>200)throw new AdminFormError('Selección inválida.');for(const key of [...new Set(ids)]){const r=await db.rpc('tracker_control_v1',{kind_input:kind,id_input:id(key),action_input:action});if(r.error)throw new AdminFormError('No se pudo actualizar el seguimiento.');}if(action==='sync')await tick(db);}
async function saveTrackerSupplierImpl(form:FormData){const db=await getAdminClient();const r=await db.rpc('tracker_save_supplier_v1',{supplier_input:id(form.get('supplierId')),enabled_input:form.get('enabled')==='on',seconds_input:Number(form.get('seconds')),priority_input:Number(form.get('priority'))});if(r.error)throw new AdminFormError('No se guardó la configuración del proveedor.');revalidatePath('/admin/proveedores/rastreador');}
async function discoverSupplierCategoriesImpl(supplierId:string){const db=await getAdminClient();const r=await db.from('suppliers').select('*').eq('id',id(supplierId)).eq('is_active',true).single();if(r.error)throw new AdminFormError('Proveedor no disponible.');const adapter=supplierAdapter(r.data.official_key);const slot=await db.rpc('reserve_supplier_source_slot_v1',{supplier_input:r.data.id,delay_input:10000});if(slot.error)throw new AdminFormError('No se pudo reservar el acceso al proveedor.');const wait=Number(slot.data??0);if(wait>10000)throw new AdminFormError('El proveedor está en uso. Volvé a intentar en unos segundos.');if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));const html=await fetchTrackerHtml(r.data.website,adapter.key);return adapter.listing(html,r.data.website,r.data.website).categories;}
async function importTrackerItemsImpl(ids:string[],categoryId:string){
 const db=await getAdminClient();if(!ids.length||ids.length>200)throw new AdminFormError('Seleccioná entre uno y 200 productos.');id(categoryId);
 const result=await db.from('supplier_tracker_items').select('*').in('id',[...new Set(ids.map(id))]);if(result.error||result.data.length!==new Set(ids).size)throw new AdminFormError('La selección cambió.');
 const offerIds:string[]=[];
 for(const item of result.data){if(item.excluded)throw new AdminFormError('Hay un producto excluido en la selección.');if(item.offer_id){offerIds.push(item.offer_id);continue;}
  const supplier=await db.from('suppliers').select('*').eq('id',item.supplier_id).eq('is_active',true).single();if(supplier.error)throw new AdminFormError('Proveedor archivado.');
  const existing=await db.from('supplier_offers').select('id').eq('supplier_id',item.supplier_id).eq('external_id',item.external_id).eq('variant_key',`listing:${item.external_id}`).maybeSingle();
  if(existing.error)throw new AdminFormError('No se pudo comprobar si ya existe la oferta.');
  let offerId=existing.data?.id as string|undefined;
  if(!offerId){const observed=parseObservation({external_id:item.external_id,variant_key:`listing:${item.external_id}`,title:item.title,brand:item.brand,model:item.model,gtin:item.gtin,source_url:item.url,origin_cost:item.origin_cost,currency:item.currency,availability:'unknown',verification:'pending',observed_at:item.last_seen_at},supplier.data as IntelligenceSupplier);
   const saved=await db.rpc('record_supplier_observation_v1',{p:{...observed,evidence:{sourceTitle:item.title,availabilityBasis:'listing_unknown',trackerItemId:item.id}}});if(saved.error)throw new AdminFormError('No se pudo preparar la oferta de revisión.');offerId=String(saved.data);
  }
  const link=await createCommerceService().rpc('tracker_link_offer_v1',{item_input:item.id,offer_input:offerId});if(link.error)throw new AdminFormError('No se pudo relacionar el borrador de oferta.');offerIds.push(offerId!);
 }
 const preview=await previewCatalogImport(db,{filters:{},offerIds,allMatching:false,categoryId,limit:200});
 const confirmed=await db.rpc('control_catalog_import_job_v1',{job_input:preview.jobId,action_input:'confirm'});if(confirmed.error)throw new AdminFormError('Se guardó la revisión, pero no se pudo encolar el lote.');await tick(db);
 return{jobId:preview.jobId,counts:preview.counts};
}
export async function readTrackerHistory(itemId:string|null,kind:string|null,cursor:{at:string;id:string}|null){const db=await getAdminClient();const r=await db.rpc('tracker_history_v1',{item_input:itemId?id(itemId):null,kind_input:kind,cursor_input:cursor});if(r.error)throw new AdminFormError('No se pudo cargar el historial.');return r.data;}
async function saveTrackerItemIntervalImpl(itemId:string,seconds:number){const db=await getAdminClient();const r=await db.rpc('tracker_item_interval_v1',{item_input:id(itemId),seconds_input:seconds});if(r.error)throw new AdminFormError('No se guardó el intervalo.');}
async function preferTrackerOfferImpl(productId:string,variantId:string|null,offerId:string,reason:string){const db=await getAdminClient();const r=await db.rpc('tracker_prefer_offer_v1',{product_input:id(productId),variant_input:variantId?id(variantId):null,offer_input:id(offerId),reason_input:reason});if(r.error)throw new AdminFormError('Elegí una oferta verificada de esta presentación exacta y completá el motivo.');}
export async function readTrackerAlternatives(productId:string,variantId:string|null){const db=await getAdminClient();const r=await db.rpc('tracker_alternatives_v1',{product_input:id(productId),variant_input:variantId?id(variantId):null});if(r.error)throw new AdminFormError('No se pudieron comparar las fuentes exactas.');return r.data as import('@/lib/supplier-tracker/types').TrackerAlternatives;}

export async function saveTrackerSources(form:FormData){return runAdminFormAction(()=>saveTrackerSourcesImpl(form),'No se pudo completar la operación del rastreador. Actualizá la página y revisá la selección.');}
export async function startTrackerSource(sourceId:string){return runAdminFormAction(()=>startTrackerSourceImpl(sourceId),'No se pudo completar la operación del rastreador. Actualizá la página y revisá la selección.');}
export async function controlTracker(kind:'item'|'source',ids:string[],action:string){return runAdminFormAction(()=>controlTrackerImpl(kind,ids,action),'No se pudo completar la operación del rastreador. Actualizá la página y revisá la selección.');}
export async function saveTrackerSupplier(form:FormData){return runAdminFormAction(()=>saveTrackerSupplierImpl(form),'No se pudo completar la operación del rastreador. Actualizá la página y revisá la selección.');}
export async function discoverSupplierCategories(supplierId:string){return runAdminFormAction(()=>discoverSupplierCategoriesImpl(supplierId),'No se pudo completar la operación del rastreador. Actualizá la página y revisá la selección.');}
export async function importTrackerItems(ids:string[],categoryId:string){return runAdminFormAction(()=>importTrackerItemsImpl(ids,categoryId),'No se pudo completar la operación del rastreador. Actualizá la página y revisá la selección.');}
export async function saveTrackerItemInterval(itemId:string,seconds:number){return runAdminFormAction(()=>saveTrackerItemIntervalImpl(itemId,seconds),'No se pudo completar la operación del rastreador. Actualizá la página y revisá la selección.');}
export async function preferTrackerOffer(productId:string,variantId:string|null,offerId:string,reason:string){return runAdminFormAction(()=>preferTrackerOfferImpl(productId,variantId,offerId,reason),'No se pudo completar la operación del rastreador. Actualizá la página y revisá la selección.');}
