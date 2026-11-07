import {load,type CheerioAPI} from 'cheerio/slim';
import {parsePublicAmount,primaryJsonLd,type PublicProduct} from '../../supplier-public-data';
import {inspectSupplierProduct,pageCurrency} from '../../supplier-offer-adapters';
import type {IntelligenceSupplier} from '../../supplier-intelligence';
import{FOUR_SUPPLIERS,sourceUrl,type SupplierKey}from'../../supplier-url-policy';
export{FOUR_SUPPLIERS,sourceUrl,type SupplierKey}from'../../supplier-url-policy';
export interface FoundProduct {externalId:string;url:string;title:string;brand:string;sku:string;model:string;imageUrl:string|null;description:string;rawPrice:string;cost:number|null;currency:PublicProduct['currency'];availability:PublicProduct['availability'];quantity:number|null;variantKey:string;gtin:string|null;nativeUrl?:string|null;warnings:string[];images?:string[];specifications?:Record<string,string>;regularPrice?:number|null;salePrice?:number|null;taxBasis?:'excluded'|'included'|'unknown'}
export interface CatalogCategory {url:string;title:string}
export interface ListingResult {products:FoundProduct[];pages:string[];categories:CatalogCategory[];pageIdentity:string;expectedTotal?:number}
export interface SupplierAdapter {key:SupplierKey;category(url:string):boolean;product(url:string):boolean;listing(html:string,url:string,root:string):ListingResult;detail(html:string,url:string):FoundProduct|null}
export const dom=(html:string)=>load(html);
export const clean=(value:string)=>value.replace(/\s+/g,' ').trim();
export function categoryIdentity(raw:string,key:SupplierKey):string {
 const u=new URL(sourceUrl(raw,raw,key));for(const k of ['p','page','pagina','start','offset'])u.searchParams.delete(k);u.searchParams.sort();return u.href;
}
export function pagination($:CheerioAPI,selector:string,url:string,root:string,key:SupplierKey):string[]{
 const identity=categoryIdentity(root,key),result=new Set<string>();
 $(selector).each((_,e)=>{const raw=$(e).attr('href');if(!raw)return;try{const target=sourceUrl(raw,url,key);if(categoryIdentity(target,key)===identity&&target!==sourceUrl(url,url,key))result.add(target);}catch{}});return [...result];
}
export function categories($:CheerioAPI,selector:string,url:string,key:SupplierKey,accept:(url:string)=>boolean){
 const found=new Map<string,CatalogCategory>();$(selector).each((_,e)=>{try{const u=sourceUrl($(e).attr('href')??'',url,key),title=clean($(e).text()).slice(0,200);if(accept(u)&&(!found.has(u)||(!found.get(u)?.title&&title)))found.set(u,{url:u,title});}catch{}});return [...found.values()];
}
export function originalPrice(raw:string,explicit?:string):{cost:number|null;currency:PublicProduct['currency']} {
 const currency:PublicProduct['currency']=/\bUSD\b|US\$|U\$S?/.test(raw)?'USD':/\bARS\b/.test(raw)?'ARS':/\bPYG\b|\bGs\.?\b|₲/.test(raw)?'PYG':['USD','ARS','PYG'].includes(explicit??'')?explicit as PublicProduct['currency']:null;
 const amount=currency==='USD'?(raw.match(/(?:\bUSD\b|US\$|U\$S?)\s*([\d.,]+)/)?.[1]??raw.match(/([\d.,]+)\s*USD\b/)?.[1]):currency==='ARS'?raw.match(/\bARS\s*\$?\s*([\d.,]+)/)?.[1]:currency==='PYG'?raw.match(/(?:\bPYG|\bGs\.?|₲)\s*([\d.,]+)/)?.[1]:null;
 return {cost:currency?parsePublicAmount(amount??raw):null,currency};
}
export function safeImage(raw:string|undefined,base:string):string|null {
 try{
  const u=new URL(raw??'',base),host=u.hostname.replace(/^www\./,''),source=new URL(base).hostname.replace(/^www\./,'');
  if(!raw||u.protocol!=='https:'||u.username||u.password||u.port||!Object.values(FOUR_SUPPLIERS).some(s=>s.host===source))return null;
  return host===source||(source==='atacadoconnect.com'&&host==='cdn.atacadoconnect.com')?u.href:null;
 }catch{return null;}
}
export function item(input:Partial<FoundProduct>&Pick<FoundProduct,'externalId'|'url'|'title'>):FoundProduct {
 return {brand:'',sku:'',model:'',imageUrl:null,description:'',rawPrice:'',cost:null,currency:null,availability:'unknown',quantity:null,variantKey:'source',gtin:null,warnings:[],...input};
}
export function structuredDetail(html:string,url:string,key:SupplierKey):FoundProduct|null {
 const supplier={official_key:key}as IntelligenceSupplier,p=inspectSupplierProduct(html,url,supplier);
 if(!p)return null;
 const $=dom(html),raw=$('#product-details').attr('data-product'),structured=primaryJsonLd(html,url,p.external_id);
 let native:Record<string,unknown>={};
 if(raw)try{native=JSON.parse(raw);}catch{}
 const str=(value:unknown)=>typeof value==='string'?value:'';
 const reference=str(native.reference)||str(structured?.sku);
 const imageNodes=$('.product-cover img, .product-images img, [itemprop="image"], .product-gallery img');
 const imageCandidates=[
  ...(Array.isArray(structured?.image)?structured.image:[structured?.image]),
  ...imageNodes.toArray().map(node=>$(node).attr('data-image-large-src')??$(node).attr('content')??$(node).attr('src')),
 ];
 const images=[...new Set(imageCandidates.map(value=>safeImage(str(value),url)).filter((value):value is string=>!!value))];
 const description=clean(str(native.description)&&dom(str(native.description)).text()
  ||str(native.description_short)&&dom(str(native.description_short)).text()
  ||str(structured?.description)&&dom(str(structured?.description)).text()
  ||$('.product-description, [itemprop="description"], #product-tab-description').first().text()).slice(0,15000);
 const specifications:Record<string,string>=Object.create(null);
 for(const feature of Array.isArray(native.features)?native.features:[]){
  const name=str(feature?.name),value=str(feature?.value);
  if(name&&value)specifications[name]=value;
 }
 for(const attribute of native.attributes&&typeof native.attributes==='object'?Object.values(native.attributes):[]){
  const name=str(attribute?.group_name),value=str(attribute?.name);
  if(name&&value)specifications[name]=value;
 }
 $('.product-features .data-sheet dt').each((_,el)=>{
  const name=clean($(el).text()),value=clean($(el).next('dd').text());
  if(name&&value)specifications[name]=value;
 });
 for(const property of Array.isArray(structured?.additionalProperty)?structured.additionalProperty:[]){
  const name=str(property?.name),value=str(property?.value);
  if(name&&value)specifications[name]=value;
 }
 const regularPrice=native.has_discount===true?parsePublicAmount(String(native.regular_price_amount??'')):null;
 const quantity=typeof native.quantity==='number'&&Number.isInteger(native.quantity)&&native.quantity>=0?native.quantity:null;
 const model=raw ? str(native.mpn)||str(native.model) : p.model;
 return item({externalId:p.external_id,url,title:p.title,brand:p.brand,model,sku:reference,gtin:p.gtin??(str(native.ean13)||null),
  variantKey:p.variant_key,cost:p.origin_cost,currency:p.currency,availability:p.availability,quantity,imageUrl:images[0]??null,images,
  description,specifications,regularPrice,salePrice:regularPrice!==null?p.origin_cost:null,
  rawPrice:clean($('.current-price, .product-price, [itemprop="price"]').first().text()),
  warnings:p.origin_cost===null?['Moneda o costo sin confirmar en la ficha.']:[]});
}
export const currencyOf=pageCurrency;
