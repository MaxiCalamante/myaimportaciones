import { fetchSupplierPage, readSupplierHtml, supplierUrl } from "./supplier-url";
import { parseTotalAvailability } from "./total-availability";
import type { IntelligenceSupplier, SupplierOffer } from "./supplier-intelligence";
import { supplierSourceUrl } from "./supplier-intelligence";
import { primaryJsonLd,publicProductFromJsonLd,totalVisibleOffer,type PublicProduct } from "./supplier-public-data";
import { atlanticoPublicProduct } from './atlantico-product';

type Outcome = { ok: true; values: { availability: string; origin_cost: number | null; currency: string | null } } | { ok: false; missing?: boolean; message: string };
/** Historical JSON-LD offers used attribute:0 for their sole source product. */
export function registeredProductIdentityMatches(html:string,url:string,supplier:IntelligenceSupplier,prior:SupplierOffer,product:PublicProduct):boolean {
  if (prior.external_id !== product.external_id) return false;
  if (prior.variant_key === product.variant_key) return true;
  if (!['atacado-connect','total'].includes(supplier.official_key??'') || prior.variant_key !== 'attribute:0' || product.variant_key !== 'base') return false;
  const primary = primaryJsonLd(html,url,prior.external_id);
  if (!primary || typeof primary.url !== 'string' || primary.isVariantOf ||
    (primary.hasVariant && !(Array.isArray(primary.hasVariant) && primary.hasVariant.length === 0))) return false;
  try { return new URL(primary.url,url).href === new URL(url).href; } catch { return false; }
}
/** Read only a JSON literal assigned by PrestaShop. Never evaluate third-party scripts. */
export function pageCurrency(html: string): string | undefined {
  const match = /\b(?:var|let|const)\s+prestashop\s*=\s*\{/.exec(html);
  if (!match) return;
  const start = match.index + match[0].lastIndexOf("{");
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < Math.min(html.length, start + 500000); i++) {
    const c = html[i];
    if (quoted) { if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try { const p = JSON.parse(html.slice(start, i + 1)); return typeof p.currency?.iso_code === "string" ? p.currency.iso_code : undefined; } catch { return; }
    }
  }
}
export function supplierEvidenceGap(html: string, supplier: IntelligenceSupplier): string | null {
  if (supplier.official_key !== "atacado-usa") return null;
  if (/<section\b[^>]*class=["'][^"']*\bav-product-detail\b/i.test(html) && !/\bid\s*=\s*["']product-details["']/i.test(html)) {
    return "Atacado USA: la ficha resumida no confirma cantidad, moneda ni variante; se conserva la última evidencia.";
  }
  if (html.includes("av-hero-slider") || html.includes("av-hero-layout")) {
    return "Atacado USA: el enlace lleva al catálogo general; no confirma el producto ni su disponibilidad.";
  }
  return null;
}

/** Strict identity gate. Related cards, parser failures and 404s never mean no physical MYA stock. */
export function parseRegisteredOffer(html: string, offer: SupplierOffer, supplier: IntelligenceSupplier): Outcome {
  if (supplier.official_key === 'atlantico') {
    const p = atlanticoPublicProduct(html, offer.source_url);
    if (!p || p.external_id !== offer.external_id || offer.variant_key !== 'base' || p.availability === 'unknown') return {ok:false,message:'Atlántico: la ficha no confirma identidad primaria y disponibilidad.'};
    return {ok:true,values:{availability:p.availability,origin_cost:p.origin_cost,currency:p.currency}};
  }
  if (supplier.official_key === "atacado-connect") {
    const p=publicProductFromJsonLd(html,offer.source_url,offer.external_id);
    if(!p||p.external_id!==offer.external_id||p.availability==='unknown')return {ok:false,message:'La ficha no confirma identidad o disponibilidad del producto principal.'};
    return {ok:true,values:{availability:p.availability,origin_cost:p.origin_cost,currency:p.currency}};
  }
  if (supplier.official_key === "total") {
    if (offer.variant_key !== "base") return { ok: false, message: "Total: variante no soportada por el adaptador; confirmar manualmente." };
    const result = parseTotalAvailability(html, offer.external_id);
    if (result.status === "error") return { ok: false, message: result.message };
    return { ok: true, values: { availability: result.status, origin_cost: null, currency: null } };
  }
  if (!["star-company", "atacado-usa"].includes(supplier.official_key ?? "")) return { ok: false, message: "Proveedor sin adaptador validado." };
  
  const evidenceGap = supplierEvidenceGap(html, supplier);
  if (evidenceGap) return { ok: false, message: evidenceGap };

  const tag = [...html.matchAll(/<[^>]+>/g)].map(m => m[0]).find(t => /\bid\s*=\s*["']product-details["']/i.test(t));
  const attr = tag?.match(/\bdata-product\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
  if (!attr) return { ok: false, message: "No se encontró evidencia del producto principal." };
  try {
    const decoded = attr.replace(/&quot;/g, '"').replace(/&#(?:0*39|x0*27);/gi, "'").replace(/&amp;/g, "&");
    const p = JSON.parse(decoded);
    if (String(p.id_product) !== offer.external_id || offer.variant_key !== `attribute:${p.id_product_attribute ?? 0}` || !Number.isInteger(p.quantity) || p.quantity < 0) return { ok: false, message: "Identificador o variante diferentes; revisar la ficha manualmente." };
    // Reuse only explicitly labelled currency evidence; never infer USD from an unlabelled number.
    const currency = p.price_currency_code ?? p.currency?.iso_code ?? pageCurrency(html);
    const price = Number(p.price_amount);
    const hasPrice = ["USD", "ARS", "PYG"].includes(currency) && Number.isFinite(price) && price > 0;
    return { ok: true, values: { availability: p.quantity > 0 ? "in_stock" : "out_of_stock", origin_cost: hasPrice ? price : null, currency: hasPrice ? currency : null } };
  } catch { return { ok: false, message: "Evidencia estructurada inválida; se conserva la última consulta exitosa." }; }
}
/** Discover identity only from the primary product of a curated source URL. */
export function inspectSupplierProduct(html:string,url:string,supplier:IntelligenceSupplier,sku?:string):PublicProduct|null {
  if (supplier.official_key === 'atlantico') return atlanticoPublicProduct(html, url);
  if(['star-company','atacado-usa'].includes(supplier.official_key??'')){
    const tag=[...html.matchAll(/<[^>]+>/g)].map(m=>m[0]).find(t=>/\bid\s*=\s*["']product-details["']/i.test(t));
    const attr=tag?.match(/\bdata-product\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];if(!attr)return null;
    try{const p=JSON.parse(attr.replace(/&quot;/g,'"').replace(/&#(?:0*39|x0*27);/gi,"'").replace(/&amp;/g,'&'));
      if(!p.id_product||typeof p.name!=='string'||!Number.isInteger(p.quantity)||p.quantity<0)return null;
      const currency=p.price_currency_code??p.currency?.iso_code??pageCurrency(html),price=Number(p.price_amount);
      return {external_id:String(p.id_product),variant_key:`attribute:${p.id_product_attribute??0}`,title:p.name,brand:String(p.manufacturer_name??''),model:String(p.reference??''),source_url:url,
        origin_cost:['USD','ARS','PYG'].includes(currency)&&Number.isFinite(price)&&price>0?price:null,currency:['USD','ARS','PYG'].includes(currency)?currency:null,availability:p.quantity>0?'in_stock':'out_of_stock'};
    }catch{return null;}
  }
  const id=supplier.official_key==='atacado-connect'?url.match(/\/(\d+)\/?(?:\?|$)/)?.[1]:sku;
  const result=publicProductFromJsonLd(html,url,id);
  if(result&&supplier.official_key==='total'){
    // Total's JSON-LD productID is its commercial SKU; tracker identities use the URL ID.
    const sourceId=new URL(url).pathname.match(/^\/produto\/[^/]+-(\d+)\.html$/)?.[1];
    const primary=primaryJsonLd(html,url,id);
    const canonicalTag=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).find(tag=>/\brel\s*=\s*["']canonical["']/i.test(tag));
    const canonical=canonicalTag?.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    if(sourceId&&typeof primary?.url==='string'&&canonical){
      try{if(new URL(primary.url,url).href===new URL(url).href&&new URL(canonical.replace(/&amp;/g,'&'),url).href===new URL(url).href)result.external_id=sourceId;}catch{/* Conflicting source identity stays available for the strict registration gate. */}
    }
    const visible=totalVisibleOffer(html);
    // JSON-LD may quote a pre-tax/stale baseline. Only the primary visible USD quote is a cost.
    result.origin_cost=visible?.price??null;result.currency=visible?.price?'USD':null;
    if(visible&&visible.availability!=='unknown')result.availability=visible.availability;
  }
  return result;
}
/** Read one already reviewed USA native page; summary prices never establish USD or stock. */
export async function inspectRegisteredSupplierProduct(html:string,url:string,supplier:IntelligenceSupplier,prior:SupplierOffer|null|undefined,
  readNative:(url:string)=>Promise<string>,sku?:string):Promise<{product:PublicProduct|null;html:string;observedUrl:string}> {
  const product=inspectSupplierProduct(html,url,supplier,prior?.external_id??sku);
  const original={product,html,observedUrl:url};
  if(product||!prior||supplier.official_key!=='atacado-usa'||prior.source_url!==url)return original;
  const reviewed=(prior as SupplierOffer&{evidence?:{observedUrl?:unknown}}).evidence?.observedUrl;
  if(typeof reviewed!=='string')return original;
  let native:string;
  try{
    const source=new URL(url),candidate=new URL(supplierSourceUrl(reviewed,supplier));
    if(source.pathname.match(/^\/produto\/(\d+)\/?$/)?.[1]!==prior.external_id||
      candidate.pathname.match(/\/(\d+)-[^/]+\.html$/)?.[1]!==prior.external_id)return original;
    native=supplierUrl(candidate.href);
  }catch{return original;}
  const detail=await readNative(native),found=inspectSupplierProduct(detail,url,supplier,prior.external_id);
  if(!found||found.external_id!==prior.external_id||found.variant_key!==prior.variant_key||found.availability==='unknown'||
    !found.currency||!found.origin_cost)return {product:null,html:detail,observedUrl:native};
  return {product:found,html:detail,observedUrl:native};
}
export async function probeRegisteredOffer(offer: SupplierOffer, supplier: IntelligenceSupplier): Promise<Outcome> {
  try {
    const response = await fetchSupplierPage(offer.source_url, "MYA-SupplierCheck/1.0");
    if (response.status === 404) return { ok: false, missing: true, message: "Ficha no encontrada (404); requiere revisión, no confirma agotamiento." };
    if (!response.ok) return { ok: false, message: `Error HTTP ${response.status}; se conserva evidencia anterior.` };
    supplierSourceUrl(response.url, supplier);
    return parseRegisteredOffer(await readSupplierHtml(response), offer, supplier);
  } catch (e) { return { ok: false, message: e instanceof Error ? e.message : "Error de consulta." }; }
}
