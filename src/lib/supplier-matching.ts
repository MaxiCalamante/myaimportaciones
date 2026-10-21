import {titleIdentity} from './supplier-public-data';

export interface MatchProduct {id:string;title:string;brand?:string|null;model?:string|null;sku?:string|null;source_url?:string|null;has_variants?:boolean;specifications?:Record<string,string>|null}
export interface MatchVariant {id:string;product_id:string;title:string;sku?:string|null;options?:Record<string,string>|null}
export interface MatchTarget {productId:string;variantId:string|null;title:string;brand:string;model:string;sku:string;specifications:Record<string,string>;sourceUrl:string|null}
export interface MatchSource {title:string;brand?:string|null;model?:string|null;gtin?:string|null;external_id?:string;source_url?:string;variant_key?:string;supplierKey?:string}
export interface MatchResult {status:'exact'|'review'|'none';target:MatchTarget|null;method:'gtin'|'manufacturer_model'|'exact_identity'|null;reason:string;alternatives:string[]}
export function supplierLinkCounts(offers:Array<{product_id:string|null;variant_id:string|null;supplier_id:string;verification:string}>){
 const products=new Map<string,Set<string>>(),identities=new Map<string,{productId:string;suppliers:Set<string>}>();
 for(const o of offers){if(!o.product_id||o.verification!=='verified')continue;
  if(!products.has(o.product_id))products.set(o.product_id,new Set());products.get(o.product_id)!.add(o.supplier_id);
  const key=`${o.product_id}:${o.variant_id??'base'}`;if(!identities.has(key))identities.set(key,{productId:o.product_id,suppliers:new Set()});identities.get(key)!.suppliers.add(o.supplier_id);
 }
 return{products,multipleProducts:new Set([...identities.values()].filter(v=>v.suppliers.size>1).map(v=>v.productId))};
}

