import type { IntelligenceSupplier, OfferObservation } from "./supplier-intelligence";

export interface PublicProduct { external_id: string; variant_key: string; title: string; brand: string; model: string; source_url: string; origin_cost: number | null; currency: "USD" | "ARS" | "PYG" | null; availability: "in_stock" | "out_of_stock" | "unknown"; gtin?: string | null }
export function parsePublicAmount(raw: string): number | null {
  let value=raw.replace(/[^\d.,-]/g,"");
  if (!value || value.includes("-")) return null;
  const dot=value.lastIndexOf("."),comma=value.lastIndexOf(",");
  if(dot>=0&&comma>=0) value=dot>comma?value.replace(/,/g,""):value.replace(/\./g,"").replace(",",".");
  else if(comma>=0) value=/,\d{1,2}$/.test(value)?value.replace(/\./g,"").replace(",","."):value.replace(/,/g,"");
  else if((value.match(/\./g)??[]).length>1) value=value.replace(/\./g,"");
  const n=Number(value);return Number.isFinite(n)&&n>0&&n<1e10?n:null;
}
export function jsonLdProducts(html: string): Record<string, unknown>[] {
  const products:Record<string,unknown>[]=[];
  function collect(v:unknown){if(Array.isArray(v)){v.forEach(collect);return;}if(!v||typeof v!=="object")return;const o=v as Record<string,unknown>;
    if(o['@type']==='Product'||(Array.isArray(o['@type'])&&o['@type'].includes('Product')))products.push(o);
    if(o['@graph'])collect(o['@graph']);if(o.mainEntity)collect(o.mainEntity);if(o.itemListElement)collect(o.itemListElement);if(o.item)collect(o.item);
  }
  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{collect(JSON.parse(m[1]));}catch{}}
  return products;
}
export function primaryJsonLd(html:string,url:string,externalId?:string){
  const all=jsonLdProducts(html),clean=(s:string)=>s.replace(/\/$/,"").split(/[?#]/)[0];
  return all.find(p=>typeof p.url==='string'&&clean(p.url)===clean(url))??(externalId?all.find(p=>String(p.productID??p.sku??'')===externalId):undefined)??(all.length===1?all[0]:undefined);
}
export function publicProductFromJsonLd(html:string,url:string,id?:string):PublicProduct|null{
  const p=primaryJsonLd(html,url,id);if(!p||typeof p.name!=='string')return null;
  const offers=Array.isArray(p.offers)?p.offers:p.offers?[p.offers]:[];
  const amounts=offers.filter(o=>o&&typeof o==='object')as Record<string,unknown>[];
  const o=amounts.find(o=>o.priceCurrency==='USD')??amounts.find(o=>['ARS','PYG'].includes(String(o.priceCurrency)))??amounts[0];
  const currency=o&&['USD','ARS','PYG'].includes(String(o.priceCurrency))?String(o.priceCurrency)as PublicProduct['currency']:null;
  const price=currency?parsePublicAmount(String(o?.price??'')):null;
  const a=String(o?.availability??'').toLowerCase().replace(/[\s_-]/g,'');
  const availability=a.endsWith('/instock')||a==='instock'?'in_stock':a.endsWith('/outofstock')||a.endsWith('/soldout')?'out_of_stock':'unknown';
  const brand=p.brand&&typeof p.brand==='object'?String((p.brand as Record<string,unknown>).name??''):String(p.brand??'');
  return {external_id:String(p.productID??p.sku??id??''),variant_key:'base',title:p.name.trim(),brand,model:String(p.mpn??p.model??''),source_url:url,origin_cost:price,currency:price?currency:null,availability,gtin:String(p.gtin13??p.gtin??'')||null};
}
export function totalVisibleOffer(html:string):{price:number|null;availability:PublicProduct['availability']}|null{
 const heading=html.search(/<h1\b/i);if(heading<0)return null;
 const rest=html.slice(heading),match=/<div\b[^>]*class=["'][^"']*\bproduct-price\b[^"']*["'][^>]*>/i.exec(rest);if(!match)return null;
 const start=match.index;let depth=0,end=-1;
 for(const tag of rest.slice(start).matchAll(/<\/?div\b[^>]*>/gi)){if(tag[0].startsWith('</'))depth--;else depth++;if(depth===0){end=start+tag.index!+tag[0].length;break;}}
 if(end<0)return null;const block=rest.slice(start,end),text=block.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ');
 const availability=/schema\.org\/InStock/i.test(block)?'in_stock':/schema\.org\/OutOfStock/i.test(block)?'out_of_stock':'unknown';
 return {price:parsePublicAmount(text.match(/\bUSD\s*([\d.,]+)/i)?.[1]??''),availability};
}
export function titleIdentity(value:string){return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');}
/** New suppliers never get a fuzzy automatic catalogue link. Exact normalized identity must be unique. */
export function exactCatalogueMatch(candidate:PublicProduct,products:Array<{id:string;title:string;hasVariants?:boolean}>){
  const matches=products.filter(p=>!p.hasVariants&&titleIdentity(p.title)===titleIdentity(candidate.title));return matches.length===1?matches[0].id:null;
}
export function observationFromPublic(p:PublicProduct,supplier:IntelligenceSupplier,productId:string|null=null):OfferObservation{
  const sealedRequired=supplier.official_key==='atacado-connect'&&/\biphone\b/i.test(p.title)&&!/\b(nuevo sellado|new sealed|novo lacrado|new_sealed)\b/i.test(p.title+' '+p.variant_key);
  return {...p,gtin:p.gtin??null,supplier_id:supplier.id,product_id:productId,variant_id:null,verification:productId&&!sealedRequired?'verified':'pending',method:'product_page',observed_at:new Date().toISOString()};
}
