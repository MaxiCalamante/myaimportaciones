import{dom,item,clean,sourceUrl,safeImage,originalPrice,pagination,categories,categoryIdentity,structuredDetail,type SupplierAdapter,type FoundProduct}from'./shared';
const key='total' as const;
const category=(url:string)=>/^\/produtos(?:\/[^/]+)*\/filter\/?$/.test(new URL(url).pathname);
const product=(url:string)=>/^\/produto\/[^/]+\.html$/.test(new URL(url).pathname);
export const totalAdapter:SupplierAdapter={key,category,product,
 listing(html,url,root){const $=dom(html),products:FoundProduct[]=[];$('.product, .product-item, .product-wrap').filter((_,el)=>$(el).find('.product-name a[href*="/produto/"]').length>0).each((_,el)=>{const card=$(el);if(card.parents('.product,.product-item,.product-wrap').length)return;const raw=card.find('.product-name a').attr('href');if(!raw)return;try{const target=sourceUrl(raw,url,key),id=new URL(target).pathname.match(/-(\d+)\.html$/)?.[1]??target;const rawPrice=clean(card.find('.product-price,.price').first().text());products.push(item({externalId:id,url:target,title:clean(card.find('.product-name').text()),sku:(card.find('.product-cat').text().match(/#?SKU\s*([A-Za-z0-9._-]+)/i)?.[1]??''),imageUrl:safeImage(card.find('img').first().attr('src'),url),rawPrice,warnings:/SEM I\.V\.A\./i.test(rawPrice)?['Precio de origen sin IVA; confirmar cargos aplicables.']:[],...originalPrice(rawPrice)}));}catch{}});
 const total=clean($('.show-info').first().text()).match(/\bde\s+([\d.]+)\s+item/i)?.[1];
 return{products,pages:pagination($,'.pagination a[href],.page-pagination a[href],a[rel="next"]',url,root,key),categories:categories($,'a[href*="/produtos/"]',url,key,category),pageIdentity:categoryIdentity(url,key),expectedTotal:total?Number(total.replace(/\./g,'')):undefined};},
 detail(html,url){
  const p=structuredDetail(html,url,key),externalId=new URL(url).pathname.match(/-(\d+)\.html$/)?.[1];
  if(!p||!externalId)return null;
  const $=dom(html),primaryPrice=clean($('.product-single .product-price, .product-details .product-price, .product-price').first().text());
  const taxBasis=/\b(?:sem|sin)\s+I\.?V\.?A\.?/i.test(primaryPrice)?'excluded':/\b(?:com|con)\s+I\.?V\.?A\.?/i.test(primaryPrice)?'included':'unknown';
  return {...p,externalId,sku:p.sku||p.externalId,model:p.title.match(/\b(?:T[A-Z]{1,8}|W[A-Z]{1,8})\d+[A-Z0-9-]*\b/)?.[0]??p.model,
   rawPrice:primaryPrice,taxBasis,warnings:[...p.warnings,...(taxBasis!=='included'?['Confirmar IVA y cargos aplicables al precio de origen.']:[])]};
 }};
