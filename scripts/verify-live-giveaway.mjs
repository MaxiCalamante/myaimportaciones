// Local-only HTTP fixtures + real Postgres functions. Never points Next at production Supabase.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile,mkdir,writeFile,readdir } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { chromium } from '@playwright/test';
import { consoleFixture } from './instagram-export-fixture.mjs';
const base='http://localhost:3114',databaseUrl='http://127.0.0.1:3115',out='docs/sorteos/qa-private';
const adminId='11111111-1111-4111-8111-111111111111',customerId='22222222-2222-4222-8222-222222222222';
const db=new PGlite();
let next,browser;
await mkdir(out,{recursive:true});
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
  create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
  create function public.is_admin() returns boolean language sql as $$ select true $$;`);
await db.exec(await readFile('supabase/migrations/20261014140000_live_giveaway.sql','utf8'));
await db.exec('set role service_role');
function fakeJwt(id){return [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test-only-signature'].join('.');}
function authId(req){try{const token=(req.headers.authorization||'').replace('Bearer ','');return JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).sub;}catch{return null;}}
function send(res,value,status=200,extra={}){res.writeHead(status,{'Content-Type':'application/json',...extra});res.end(JSON.stringify(value));}
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,databaseUrl);
    if(url.pathname==='/auth/v1/user'){
      const id=authId(req);if(![adminId,customerId].includes(id))return send(res,{error:'unauthorized'},401);
      return send(res,{id,aud:'authenticated',role:'authenticated',email:'fixture@example.test',user_metadata:{full_name:'Cuenta de prueba'},app_metadata:{provider:'email'},created_at:new Date().toISOString()});
    }
    if(url.pathname==='/rest/v1/profiles'){const id=(url.searchParams.get('id')||'').replace('eq.','');const profile={id,full_name:'Cuenta de prueba',email:'fixture@example.test',role:id===adminId?'admin':'customer',customer_tier:'retail'};return send(res,req.headers.accept?.includes('object')?profile:[profile]);}
    if(url.pathname==='/rest/v1/giveaway_campaign'){return send(res,(await db.query('select * from giveaway_campaign where id=1')).rows[0]);}
    if(url.pathname==='/rest/v1/giveaway_rounds'){const id=(url.searchParams.get('id')||'').replace('eq.','');const row=(await db.query('select * from giveaway_rounds where id=$1',[id])).rows[0];return row?send(res,row):send(res,{message:'not found'},404);}
    if(url.pathname.startsWith('/rest/v1/rpc/')){
      let input='';for await(const chunk of req)input+=chunk;const body=input?JSON.parse(input):{};
      const fn=url.pathname.split('/').at(-1);
      if(fn==='public_giveaway_v1')return send(res,(await db.query('select public_giveaway_v1() data')).rows[0].data);
      const args={giveaway_save_v1:['revision_input','config_input','dataset_input','snapshot_input','reason_input','actor_input'],giveaway_start_v1:['revision_input','audit_input','mode_input','expected_round','actor_input'],giveaway_review_v1:['revision_input','round_input','audit_input','action_input','actor_input']}[fn];
      if(args){const values=args.map(k=>typeof body[k]==='object'&&body[k]!==null?JSON.stringify(body[k]):body[k]??null);return send(res,(await db.query(`select ${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) data`,values)).rows[0].data);}
      return send(res,[],200);
    }
    return send(res,[],200);
  }catch(e){return send(res,{code:e.code||'FIXTURE',message:e.message},400);}
});
await new Promise(resolve=>server.listen(3115,'127.0.0.1',resolve));
const errors=[],blocked=[];
try{
  next=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--port','3114','--hostname','127.0.0.1'],{
    cwd:process.cwd(),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,NEXT_DIST_DIR:'.next-giveaway-qa',NEXT_PUBLIC_SITE_URL:base,NEXT_PUBLIC_SUPABASE_URL:databaseUrl,NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon-key',SUPABASE_SERVICE_ROLE_KEY:'fixture-service-key-private-32-characters',GIVEAWAY_AUDIT_SECRET:'fixture-audit-key-private-32-characters',COMMERCE_CHECKOUT_ENABLED:'false',COMMERCE_EMAIL_ENABLED:'false',NEXT_PUBLIC_GA_MEASUREMENT_ID:'',NEXT_PUBLIC_META_PIXEL_ID:''}
  });
  let logs='';next.stdout.on('data',b=>{logs+=b;});next.stderr.on('data',b=>{logs+=b;});
  for(let i=0;i<180;i++){try{const r=await fetch(base+'/sorteo');if(r.ok)break;}catch{}if(next.exitCode!==null)throw new Error('Next local no inició: '+logs.slice(-1200));if(i===179)throw new Error('Tiempo agotado al iniciar Next local.');await new Promise(r=>setTimeout(r,500));}
  const cache=path.join(process.env.LOCALAPPDATA||'','ms-playwright'),installed=(await readdir(cache)).filter(d=>/^chromium-\d+$/.test(d)).sort((a,b)=>Number(b.split('-')[1])-Number(a.split('-')[1]));
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||path.join(cache,installed[0],'chrome-win64','chrome.exe')});
  async function context(viewport,authenticated=false){
    const c=await browser.newContext({viewport});
    await c.route('**/*',async route=>{const u=new URL(route.request().url());if(['localhost','127.0.0.1'].includes(u.hostname))await route.continue();else{blocked.push(u.origin);await route.abort();}});
    await c.addInitScript(()=>localStorage.setItem('mya_analytics_consent','denied'));
    if(authenticated){const token=fakeJwt(adminId),session={access_token:token,refresh_token:'test-only-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:adminId,email:'fixture@example.test',aud:'authenticated'}};await c.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'}]);}
    return c;
  }
  const ac=await context({width:1440,height:1000},true),vc=await context({width:1440,height:1000}),mc=await context({width:390,height:844});
  const admin=await ac.newPage(),viewer=await vc.newPage(),mobile=await mc.newPage();for(const p of [admin,viewer,mobile])p.on('pageerror',e=>errors.push(e.message));
  // Wrong client time must not alter the shared timeline or winner.
  await mobile.addInitScript(()=>{const original=Date.now.bind(Date);Date.now=()=>original()+7*60000;});
  await admin.goto(base+'/admin/sorteo',{waitUntil:'networkidle'});
  await admin.getByRole('heading',{name:'MYA Sorteo en vivo',exact:true}).waitFor();
  const exported=await consoleFixture(browser);
  const scriptDenied=await vc.request.get(base+'/api/admin/sorteo/script');assert.equal(scriptDenied.status(),401);
  await admin.getByRole('button',{name:'Importar de Instagram',exact:true}).click();await admin.getByLabel('Pegá el JSON de Instagram').fill(JSON.stringify(exported));await admin.getByRole('button',{name:'Revisar comentarios de Instagram',exact:true}).click();assert.equal(await admin.getByRole('button',{name:'Guardar lista privada y anuncio',exact:true}).isEnabled(),false);await admin.getByLabel('Revisé la cobertura de los comentarios y respuestas antes de guardar esta lista.').check();
  const noAck=await ac.request.post(base+'/api/admin/sorteo',{headers:{Origin:base},data:{action:'import',kind:'instagram-export',revision:0,config:{title:'SORTEO DÍA DE LA MADRE',prize:'Travel Kit SKIN1004 Centella',permalink:exported.postUrl,scheduledFor:null,published:false},rules:{owner:'_myaimportaciones',requireMention:true,cutoff:'2026-10-18T23:59:59-03:00',allowUndated:false,manualExclusions:{}},text:JSON.stringify(exported)}});assert.equal(noAck.status(),400);
  await admin.getByLabel('Publicar el anuncio, contador y cantidad en /sorteo').check();
  for(const width of [320,390]){await admin.setViewportSize({width,height:844});await admin.screenshot({path:path.join(out,`instagram-import-${width}.png`),fullPage:true});assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  await admin.setViewportSize({width:1440,height:1000});
  await admin.getByRole('button',{name:'Guardar lista privada y anuncio'}).click();await admin.getByText('Lista guardada en privado.',{exact:false}).waitFor();await admin.screenshot({path:path.join(out,'admin-preparado.png'),fullPage:true});
  await viewer.goto(base+'/sorteo',{waitUntil:'domcontentloaded'});await mobile.goto(base+'/sorteo',{waitUntil:'domcontentloaded'});
  const denied=await vc.request.get(base+'/api/admin/sorteo');assert.equal(denied.status(),401);
  await admin.getByLabel('Grabar el escenario en video vertical').check();
  await admin.getByRole('button',{name:'INICIAR EN VIVO',exact:true}).click();await admin.getByLabel('Revisé la lista guardada, exclusiones y reglas. Confirmo el inicio público.').check();await admin.getByRole('button',{name:'Confirmar e iniciar en vivo'}).click();
  await viewer.getByRole('heading',{name:'Estamos por comenzar',exact:true}).waitFor({timeout:15000});await mobile.getByRole('heading',{name:'Estamos por comenzar',exact:true}).waitFor({timeout:15000});
  const during=await (await vc.request.get(base+'/api/sorteo')).json();assert.equal(during.winner,null);assert.equal(during.participantCount,2);assert.ok(!JSON.stringify(during).includes('words'));assert.ok(!JSON.stringify(during).includes('comments'));assert.ok(!JSON.stringify(during).includes('manualExclusions'));
  await viewer.screenshot({path:path.join(out,'contador-sincronizado.png'),fullPage:true});
  await viewer.getByRole('heading',{name:'La suerte está girando…',exact:true}).waitFor({timeout:15000});await viewer.screenshot({path:path.join(out,'ruleta-publica.png'),fullPage:true});
  const mid=await (await vc.request.get(base+'/api/sorteo')).json();assert.equal(mid.winner,null);assert.equal(mid.reel.length,2);
  await viewer.getByRole('heading',{name:'¡Tenemos ganador!',exact:true}).waitFor({timeout:20000});await mobile.getByRole('heading',{name:'¡Tenemos ganador!',exact:true}).waitFor({timeout:10000});
  const winner=(await viewer.getByText(/^@fixture\./,{exact:true}).innerText());assert.equal(await mobile.getByText(/^@fixture\./,{exact:true}).innerText(),winner);
  await viewer.reload({waitUntil:'domcontentloaded'});await viewer.getByRole('heading',{name:'¡Tenemos ganador!',exact:true}).waitFor();assert.equal(await viewer.getByText(/^@fixture\./,{exact:true}).innerText(),winner);
  assert.equal(await viewer.getByRole('button',{name:'INICIAR EN VIVO'}).count(),0);
  await admin.getByLabel('Comprobé que sigue a MYA').check();await admin.getByLabel('Comprobé el like',{exact:true}).check();await admin.getByLabel('Revisé la historia compartida').check();await admin.getByRole('button',{name:'Registrar revisión',exact:false}).click();await viewer.getByText('MYA registró la revisión manual de las condiciones.',{exact:true}).waitFor({timeout:10000});
  await admin.getByRole('button',{name:'Descargar video',exact:true}).waitFor();await admin.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Descargar video'&&!b.disabled),{timeout:10000});
  const videoDownload=admin.waitForEvent('download');await admin.getByRole('button',{name:'Descargar video',exact:true}).click();const video=await videoDownload;await video.saveAs(path.join(out,'video-sorteo-fixture.mp4'));
  const pngDownload=admin.waitForEvent('download');await admin.getByRole('button',{name:'Imagen 1080 × 1920',exact:true}).click();const png=await pngDownload,pngPath=path.join(out,'ganador-fixture.png');await png.saveAs(pngPath);const pngBytes=await readFile(pngPath);assert.equal(pngBytes.readUInt32BE(16),1080);assert.equal(pngBytes.readUInt32BE(20),1920);
  const widths=[];
  for(const width of [320,390,768,1440]){await viewer.setViewportSize({width,height:900});await viewer.screenshot({path:path.join(out,`publico-${width}.png`),fullPage:true});assert.equal(await viewer.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);widths.push(width);}
  await admin.setViewportSize({width:390,height:844});await admin.screenshot({path:path.join(out,'admin-mobile.png'),fullPage:true});assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await viewer.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const axe=await viewer.evaluate(async()=>await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  assert.deepEqual(errors,[]);const report={at:new Date().toISOString(),fixtureOnly:true,tests:{importAndAdmin:true,consoleScriptCollector:true,instagramJsonImport:true,coverageReviewRequired:true,photosAndNamesPreserved:true,guestMutationDenied:true,winnerHiddenUntilReveal:true,twoDevicesSameWinner:true,wrongDeviceClockIgnored:true,reloadKeepsWinner:true,manualReviewShared:true,privateFileNotInPublicPayload:true},widths,jsErrors:errors,axeViolations:axe.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})),externalBrowserRequestsBlocked:blocked.length};
  await writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{
  await browser?.close();if(next&&next.exitCode===null)next.kill();await new Promise(resolve=>server.close(resolve));await db.close();
}
