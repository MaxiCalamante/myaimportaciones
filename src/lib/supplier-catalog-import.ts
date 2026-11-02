import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { calculateImport, classifyImport, type ImportPolicy } from './import-costs';
import { quoteCatalogPrice, type CatalogPricingRule } from './catalog-pricing';
import { offerEvidence, supplierSourceUrl, type SupplierOffer, type IntelligenceSupplier } from './supplier-intelligence';
import { acquisitionFxFresh } from './supplier-usdt';
import type { TrackingConfig } from './supplier-automation';
import { readAllPages } from './read-all-pages';
import { readAdminProducts } from './admin-catalog-read';
import { matchTargets, type MatchProduct, type MatchVariant } from './supplier-matching';
import { linkPayload, type CrosslinkCatalog } from './supplier-crosslinks';
import { planCatalogImport, validateCatalogFilters } from './catalog-import-plan';
import type { CatalogCandidate, CatalogImportFilters, CatalogImportItem, CatalogImportJob, CatalogImportWorkspace, CatalogPreviewSelection, CatalogPreviewResult } from './catalog-import-types';
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export function catalogMessage(message:string):string {
 if(/ficha HTTPS exacta/.test(message))return 'Falta la ficha HTTPS exacta del producto en el sitio del proveedor.';
 if(/source.*changed|source offer missing/i.test(message))return 'La oferta cambió después de la vista previa. Generá una nueva revisión.';
 if(/commercial policy changed/i.test(message))return 'Las reglas comerciales o el cambio se modificaron. Generá una nueva vista previa.';
 if(/variant|identity|existing title|slug/i.test(message))return 'Revisá la identidad y la variante: hay una coincidencia o un enlace que necesita confirmación.';
 if(/documentary|confirmation/i.test(message))return 'Completá las confirmaciones y la evidencia documental antes de publicar.';
 if(/description|image|positive price/i.test(message))return 'Completá una descripción útil, una imagen autorizada y un precio válido.';
 if(/cost|contribution|margin|policy/i.test(message))return 'Revisá costos documentados, vigencias y margen mínimo antes de publicar.';
 if(/fresh|supplier offer/i.test(message))return 'Falta una oferta verificada con disponibilidad y precio vigentes.';
 return 'No se pudo completar la operación. Revisá el registro y actualizá antes de reintentar.';
}
export function catalogId(id:string){if(typeof id!=='string'||!uuid.test(id))throw new Error('Identificador inválido.');return id;}
function offersQuery(db:SupabaseClient,f:CatalogImportFilters){
 let q=db.from('supplier_offers').select('*',{count:'exact'});
 // Escape PostgREST pattern metacharacters; no interpolated .or expressions.
 const literal=(s:string)=>s.replace(/[\\%_]/g,'\\$&');
 if(f.query)q=q.ilike('title',`%${literal(f.query)}%`);
 if(f.brand)q=q.ilike('brand',`%${literal(f.brand)}%`);
 if(f.supplierId)q=q.eq('supplier_id',f.supplierId);
 if(f.availability)q=q.eq('availability',f.availability);
 if(f.minCost!==undefined)q=q.gte('origin_cost',f.minCost);
 if(f.maxCost!==undefined)q=q.lte('origin_cost',f.maxCost);
 return q.order('id');
}
async function pricingContext(db:SupabaseClient){
 const [settings,policy,pricing,suppliers,categories]=await Promise.all([
  db.from('supplier_tracking_settings').select('config').eq('id',true).maybeSingle(),
  db.from('import_cost_policies').select('id,config').order('created_at',{ascending:false}).limit(1).maybeSingle(),
  db.from('catalog_pricing_rules').select('id,config').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1).maybeSingle(),
  db.from('suppliers').select('*').eq('is_active',true).order('name'),
  db.from('categories').select('id,name,slug,parent_id').order('name')
 ]);
 if(suppliers.error||categories.error)throw new Error('No se pudieron leer proveedores y categorías.');
 if(settings.error||policy.error)throw new Error('No se pudo leer la configuración de abastecimiento.');
 if(pricing.error&&!['42P01','PGRST205'].includes(pricing.error.code))throw new Error('No se pudieron leer las reglas comerciales.');
 return{settings:settings.data?.config as TrackingConfig|undefined,policy:policy.data as {id:string;config:ImportPolicy}|null,pricing:pricing.data as {id:string;config:CatalogPricingRule}|null,suppliers:(suppliers.data??[]) as IntelligenceSupplier[],categories:categories.data??[]};
}
type PricingContext=Awaited<ReturnType<typeof pricingContext>>;
function estimate(o:SupplierOffer,ctx:PricingContext,categoryId:string){
 const warnings:string[]=[];const supplier=ctx.suppliers.find(s=>s.id===o.supplier_id);
 if(!supplier)return{price:null,margin:null,cost:undefined,warnings:['Proveedor inactivo o inexistente.']};
 if(!ctx.settings||!ctx.policy||!ctx.pricing)return{price:null,margin:null,cost:undefined,warnings:['Configurá tarifas, cotización y reglas comerciales.']};
 const evidence=offerEvidence(o,supplier);
 if(!evidence.usable)warnings.push(evidence.label);
 if(!acquisitionFxFresh(ctx.settings))warnings.push('Cotización de adquisición vencida o sin confirmar.');
 if(o.currency!=='USD')warnings.push('La moneda requiere una cotización explícita por operación.');
 const scope=(o as SupplierOffer&{evidence?:{costScope?:string}}).evidence?.costScope;
 if(scope==='supplier_quote_inclusions_unconfirmed')warnings.push('Falta confirmar qué cargos incluye el proveedor.');
 if(ctx.settings.shippingPaidByMya&&ctx.settings.shippingArs>0)warnings.push('El transporte compartido debe distribuirse en una simulación; no se aplica por unidad.');
 try{
  if(o.currency!=='USD'||!o.origin_cost)throw new Error('Costo de origen incompleto.');
  // A catalogue import is not a purchase operation: never apply a volume tier to a lone item.
  const policy={...ctx.policy.config,volumeConfirmed:false};
  const r=calculateImport({lines:[{id:o.id,title:o.title,quantity:1,origin:Number(o.origin_cost),currency:'USD',acquisitionArsPerUnit:ctx.settings.acquisitionArsPerUsd,originUnitsPerUsd:1,kind:classifyImport(o.title,o.brand),inches:Number(o.title.match(/\b(\d{2,3})\s*(?:pulgadas|polegadas|["″])/i)?.[1])||undefined,sourceConfirmed:evidence.usable,sourceReference:o.source_url,observedAt:o.cost_checked_at??undefined}],expenses:[],expensesConfirmed:ctx.pricing.config.expensesConfirmed,targetMargin:ctx.pricing.config.targetMarginPercent},policy);
  warnings.push(...r.warnings);
  const q=quoteCatalogPrice(r.lines[0].unitArs,ctx.pricing.config,categoryId);
  warnings.push(...q.warnings);
  const safe=q.complete&&warnings.length===0;
  return{price:safe?q.price:null,margin:q.marginPercent,cost:r.lines[0].unitArs===null?undefined:{origin_cost:o.origin_cost,currency:o.currency,exchange_rate:ctx.settings.acquisitionArsPerUsd,freight_per_unit:0,other_landed_cost:Math.max(0,r.lines[0].unitArs-Number(o.origin_cost)*ctx.settings.acquisitionArsPerUsd),variable_cost:ctx.pricing.config.fixedUnitArs,payment_fee_percent:ctx.pricing.config.paymentFeePercent,minimum_contribution:0,expenses_confirmed:false,verified_at:o.cost_checked_at,source_document:`Estimación privada. Política ${ctx.policy.id}; regla ${ctx.pricing.id}; requiere ratificar gastos.`,supplier_url:o.source_url},warnings:[...new Set(warnings)]};
 }catch(e){return{price:null,margin:null,cost:undefined,warnings:[...warnings,e instanceof Error?e.message:'No se pudo estimar el costo.']};}
}
export async function readCatalogImportWorkspace(db:SupabaseClient,raw:CatalogImportFilters={}):Promise<CatalogImportWorkspace>{
 const f=validateCatalogFilters(raw),ctx=await pricingContext(db),page=f.page!,pageSize=f.pageSize!;
 const [offers,jobs]=await Promise.all([offersQuery(db,f).range((page-1)*pageSize,page*pageSize-1),db.from('catalog_import_jobs').select('*').order('created_at',{ascending:false}).limit(20)]);
 if(offers.error)throw new Error('No se pudieron leer las ofertas.');
 const installed=!jobs.error;
 if(jobs.error&&!['42P01','PGRST205'].includes(jobs.error.code))throw new Error('No se pudieron leer los trabajos de importación.');
 const items:CatalogCandidate[]=(offers.data??[]).map((o:SupplierOffer)=>{
  const sup=ctx.suppliers.find(s=>s.id===o.supplier_id),e=sup?offerEvidence(o,sup):null,q=estimate(o,ctx,'');
  return{id:o.id,title:o.title,brand:o.brand,supplierName:sup?.name??'Proveedor inactivo',originCost:o.origin_cost===null?null:Number(o.origin_cost),currency:o.currency,availability:e?.availabilityFresh&&!o.last_error?o.availability:'unknown',checkedAt:o.availability_checked_at,linkedProductId:o.product_id,verification:o.verification,price:q.price,margin:q.margin,warnings:q.warnings};
 });
 const jobRows:CatalogImportJob[]=[];
 const ids=(jobs.data??[]).map(j=>j.id);
 const summary=ids.length?await db.rpc('catalog_import_job_counts_v1',{job_inputs:ids}):{data:[],error:null};
 if(summary.error)throw new Error('No se pudieron leer los totales de los trabajos.');
 for(const j of jobs.data??[]){const counts:Record<string,number>={};for(const r of summary.data??[])if(r.job_id===j.id)counts[r.state]=Number(r.total);jobRows.push({...j,counts});}
 return{installed,candidates:items,total:offers.count??0,page,pageSize,suppliers:ctx.suppliers.map(s=>({id:s.id,name:s.name})),categories:ctx.categories.map(c=>({id:c.id,name:c.name})),jobs:jobRows,pricing:ctx.pricing?.config??null};
}
export async function readCatalogJob(db:SupabaseClient,id:string){
 catalogId(id);const j=await db.from('catalog_import_jobs').select('*').eq('id',id).single();if(j.error)throw new Error('No se encontró el trabajo.');
 const r=await db.from('catalog_import_items').select('*').eq('job_id',id).order('position').range(0,99);
 if(r.error)throw new Error('No se pudieron leer los resultados del lote.');
 const rows=((r.data??[]) as CatalogImportItem[]).map(row=>({...row,error:row.error?catalogMessage(row.error):null}));
 const summary=await db.rpc('catalog_import_job_counts_v1',{job_inputs:[id]});
 if(summary.error)throw new Error('No se pudo leer el avance del lote.');
 const counts:Record<string,number>={};for(const row of summary.data??[])counts[row.state]=Number(row.total);
 return{job:{...j.data,counts} as CatalogImportJob,items:rows};
}
export async function previewCatalogImport(db:SupabaseClient,s:CatalogPreviewSelection):Promise<CatalogPreviewResult>{
 const f=validateCatalogFilters(s.filters);catalogId(s.categoryId);
 if(!Number.isInteger(s.limit)||s.limit<1||s.limit>5000||typeof s.allMatching!=='boolean')throw new Error('Elegí un límite de 1 a 5.000 ofertas.');
 const ctx=await pricingContext(db);
 if(!ctx.categories.some(c=>c.id===s.categoryId))throw new Error('La categoría elegida ya no existe.');
 const selected:SupplierOffer[]=[];
 if(s.allMatching){
  for(let from=0;from<s.limit;from+=500){const r=await offersQuery(db,f).range(from,Math.min(s.limit,from+500)-1);if(r.error)throw new Error('No se pudo completar la selección.');selected.push(...(r.data??[]));if((r.data?.length??0)<500)break;}
 }else{
  if(!Array.isArray(s.offerIds)||!s.offerIds.length||s.offerIds.length>s.limit)throw new Error('Seleccioná ofertas dentro del límite del lote.');
  const ids=[...new Set(s.offerIds.map(catalogId))];
  for(let i=0;i<ids.length;i+=200){const r=await db.from('supplier_offers').select('*').in('id',ids.slice(i,i+200)).order('id');if(r.error)throw new Error('No se pudieron verificar las ofertas seleccionadas.');selected.push(...(r.data??[]));}
  if(selected.length!==ids.length)throw new Error('La selección cambió; actualizá la lista.');
 }
 if(!selected.length)throw new Error('No hay ofertas para importar con estos filtros.');
 const [products,variants]=await Promise.all([
  readAllPages<Record<string,unknown>>((from,to)=>readAdminProducts(db,{from,size:to-from+1})).then(rows=>rows as unknown as MatchProduct[]),
  readAllPages<MatchVariant>((from,to)=>db.from('product_variants').select('id,product_id,title,sku,options').order('id').range(from,to))
 ]);
 const targets=matchTargets(products,variants),catalog={products,variants,targets,offers:selected,suppliers:ctx.suppliers} as CrosslinkCatalog;
 const planned=planCatalogImport(selected,targets,s.categoryId,o=>estimate(o,ctx,s.categoryId));
 for(const row of planned){
  const o=selected.find(o=>o.id===row.offer_id)!;
  const supplier=ctx.suppliers.find(s=>s.id===o.supplier_id);
  if(!supplier){row.payload.action='review';row.payload.reason='Proveedor inactivo.';}
  else if(row.payload.action==='new'){
   try{
    const source=new URL(supplierSourceUrl(o.source_url,supplier));
    if(!o.external_id||o.variant_key.startsWith('listing:')||['/','/home','/index.php'].includes(source.pathname.replace(/\/$/,'')||'/')&&!(source.searchParams.get('route')==='product/product'&&source.searchParams.has('product_id')))throw new Error('Ficha general');
   }catch{row.payload.action='review';row.payload.reason='Falta la ficha HTTPS exacta del producto en el sitio del proveedor.';}
  }
  if(row.payload.action==='link'&&row.payload.target){
   const p=products.find(p=>p.id===row.payload.target!.productId) as MatchProduct&{deleted_at?:string|null};
   if(p?.deleted_at){row.payload.action='review';row.payload.reason='El producto equivalente está archivado; revisá su recuperación.';}
   else {row.payload.link=linkPayload(o,row.payload.target,catalog,'admin_review','Identidad exacta revisada en vista previa administrativa',true);Object.assign(row.payload.target,{productSnapshot:row.payload.link.productSnapshot,variantSnapshot:row.payload.link.variantSnapshot});}
  }
 }
 const saved=await db.rpc('create_catalog_import_job_v1',{request_input:randomUUID(),config_input:{category_id:s.categoryId,filters:f,limit:s.limit,automatic_publication:false,minimum_margin_percent:ctx.pricing?.config.minimumMarginPercent??null,pricing_rule_id:ctx.pricing?.id??null,import_policy_id:ctx.policy?.id??null,tracking_config:ctx.settings??null},rows_input:planned});
 if(saved.error)throw new Error(`No se guardó la vista previa: ${catalogMessage(saved.error.message)}`);
 const jobId=String(saved.data),result=await readCatalogJob(db,jobId),counts:Record<string,number>={};for(const r of planned)counts[r.payload.action]=(counts[r.payload.action]??0)+1;
 return{jobId,total:planned.length,counts,items:result.items};
}
