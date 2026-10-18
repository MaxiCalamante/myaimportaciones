// Read-only production smoke. Official draws, imports, reviews and uploads are never submitted.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const base='https://myaimportaciones.com',out='docs/sorteos/qa-private';
await mkdir(out,{recursive:true});
const api=await fetch(base+'/api/sorteo');assert.equal(api.status,200);
assert.match(api.headers.get('cache-control')||'',/no-store/);
const state=await api.json();assert.equal(state.available,true);
assert.ok(Number.isFinite(Date.parse(state.serverNow)));
if(process.env.GIVEAWAY_EXPECT_WAITING==='1'){assert.equal(state.round,null);assert.equal(state.winner,null);}
for(const field of ['snapshot','comments','selection','designatedUsername','requirementsReviewed'])assert.equal(field in state,false,field);
const htmlResponse=await fetch(base+'/sorteo');assert.equal(htmlResponse.status,200);const html=await htmlResponse.text();
assert.equal((html.match(/<title>(.*?)<\/title>/)?.[1].match(/MYA Importaciones/g)||[]).length,1);
assert.ok(html.includes('rel="canonical" href="'+base+'/sorteo"'));
const schemas=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1]));
const event=schemas.find(x=>x['@type']==='Event');assert.ok(event);
if(state.config.scheduledFor)assert.equal(Date.parse(event.startDate),Date.parse(state.config.scheduledFor));
const adminApi=await fetch(base+'/api/admin/sorteo');assert.equal(adminApi.status,401);
const adminPage=await fetch(base+'/admin/sorteo',{redirect:'manual'});assert.ok([302,303,307,308].includes(adminPage.status));
assert.equal(new URL(adminPage.headers.get('location'),base).pathname,'/login');

const cache=path.join(process.env.LOCALAPPDATA||'','ms-playwright');
const versions=(await readdir(cache)).filter(x=>/^chromium-\d+$/.test(x)).sort((a,b)=>Number(b.split('-')[1])-Number(a.split('-')[1]));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||path.join(cache,versions[0],'chrome-win64','chrome.exe')});
const report={at:new Date().toISOString(),commit:process.env.GIVEAWAY_RELEASE_SHA||null,readOnly:true,available:state.available,revision:state.revision,participants:state.participantCount,scheduledFor:state.config.scheduledFor,roundId:state.round?.id||null,hasWinner:Boolean(state.winner),privateApiStatus:adminApi.status,privatePageStatus:adminPage.status,widths:[],jsErrors:[],blockedWrites:[],brokenVisibleImages:[],axeViolations:[]};
try{
  const context=await browser.newContext();
  await context.addInitScript(()=>localStorage.setItem('mya_analytics_consent','denied'));
  await context.route('**/*',route=>{const request=route.request();if(!['GET','HEAD'].includes(request.method())){report.blockedWrites.push({method:request.method(),path:new URL(request.url()).pathname});return route.abort();}return new URL(request.url()).origin===base?route.continue():route.abort();});
  const page=await context.newPage();page.on('pageerror',e=>report.jsErrors.push(e.message));
  for(const width of [320,390,768,1280,1440]){
    await page.setViewportSize({width,height:900});await page.goto(base+'/sorteo',{waitUntil:'load'});
    await page.getByRole('heading',{level:1}).waitFor();
    const stage=page.getByRole('region',{name:'Escenario del sorteo',exact:true});await stage.scrollIntoViewIfNeeded();
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(img=>{const b=img.getBoundingClientRect();return b.top<innerHeight&&b.bottom>0;}).map(img=>img.decode().catch(()=>{})));});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);
    assert.ok((await stage.innerText()).includes(state.participantCount.toLocaleString('es-AR')+' participantes'));
    assert.equal(await page.getByLabel('Buscar ganador designado').count(),0);
    const broken=await page.evaluate(()=>[...document.images].filter(img=>{const b=img.getBoundingClientRect();return b.top<innerHeight&&b.bottom>0&&b.width>0&&img.naturalWidth===0;}).map(img=>img.alt));
    report.brokenVisibleImages.push(...broken.map(alt=>({width,alt})));
    await stage.screenshot({path:path.join(out,'production-stage-'+width+'.png')});
    await page.screenshot({path:path.join(out,'production-public-'+width+'.png'),fullPage:true});report.widths.push(width);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Ampliar el escenario',exact:true}).click();
  await page.getByRole('button',{name:'Salir · Escape',exact:true}).waitFor();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Salir · Escape',exact:true}).waitFor({state:'hidden'});
  await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
  const axe=await page.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  report.axeViolations=axe.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.length}));
  assert.deepEqual(report.jsErrors,[]);assert.deepEqual(report.blockedWrites,[]);assert.deepEqual(report.brokenVisibleImages,[]);assert.deepEqual(report.axeViolations,[]);
  await writeFile(path.join(out,'production-final-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
