import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const preview=process.env.STOREFRONT_QA_PREVIEW?JSON.parse(await readFile('scratch/suppliers-private/frontend-preview-access.json','utf8')):null;
const base=preview?.base||process.env.STOREFRONT_QA_URL||'http://127.0.0.1:3107';
const out=resolve('../scratch/storefront-premium-20261020',preview?'preview':base.includes('127.0.0.1')?'local':'production');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,timeout:60000});
const results=[],errors=[],blockedWrites=[];
async function shot(page,path){
 await page.evaluate(()=>Promise.race([Promise.all([...document.images].filter(img=>{const r=img.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0;}).map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});}))),new Promise(resolve=>setTimeout(resolve,5000))]));
 return page.screenshot({path,timeout:120000,animations:'disabled',caret:'hide'});
}
const routes=process.argv.includes('--smoke')?['/catalogo','/producto/apple-iphone-17-pro-max']:process.argv.includes('--focus')?['/catalogo','/producto/apple-iphone-17-pro-max','/checkout']:['/','/catalogo','/catalogo?q=Medicube','/catalogo?q=zzzz-mya-sin-resultados','/producto/apple-iphone-17-pro-max','/favoritos','/checkout','/seguimiento','/login','/register','/condiciones','/privacidad'];
const selectedWidth=process.argv.find(arg=>arg.startsWith('--width='));
const widths=selectedWidth?[Number(selectedWidth.split('=')[1])]:process.argv.includes('--smoke')||process.argv.includes('--focus')?[320,390]:[320,390,768,1440];
async function geometry(page,label,width){
 const state=await page.evaluate(()=>{
  const viewport=document.documentElement.clientWidth;
  const overflowing=[...document.querySelectorAll('main *,.product-buy-bar *')].filter(e=>{
   const r=e.getBoundingClientRect();if(!r.width||getComputedStyle(e).visibility==='hidden'||r.right<=viewport+1&&r.left>=-1)return false;
   for(let parent=e.parentElement;parent;parent=parent.parentElement){if(['auto','scroll','hidden','clip'].includes(getComputedStyle(parent).overflowX))return false;}
   return r.right>viewport+1||r.left<-1;
  }).slice(0,8).map(e=>({tag:e.tagName,text:e.textContent?.slice(0,70),class:e.className}));
  const bar=document.querySelector('.product-buy-bar');
  const price=bar?.querySelector('p.tabular-nums');
  const brokenPrices=[...document.querySelectorAll('[data-product-price]')].filter(p=>p.scrollWidth>p.clientWidth+1).map(p=>p.textContent);
  const collapsedImages=[...document.querySelectorAll('main article img')].filter(img=>img.getBoundingClientRect().width>0&&img.getBoundingClientRect().height<2).map(img=>img.alt);
  return{width:viewport,scroll:document.documentElement.scrollWidth,overflowing,brokenPrices,collapsedImages,barPriceFits:!price||price.scrollWidth<=price.clientWidth+1};
 });
 results.push({label,width,...state});assert(state.scroll<=state.width+1,`${label} ${width}: document overflow`);assert.deepEqual(state.overflowing,[],`${label} ${width}: visible overflowing elements`);assert.deepEqual(state.brokenPrices,[],`${label}: card price clipped`);assert.deepEqual(state.collapsedImages,[],`${label}: product image collapsed`);assert(state.barPriceFits,`${label}: sticky price clipped`);
}
try{
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768,deviceScaleFactor:1});
  await context.addInitScript(()=>localStorage.setItem('mya_analytics_consent','denied'));
  await context.route('**/*',route=>{const request=route.request();if(!['GET','HEAD','OPTIONS'].includes(request.method())){blockedWrites.push({method:request.method(),url:request.url().split('?')[0]});return route.abort();}if(/google-analytics|googletagmanager|doubleclick|facebook.net/.test(request.url()))return route.abort();return route.continue();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push({width,message:error.message}));
  if(preview)await page.goto(`${base}/?_vercel_share=${encodeURIComponent(preview.secret)}`,{waitUntil:'domcontentloaded',timeout:60000});
  for(const path of routes){
   const response=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:120000});assert(response?.ok(),`${path}: HTTP ${response?.status()}`);assert.equal(new URL(page.url()).origin,base,`${path}: unexpected redirect`);await page.waitForTimeout(350);
   await geometry(page,path,width);
   if(path.startsWith('/producto/')){
    await page.locator('[data-product-actions]').scrollIntoViewIfNeeded();
    await shot(page,resolve(out,`product-actions-${width}.png`));
    const contact=page.getByRole('button',{name:'Consultar por WhatsApp',exact:true}).first();await contact.click();
    const dialog=page.getByRole('dialog',{name:'Hablemos de tu compra'});await dialog.waitFor();assert.equal(await dialog.locator('a[href*="wa.me"],a[href*="whatsapp.com"]').count(),2);
    await geometry(page,'contact dialog',width);await shot(page,resolve(out,`contact-${width}.png`));await page.keyboard.press('Escape');
    await page.evaluate(()=>scrollTo(0,document.body.scrollHeight*.75));await page.waitForTimeout(300);
    if(width<768){await page.getByRole('region',{name:'Acciones rápidas de compra'}).waitFor();await geometry(page,'sticky purchase',width);await shot(page,resolve(out,`sticky-${width}.png`));}
   }
   if(path==='/catalogo'){
    await shot(page,resolve(out,`catalog-${width}.png`));
    if(width<640){await page.getByRole('button',{name:/^Filtros/}).click();await page.getByRole('dialog',{name:'Filtros del catálogo'}).waitFor();await geometry(page,'filters',width);await shot(page,resolve(out,`filters-${width}.png`));await page.keyboard.press('Escape');}
   }
   console.log(JSON.stringify({checked:path,width}));
  }
  if(!process.argv.includes('--smoke')){
   await page.goto(base+'/producto/apple-iphone-17-pro-max',{waitUntil:'domcontentloaded'});
   const actions=page.locator('[data-product-actions]');await actions.waitFor();
   const unit=Number((await page.locator('[data-product-purchase] > div').first().locator('p').nth(1).innerText()).replace(/[^0-9]/g,''));
   const increment=actions.getByRole('button',{name:'Aumentar cantidad',exact:true});
   await expect(increment).toBeEnabled();await increment.click();await expect(actions.locator('output')).toHaveText('2');
   await actions.getByRole('button',{name:'Agregar al carrito',exact:true}).click();
   const cart=page.getByRole('dialog',{name:'Carrito',exact:true});await cart.waitFor();await expect(cart.locator('output').first()).toHaveText('2');
   await geometry(page,'populated cart',width);await shot(page,resolve(out,`cart-${width}.png`));
   await cart.getByRole('button',{name:'Cerrar carrito'}).click();
   if(width<768){await page.evaluate(()=>scrollTo(0,document.body.scrollHeight*.75));await page.waitForTimeout(200);const total=await page.locator('.product-buy-bar p.tabular-nums').innerText();assert.equal(Number(total.replace(/[^0-9]/g,'')),unit*2,'Sticky total must include the selected quantity');await geometry(page,'two-unit sticky total',width);}
   await page.goto(base+'/checkout',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Finalizar compra'}).waitFor();await page.locator('main').getByText(/2 × Apple iPhone 17 Pro Max/).first().waitFor({timeout:30000});await geometry(page,'populated checkout',width);await shot(page,resolve(out,`checkout-${width}.png`));
   if(width<768){
    await page.goto(base+'/catalogo',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Buscar productos',exact:true}).click();await page.locator('#mobile-search-input').fill('Medicube');
    const result=page.locator('#mobile-site-menu button').filter({has:page.locator('img')}).first();await result.waitFor({timeout:30000});await geometry(page,'mobile search results',width);await shot(page,resolve(out,`search-${width}.png`));await result.click();await page.waitForURL('**/producto/**');assert.equal(await page.getByRole('dialog').count(),0,'Search must open a full product page');
   }
   console.log(JSON.stringify({interactions:'quantity, cart, checkout and search',width}));
  }
  await context.close();
 }
 assert.deepEqual(errors,[],'Runtime JavaScript errors');
 await writeFile(resolve(out,'report.json'),JSON.stringify({base,checkedAt:new Date().toISOString(),results,errors,blockedWrites},null,2));
 console.log(JSON.stringify({out,views:results.length,errors,blockedWrites}));
}finally{await browser.close();}
