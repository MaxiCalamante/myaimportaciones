'use server';
import { getAdminClient } from '@/lib/admin-auth';
import { catalogId, catalogMessage, previewCatalogImport, readCatalogImportWorkspace, readCatalogJob } from '@/lib/supplier-catalog-import';
import { validateCatalogPricingRule, type CatalogPricingRule } from '@/lib/catalog-pricing';
import type { CatalogImportFilters, CatalogPreviewSelection, CatalogReview } from '@/lib/catalog-import-types';
import { revalidatePath } from 'next/cache';
import { invalidateAdminStorefrontCache } from '@/lib/storefront';
export async function readCatalogImportAction(filters:CatalogImportFilters={}){return readCatalogImportWorkspace(await getAdminClient(),filters);}
export async function previewCatalogImportAction(selection:CatalogPreviewSelection){return previewCatalogImport(await getAdminClient(),selection);}
export async function readCatalogJobAction(jobId:string){return readCatalogJob(await getAdminClient(),jobId);}
export async function controlCatalogImportAction(jobId:string,action:'confirm'|'pause'|'resume'|'cancel'|'retry_failed'){
 const db=await getAdminClient();catalogId(jobId);
 if(!['confirm','pause','resume','cancel','retry_failed'].includes(action))throw new Error('Acción de lote inválida.');
 const r=await db.rpc('control_catalog_import_job_v1',{job_input:jobId,action_input:action});if(r.error)throw new Error(catalogMessage(r.error.message));
 revalidatePath('/admin/oportunidades/importacion');
}
export async function processCatalogImportAction(jobId:string){
 const db=await getAdminClient();catalogId(jobId);
 const r=await db.rpc('process_catalog_import_job_v1',{job_input:jobId,limit_input:20});if(r.error)throw new Error(catalogMessage(r.error.message));
 revalidatePath('/admin');return r.data;
}
export async function saveCatalogPricingAction(rule:CatalogPricingRule){
 const db=await getAdminClient(),config=validateCatalogPricingRule(rule);
 const r=await db.from('catalog_pricing_rules').insert({config});if(r.error)throw new Error('No se guardó la nueva versión de reglas.');
 revalidatePath('/admin/oportunidades/importacion');
}
export async function readCatalogReviewsAction(productId?:string):Promise<CatalogReview[]>{
 const db=await getAdminClient();
 const query=db.from('catalog_product_reviews').select('*, products(title,slug)');
 const r=productId ? await query.eq('product_id',catalogId(productId)) : await query.order('updated_at',{ascending:false}).limit(200);
 if(r.error){if(['42P01','PGRST205'].includes(r.error.code))return[];throw new Error('No se pudieron leer las revisiones.');}
 return(r.data??[]).map(r=>({...r,title:r.products?.title,slug:r.products?.slug}));
}
export async function reviewCatalogProductAction(productId:string,review:Omit<CatalogReview,'product_id'|'state'|'title'|'slug'>,action:'save'|'publish'|'pause'){
 const db=await getAdminClient();catalogId(productId);if(!['save','publish','pause'].includes(action))throw new Error('Acción de publicación inválida.');
 if(!review||['identity_confirmed','costs_confirmed','media_authorized','compliance_confirmed'].some(k=>typeof review[k as keyof typeof review]!=='boolean')||typeof review.evidence!=='string'||review.evidence.length>10000)throw new Error('Revisá las confirmaciones y la evidencia documental.');
 const r=await db.rpc('review_catalog_product_v1',{product_input:productId,review_input:review,action_input:action});if(r.error)throw new Error(catalogMessage(r.error.message));
 invalidateAdminStorefrontCache();revalidatePath('/','layout');
}
