import sharp from 'sharp';
// Local-only HTTP fixtures + real Postgres functions. Never points Next at production Supabase.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile,mkdir,writeFile,readdir } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { chromium } from '@playwright/test';
const base='http://localhost:3114',databaseUrl='http://127.0.0.1:3115',out='docs/sorteos/qa-private';
const adminId='11111111-1111-4111-8111-111111111111',customerId='22222222-2222-4222-8222-222222222222';
const db=new PGlite();
let next,browser;
let logs="";
const originalTsconfig=await readFile('tsconfig.json','utf8');
await mkdir(out,{recursive:true});
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
  create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
  create function public.is_admin() returns boolean language sql as $$ select true $$;`);
await db.exec(await readFile('supabase/migrations/20261014140000_live_giveaway.sql','utf8'));
await db.exec(await readFile('supabase/migrations/20261017120000_giveaway_repeat_selection.sql','utf8'));
await db.exec('set role service_role');
function fakeJwt(id){return [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test-only-signature'].join('.');}
function authId(req){try{const token=(req.headers.authorization||'').replace('Bearer ','');return JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).sub;}catch{return null;}}
function send(res,value,status=200,extra={}){res.writeHead(status,{'Content-Type':'application/json',...extra});res.end(JSON.stringify(value));}
const fixturePhoto=await sharp({create:{width:96,height:96,channels:3,background:'#80b6ad'}}).png().toBuffer();
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,databaseUrl);
    if(url.pathname==='/storage/v1/object/sign/giveaway-avatars'&&req.method==='POST'){
      let raw='';for await(const chunk of req)raw+=chunk;const {paths}=JSON.parse(raw);
      return send(res,paths.map(p=>({path:p,signedURL:`/object/sign/giveaway-avatars/${p}?token=fixture-only-photo`})),200);
    }
    if(url.pathname.startsWith('/storage/v1/object/')){res.writeHead(200,{'Content-Type':'image/png','Access-Control-Allow-Origin':'*'});res.end(fixturePhoto);return;}
    if(url.pathname==='/auth/v1/user'){
      const id=authId(req);if(![adminId,customerId].includes(id))return send(res,{error:'unauthorized'},401);
      return send(res,{id,aud:'authenticated',role:'authenticated',email:'fixture@example.test',user_metadata:{full_name:'Cuenta de prueba'},app_metadata:{provider:'email'},created_at:new Date().toISOString()});
    }
    if(url.pathname==='/rest/v1/profiles'){const id=(url.searchParams.get('id')||'').replace('eq.','');const profile={id,full_name:'Cuenta de prueba',email:'fixture@example.test',role:id===adminId?'admin':'customer',customer_tier:'retail'};return send(res,req.headers.accept?.includes('object')?profile:[profile]);}
    if(url.pathname==='/rest/v1/giveaway_campaign'){return send(res,(await db.query('select * from giveaway_campaign where id=1')).rows[0]);}
    if(url.pathname==='/rest/v1/giveaway_rounds'){const id=(url.searchParams.get('id')||'').replace('eq.','');const row=(await db.query('select * from giveaway_rounds where id=$1',[id])).rows[0];return row?send(res,url.searchParams.get('select')==='audit->draws'?{draws:row.audit.draws}:row):send(res,{message:'not found'},404);}
    if(url.pathname.startsWith('/rest/v1/rpc/')){
      let input='';for await(const chunk of req)input+=chunk;const body=input?JSON.parse(input):{};
      const fn=url.pathname.split('/').at(-1);
      if(fn==='public_giveaway_v1')return send(res,(await db.query('select public_giveaway_v1() data')).rows[0].data);
      const args={giveaway_selection_v1:['revision_input','selection_input','actor_input'],giveaway_save_v1:['revision_input','config_input','dataset_input','snapshot_input','reason_input','actor_input'],giveaway_start_v1:['revision_input','audit_input','mode_input','expected_round','actor_input'],giveaway_review_v1:['revision_input','round_input','audit_input','action_input','actor_input']}[fn];
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
    cwd:process.cwd(),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_OPTIONS:'--require '+JSON.stringify(path.resolve('scripts/giveaway-meta-fixture.cjs')),INSTAGRAM_ACCESS_TOKEN:'fixture-only-meta-token',NEXT_DIST_DIR:process.env.GIVEAWAY_QA_DIST_DIR||`.next-giveaway-qa/run-${process.pid}`,NEXT_PUBLIC_SITE_URL:base,NEXT_PUBLIC_SUPABASE_URL:databaseUrl,NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon-key',SUPABASE_SERVICE_ROLE_KEY:'fixture-service-key-private-32-characters',GIVEAWAY_AUDIT_SECRET:'fixture-audit-key-private-32-characters',COMMERCE_CHECKOUT_ENABLED:'false',COMMERCE_EMAIL_ENABLED:'false',NEXT_PUBLIC_GA_MEASUREMENT_ID:'',NEXT_PUBLIC_META_PIXEL_ID:''}
  });
  next.stdout.on('data',b=>{logs+=b;});next.stderr.on('data',b=>{logs+=b;});
  for(let i=0;i<180;i++){try{const r=await fetch(base+'/sorteo',{signal:AbortSignal.timeout(15000)});if(r.ok)break;}catch{}if(next.exitCode!==null)throw new Error('Next local no inició: '+logs.slice(-1200));if(i===179)throw new Error('Tiempo agotado al iniciar Next local.');await new Promise(r=>setTimeout(r,500));}
  console.log('Servidor de ensayo listo.');
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
  await admin.goto(base+'/admin/sorteo',{waitUntil:'domcontentloaded',timeout:120000});
  await admin.getByRole('heading',{name:'MYA Sorteo en vivo',exact:true}).waitFor({timeout:120000});
  await admin.locator('canvas[data-loaded-avatars]').waitFor();
  console.log('Administrador cargado.');
  const beforeResponse=await ac.request.get(base+'/api/admin/sorteo');if(!beforeResponse.ok())throw new Error('Admin API '+beforeResponse.status()+' '+logs.slice(-3500));const beforePreview=await beforeResponse.json();
  await admin.getByRole('button',{name:'Ensayo privado',exact:true}).click();
  for(const label of ['Contador','Ruleta','Ganador']){await admin.getByRole('button',{name:label,exact:true}).click();await admin.evaluate(()=>window.scrollTo(0,0));await admin.screenshot({path:path.join(out,'ensayo-'+label.toLowerCase()+'.png'),fullPage:true});}
  await admin.getByRole('button',{name:'Ensayar animación completa',exact:true}).click();await admin.getByRole('img',{name:/Ensayo privado, sin validez.*Ganador: @demo.pilar/}).waitFor({timeout:22000});
  console.log('Ensayo privado completo.');
  const afterPreview=await (await ac.request.get(base+'/api/admin/sorteo')).json();assert.equal(afterPreview.revision,beforePreview.revision);assert.equal(afterPreview.round,null);assert.equal(afterPreview.snapshot,null);
  await admin.getByRole('button',{name:'Vista real',exact:true}).click();
  await admin.getByRole('button',{name:'Cargar últimos comentarios',exact:true}).click();await admin.getByText('Lista guardada en privado.',{exact:false}).waitFor();
  console.log('Comentarios de prueba importados.');
  const imported=await (await ac.request.get(base+'/api/admin/sorteo')).json();assert.equal(imported.snapshot.comments.length,4);assert.equal(imported.snapshot.source.kind,'instagram');assert.equal(imported.snapshot.review.valid.length,2);assert.equal(imported.snapshot.comments.filter(c=>c.avatar&&c.displayName).length,4);
  // A second administrator updates the saved campaign while this tab stays open.
  async function remoteCampaign(config){const saved=await (await ac.request.get(base+'/api/admin/sorteo')).json();const response=await ac.request.post(base+'/api/admin/sorteo',{headers:{Origin:base},data:{action:'import',kind:'existing',revision:saved.revision,config,rules:saved.snapshot.rules}});assert.equal(response.status(),200);return response.json();}
  const remoteTitle='SORTEO COMPARTIDO ENTRE DISPOSITIVOS';
  await remoteCampaign({...imported.config,title:remoteTitle});
  await admin.waitForFunction(title=>document.querySelector('#giveaway-title')?.value===title,remoteTitle,{timeout:8000});
  await admin.locator('summary').filter({hasText:'Anuncio y horario'}).click();
  await admin.getByLabel('Título público',{exact:true}).fill('BORRADOR LOCAL SIN GUARDAR');
  const remotePrize=imported.config.prize+' · versión guardada';
  const conflicting=await remoteCampaign({...imported.config,title:remoteTitle,prize:remotePrize});
  await admin.getByRole('alert').filter({hasText:'Conservamos tus cambios sin guardar'}).waitFor({timeout:8000});
  assert.equal(await admin.getByLabel('Título público',{exact:true}).inputValue(),'BORRADOR LOCAL SIN GUARDAR');
  await admin.getByRole('button',{name:'Guardar lista privada y anuncio'}).click();
  await admin.getByRole('alert').filter({hasText:'La configuración cambió en otro dispositivo'}).waitFor();
  assert.equal((await (await ac.request.get(base+'/api/admin/sorteo')).json()).config.prize,remotePrize);
  assert.equal((await (await ac.request.get(base+'/api/admin/sorteo')).json()).revision,conflicting.revision);
  await remoteCampaign(imported.config);
  await admin.reload({waitUntil:'domcontentloaded'});await admin.locator('canvas[data-loaded-avatars]').waitFor();
  console.log('Actualización entre administradores y protección de borradores verificadas.');
  await admin.getByRole('button',{name:'Cargar últimos comentarios',exact:true}).click();await admin.getByText('Lista guardada en privado.',{exact:false}).waitFor();const refreshed=await (await ac.request.get(base+'/api/admin/sorteo')).json();assert.equal(refreshed.snapshot.comments.length,4);
  await admin.getByLabel('Publicar el anuncio, contador y cantidad en /sorteo').check();
  await admin.locator('summary').filter({hasText:'Anuncio y horario'}).click();
  await admin.getByLabel('Horario previsto del vivo').fill('2026-10-18T12:00');
  await admin.getByLabel('Cierre de comentarios').fill('2026-10-18T12:01');
  await admin.getByRole('button',{name:'Guardar lista privada y anuncio'}).click();
  await admin.getByRole('alert').filter({hasText:'El cierre de comentarios debe ser anterior o igual'}).waitFor();
  await admin.getByLabel('Cierre de comentarios').fill('2026-10-18T12:00');
  const currentTiming=await (await ac.request.get(base+'/api/admin/sorteo')).json();
  const invalidTiming=await ac.request.post(base+'/api/admin/sorteo',{headers:{Origin:base},data:{action:'import',kind:'existing',revision:currentTiming.revision,config:{...currentTiming.config,scheduledFor:'2026-10-18T12:00:00-03:00'},rules:{...currentTiming.snapshot.rules,cutoff:'2026-10-18T12:00:01-03:00'}}});
  assert.equal(invalidTiming.status(),400);
  assert.equal((await (await ac.request.get(base+'/api/admin/sorteo')).json()).revision,currentTiming.revision);
  for(const width of [320,390]){await admin.setViewportSize({width,height:844});await admin.evaluate(()=>window.scrollTo(0,0));await admin.screenshot({path:path.join(out,`instagram-import-${width}.png`),fullPage:true});assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  await admin.setViewportSize({width:1440,height:1000});
  await admin.getByLabel('Buscar participantes o comentarios').fill('fixture.flor');assert.equal(await admin.locator('tbody tr').count(),1);await admin.getByLabel('Buscar participantes o comentarios').fill('');
  await admin.getByRole('button',{name:'Guardar lista privada y anuncio'}).click();await admin.getByText('Lista guardada en privado.',{exact:false}).waitFor();await admin.evaluate(()=>window.scrollTo(0,0));await admin.screenshot({path:path.join(out,'admin-preparado.png'),fullPage:true});
  await viewer.goto(base+'/sorteo',{waitUntil:'domcontentloaded'});await mobile.goto(base+'/sorteo',{waitUntil:'domcontentloaded'});
  assert.equal(Date.parse((await (await vc.request.get(base+'/api/sorteo')).json()).config.scheduledFor),Date.parse('2026-10-18T12:00:00-03:00'));
  const eventLd=await viewer.locator('script[type="application/ld+json"]').allTextContents();
  assert.ok(eventLd.some(value=>Date.parse(JSON.parse(value).startDate)===Date.parse('2026-10-18T12:00:00-03:00')));
  const calendarDownload=viewer.waitForEvent('download');await viewer.getByRole('button',{name:'Agendar el sorteo'}).click();
  const calendar=await calendarDownload;await calendar.saveAs(path.join(out,'sorteo-fixture.ics'));
  assert.match(await readFile(path.join(out,'sorteo-fixture.ics'),'utf8'),/DTSTART:20261018T150000Z/);
  for(const width of [320,390,768,1280,1440]){
    for(const [page,label] of [[viewer,'publico-previa'],[admin,'admin-previa']]){
      await page.setViewportSize({width,height:900});
      await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,`${label}-${width}.png`),fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${label} ${width}`);
    }
  }
  // A scheduled zero is a READY state, never an authorized start.
  const originalSchedule=(await (await vc.request.get(base+'/api/sorteo')).json()).config.scheduledFor;
  await db.query("update giveaway_campaign set config=jsonb_set(config,'{scheduledFor}',to_jsonb($1::text)),revision=revision+1 where id=1",[new Date(Date.now()+1200).toISOString()]);
  await viewer.reload({waitUntil:'domcontentloaded'});
  await viewer.getByRole('heading',{name:'Estamos por comenzar',exact:true}).waitFor({timeout:10000});
  const readyState=await (await vc.request.get(base+'/api/sorteo')).json();assert.equal(readyState.round,null);assert.equal(readyState.winner,null);
  assert.equal(await viewer.locator('[data-event-state="ready"]').count(),1);
  await viewer.evaluate(()=>window.scrollTo(0,0));await viewer.screenshot({path:path.join(out,'premium-preparado.png'),fullPage:true});
  await db.query("update giveaway_campaign set config=jsonb_set(config,'{scheduledFor}',to_jsonb($1::text)),revision=revision+1 where id=1",[originalSchedule]);
  await viewer.reload({waitUntil:'domcontentloaded'});await admin.reload({waitUntil:'domcontentloaded'});await admin.locator('canvas[data-loaded-avatars]').waitFor();
  await viewer.waitForResponse(r=>r.url()===base+'/api/sorteo'&&r.ok());
  // Test both real share paths without invoking an external operating-system dialog.
  await viewer.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copiedGiveaway=value;}}});});
  await viewer.getByRole('button',{name:'Compartir sorteo',exact:true}).click();
  await viewer.waitForFunction(expected=>window.__copiedGiveaway===expected,base+'/sorteo');
  assert.equal(await viewer.evaluate(()=>window.__copiedGiveaway),base+'/sorteo');
  await mobile.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__nativeGiveawayShare=data;}}));
  await mobile.getByRole('button',{name:'Compartir sorteo',exact:true}).click();await mobile.waitForFunction(expected=>window.__nativeGiveawayShare?.url===expected,base+'/sorteo');assert.equal(await mobile.evaluate(()=>window.__nativeGiveawayShare.url),base+'/sorteo');
  await viewer.route('**/api/sorteo',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'fixture connection interruption'})}));
  await viewer.getByText('La conexión se interrumpió.',{exact:false}).waitFor({timeout:10000});
  await viewer.unroute('**/api/sorteo');await viewer.getByRole('button',{name:'Reintentar conexión',exact:true}).click();
  await viewer.getByText('La conexión se interrumpió.',{exact:false}).waitFor({state:'hidden',timeout:10000});
  console.log('Contador a cero sin inicio, compartir y reconexión verificados.');
  await viewer.emulateMedia({reducedMotion:'reduce'});
  await viewer.getByRole('button',{name:'Ampliar el escenario'}).click();
  await viewer.getByRole('button',{name:'Salir · Escape'}).waitFor();
  assert.equal(await viewer.evaluate(()=>document.body.style.overflow),'hidden');
  // A live transition can remove the focused control (for example the calendar button).
  await viewer.evaluate(()=>document.activeElement?.blur());await viewer.keyboard.press('Tab');
  assert.equal(await viewer.evaluate(()=>document.activeElement?.closest('[role="dialog"]')?.getAttribute('aria-label')),'Sorteo en vivo de MYA');
  for(let i=0;i<8;i++){await viewer.keyboard.press('Tab');assert.equal(await viewer.evaluate(()=>document.activeElement?.closest('[role="dialog"]')?.getAttribute('aria-label')),'Sorteo en vivo de MYA');}
  await viewer.keyboard.press('Escape');
  assert.notEqual(await viewer.evaluate(()=>document.body.style.overflow),'hidden');
  assert.equal(await viewer.getByRole('button',{name:'Ampliar el escenario'}).evaluate(el=>document.activeElement===el),true);
  await viewer.emulateMedia({reducedMotion:'no-preference'});
  await viewer.setViewportSize({width:1440,height:1000});await admin.setViewportSize({width:1440,height:1000});
  assert.equal((await (await vc.request.get(base+'/api/sorteo')).json()).round,null);
  const guestWrite=await vc.request.post(base+'/api/admin/sorteo',{headers:{Origin:base},data:{action:'selection',revision:0,selection:{}}});assert.equal(guestWrite.status(),401);
  const wrongOrigin=await ac.request.post(base+'/api/admin/sorteo',{headers:{Origin:'https://untrusted.example'},data:{action:'selection',revision:0,selection:{}}});assert.equal(wrongOrigin.status(),403);
  const denied=await vc.request.get(base+'/api/admin/sorteo');assert.equal(denied.status(),401);
  const selectionPanel=admin.getByRole('group',{name:'Selección privada del ganador'});
  await selectionPanel.getByLabel('Buscar ganador designado').fill('fixture.flor');
  await selectionPanel.getByRole('button',{name:'Designar @fixture.flor',exact:true}).click();
  assert.equal(await selectionPanel.getByRole('button',{name:'Guardar selección privada'}).isEnabled(),false);
  await selectionPanel.getByLabel('Revisé manualmente que esta cuenta cumplió todos los requisitos de la publicación original.').check();
  await selectionPanel.getByRole('button',{name:'Guardar selección privada'}).click();
  await admin.getByText('Selección privada guardada.',{exact:false}).waitFor();
  await admin.reload({waitUntil:'domcontentloaded'});await admin.locator('canvas[data-loaded-avatars]').waitFor();
  assert.equal((await (await ac.request.get(base+'/api/admin/sorteo')).json()).selection.designatedUsername,'fixture.flor');
  const privateBefore=JSON.stringify(await (await vc.request.get(base+'/api/sorteo')).json());
  assert.ok(!privateBefore.includes('designatedUsername'));assert.ok(!privateBefore.includes('requirementsReviewed'));
  assert.equal(await viewer.getByLabel('Buscar ganador designado').count(),0);
  for(const width of [320,390,768,1280,1440]){await admin.setViewportSize({width,height:900});assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  await admin.setViewportSize({width:1440,height:1000});
  console.log('Selector privado persistido y oculto para visitantes.');
  await selectionPanel.screenshot({path:path.join(out,'selector-privado.png')});
  await admin.getByLabel('Grabar el escenario en video vertical').check();
  await admin.getByRole('button',{name:'INICIAR EN VIVO',exact:true}).click();
  for(const [width,height] of [...[320,390,768,1280,1440].map(width=>[width,900]),[320,600],[844,390]]){
    await admin.setViewportSize({width,height});
    const dialog=admin.getByRole('dialog',{name:'Confirmar el inicio en vivo'});await dialog.screenshot({path:path.join(out,`confirmacion-inicio-${width}x${height}.png`)});
    const rect=await dialog.boundingBox();assert.ok(rect);assert.ok(Math.abs(rect.x-(width-rect.width)/2)<3,'Centrado horizontal del diálogo '+width);assert.ok(Math.abs(rect.y-(height-rect.height)/2)<3,'Centrado vertical del diálogo '+width);assert.ok(rect.width<=width&&rect.height<=height);
    assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth),false,'Desborde del diálogo '+width);
    assert.equal(await admin.evaluate(()=>document.body.style.overflow),'hidden');
    if(width===390)await admin.screenshot({path:path.join(out,'confirmation-preview-390.png')});
  }
  await admin.keyboard.press('Escape');await admin.getByRole('dialog').waitFor({state:'hidden'});assert.notEqual(await admin.evaluate(()=>document.body.style.overflow),'hidden');
  assert.equal((await (await vc.request.get(base+'/api/sorteo')).json()).round,null);
  await admin.setViewportSize({width:1440,height:1000});await admin.getByRole('button',{name:'INICIAR EN VIVO',exact:true}).click();await admin.getByLabel('Revisé la lista guardada, exclusiones y reglas. Confirmo el inicio público.').check();await admin.getByRole('button',{name:'Confirmar e iniciar en vivo'}).click();
  await viewer.getByRole('heading',{name:'Estamos por comenzar',exact:true}).waitFor({timeout:15000});await mobile.getByRole('heading',{name:'Estamos por comenzar',exact:true}).waitFor({timeout:15000});
  const during=await (await vc.request.get(base+'/api/sorteo')).json();assert.equal(during.winner,null);assert.equal(during.participantCount,2);assert.ok(!JSON.stringify(during).includes('words'));assert.ok(!JSON.stringify(during).includes('comments'));assert.ok(!JSON.stringify(during).includes('manualExclusions'));
  await viewer.evaluate(()=>window.scrollTo(0,0));await viewer.screenshot({path:path.join(out,'contador-sincronizado.png'),fullPage:true});
  await viewer.getByRole('heading',{name:'Estamos seleccionando una cuenta',exact:true}).waitFor({timeout:15000});await viewer.evaluate(()=>window.scrollTo(0,0));await viewer.screenshot({path:path.join(out,'ruleta-publica.png'),fullPage:true});
  const firstReelFrame=await viewer.locator('canvas').evaluate(el=>el.toDataURL());
  await viewer.waitForFunction(previous=>document.querySelector('canvas')?.toDataURL()!==previous,firstReelFrame,{timeout:2000});
  const mid=await (await vc.request.get(base+'/api/sorteo')).json();assert.equal(mid.winner,null);assert.equal(mid.reel.length,2);assert.ok(mid.reel.every(c=>c.avatar?.includes('fixture-only-photo')));await viewer.waitForFunction(()=>Number(document.querySelector('canvas')?.getAttribute('data-loaded-avatars'))===2,{timeout:5000});
  await viewer.getByRole('heading',{name:'Revisamos la cuenta seleccionada',exact:true}).waitFor({timeout:20000});await mobile.getByRole('heading',{name:'Revisamos la cuenta seleccionada',exact:true}).waitFor({timeout:10000});
  const photoResponse=await vc.request.get(base+'/api/sorteo/foto?round='+mid.round.id);assert.equal(photoResponse.status(),200);assert.match(photoResponse.headers()['content-type'],/image\/png/);await viewer.locator('[aria-label^="Perfil de @fixture"]').getAttribute('data-loaded');
  const winner=(await viewer.getByText(/^@fixture\./,{exact:true}).innerText());assert.equal(winner,'@fixture.flor');assert.equal(await mobile.getByText(/^@fixture\./,{exact:true}).innerText(),winner);
  await viewer.reload({waitUntil:'domcontentloaded'});await viewer.getByRole('heading',{name:'Revisamos la cuenta seleccionada',exact:true}).waitFor();assert.equal(await viewer.getByText(/^@fixture\./,{exact:true}).innerText(),winner);
  assert.equal(await viewer.getByRole('button',{name:'INICIAR EN VIVO'}).count(),0);
  await admin.getByLabel('Comprobé que sigue a MYA').check();await admin.getByLabel('Comprobé el like',{exact:true}).check();await admin.getByLabel('Revisé la historia compartida').check();await admin.getByRole('button',{name:'Registrar revisión',exact:false}).click();await viewer.getByText('MYA registró la revisión manual de las condiciones.',{exact:true}).waitFor({timeout:10000});
  await viewer.getByRole('heading',{name:'¡Tenemos ganadora!',exact:true}).waitFor();
  for(const width of [320,390,768,1280,1440]){await viewer.setViewportSize({width,height:950});await viewer.evaluate(()=>window.scrollTo(0,0));await viewer.screenshot({path:path.join(out,`premium-ganadora-${width}.png`),fullPage:true});assert.equal(await viewer.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  await viewer.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  const resultAxe=await viewer.evaluate(async()=>await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  await writeFile(path.join(out,'axe-result.json'),JSON.stringify(resultAxe.violations,null,2));
  assert.deepEqual(resultAxe.violations.map(v=>v.id),[],'Accesibilidad del resultado confirmado');

  await admin.getByRole('button',{name:'Descargar video',exact:true}).waitFor();await admin.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Descargar video'&&!b.disabled),{timeout:10000});
  const videoDownload=admin.waitForEvent('download');await admin.getByRole('button',{name:'Descargar video',exact:true}).click();const video=await videoDownload;await video.saveAs(path.join(out,'video-sorteo-fixture.mp4'));
  const pngDownload=admin.waitForEvent('download');await admin.getByRole('button',{name:'Imagen 1080 × 1920',exact:true}).click();const png=await pngDownload,pngPath=path.join(out,'ganador-fixture.png');await png.saveAs(pngPath);const pngBytes=await readFile(pngPath);assert.equal(pngBytes.readUInt32BE(16),1080);assert.equal(pngBytes.readUInt32BE(20),1920);
  console.log('Ganador designado, revisión y exportaciones verificadas.');
  await selectionPanel.getByRole('button',{name:'Limpiar selección',exact:true}).click();
  await selectionPanel.getByRole('button',{name:'Guardar selección privada'}).click();
  await admin.getByText('Selección privada guardada.',{exact:false}).waitFor();
  const firstState=await (await ac.request.get(base+'/api/admin/sorteo')).json();
  const unconfirmed=await ac.request.post(base+'/api/admin/sorteo',{headers:{Origin:base},data:{action:'repeat',revision:firstState.revision,roundId:firstState.round.id,reason:'Prueba sin confirmación'}});
  assert.equal(unconfirmed.status(),400);
  await admin.getByRole('button',{name:'Volver a sortear',exact:true}).click();
  assert.equal(await admin.getByRole('button',{name:'Confirmar y volver a sortear',exact:true}).isEnabled(),false);
  await admin.getByLabel('Motivo de la nueva ejecución').fill('Nueva ejecución oficial de prueba');
  await admin.getByLabel('Confirmo repetir el sorteo oficial con esta configuración.').check();
  const repetitionSaved=admin.waitForResponse(r=>r.url()===base+'/api/admin/sorteo'&&r.request().method()==='POST'&&r.request().postDataJSON().action==='repeat');
  await admin.getByRole('button',{name:'Confirmar y volver a sortear',exact:true}).click();
  const repetitionResponse=await repetitionSaved;assert.equal(repetitionResponse.status(),200);const secondState=await repetitionResponse.json();
  assert.notEqual(secondState.round.id,firstState.round.id);
  const sameRetry=await ac.request.post(base+'/api/admin/sorteo',{headers:{Origin:base},data:{action:'repeat',confirmed:true,revision:firstState.revision,roundId:firstState.round.id,reason:'Nueva ejecución oficial de prueba'}});
  assert.equal(sameRetry.status(),200);assert.equal((await sameRetry.json()).round.id,secondState.round.id);
  const locked=await ac.request.post(base+'/api/admin/sorteo',{headers:{Origin:base},data:{action:'selection',revision:secondState.revision,selection:secondState.selection}});
  assert.equal(locked.status(),409);
  await viewer.getByRole('heading',{name:'Estamos por comenzar',exact:true}).waitFor({timeout:15000});
  const hiddenAgain=await (await vc.request.get(base+'/api/sorteo')).json();assert.equal(hiddenAgain.winner,null);assert.equal(hiddenAgain.round.attempt,2);
  await viewer.getByRole('heading',{name:'Revisamos la cuenta seleccionada',exact:true}).waitFor({timeout:20000});
  assert.equal(await viewer.getByText('@fixture.alma',{exact:true}).innerText(),'@fixture.alma');
  await admin.getByRole('heading',{name:'@fixture.alma',exact:true}).waitFor({timeout:10000});
  assert.equal(await admin.getByLabel('Comprobé que sigue a MYA').isChecked(),false);
  assert.equal((await db.query('select count(*)::int n from giveaway_rounds')).rows[0].n,2);
  assert.equal((await (await ac.request.get(base+'/api/admin/sorteo')).json()).snapshot.comments.length,4);
  console.log('Repetición oficial, bloqueo, reintentos y exclusiones verificados.');
  await admin.getByRole('button',{name:'Reiniciar sorteo (volver a la previa)',exact:true}).click();
  await admin.getByRole('heading',{name:'Reiniciar sorteo para volver a la previa',exact:true}).waitFor();
  await admin.getByRole('button',{name:'Confirmar reinicio y volver a la previa',exact:true}).click();
  await admin.getByText('Sorteo reiniciado exitosamente.',{exact:false}).waitFor();
  const resetAdmin=await (await ac.request.get(base+'/api/admin/sorteo')).json();
  assert.equal(resetAdmin.round,null);
  assert.equal(resetAdmin.snapshot.comments.length,4);
  assert.equal(resetAdmin.snapshot.review.valid.length,2);
  const resetViewer=await (await vc.request.get(base+'/api/sorteo')).json();
  assert.equal(resetViewer.round,null);
  assert.equal(resetViewer.winner,null);
  const widths=[];
  for(const width of [320,390,768,1280,1440]){await viewer.setViewportSize({width,height:900});await viewer.evaluate(()=>window.scrollTo(0,0));await viewer.screenshot({path:path.join(out,`publico-${width}.png`),fullPage:true});assert.equal(await viewer.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);widths.push(width);}
  await admin.setViewportSize({width:390,height:844});await admin.evaluate(()=>window.scrollTo(0,0));await admin.screenshot({path:path.join(out,'admin-mobile.png'),fullPage:true});assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await viewer.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const axe=await viewer.evaluate(async()=>await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  await viewer.setViewportSize({width:1440,height:1000});await viewer.evaluate(()=>window.scrollTo(0,0));await viewer.screenshot({path:path.join(out,'redesign-desktop.png'),fullPage:true});
  await viewer.setViewportSize({width:390,height:844});await viewer.evaluate(()=>window.scrollTo(0,0));await viewer.screenshot({path:path.join(out,'redesign-mobile.png'),fullPage:true});
  await writeFile(path.join(out,'axe-preview.json'),JSON.stringify(axe.violations,null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(axe.violations.map(v=>v.id),[]);
  const report={at:new Date().toISOString(),fixtureOnly:true,tests:{importAndAdmin:true,remoteAdminChangesSynced:true,unsavedDraftConflictProtected:true,apiPaginationAndDedupe:true,privateRehearsalNoMutation:true,officialApiImport:true,photosAndNamesPreserved:true,roulettePhotosLoaded:true,winnerPhotoServed:true,participantSearch:true,guestMutationDenied:true,winnerHiddenUntilReveal:true,twoDevicesSameWinner:true,wrongDeviceClockIgnored:true,reloadKeepsWinner:true,manualReviewShared:true,privateFileNotInPublicPayload:true,resetGiveawayRound:true,designatedWinnerPersists:true,designationPrivate:true,clearSelectionRestoresRandom:true,repeatRequiresConfirmation:true,repeatAnimationSynchronized:true,repeatExcludesPreviousWinner:true,repeatRetryIdempotent:true,selectionLockedDuringAnimation:true,reviewChecksReset:true,countdownZeroDoesNotStart:true,readyState:true,nativeShare:true,clipboardShare:true,reconnectionRecovery:true,confirmedWinnerFiveWidths:true,confirmedWinnerAccessibility:true,noonScheduleShared:true,serverRejectsLateCutoff:true,calendarDownload:true,eventMetadataMatches:true,adminAndPublicFiveWidths:true,presentationAndReducedMotion:true},widths,jsErrors:errors,axeViolations:[],externalBrowserRequestsBlocked:blocked.length};
  await writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{
  await writeFile(path.join(out,'next-qa-log.txt'),logs);
  await browser?.close();if(next&&next.exitCode===null)next.kill();await new Promise(resolve=>server.close(resolve));await db.close();await writeFile('tsconfig.json',originalTsconfig);
}
