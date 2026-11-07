/** The only approved public supplier origins. Historic records may retain other URLs. */
export const FOUR_SUPPLIERS={
 'atacado-connect':{name:'Atacado Connect',host:'atacadoconnect.com'},
 'atacado-usa':{name:'Atacado USA',host:'atacadousa.com.py'},
 'star-company':{name:'Star Company',host:'starcompany-py.com'},
 total:{name:'Total Herramientas Oficial',host:'totalherramientasoficial.com.py'},
}as const;
export type SupplierKey=keyof typeof FOUR_SUPPLIERS;
export function supplierKeyForUrl(value:string):SupplierKey{
 const host=new URL(value).hostname.replace(/^www\./,'');
 const key=(Object.keys(FOUR_SUPPLIERS)as SupplierKey[]).find(k=>FOUR_SUPPLIERS[k].host===host);
 if(!key)throw Error('Proveedor fuera del alcance autorizado.');return key;
}
function publicPath(path:string){
 const segments=path.split('/').map(part=>{let decoded=part;
  for(let i=0;i<4&&/%[\da-f]{2}/i.test(decoded);i++){const next=decodeURIComponent(decoded);if(next===decoded)break;decoded=next;}
  if(/[%][\da-f]{2}/i.test(decoded)||/[\\/?#\x00-\x1f\x7f]/.test(decoded)||decoded==='.'||decoded==='..')throw Error('Ruta codificada ambigua o no autorizada.');
  return encodeURIComponent(decoded);
 });
 const normalized=segments.join('/');
 if(/^\/(?:api|admin|login|acesso|orcamento|carrinho|set-country)(?:\/|$)/i.test(normalized))throw Error('La ruta no pertenece al catálogo público autorizado.');
 return normalized;
}
export function sourceUrl(raw:string,base:string,key:SupplierKey):string{
 const u=new URL(raw,base);
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname.replace(/^www\./,'')!==FOUR_SUPPLIERS[key].host)throw Error('URL fuera del proveedor o de su catálogo público.');
 u.pathname=publicPath(u.pathname);u.hostname=(key==='star-company'||key==='total'?'www.':'')+FOUR_SUPPLIERS[key].host;
 if(key==='star-company'&&u.pathname==='/index.php'&&u.searchParams.get('module')==='starcategorypremium'&&/^\d+$/.test(u.searchParams.get('id_category')??'')){
  u.pathname='/categoria-premium/'+u.searchParams.get('id_category');for(const k of['controller','module','id_category'])u.searchParams.delete(k);
 }
 if(key==='star-company'&&/^\/categoria-premium\/\d+\/?$/.test(u.pathname)){u.searchParams.delete('fc');if(u.searchParams.get('order')==='position')u.searchParams.delete('order');}
 u.hash='';for(const k of[...u.searchParams.keys()])if(/^(utm_|fbclid|gclid)/i.test(k))u.searchParams.delete(k);
 for(const k of['p','page','pagina'])if(u.searchParams.get(k)==='1')u.searchParams.delete(k);
 for(const k of['offset','start'])if(u.searchParams.get(k)==='0')u.searchParams.delete(k);
 u.searchParams.sort();return u.href;
}
