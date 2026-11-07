import {sourceUrl,type SupplierKey}from'../supplier-url-policy';
import {readSupplierHtml}from'../supplier-response';
const robotsCache=new Map<string,{at:number;text:string}>();
export class TrackerHttpError extends Error{constructor(message:string,public status?:number){super(message);}}
export function robotsAllowed(text:string,url:string,userAgent='MYA-CatalogMonitor'):boolean{
 const groups:Array<{agents:string[];rules:Array<{allow:boolean;path:string}>}>=[];let group={agents:[]as string[],rules:[]as Array<{allow:boolean;path:string}>};
 for(const raw of text.split(/\r?\n/)){const line=raw.replace(/#.*/,'').trim(),m=line.match(/^([^:]+):\s*(.*)$/);if(!m)continue;const key=m[1].toLowerCase(),value=m[2].trim();
  if(key==='user-agent'){if(group.rules.length){groups.push(group);group={agents:[],rules:[]};}group.agents.push(value.toLowerCase());}
  else if((key==='allow'||key==='disallow')&&value&&group.agents.length)group.rules.push({allow:key==='allow',path:value});
 }groups.push(group);
 const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&userAgent.toLowerCase().includes(a))),selected=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
 const path=new URL(url).pathname+new URL(url).search;
 const matches=selected.flatMap(g=>g.rules).filter(r=>{const end=r.path.endsWith('$'),pattern=(end?r.path.slice(0,-1):r.path).split('*').map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*');return new RegExp('^'+pattern+(end?'$':'')).test(path);}).sort((a,b)=>b.path.replace(/\*/g,'').length-a.path.replace(/\*/g,'').length||Number(b.allow)-Number(a.allow));
 return matches[0]?.allow??true;
}
async function request(url:string,key:SupplierKey,fetcher:typeof fetch,authorize?:(url:string)=>void){
 let current=sourceUrl(url,url,key);const signal=AbortSignal.timeout(10000);
 for(let redirects=0;redirects<=3;redirects++){
  authorize?.(current);
  const response=await fetcher(current,{redirect:'manual',signal,headers:{'User-Agent':'MYA-CatalogMonitor/2.0 (+https://myaimportaciones.com)','Accept':'text/html,application/xhtml+xml,application/xml,text/plain'}});
  if(![301,302,303,307,308].includes(response.status))return {response,finalUrl:current};
  const location=response.headers.get('location');await response.body?.cancel();if(!location)throw new TrackerHttpError('Redirección inválida.');current=sourceUrl(location,current,key);
 }throw new TrackerHttpError('Demasiadas redirecciones.');
}
export async function fetchTrackerResponse(url:string,key:SupplierKey,fetcher:typeof fetch=fetch){
 const normalized=sourceUrl(url,url,key),origin=new URL(normalized).origin,cached=robotsCache.get(origin);
 let rules=cached?.text;
 if(!cached||Date.now()-cached.at>3600000){
  const {response:robots}=await request(origin+'/robots.txt',key,fetcher,target=>{if(new URL(target).pathname!=='/robots.txt')throw new TrackerHttpError('Redirección de robots.txt no verificable.');});
  if(robots.status===404)rules='';else if(robots.ok){rules=await readSupplierHtml(robots);if(/<html|<!doctype/i.test(rules))throw new TrackerHttpError('robots.txt no verificable.');}
  else throw new TrackerHttpError('No se pudo comprobar robots.txt.',robots.status);
  robotsCache.set(origin,{at:Date.now(),text:rules!});
 }
 if(!robotsAllowed(rules??'',normalized))throw new TrackerHttpError('La ruta está restringida por robots.txt.',403);
 if((!cached||Date.now()-cached.at>3600000)&&fetcher===fetch)await new Promise(resolve=>setTimeout(resolve,10000));
 const {response,finalUrl}=await request(normalized,key,fetcher,target=>{if(!robotsAllowed(rules??'',target))throw new TrackerHttpError('El destino está restringido por robots.txt.',403);});
 const original=new URL(normalized),target=new URL(finalUrl);
 if(target.pathname.replace(/\/$/,'')!==original.pathname.replace(/\/$/,'')||
  ['p','page','pagina','start','offset'].some(key=>original.searchParams.get(key)!==target.searchParams.get(key)))throw new TrackerHttpError('La URL cambió; verificar el destino antes de actualizar evidencia.');
 return{response,finalUrl};
}
export async function fetchTrackerHtml(url:string,key:SupplierKey,fetcher:typeof fetch=fetch){
 const {response}=await fetchTrackerResponse(url,key,fetcher);
 if(!response.ok)throw new TrackerHttpError(`HTTP ${response.status}: incidencia técnica; no acredita agotamiento.`,response.status);
 const isSitemap=key==='atacado-connect'&&new URL(url).pathname==='/sitemap.xml';
 const html=await readSupplierHtml(response,isSitemap?12_000_000:undefined);
 if(/<title>[^<]*(?:just a moment|access denied|captcha|verifica.{0,10}humano)/i.test(html))throw new TrackerHttpError('El proveedor requiere verificación de acceso.',403);
 return html;
}
