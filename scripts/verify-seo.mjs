// Read-only HTTP/browser checks. Checkout submission and external writes are blocked.
import assert from 'node:assert/strict';
import { mkdir,writeFile,readFile,readdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
const base=(process.env.SEO_BASE_URL||'https://myaimportaciones.com').replace(/\/$/,''),official='https://myaimportaciones.com';
const baseline=process.env.SEO_BASELINE==='1',out='docs/seo/qa-private',label=baseline?'before-vitals':base===official?'production':'local';
await mkdir(out,{recursive:true});
const cache=path.join(process.env.LOCALAPPDATA||'','ms-playwright'),installed=(await readdir(cache)).filter(x=>/^chromium-\d+$/.test(x)).sort((a,b)=>Number(b.split('-')[1])-Number(a.split('-')[1]));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||path.join(cache,installed[0],'chrome-win64','chrome.exe')});
const report={at:new Date().toISOString(),base,baseline,commit:process.env.SEO_RELEASE_SHA||null,requests:[],vitals:[],screens:[],errors:[],blockedWrites:[],warnings:[]};
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#x27;',"'");
function equivalent(a,b){const x=new URL(a),y=new URL(b);x.searchParams.sort();y.searchParams.sort();return x.origin+x.pathname+x.searchParams.toString()===y.origin+y.pathname+y.searchParams.toString();}
async function get(route){const start=performance.now(),r=await fetch(base+route,{headers:{'User-Agent':'Googlebot'},redirect:'manual'}),body=await r.text();return {route,status:r.status,ms:Math.round(performance.now()-start),bytes:Buffer.byteLength(body),body,location:r.headers.get('location')};}
try{
  const c=await browser.newContext({viewport:{width:1440,height:1000}});
  await c.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(!['GET','HEAD'].includes(request.method())){report.blockedWrites.push({method:request.method(),path:url.pathname});return route.abort();}if(url.origin===base||url.protocol==='data:')return route.continue();return route.abort();});
  await c.addInitScript(()=>{localStorage.setItem('mya_analytics_consent','denied');window.__seoVitals={lcp:0,cls:0,eventDuration:0};for(const type of ['largest-contentful-paint','layout-shift','event'])try{new PerformanceObserver(list=>{for(const e of list.getEntries()){if(type==='largest-contentful-paint')window.__seoVitals.lcp=e.startTime;if(type==='layout-shift'&&!e.hadRecentInput)window.__seoVitals.cls+=e.value;if(type==='event'&&e.interactionId)window.__seoVitals.eventDuration=Math.max(window.__seoVitals.eventDuration,e.duration);}}).observe({type,buffered:true,durationThreshold:16});}catch{}});
  const page=await c.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base+'/catalogo',{waitUntil:'domcontentloaded'});
  const productPath=await page.locator('article a[href^="/producto/"]').first().getAttribute('href');assert.ok(productPath);
  for(const route of ['/',productPath])for(const width of [390,1440]){
    await page.setViewportSize({width,height:900});await page.goto(base+route,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1200);
    const metrics=await page.evaluate(()=>({ ...window.__seoVitals,ttfb:performance.getEntriesByType('navigation')[0].responseStart,jsBytes:performance.getEntriesByType('resource').filter(e=>e.initiatorType==='script').reduce((n,e)=>n+e.transferSize,0),overflow:document.documentElement.scrollWidth>innerWidth }));
    report.vitals.push({route,width,...metrics});assert.equal(metrics.overflow,false);
  }
  if(!baseline){
    const routes=['/','/catalogo','/catalogo?category=cosmetica-coreana','/catalogo?brand=SKIN1004','/catalogo?page=2','/catalogo?brand=SKIN1004&page=2','/catalogo?q=centella','/catalogo?category=cosmetica-coreana&brand=SKIN1004',productPath,'/condiciones','/privacidad','/sorteo'];
    const titles=new Set();
    for(const route of routes){
      const r=await get(route);assert.equal(r.status,200,route);const canonical=decode(r.body.match(/rel="canonical" href="([^"]+)"/)?.[1]||'');assert.ok(canonical.startsWith(official),route+' canonical');assert.ok(equivalent(canonical,official+route),route+' self canonical');
      const title=r.body.match(/<title>(.*?)<\/title>/)?.[1];assert.ok(title,route+' title');
      if(!route.includes('q=')&&!route.includes('&brand=')){assert.ok(!titles.has(title),'duplicate title '+title);titles.add(title);}
      if(route.includes('q=')||route.includes('&brand='))assert.match(r.body,/<meta name="robots" content="noindex, follow"/);
      const ld=[...r.body.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1]));assert.ok(ld.some(x=>x['@type']==='Organization'));
      if(route.startsWith('/producto/')){const product=ld.find(x=>x['@type']==='Product');assert.ok(product?.offers?.price>0);assert.ok(!product.offers.shippingDetails);assert.ok(!product.offers.hasMerchantReturnPolicy);assert.ok(r.body.includes(product.name.replaceAll('&','&amp;')));}
      report.requests.push({route,status:r.status,ms:r.ms,bytes:r.bytes,canonical,title});
    }
    for(const route of ['/producto/producto-inexistente-seo-qa','/catalogo?category=no-existe','/catalogo?brand=MarcaInexistente','/catalogo?page=199']){const r=await get(route);assert.equal(r.status,404,route);}
    const robots=await get('/robots.txt');assert.equal(robots.status,200);assert.ok(robots.body.includes(official+'/sitemap.xml'));assert.ok(!robots.body.includes('Disallow: /login'));assert.ok(!robots.body.includes('Disallow: /_next'));
    const sitemap=await get('/sitemap.xml');assert.equal(sitemap.status,200);assert.ok(!sitemap.body.includes('<lastmod>'));const urls=[...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>decode(x[1]));assert.ok(urls.length>400);assert.equal(new Set(urls).size,urls.length);assert.ok(urls.every(u=>u.startsWith(official)&&!/[?&](q|page|sort)=/.test(u)));report.sitemapUrls=urls.length;
    const feed=await get('/api/catalog/google-feed');assert.equal(feed.status,200);report.feedItems=(feed.body.match(/<item>/g)||[]).length;assert.ok(report.feedItems>400);assert.ok(!feed.body.includes('identifier_exists'));assert.ok(!feed.body.includes('google_product_category'));
    const xmlErrors=await page.evaluate(xml=>{const doc=new DOMParser().parseFromString(xml,'application/xml');return doc.querySelector('parsererror')?.textContent||'';},feed.body);assert.equal(xmlErrors,'');
    await page.goto(base+productPath,{waitUntil:'load'});
    const add=page.getByRole('button',{name:/Agregar al carrito/i}).first();if(await add.isVisible()){await add.click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mm-cart')||'[]').length>0);const cart=await page.evaluate(()=>JSON.parse(localStorage.getItem('mm-cart')));assert.equal(cart[0].quantity,1);await page.reload({waitUntil:'load'});assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('mm-cart'))[0].quantity),1);report.cartButton='added and persisted after reload';}else report.warnings.push('El producto elegido requiere consulta de disponibilidad.');
    await page.goto(base+'/checkout',{waitUntil:'domcontentloaded'});assert.ok(await page.locator('h1').count());
    await page.goto(base+'/login',{waitUntil:'domcontentloaded'});assert.equal(await page.getByLabel('Contraseña',{exact:true}).count(),1);
    const admin=await c.request.get(base+'/api/admin/sorteo');assert.equal(admin.status(),401);report.adminStatus=admin.status();
    for(const width of [320,390,768,1280,1440])for(const [route,name] of [['/catalogo','catalog'],[productPath,'product']]){
      await page.setViewportSize({width,height:900});await page.goto(base+route,{waitUntil:'load'});await page.evaluate(()=>window.scrollTo(0,0));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' '+width);await page.screenshot({path:`${out}/${label}-${name}-${width}.png`,fullPage:true});report.screens.push({name,width});
    }
    await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});const axe=await page.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));report.axeViolations=axe.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.length}));
    await page.screenshot({path:`${out}/${label}-preview.png`,fullPage:false});
    if(process.env.SEO_CRAWL==='1'){
      const pending=[...urls],failures=[],seen=new Map();let completed=0;
      await Promise.all(Array.from({length:4},async()=>{while(pending.length){const url=pending.shift(),route=new URL(url).pathname+new URL(url).search;const r=await get(route);if(r.status!==200){failures.push({route,status:r.status});continue;}const canonical=decode(r.body.match(/rel="canonical" href="([^"]+)"/)?.[1]||'');if(!equivalent(canonical,url))failures.push({route,error:'canonical mismatch',canonical});const title=r.body.match(/<title>(.*?)<\/title>/)?.[1];if(seen.has(title))failures.push({route,error:'duplicate title',other:seen.get(title)});seen.set(title,route);completed++;if(completed%100===0)console.log('SEO crawl '+completed+'/'+urls.length);}}));report.crawl={completed,failures};assert.deepEqual(failures,[]);
    }
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.blockedWrites,[]);
  }
  await writeFile(`${out}/${label}-verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
