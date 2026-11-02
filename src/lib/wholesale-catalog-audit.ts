import { identityTokens } from './supplier-matching';

type Row = Record<string, unknown>;
export interface WholesaleAuditFinding { code:string; label:string }
export interface WholesaleAuditItem {
  id:string; title:string; slug:string; sku:string; active:boolean; state:'ready'|'review'|'archived';
  findings:WholesaleAuditFinding[]; duplicateCandidates:string[]; verifiedSupplierCount:number;
}
export interface WholesaleCatalogAudit {
  observedAt:string; assessed:number; active:number; ready:number; pending:number; archived:number;
  duplicateGroups:number; duplicateCandidates:number; findings:Record<string,number>; items:WholesaleAuditItem[];
}
const str=(v:unknown)=>typeof v==='string'?v.trim():'';
const amount=(v:unknown)=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const https=(v:unknown)=>{try{const u=new URL(str(v));return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const plain=(v:unknown)=>str(v).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const fresh=(v:unknown,hours:number,now:number)=>{const t=Date.parse(str(v));return Number.isFinite(t)&&t<=now+300000&&now-t<=hours*3600000;};

/** Read-only assessment. Suspected duplicates never imply permission to merge or delete. */
export function auditWholesaleCatalog(data:{products:Row[];variants:Row[];costs:Row[];offers:Row[];suppliers:Row[];categories:Row[];controls?:Row[];variantCosts?:Row[]},now=Date.now()):WholesaleCatalogAudit {
  const suppliers=new Map(data.suppliers.map(s=>[s.id,s])),costs=new Map(data.costs.map(c=>[c.product_id,c]));
  const categories=new Map(data.categories.map(c=>[c.id,c]));
  const duplicates=new Map<string,string[]>();
  for(const p of data.products){
    if(p.deleted_at)continue;
    const brand=str(p.brand).toLowerCase(),sku=str(p.sku).toLowerCase();
    const key=sku?`sku:${brand}:${sku}`:`identity:${brand}:${identityTokens(str(p.title)).join('|')}`;
    if(!sku&&(!brand||identityTokens(str(p.title)).length<3))continue;
    duplicates.set(key,[...(duplicates.get(key)??[]),str(p.id)]);
  }
  const duplicateGroups=[...duplicates.values()].filter(ids=>ids.length>1);
  const duplicateMap=new Map(duplicateGroups.flatMap(ids=>ids.map(id=>[id,ids.filter(other=>other!==id)] as const)));
  const rootSlug=(id:unknown)=>{let c=categories.get(id);const seen=new Set<unknown>();while(c?.parent_id&&!seen.has(c.id)){seen.add(c.id);c=categories.get(c.parent_id)??c;}return str(c?.slug);};
  const items=data.products.map((p):WholesaleAuditItem=>{
    const findings:WholesaleAuditFinding[]=[];const add=(code:string,label:string)=>{if(!findings.some(f=>f.code===code))findings.push({code,label});};
    const id=str(p.id),title=str(p.title),variants=data.variants.filter(v=>v.product_id===id&&v.is_active!==false);
    const offers=data.offers.filter(o=>o.product_id===id),cost=costs.get(id);
    const verified=offers.filter(o=>{const s=suppliers.get(o.supplier_id);return s?.is_active&&o.verification==='verified'&&!o.last_error&&fresh(o.availability_checked_at,Math.min(24,Number(s.freshness_hours)||24),now);});
    if(!title||title.length<8||/\.\.\.|…/.test(title))add('title','Título incompleto o truncado');
    if(!str(p.brand))add('brand','Marca sin confirmar');
    if(!str(p.sku)&&!str(p.model)&&!verified.some(o=>str(o.external_id)))add('identity','Falta código, modelo o identificador de fuente comprobado');
    if(!categories.has(p.category_id))add('category','Categoría inexistente');
    const root=rootSlug(p.category_id);
    if(/apple|samsung|xiaomi|jbl/i.test(str(p.brand))&&/cosmet|perfum|capilar/i.test(root))add('category','Marca tecnológica dentro de un rubro ajeno');
    if(/medicube|skin1004|anua|celimax|althea|cosrx|biodance|torriden|round lab/i.test(str(p.brand))&&/electr|herramient/i.test(root))add('category','Cosmética dentro de un rubro ajeno');
    const images=[p.image_url,...(Array.isArray(p.image_urls)?p.image_urls:[])].filter(Boolean);
    if(!images.some(https))add('image','Falta imagen HTTPS');
    if(images.some(i=>!https(i)))add('image_url','Hay imágenes con URL inválida');
    if(plain(p.description).length<80)add('description','Descripción insuficiente');
    if(/garant[ií]a oficial de 30 d[ií]as|paq\.?ar en vivo|cura(?:r)? (?:el|la)|env[ií]o asegurado/i.test(plain(p.description)))add('claims','Revisar promesas o propiedades documentales');
    if(!https(p.source_url)&&!offers.some(o=>https(o.source_url)))add('source','Falta ficha de proveedor');
    if(!verified.length)add('supplier','No hay identidad y disponibilidad de proveedor vigentes');
    if(offers.some(o=>str(o.last_error)))add('source_error','Hay incidencias registradas en fuentes');
    if(variants.length){
      for(const v of variants)if(!verified.some(o=>o.variant_id===v.id))add('variant_source','Faltan fuentes vigentes de alguna variante exacta');
      if(variants.some(v=>!(data.variantCosts??[]).some(c=>c.variant_id===v.id&&c.expenses_confirmed===true&&fresh(c.verified_at,24,now))))add('variant_cost','Faltan costos confirmados de alguna variante exacta');
    }
    if(!cost||!(Number(cost.origin_cost)>0)||!(Number(cost.exchange_rate)>0)||amount(cost.landed_cost)===null)add('cost','Costo de adquisición incompleto');
    if(cost?.expenses_confirmed!==true)add('expenses','Gastos completos sin ratificación');
    if(!fresh(cost?.verified_at,24,now)||!str(cost?.source_document))add('cost_evidence','Costo vencido o sin documento');
    if(!(Number(p.retail_price)>0))add('retail_price','Precio minorista inválido');
    const wholesale=amount(p.wholesale_price);
    if(wholesale===null||wholesale<=0)add('wholesale_price','Precio mayorista pendiente');
    if(wholesale!==null&&wholesale>0&&Number(p.retail_price)>0&&wholesale>=Number(p.retail_price))add('competitiveness','Mayorista igual o superior al minorista');
    if(cost?.expenses_confirmed===true&&wholesale!==null&&wholesale>0){
      const fee=amount(cost.payment_fee_percent),landed=amount(cost.landed_cost),variable=amount(cost.variable_cost);
      if(fee===null||fee<0||fee>=100||landed===null||variable===null)add('margin','No se puede verificar contribución');
      else if(wholesale*(1-fee/100)-landed-variable<=0)add('margin','Contribución no positiva con el precio registrado');
    }
    if(p.fulfillment_mode==='own_stock'&&Number(p.stock)>0&&!p.stock_verified_at)add('physical_stock','Unidades propias sin comprobación');
    const duplicateCandidates=duplicateMap.get(id)??[];
    if(duplicateCandidates.length)add('duplicate','Posible duplicado: verificar identidad completa antes de fusionar');
    // Rights and commercial eligibility require evidence, never inference from a provider listing.
    const identities=variants.length?variants.map(v=>v.id):[null];
    if(identities.some(variantId=>!(data.controls??[]).some(c=>c.product_id===id&&(c.variant_id??null)===variantId&&c.identity_confirmed===true&&c.eligibility_confirmed===true&&c.media_authorized===true&&c.compliance_confirmed===true&&str(c.evidence).length>=20)))add('eligibility','Ratificar documentación comercial y autorización de imágenes');
    return{id,title,slug:str(p.slug),sku:str(p.sku),active:p.is_active===true,state:p.deleted_at?'archived':findings.length?'review':'ready',findings,duplicateCandidates,verifiedSupplierCount:new Set(verified.map(o=>o.supplier_id)).size};
  });
  const findings:Record<string,number>={};for(const item of items.filter(i=>i.state!=='archived'))for(const f of item.findings)findings[f.code]=(findings[f.code]??0)+1;
  return{observedAt:new Date(now).toISOString(),assessed:items.length,active:items.filter(i=>i.active&&i.state!=='archived').length,ready:items.filter(i=>i.state==='ready').length,pending:items.filter(i=>i.state==='review').length,archived:items.filter(i=>i.state==='archived').length,duplicateGroups:duplicateGroups.length,duplicateCandidates:duplicateMap.size,findings,items};
}
