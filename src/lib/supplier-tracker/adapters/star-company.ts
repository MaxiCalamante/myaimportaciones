import{dom,item,clean,sourceUrl,safeImage,originalPrice,pagination,categories,categoryIdentity,structuredDetail,currencyOf,type SupplierAdapter,type FoundProduct}from'./shared';
const key='star-company' as const;
const category=(url:string)=>{
 const u=new URL(url);
 return (u.searchParams.get('module')==='starcategorypremium'&&u.searchParams.has('id_category'))||
  (!u.pathname.endsWith('.html')&&/^\/(?:\d+-[^/]+|categoria-premium\/\d+)\/?$/.test(u.pathname));
};
const product=(url:string)=>/\/\d+-[^/]+\.html$/.test(new URL(url).pathname);
export const starCompanyAdapter:SupplierAdapter={key,category,product,
 listing(html,url,root){const $=dom(html),products:FoundProduct[]=[];$('article.scp-card,article.product-miniature,[data-id-product].js-product-miniature').each((_,el)=>{const card=$(el),raw=card.find('a.scp-img,a.product_name,a.product-thumbnail,a[href$=".html"]').first().attr('href');if(!raw)return;try{const target=sourceUrl(raw,url,key),id=card.attr('data-id-product')??new URL(target).pathname.match(/\/(\d+)-/)?.[1];if(!id)return;const rawPrice=clean(card.find('.scp-price,.product-price-and-shipping .price,.product-premium-price-v2,.price').first().text());products.push(item({externalId:id,url:target,brand:clean(card.find('.scp-brand').first().text()),quantity:/^(\d+)\s+In Stock$/i.test(clean(card.find('.scp-stock').text()))?Number(clean(card.find('.scp-stock').text()).match(/^\d+/)?.[0]):null,availability:/^\d+\s+In Stock$/i.test(clean(card.find('.scp-stock').text()))?(Number(clean(card.find('.scp-stock').text()).match(/^\d+/)?.[0])>0?'in_stock':'out_of_stock'):/out of stock/i.test(card.find('.scp-stock').text())?'out_of_stock':'unknown',title:clean(card.find('.scp-body h2,.product_name,.product-title').first().text()),imageUrl:safeImage(card.find('img').first().attr('src')??card.find('img').first().attr('data-src'),url),rawPrice,...originalPrice(rawPrice,currencyOf(html))}));}catch{}});
 const total=clean($('.scp-count').first().text()).match(/\bExistem\s+([\d.]+)\s+produtos\b/i)?.[1];
 return{products,pages:pagination($,'.scp-pagination a[href],.pagination a[href],a[rel="next"],.star-category-pagination a[href]',url,root,key),categories:categories($,'a[href]',url,key,category),pageIdentity:categoryIdentity(url,key),expectedTotal:total?Number(total.replace(/\./g,'')):undefined};},detail:(html,url)=>structuredDetail(html,url,key)};
