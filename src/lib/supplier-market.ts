import type{SupabaseClient}from'@supabase/supabase-js';
import{readSupplierHtml}from'./supplier-url';
import{primaryJsonLd,publicProductFromJsonLd,titleIdentity}from'./supplier-public-data';
export function marketUrl(raw:string){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port||!(u.hostname==='mercadolibre.com.ar'||u.hostname.endsWith('.mercadolibre.com.ar')))throw new Error('Usá la ficha argentina exacta de Mercado Libre por HTTPS.');return u.href;}
export function manualMarketUrl(raw:string){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port||!/^[-a-z0-9.]+\.[a-z]{2,}$/i.test(u.hostname)||/\.(local|internal|localhost|test|example)$/i.test(u.hostname))throw new Error('Usá una ficha pública HTTPS de una tienda argentina verificable.');return u.href;}
export function compatibleMarketIdentity(own:{title:string;brand?:string;model?:string},other:string){
 // Only presentation-equivalent names can renew an exact reference automatically.
 // Additional capacity, color, pack or accessory tokens require an administrator.
 const identity=(s:string)=>titleIdentity(s).replace(/\s+(?=ml\b|gb\b|tb\b|mm\b|kg\b)/g,'').split(' ').filter(t=>!['nuevo','nueva','sellado','sellada','original','oficial'].includes(t)).sort().join('|');
 return identity(own.title)===identity(other);
}
export async function refreshMarketReferences(db:SupabaseClient,limit=8){
 const result=await db.from('supplier_market_references').select('*').eq('refresh_mode','automatic').order('last_attempt_at',{ascending:true,nullsFirst:true}).limit(limit);if(result.error)throw new Error('No se pudo leer los comparables.');
 let checked=0,success=0;
 for(const r of result.data??[]){const stamp=new Date().toISOString();try{
   let url=marketUrl(r.source_url),response:Response|undefined;
   for(let i=0;i<4;i++){response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'User-Agent':'MYA-MarketReview/1.0'}});if(![301,302,303,307,308].includes(response.status))break;const target=response.headers.get('location');await response.body?.cancel();if(!target)throw new Error('Redirección de referencia inválida');url=marketUrl(new URL(target,url).href);}
   if(!response?.ok)throw new Error(`Referencia respondió HTTP ${response?.status??'sin respuesta'}; se conserva el dato histórico.`);
   if(/\/login|\/auth|\/jms\//.test(new URL(url).pathname))throw new Error('El comparable requiere acceso; no se evita la restricción.');
   const html=await readSupplierHtml(response),found=publicProductFromJsonLd(html,url),primary=primaryJsonLd(html,url);
   const offer=primary?.offers&&!Array.isArray(primary.offers)?primary.offers as Record<string,unknown>:null;
   if(!/\/NewCondition$/.test(String(offer?.itemCondition??primary?.itemCondition??'')))throw new Error('El comparable no acredita condición nueva; requiere revisión.');
   if(!found||found.currency!=='ARS'||!found.origin_cost||found.availability!=='in_stock')throw new Error('Comparable sin precio final ARS y disponibilidad explícita.');
   const product=await db.from('products').select('title,brand,model').eq('id',r.product_id).single();if(product.error||!compatibleMarketIdentity(product.data,found.title))throw new Error('La identidad o presentación del comparable requiere revisión.');
   const saved=await db.from('supplier_market_references').update({price_ars:found.origin_cost,title:found.title,checked_at:stamp,last_attempt_at:stamp,last_error:null}).eq('id',r.id);if(saved.error)throw new Error('No se pudo guardar la referencia.');success++;
  }catch(e){await db.from('supplier_market_references').update({last_attempt_at:stamp,last_error:e instanceof Error?e.message:'Error de consulta'}).eq('id',r.id);}checked++;
 }
 return {checked,success,errors:checked-success};
}
