// Public UI only: no keys, private endpoints, authentication or purchase actions are inspected.
/** @param {string|null} startUrl @param {null|(()=>Promise<unknown>)} beforeSearch */
export async function collectPublicCatalog(browser,supplier,query='',cadence=10000,startUrl=null,beforeSearch=null){
 const context=await browser.newContext({locale:'es-AR'});
 await context.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())&&!/google-analytics|googletagmanager|doubleclick|facebook.net/.test(route.request().url())?route.continue():route.abort());
 const page=await context.newPage();
 const publicStocks=new Map();let dollarBaseVerified=false;
 // Mobile Zone's own public UI requests these credential-free endpoints. Use stock only;
 // acquisition price comes from the visible card, because API base price can omit a surcharge.
 if(supplier.official_key==='mobile-zone')page.on('response',async response=>{try{
  const u=new URL(response.url());if(u.hostname!=='products-api-dns.mobilezone.com.py'||response.request().method()!=='GET')return;
  if(u.pathname==='/api/products'){const data=await response.json();for(const p of data.products??[])if(Number.isInteger(p.stock)&&p.stock>=0)publicStocks.set(String(p.internal_id),p.stock);}
  if(u.pathname==='/api/exchange'){const data=await response.json();dollarBaseVerified=Array.isArray(data)&&data.some(e=>e.currency?.name_py==='Dólar'&&Number(e.amount_buy)===1)&&data.some(e=>/Peso argentino/i.test(e.currency?.name_py??''));}
 }catch{/* Unavailable public evidence leaves the card unconfirmed. */}});
 try{
  await page.goto(startUrl??supplier.website,{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForTimeout(4000);
  if(await page.getByText(/Verificación de seguridad en curso|verifying you are human|checking your browser/i).count())throw new Error('Sitio protegido por verificación antibots; importar lista autorizada.');
  let searched=false;
  if(query&&!startUrl){
   if(beforeSearch)await beforeSearch();else await page.waitForTimeout(Math.max(0,cadence-4000));
   const search=page.locator('input[type="search"],input[placeholder*="busc" i],input[placeholder*="pesquis" i],input[name="search"],input[name="s"]').filter({visible:true}).first();
   if(await search.count()){searched=true;await search.click();await search.fill(query);await search.press('Enter');await page.waitForTimeout(3000);}
  }
  const records=await page.evaluate(({key,source})=>{
   const visible=e=>e.getClientRects().length>0;
   const text=e=>(e?.innerText??'').replace(/\u00a0/g,' ').trim();
   const available=(t,button)=>/agotado|sin stock|out of stock|indispon[ií]vel|n[aã]o dispon[ií]vel/i.test(t)?'out_of_stock':button&&!button.disabled?'in_stock':'unknown';
   if(key==='star-company'||key==='atacado-usa')return [...document.querySelectorAll('article.product-miniature,.js-product-miniature')].filter(visible).map(e=>{
    const a=e.querySelector('.product-title a,h2 a,h3 a'),url=a?.href,id=e.getAttribute('data-id-product')??url?.match(/\/(\d+)-/)?.[1],price=text(e.querySelector('.price'));
    return {id,title:a?.getAttribute('title')?.trim()||text(a),price,currency:/US\$|U\$|USD/.test(price)||/\bUSD\b|U\$/.test(document.querySelector('.currency-selector')?.innerText??'')?'USD':null,url,availability:available(text(e),e.querySelector('.add-to-cart')),basis:'listing_only',brand:'',scope:'origin'};
   }).filter(p=>p.id&&p.title&&p.price);
   if(key==='total')return [...document.querySelectorAll('.product-name a[href*="/produto/"]')].filter(visible).map(a=>{
    let card=a;for(let i=0;i<6&&card.parentElement;i++){card=card.parentElement;if(card.querySelector('.product-price'))break;}
    const lines=text(card).split('\n').map(x=>x.trim()).filter(Boolean),price=lines.find(x=>/\bUSD\s*[\d.,]+/.test(x)),sku=text(card.querySelector('.product-cat')).match(/SKU\s*(\d+)/i)?.[1];
    return {id:sku??a.href.match(/-(\d+)\.html/)?.[1],title:text(a),price:price?.match(/\bUSD\s*[\d.,]+/)?.[0],currency:price?'USD':null,url:a.href,availability:'unknown',basis:'listing_only',brand:'Total',scope:'origin_includes_displayed_taxes'};
   }).filter(p=>p.id&&p.title&&p.price);
   if(key==='vencell'||key==='neo-import')return [...document.querySelectorAll('.prod-card')].filter(visible).map(e=>{
    const id=(e.getAttribute('onclick')??'').match(/openProduct\(['"]([^'"]+)/)?.[1];
    const title=text(e.querySelector('.prod-name')),price=text(e.querySelector('.prod-price-usd')),buy=e.querySelector('.add-btn');
    return {id,title,price,currency:/US\$|USD/.test(price)?'USD':null,url:source,availability:available(text(e),buy),basis:/agotado|disponible|stock/i.test(text(e))?'explicit':'listed_orderable',brand:text(e.querySelector('.prod-cat')),scope:key==='neo-import'?'supplier_quote_inclusions_unconfirmed':'origin'};
   }).filter(p=>p.id&&p.title);
   if(key==='atacado-connect')return [...document.querySelectorAll('a[href*="/produto/"]')].filter(visible).map(e=>{
    const lines=text(e).split('\n').map(x=>x.trim()).filter(Boolean),price=lines.find(x=>/^U\$|^US\$|^USD/.test(x));
    return {id:e.href.match(/\/(\d+)\/?$/)?.[1],title:lines[0],price,currency:price?'USD':null,url:e.href,availability:'unknown',basis:'listing_only',brand:lines[2]??'',scope:'origin'};
   }).filter(p=>p.id&&p.title&&p.price);
   if(key==='atlantico')return [...document.querySelectorAll('.product-thumb')].filter(visible).map(e=>{
    const a=e.querySelector('.product-name a'),url=a?.href,id=url?new URL(url).searchParams.get('product_id'):null;
    return {id,title:text(a),price:text(e.querySelector('.price-new')??e.querySelector('.price')),currency:/Moneda\s+USD/i.test(document.body.innerText)?'USD':null,url,availability:available(text(e),e.querySelector('.button-cart,.cart button,button[onclick*="cart.add"]')),basis:'listed_orderable',brand:text(e.querySelector('.manufacture-product')),scope:'origin'};
   }).filter(p=>p.id&&p.title&&p.price);
   if(key==='mobile-zone'){
    const coded=[...document.querySelectorAll('body *')].filter(e=>visible(e)&&e.children.length===0&&/^C[ÓO]D:\s*\d+$/i.test(text(e)));
    return coded.map(el=>{let card=el;for(let i=0;i<7&&card.parentElement;i++){const next=card.parentElement;if((text(next).match(/C[ÓO]D:/g)??[]).length>1)break;card=next;if(/A[ñn]adir al carrito/i.test(text(card)))break;}
      const lines=text(card).split('\n').map(s=>s.trim()).filter(Boolean),title=lines.find(s=>!/^C[ÓO]D:|^G\$|^R\$|^\$|A[ñn]adir/i.test(s)),price=lines.find(s=>/^\$\s*[\d,.]+/.test(s));
      const button=[...card.querySelectorAll('button')].find(b=>/carrito/i.test(text(b)));
      return {id:text(el).replace(/\D/g,''),title,price,currency:/\bUSD\b|US\$|d[oó]lares americanos/i.test(document.body.innerText)?'USD':null,url:source,availability:available(text(card),button),basis:'listed_orderable',brand:'',scope:'origin'};
    }).filter(p=>p.id&&p.title&&p.price);
   }
   return [];
  },{key:supplier.official_key,source:supplier.website});
  // Detail links are returned only if present in the provider DOM. Missing cards never imply no stock.
  if(supplier.official_key==='mobile-zone')for(const record of records){const stock=publicStocks.get(record.id);if(stock!==undefined){record.availability=stock>0?'in_stock':'out_of_stock';record.basis='explicit';record.stock=stock;}if(dollarBaseVerified)record.currency='USD';}
  const searchKey=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const unique=[...new Map(records.filter(r=>!query||searchKey(r.title).includes(searchKey(query))).map(r=>[r.id,r])).values()].slice(0,150);
  const next=await page.locator('a[rel="next"],.pagination a.next,.pagination .next a').first().getAttribute('href').catch(()=>null);
  return {records:unique,title:await page.title(),url:page.url(),searched:searched||!!startUrl,nextUrl:next?new URL(next,page.url()).href:null,limited:records.length>150};
 }finally{await context.close();}
}
