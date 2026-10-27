"use server";
import{getAdminClient}from'@/lib/admin-auth';
import{createCommerceService}from'@/lib/supabase/service';
import{runSupplierAutomation,validateTrackingConfig,type TrackingConfig}from'@/lib/supplier-automation';
import{manualMarketUrl}from'@/lib/supplier-market';
import{validId}from'@/lib/admin-product';
import{revalidatePath}from'next/cache';
import{invalidateAdminStorefrontCache}from'@/lib/storefront';
import{readCrosslinkCatalog,linkPayload,type TrackedOffer}from'@/lib/supplier-crosslinks';
const refresh=()=>{revalidatePath('/admin/proveedores/inteligencia');};
export async function saveTrackingSettingsAction(config:TrackingConfig,confirmed:boolean){
 const db=await getAdminClient();if(confirmed!==true)throw new Error('Confirmá las condiciones del seguimiento.');validateTrackingConfig(config);
 const result=await db.from('supplier_tracking_settings').update({config,updated_at:new Date().toISOString()}).eq('id',true).select('id').single();if(result.error)throw new Error('No se pudo guardar el seguimiento.');refresh();
}
export async function requestSupplierSearchAction(query:string){
 const db=await getAdminClient();if(typeof query!=='string'||query.trim().length<2||query.length>80)throw new Error('Ingresá marca/modelo o palabras del producto (2 a 80 caracteres).');
 const recent=await db.from('supplier_search_requests').select('id').in('state',['queued','running']).eq('query',query.trim()).limit(1);if(recent.error)throw new Error('No se pudo verificar la búsqueda.');
 if(recent.data?.length)return 'Esta búsqueda ya está en la cola del procesador.';
 const saved=await db.from('supplier_search_requests').insert({query:query.trim()});if(saved.error)throw new Error('No se pudo solicitar la búsqueda.');refresh();return 'Búsqueda registrada. El procesador consulta los proveedores y guarda los resultados aquí.';
}
export async function runSupplierTrackingAction(){
 await getAdminClient();const result=await runSupplierAutomation(createCommerceService(),{worker:'admin-manual',limit:6,timeBudgetMs:35000});invalidateAdminStorefrontCache();revalidatePath('/','layout');refresh();return 'disabled' in result && result.disabled ? 'El seguimiento está desactivado en la configuración.' : `Seguimiento: ${result.checked} consultas, ${result.success} correctas y ${result.errors} con incidencia registrada.`;
}
export async function saveMarketReferenceAction(form:FormData){
 const db=await getAdminClient();const productId=String(form.get('product_id')??'');validId(productId);
 if(form.get('confirmed')!=='on')throw new Error('Confirmá que el comparable coincide exactamente.');
 const url=manualMarketUrl(String(form.get('source_url')??'')),price=Number(form.get('price_ars'));
 if(!Number.isFinite(price)||price<=0||price>1e10)throw new Error('Precio de referencia inválido.');
 const existing=await db.from('supplier_market_references').select('id').eq('product_id',productId).eq('source_url',url).maybeSingle();if(existing.error)throw new Error('No se pudo revisar la referencia.');
 const values={product_id:productId,source_url:url,price_ars:price,title:String(form.get('title')??'').slice(0,500),identity_verified:true,checked_at:new Date().toISOString(),last_error:null,refresh_mode:'manual'};
 const result=existing.data?await db.from('supplier_market_references').update(values).eq('id',existing.data.id):await db.from('supplier_market_references').insert(values);
 if(result.error)throw new Error('No se pudo guardar el comparable.');refresh();return 'Comparable exacto registrado con fecha de verificación.';
}
export async function approveSupplierPriceAction(id:string,confirmed:boolean){
 const db=await getAdminClient();validId(id);if(confirmed!==true)throw new Error('Confirmá el precio revisado.');
 const result=await db.rpc('approve_supplier_price_v1',{decision_input:id,confirmed_input:true});if(result.error)throw new Error('La evidencia o el precio cambiaron. Recalculá antes de aprobar.');
 invalidateAdminStorefrontCache();revalidatePath('/','layout');refresh();return 'Precio revisado y aplicado con registro de aprobación.';
}
export async function retrySupplierJobAction(id:string){
 await getAdminClient();validId(id);
 const result=await createCommerceService().from('supplier_sync_queue').update({state:'ready',attempts:0,next_run_at:new Date().toISOString(),leased_until:null}).eq('id',id).in('state',['retry','blocked']).select('id').single();
 if(result.error)throw new Error('La consulta ya está en ejecución o no requiere reintento.');refresh();return 'Consulta reprogramada. Se conserva la evidencia anterior hasta obtener una respuesta válida.';
}
export async function linkSupplierOfferAction(offerId:string,productId:string,variantId:string|null,confirmed:boolean){
 const db=await getAdminClient();validId(offerId);validId(productId);if(variantId)validId(variantId);if(!confirmed)throw new Error('Confirmá identidad, presentación y variante exactas.');
 const catalog=await readCrosslinkCatalog(createCommerceService()),offer=catalog.offers.find(o=>o.id===offerId),target=catalog.targets.find(t=>t.productId===productId&&t.variantId===variantId);
 if(!offer||!target)throw new Error('Oferta o variante inexistente.');
 const r=await db.rpc('link_supplier_offer_v1',{link_input:linkPayload(offer as TrackedOffer,target,catalog,'admin_review','Vínculo interno revisado por administrador',true)});
 if(r.error)throw new Error(`No se vinculó: ${r.error.message}`);refresh();return 'Oferta vinculada internamente; el seguimiento conserva fuente, precio y disponibilidad.';
}
