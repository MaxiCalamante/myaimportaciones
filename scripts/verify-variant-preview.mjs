// Public read-only browser verification; does not place orders or send messages.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
const base=process.env.SEO_BASE_URL||'http://localhost:3118';
const out=process.env.SEO_QA_OUT||'docs/seo/qa-private/variant-preview-2026-10-25/local';
await fs.mkdir(out,{recursive:true});
const cache=path.join(process.env.LOCALAPPDATA,'ms-playwright');
const installed=(await fs.readdir(cache)).filter(x=>/^chromium-\d+$/.test(x)).sort((a,b)=>Number(b.split('-')[1])-Number(a.split('-')[1]));
const browser=await chromium.launch({headless:true,executablePath:path.join(cache,installed[0],'chrome-win64','chrome.exe')});
const report={base,at:new Date().toISOString(),views:[],flows:[],errors:[],images:[],writes:[]};
async function noOverflow(page,label){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label}: page overflow`);assert.deepEqual(await page.locator('[data-variant-preview]').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)),[],`${label}: preview overflow`);}
try{
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:1000}});
  await context.route('**/*',async route=>{const req=route.request();if(!['GET','HEAD'].includes(req.method())){report.writes.push(req.url());return route.abort();}if(/google-analytics|googletagmanager|facebook\.net|facebook\.com/.test(req.url()))return route.abort();if(req.headers()['next-router-prefetch']==='1')return route.abort();return route.continue();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  for(const category of ['perfumeria','electronica','cosmetica-coreana']){
   const url=`${base}/catalogo?category=${category}`;const response=await page.goto(url,{waitUntil:'networkidle'});assert.equal(response.status(),200);
   await page.locator('[data-variant-preview]').first().waitFor();await noOverflow(page,`${category}/${width}`);
   const previews=await page.locator('[data-variant-preview]').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,links:n.querySelectorAll('a[href*="variant="]').length})));
   assert.ok(previews.length);assert.ok(previews.every(p=>p.links<=2&&p.links>0));
   await page.screenshot({path:`${out}/${category}-${width}.png`,fullPage:true});report.views.push({category,width,previews});
   const choice=page.locator('[data-variant-preview] a[href*="variant="]').nth(1);
   const selected=await choice.getAttribute('title'),href=await choice.getAttribute('href'),image=await choice.locator('img').getAttribute('src').catch(()=>null);
   await choice.click();await page.waitForURL(u=>u.pathname.startsWith('/producto/')&&u.searchParams.has('variant'));await page.waitForLoadState('networkidle');
   assert.equal(new URL(page.url()).searchParams.get('variant'),new URL(href,base).searchParams.get('variant'));
   await page.locator('#variant-options-section button[aria-pressed="true"]').first().waitFor();
   const selectedTexts=await page.locator('#variant-options-section button[aria-pressed="true"]').allTextContents();assert.ok(selectedTexts.length,'Selected options must exist');
   assert.ok(await page.locator('main').getByText(selected,{exact:true}).count(),`Selected variant title missing: ${selected}`);
   if(image)assert.equal(await page.getByRole('button',{name:/Ampliar foto de/}).locator('img').getAttribute('src'),image);
   await noOverflow(page,`detail/${category}/${width}`);report.flows.push({category,width,selected,href,selectedTexts});
  }
  // New family and repaired legacy families must expose the real edition rows.
  for(const slug of ['lattafa-ana-abiyedh-eau-de-parfum-60-ml','lattafa-fakhar-eau-de-parfum-100-ml','lattafa-khamrah-eau-de-parfum-100-ml','lattafa-yara-eau-de-parfum-100-ml']){
   const response=await page.goto(`${base}/producto/${slug}`,{waitUntil:'networkidle'});assert.equal(response.status(),200,slug);
   const expected=slug.includes('khamrah')?1:2;
   assert.ok(await page.locator('#variant-options-section button').count()>=expected,`${slug}: actual editions`);await noOverflow(page,`${slug}/${width}`);
   await page.screenshot({path:`${out}/${slug}-${width}.png`,fullPage:true});report.views.push({slug,width});
  }
  await page.goto(`${base}/mayorista/perfumeria`,{waitUntil:'networkidle'});
  await page.locator('[data-variant-preview]').first().waitFor();await noOverflow(page,`wholesale/${width}`);
  assert.ok(!(await page.content()).includes('"wholesalePrice"'),'Wholesale page must keep prices private');
  await page.locator('article').filter({has:page.locator('[data-variant-preview]')}).first().screenshot({path:`${out}/wholesale-card-${width}.png`});
  report.views.push({route:'/mayorista/perfumeria',width});
  await context.close();
 }
 const html=await(await fetch(`${base}/producto/lattafa-ana-abiyedh-eau-de-parfum-60-ml`)).text();
 assert.ok(!/origin_cost|supplier_url|atacadousa\.com\.py/.test(html),'Private supplier evidence must stay private');
 assert.ok(html.includes('25700')&&html.includes('34400'),'Both real retail prices must be rendered');
 const canonical=html.match(/rel="canonical" href="([^"]+)"/)?.[1];assert.equal(canonical,'https://myaimportaciones.com/producto/lattafa-ana-abiyedh-eau-de-parfum-60-ml');
 assert.ok((await(await fetch(`${base}/sitemap.xml`)).text()).includes(canonical),'New family in sitemap');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);
 await fs.writeFile(`${out}/verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({views:report.views.length,flows:report.flows.length,errors:report.errors,writes:report.writes}));
}catch(error){await fs.writeFile(`${out}/failure.json`,JSON.stringify({error:String(error),report,pages:browser.contexts().flatMap(c=>c.pages().map(p=>p.url()))},null,2));for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();}