export function matchTargets(products:MatchProduct[],variants:MatchVariant[]):MatchTarget[]{
 return products.flatMap<MatchTarget>(p=>{
  const children=variants.filter(v=>v.product_id===p.id);
  const base={productId:p.id,brand:p.brand??'',model:p.model??'',specifications:p.specifications??{},sourceUrl:p.source_url??null};
  if(children.length)return children.map(v=>({...base,variantId:v.id,title:`${p.title} ${v.title} ${Object.values(v.options??{}).join(' ')}`,sku:v.sku??''}));
  if(p.has_variants)return [];
  return [{...base,variantId:null,title:p.title,sku:p.sku??''}];
 });
}
const substitutions: Array<[RegExp,string]>=[
 [/\bskin\s*1004\b/g,'skin1004'],[/\bdr\s+althea\b/g,'dralthea'],[/\bvictoria\s*s?\s+secret\b/g,'victoriassecret'],
 [/\bage\s+r\b/g,'ager'],[/\bleave\s+in\b/g,'leavein'],[/\bbody\s+(?:splash(?:\s+mist)?|mist)\b/g,'bodysplash'],
 [/\b(?:creme|crema)\b/g,'cream'],[/\b(?:oleo|aceite)\b/g,'oil'],[/\b(?:bruma|brume)\b/g,'mist'],[/\b(?:colageno|colagenio)\b/g,'collagen'],
 [/\b(?:espuma|espumante)\b/g,'foam'],[/\b(?:mascara|mascarilla)\b/g,'mask'],[/\b(?:ampola|ampolla)\b/g,'ampoule'],
 [/\b(?:kit|pack|set)\b/g,'kit'],[/\b(?:preto|negro|black)\b/g,'black'],[/\b(?:branco|blanco|white)\b/g,'white'],
 [/\b(?:cinza|gris|grey|gray)\b/g,'gray'],[/\b(?:azul|blue)\b/g,'blue'],[/\b(?:verde|green)\b/g,'green'],
 [/\b(?:rosa|pink)\b/g,'pink'],[/\b(?:roxo|morado|violeta|purple)\b/g,'purple'],[/\b(?:prata|plata|silver)\b/g,'silver'],
 [/\b(?:dourado|dorado|gold)\b/g,'gold'],[/\b(?:unidades|unidade|unid|un|pcs|piezas|capsulas)\b/g,'units'],
 [/\b(?:lacrado|sellado|sealed)\b/g,'sealed'],[/\b(?:novo|nuevo|new)\b/g,'new']
];
function normalized(text:string){
 let s=titleIdentity(text.replace(/\((?:[XB]0[A-Z0-9]{8}|\d{5,14})\)\s*$/i,'').replace(/(\d)[,.](\d)/g,'$1decimal$2')).replace(/(\d+)decimal(\d+)/g,'$1.$2');
 for(const [pattern,replacement]of substitutions)s=s.replace(pattern,replacement);
 if(s.includes('ampoule'))s=s.replace(/\bserum\b/g,'');
 s=s.replace(/(\d)\s*(?:un|unid|unidades|pcs)\b/g,'$1units');
 return s.replace(/(\d(?:[\d.]*))\s+(ml|gb|tb|mah|kg|mm|nm|w|v|g|l|units)\b/g,'$1$2');
}
const optional=new Set(['facial','face','coreano','coreana','korean','cosmetico','cosmeticos','producto','produto','de','do','da','del','para','e','the','and','con','com','original','new','sealed']);
export function identityTokens(text:string){return [...new Set(normalized(text).split(' ').filter(t=>t&&!optional.has(t)))].sort();}
function measures(text:string){return [...new Set([...normalized(text).matchAll(/\b(\d+(?:\.\d+)?)(ml|gb|tb|mah|kg|mm|nm|w|v|g|l|units)\b/g)].map(m=>`${Number(m[1])*(m[2]==='l'||m[2]==='kg'||m[2]==='tb'?1000:1)}${m[2]==='l'?'ml':m[2]==='kg'?'g':m[2]==='tb'?'gb':m[2]}`))].sort();}
const colors=['black','white','gray','blue','green','pink','purple','silver','gold','titanium','natural','desert','cosmic','orange','yellow'];
function colorValues(text:string){return colors.filter(c=>normalized(text).split(' ').includes(c));}
function codes(text:string){return (text.toUpperCase().match(/\b[A-Z]{2,}[A-Z0-9\/-]*\d[A-Z0-9\/-]*\b/g)??[]).filter(c=>c.length>=6&&!/^(SKIN1004|IPHONE\d|USB\d)/.test(c));}
export function validGtin(value:string){if(!/^(\d{8}|\d{12,14})$/.test(value))return false;const digits=value.split('').map(Number),check=digits.pop()!;return(10-digits.reverse().reduce((n,d,i)=>n+d*(i%2?1:3),0)%10)%10===check;}
function targetGtins(t:MatchTarget){return Object.entries(t.specifications).filter(([k])=>/ean|gtin|barcode|barras/i.test(k)).flatMap(([,v])=>v.match(/\b\d{8,14}\b/g)??[]).filter(validGtin);}
function evaluate(source:MatchSource,target:MatchTarget){
 const raw=[source.title,source.model??''].join(' '),own=target.title;
 if(/\.\.\.|…/.test(source.title))return {exact:false,score:0,reason:'Título del proveedor truncado'};
 if(/\b(cpo|outlet|refurbished|reacondicionado|usado|seminovo|ativo|activado)\b/i.test(raw))return {exact:false,score:0,reason:'Condición de unidad diferente'};
 const accessories=/\b(escobillas|carbones|repuesto|compat[ií]vel|compatible|funda|carcasa|protector|pelicula|correa|pulseira|cargador|carregador|charger|adaptador|adapter|bateria|battery)\b/gi;
 if([...raw.matchAll(accessories)].some(m=>!normalized(own).includes(normalized(m[0]))))return {exact:false,score:0,reason:'Accesorio o contenido adicional distinto del producto'};
 if(source.supplierKey==='atacado-connect'&&/\biphone\b/i.test(raw)&&!/\b(nuevo sellado|new sealed|novo lacrado|new_sealed)\b/i.test(raw+' '+source.variant_key))return{exact:false,score:0,reason:'iPhone sin condición nuevo sellado explícita'};
 const a=identityTokens(own),b=identityTokens(source.title),set=new Set(b),overlap=a.filter(t=>set.has(t)).length;
 const score=overlap/Math.max(a.length,b.length,1);
 const ownMeasures=measures(own),theirMeasures=measures(source.title);
 if(ownMeasures.length&&JSON.stringify(ownMeasures)!==JSON.stringify(theirMeasures))return {exact:false,score:score*.5,reason:'Tamaño, capacidad, potencia o cantidad diferentes o incompletos'};
 if(JSON.stringify(colorValues(own))!==JSON.stringify(colorValues(source.title)))return{exact:false,score:score*.5,reason:'Color o terminación diferente o ausente'};
 if(a.includes('kit')!==b.includes('kit'))return{exact:false,score:score*.5,reason:'Kit y unidad individual no son equivalentes'};
 const gtin=source.gtin&&validGtin(source.gtin)?source.gtin:null;
 if(gtin&&targetGtins(target).includes(gtin))return{exact:true,score:1,method:'gtin' as const,reason:'GTIN idéntico y presentación compatible'};
 const ownCodes=codes([target.model,target.specifications['Modelo / referencia']??''].join(' '));
 const sourceCodes=codes(raw),shared=ownCodes.filter(c=>sourceCodes.includes(c));
 if(shared.length){
  if(sourceCodes.some(c=>!ownCodes.includes(c)))return{exact:false,score,reason:'La ficha contiene códigos de modelos diferentes'};
  const hardware=/\b(apple|samsung)\b/i.test(target.brand);
  if(hardware&&normalized(own).includes('pro')!==normalized(source.title).includes('pro'))return{exact:false,score,reason:'Familia o versión Pro diferente'};
  return {exact:true,score:1,method:'manufacturer_model' as const,reason:`Modelo de fabricante ${shared[0]} y presentación compatibles`};
 }
 if(a.length>=3&&JSON.stringify(a)===JSON.stringify(b))return{exact:true,score:1,method:'exact_identity' as const,reason:'Marca, fórmula/modelo y presentación coinciden exactamente'};
 return{exact:false,score,reason:'Coincidencia parcial; requiere verificar identidad completa'};
}
export function matchSupplierProduct(source:MatchSource,targets:MatchTarget[]):MatchResult{
 const raw=normalized(source.title).replace(/\s/g,'');
 const known=[...new Set(targets.map(t=>t.brand))].filter(b=>b&&raw.includes(normalized(b).replace(/\s/g,'')));
 const candidates=known.length?targets.filter(t=>known.includes(t.brand)):targets;
 const ranked=candidates.map(target=>({target,...evaluate(source,target)}));const exact=ranked.filter(r=>r.exact);
 if(exact.length===1)return{status:'exact',target:exact[0].target,method:exact[0].method!,reason:exact[0].reason,alternatives:[]};
 if(exact.length>1)return{status:'review',target:null,method:null,reason:'Más de una identidad MYA coincide; no se vincula automáticamente',alternatives:exact.map(r=>r.target.productId)};
 const possible=ranked.filter(r=>r.score>=.6).sort((a,b)=>b.score-a.score).slice(0,5);
 return {status:possible.length?'review':'none',target:null,method:null,reason:possible[0]?.reason??'Sin identidad exacta en el catálogo MYA',alternatives:possible.map(r=>r.target.productId)};
}

/** Full catalog scope; brands group independent products into reusable supplier searches. */
export function discoveryPlan(products:MatchProduct[],suppliers:Array<{id:string;official_key:string|null}>){
 const jobs:Array<{supplier_id:string;query:string;product_ids:string[]}>=[];
 for(const supplier of suppliers){const groups=new Map<string,string[]>();
  for(const p of products){let query=p.brand?.trim()||p.model?.trim()||p.title.slice(0,60);
   if(supplier.official_key==='total'&&/total|wadfow/i.test(p.brand??''))query=p.model?.trim()||query;
   if(p.brand==='Apple')query=/iPhone/i.test(p.title)?'iPhone':p.model?.trim()||'Apple';
   const key=query.toLowerCase();groups.set(key,[...(groups.get(key)??[]),p.id]);
  }
  for(const [query,ids]of groups)jobs.push({supplier_id:supplier.id,query:query.slice(0,80),product_ids:ids});
 }
 return jobs;
}
