import {load,type CheerioAPI} from 'cheerio/slim';
import {parsePublicAmount,type PublicProduct} from '../../supplier-public-data';
import {inspectSupplierProduct,pageCurrency} from '../../supplier-offer-adapters';
import type {IntelligenceSupplier} from '../../supplier-intelligence';
import{FOUR_SUPPLIERS,sourceUrl,type SupplierKey}from'../../supplier-url-policy';
export{FOUR_SUPPLIERS,sourceUrl,type SupplierKey}from'../../supplier-url-policy';
export interface FoundProduct {externalId:string;url:string;title:string;brand:string;sku:string;model:string;imageUrl:string|null;description:string;rawPrice:string;cost:number|null;currency:PublicProduct['currency'];availability:PublicProduct['availability'];quantity:number|null;variantKey:string;gtin:string|null;nativeUrl?:string|null;warnings:string[]}
export interface ListingResult {products:FoundProduct[];pages:string[];categories:Array<{url:string;title:string}>;pageIdentity:string}
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
 const found=new Map<string,{url:string;title:string}>();$(selector).each((_,e)=>{try{const u=sourceUrl($(e).attr('href')??'',url,key);if(accept(u))found.set(u,{url:u,title:clean($(e).text()).slice(0,200)});}catch{}});return [...found.values()];
}
export function originalPrice(raw:string,explicit?:string):{cost:number|null;currency:PublicProduct['currency']} {
 const currency:PublicProduct['currency']=/\bUSD\b|US\$|U\$S?/.test(raw)?'USD':/\bARS\b/.test(raw)?'ARS':/\bPYG\b|\bGs\.?\b|₲/.test(raw)?'PYG':['USD','ARS','PYG'].includes(explicit??'')?explicit as PublicProduct['currency']:null;
 const amount=currency==='USD'?(raw.match(/(?:\bUSD\b|US\$|U\$S?)\s*([\d.,]+)/)?.[1]??raw.match(/([\d.,]+)\s*USD\b/)?.[1]):currency==='ARS'?raw.match(/\bARS\s*\$?\s*([\d.,]+)/)?.[1]:currency==='PYG'?raw.match(/(?:\bPYG|\bGs\.?|₲)\s*([\d.,]+)/)?.[1]:null;
 return {cost:currency?parsePublicAmount(amount??raw):null,currency};
}
export function safeImage(raw:string|undefined,base:string):string|null {
 try{const u=new URL(raw??'',base),host=u.hostname.replace(/^www\./,'');if(!raw||u.protocol!=='https:'||u.username||u.password||u.port||!([...Object.values(FOUR_SUPPLIERS).map(s=>s.host),'cdn.atacadoconnect.com'].includes(host)))return null;return u.href;}catch{return null;}
}
export function item(input:Partial<FoundProduct>&Pick<FoundProduct,'externalId'|'url'|'title'>):FoundProduct {
 return {brand:'',sku:'',model:'',imageUrl:null,description:'',rawPrice:'',cost:null,currency:null,availability:'unknown',quantity:null,variantKey:'source',gtin:null,warnings:[],...input};
}
export function structuredDetail(html:string,url:string,key:SupplierKey):FoundProduct|null {
 const supplier={official_key:key}as IntelligenceSupplier,p=inspectSupplierProduct(html,url,supplier);
 if(!p)return null;const $=dom(html),id=$('#product-details').attr('data-product');let quantity:number|null=null;
 if(id)try{const v=JSON.parse(id);if(Number.isInteger(v.quantity)&&v.quantity>=0)quantity=v.quantity;}catch{}
 return item({externalId:p.external_id,url,title:p.title,brand:p.brand,model:p.model,sku:p.model,gtin:p.gtin??null,variantKey:p.variant_key,cost:p.origin_cost,currency:p.currency,availability:p.availability,quantity,imageUrl:safeImage($('.product-cover img, [itemprop="image"], .product-gallery img').first().attr('src'),url),description:clean($('.product-description, [itemprop="description"]').first().text()).slice(0,15000),warnings:p.origin_cost===null?['Moneda o costo sin confirmar en la ficha.']:[]});
}
export const currencyOf=pageCurrency;
