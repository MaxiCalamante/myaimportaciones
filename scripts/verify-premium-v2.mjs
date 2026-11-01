import {chromium,webkit} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
const base=process.argv[2]||'http://localhost:3000',out='docs/premium-ux-v2/evidence';await mkdir(out,{recursive:true});
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
const cats=await db.from('categories').select('id,slug,parent_id,is_wholesale_only');if(cats.error)throw cats.error;
const products=await db.from('products').select('id,slug,title,has_variants').eq('is_active',true).eq('is_wholesale_only',false).is('deleted_at',null).limit(500);if(products.error)throw products.error;
const summary={widths:[],categories:[],products:[],consoleErrors:[],networkErrors:[],webkit:null};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
await context.addInitScript(()=>{localStorage.setItem('mya_analytics_consent','denied');document.addEventListener('DOMContentLoaded',()=>{const style=document.createElement('style');style.textContent='nextjs-portal{display:none!important}';document.head.append(style);});});
const page=await context.newPage();page.on('pageerror',e=>summary.consoleErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)summary.networkErrors.push({status:r.status(),url:r.url().split('?')[0]});});
const ensure= (value,label)=>{if(!value)throw new Error(label);};
try{
for(const width of [320,375,390,430,768,1024,1440]){
 await page.setViewportSize({width,height:900});await page.goto(base,{waitUntil:'networkidle',timeout:60000});await page.locator('[data-product-card]').first().waitFor();
 const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,cards:[...document.querySelectorAll('[data-product-card]')].slice(0,4).map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),productY:document.querySelector('[data-product-card]')?.getBoundingClientRect().top,variantLinks:document.querySelectorAll('[data-variant-preview] a').length}));
 ensure(!metrics.overflow,`home overflow ${width}`);if(width<768)ensure(metrics.productY<800,`products too late ${width}`);ensure(!metrics.variantLinks,'Cards must not expand variant links');if(width<768)ensure(metrics.cards[0].width<width/2,'Two mobile columns');
 await page.screenshot({path:`${out}/after-home-${width}.jpg`,fullPage:true,quality:80});summary.widths.push({width,...metrics});
 if(width<1280){await page.getByRole('button',{name:'Abrir menu',exact:true}).click();const menu=page.getByRole('dialog');await menu.waitFor();ensure(await menu.getByRole('link',{name:/mayorista/i}).count()>0,'wholesale menu');ensure(await menu.getByRole('link',{name:/admin/i}).count()===0,'guest admin hidden');ensure(await page.evaluate(()=>document.body.style.overflow)==='hidden','body locked');await page.screenshot({path:`${out}/after-menu-${width}.jpg`,fullPage:true,quality:80});await page.keyboard.press('Escape');await menu.waitFor({state:'detached'});}
}
await page.setViewportSize({width:390,height:844});await page.goto(base+'/catalogo',{waitUntil:'networkidle'});await page.locator('[data-product-card]').first().waitFor();ensure(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'catalog overflow');await page.screenshot({path:`out/catalog-390.jpg`.replace('out/',out+'/'),fullPage:true,quality:80});
for(const p of [products.data.find(p=>p.has_variants),products.data.find(p=>!p.has_variants)].filter(Boolean)){
 const res=await page.goto(base+'/producto/'+p.slug,{waitUntil:'networkidle'});ensure(res.status()===200,'product200');ensure(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'pdp overflow');await page.screenshot({path:`${out}/product-${p.has_variants?'variants':'simple'}-390.jpg`,fullPage:true,quality:80});summary.products.push({slug:p.slug,hasVariants:p.has_variants,status:res.status()});
 if(p.has_variants){const options=page.locator('#variant-options-section button');if(await options.count()){await options.first().click();await page.screenshot({path:`${out}/variant-selected-390.jpg`,fullPage:true,quality:80});}}
}
await page.goto(base,{waitUntil:'networkidle'});await page.getByRole('button',{name:'Abrir carrito',exact:true}).click();await page.screenshot({path:`${out}/cart-390.jpg`,fullPage:true,quality:80});await page.keyboard.press('Escape');
// Real category slugs; empty existing categories remain valid catalogue pages.
for(const c of cats.data.filter(c=>!c.is_wholesale_only)){const response=await context.request.get(base+'/catalogo?category='+encodeURIComponent(c.slug));summary.categories.push({slug:c.slug,sub:!!c.parent_id,status:response.status()});ensure(response.status()===200,'category failed: '+c.slug);}
ensure(summary.consoleErrors.length===0,'browser page errors');
try{const wb=await webkit.launch({headless:true});const wp=await wb.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await wp.addInitScript(()=>localStorage.setItem('mya_analytics_consent','denied'));await wp.goto(base,{waitUntil:'networkidle'});ensure(!(await wp.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'WebKit overflow');await wp.screenshot({path:`${out}/webkit-home-390.jpg`,fullPage:true,quality:80});summary.webkit={passed:true};await wb.close();}catch(e){summary.webkit={passed:false,reason:e.message.slice(0,300)};}
}finally{await writeFile(`${out}/results.json`,JSON.stringify(summary,null,2));await browser.close();}
console.log(JSON.stringify(summary));
