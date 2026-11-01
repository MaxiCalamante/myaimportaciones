import { randomUUID } from 'node:crypto';
import { identityTokens, matchSupplierProduct, type MatchTarget } from './supplier-matching';
import type { SupplierOffer } from './supplier-intelligence';
import type { CatalogImportFilters } from './catalog-import-types';
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export function validateCatalogFilters(raw:CatalogImportFilters):CatalogImportFilters {
 if(!raw||typeof raw!=='object')throw new Error('Filtros inválidos.');
 const f:CatalogImportFilters={};
 for(const key of ['query','brand'] as const)if(raw[key]!==undefined){if(typeof raw[key]!=='string'||raw[key]!.length>120)throw new Error('Revisá la búsqueda.');if(raw[key]!.trim())f[key]=raw[key]!.trim();}
 if(raw.supplierId){if(!uuid.test(raw.supplierId))throw new Error('Proveedor inválido.');f.supplierId=raw.supplierId;}
 if(raw.availability){if(!['in_stock','out_of_stock','unknown'].includes(raw.availability))throw new Error('Disponibilidad inválida.');f.availability=raw.availability;}
 for(const key of ['minCost','maxCost'] as const)if(raw[key]!==undefined){if(!Number.isFinite(raw[key])||raw[key]!<0||raw[key]!>1e10)throw new Error('Revisá los importes de origen.');f[key]=raw[key];}
 if(f.minCost!==undefined&&f.maxCost!==undefined&&f.minCost>f.maxCost)throw new Error('El mínimo supera al máximo.');
 f.page=raw.page??1;f.pageSize=raw.pageSize??30;
 if(!Number.isInteger(f.page)||f.page<1||f.page>100000||!Number.isInteger(f.pageSize)||f.pageSize<1||f.pageSize>100)throw new Error('Paginación inválida.');
 return f;
}
export interface PlannedCatalogRow {
 offer_id:string;
 payload:{action:'new'|'link'|'review'|'skip';reason:string;identity_key:string;offer:Record<string,unknown>;
 product?:{id:string;title:string;slug:string;category_id:string;retail_price:number;brand:string;model:string;description:string};
 target?:MatchTarget;link?:Record<string,unknown>;cost?:Record<string,unknown>};
}
export function catalogOfferSnapshot(o:SupplierOffer):Record<string,unknown>{
 const keys=['id','supplier_id','external_id','variant_key','title','brand','model','gtin','source_url','origin_cost','currency','availability','verification','cost_checked_at','availability_checked_at','last_error','product_id','variant_id'] as const;
 return Object.fromEntries(keys.map(k=>[k,o[k]??null]));
}
/** No fuzzy auto-merge: the existing exact variant matcher is the sole identity authority. */
export function planCatalogImport(offers:SupplierOffer[],targets:MatchTarget[],categoryId:string,quote:(o:SupplierOffer)=>{price:number|null;cost?:Record<string,unknown>}|null):PlannedCatalogRow[]{
 if(!uuid.test(categoryId)||!offers.length||offers.length>5000)throw new Error('Elegí categoría y entre 1 y 5.000 ofertas.');
 const virtual:MatchTarget[]=[],keys=new Map<string,string>();
 return offers.map(o=>{
  const sourceTitle=(o as SupplierOffer&{evidence?:{sourceTitle?:string}}).evidence?.sourceTitle??o.title;
  const source={...o,title:sourceTitle};
  const match=matchSupplierProduct(source,[...targets,...virtual]);
  let identityKey=JSON.stringify([o.brand.trim().toLowerCase(),identityTokens(sourceTitle),o.gtin??null,o.model.trim().toLowerCase()]);
  const payload:PlannedCatalogRow['payload']={action:'new',reason:'Importar como borrador; requiere revisión antes de publicar.',identity_key:identityKey,offer:catalogOfferSnapshot(o)};
  if(o.product_id){payload.action='skip';payload.reason='Oferta ya vinculada; se conserva el producto y su precio.';return{offer_id:o.id,payload};}
  if(match.status==='review'){payload.action='review';payload.reason=match.reason;return{offer_id:o.id,payload};}
  if(match.status==='exact'&&match.target){
   if(!keys.has(match.target.productId)){payload.action='link';payload.target=match.target;payload.reason=match.reason;return{offer_id:o.id,payload};}
   identityKey=keys.get(match.target.productId)!;payload.identity_key=identityKey;
  }
  const id=randomUUID(),title=o.title.trim();
  const slug=title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,180);
  if(!slug||title.length<2){payload.action='review';payload.reason='Nombre insuficiente para crear una ficha estable.';return{offer_id:o.id,payload};}
  const q=quote(o);
  payload.product={id,title,slug,category_id:categoryId,retail_price:q?.price??0,brand:o.brand,model:o.model,description:''};
  if(q?.cost)payload.cost=q.cost;
  if(!match.target){keys.set(id,identityKey);virtual.push({productId:id,variantId:null,title:sourceTitle,brand:o.brand,model:o.model,sku:'',specifications:o.gtin?{GTIN:o.gtin}:{},sourceUrl:o.source_url});}
  return{offer_id:o.id,payload};
 });
}
