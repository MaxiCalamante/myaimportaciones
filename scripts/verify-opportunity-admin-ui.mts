/** Built Next routes, controlled Auth, and real isolated PostgreSQL publication RPCs. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { attachCatalogMembership, publicationFixture } from '../tests/helpers/assisted-publication-fixture';
import { supplierAdapter } from '../src/lib/supplier-tracker/adapters';

const target=resolve(process.argv[2]??'');
const chunkDir=resolve(target,'.next/server/chunks/ssr');
let compiledBackendPort:number|undefined;
for(const name of await readdir(chunkDir)){
  if(!name.endsWith('.js'))continue;
  const match=(await readFile(resolve(chunkDir,name),'utf8')).match(/http:\/\/127\.0\.0\.1:(\d+)/);
  if(match){compiledBackendPort=Number(match[1]);break;}
}
assert.ok(compiledBackendPort,'El build debe usar un backend aislado');
const folder=resolve('scratch/suppliers-private/mass-publication');
await mkdir(folder,{recursive:true});
const html=await readFile(resolve(folder,'atacado-connect.html'),'utf8');
const captured=JSON.parse(await readFile(resolve(folder,'report.json'),'utf8')).samples.find((x:{key:string})=>x.key==='atacado-connect');
const detail=supplierAdapter('atacado-connect').detail(html,captured.source);
assert.ok(detail?.cost && detail.imageUrl);
const f=await publicationFixture(),item=randomUUID();
const supplier=(await f.db.query<{id:string}>("select id from suppliers where official_key='atacado-connect'")).rows[0].id;
await f.db.query(`insert into supplier_tracker_items(id,supplier_id,external_id,url,title,brand,model,sku,image_url,variant_key,
  origin_cost,currency,availability,last_success_at,availability_checked_at,cost_checked_at,evidence)
  values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'in_stock',now(),now(),now(),$13)`,
  [item,supplier,detail.externalId,detail.url,detail.title,detail.brand,detail.model,detail.sku,detail.imageUrl,detail.variantKey,
    detail.cost,detail.currency,{lastResult:detail}]);
await attachCatalogMembership(f.db,item,supplier,'https://atacadoconnect.com/categoria/informatica');
const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
const user={id:randomUUID(),aud:'authenticated',role:'authenticated',email:'qa@example.test',app_metadata:{},user_metadata:{}};
const now=Math.floor(Date.now()/1000);
const cookie=(role:string)=>'base64-'+encode({access_token:[encode({alg:'HS256',typ:'JWT'}),encode({sub:user.id,aud:'authenticated',role,iat:now,exp:now+3600}),'qa'].join('.'),
  refresh_token:'qa',expires_at:now+3600,expires_in:3600,token_type:'bearer',user});
const port=async(server:Server)=>{await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();assert.ok(address&&typeof address!=='string');return address.port;};
let queue:Promise<unknown>=Promise.resolve();
const api=createServer((req,res)=>{
  queue=queue.catch(()=>{}).then(async()=>{
    const path=new URL(req.url??'/', 'http://localhost');
    let role='';try{role=JSON.parse(Buffer.from((req.headers.authorization??'').split('.')[1],'base64url').toString()).role;}catch{}
    res.setHeader('Content-Type','application/json');
    const send=(data:unknown)=>res.end(JSON.stringify(data));
    const rows=async(sql:string,args:unknown[]=[]) => (await f.db.query<Record<string,unknown>>(sql,args)).rows;
    const single=req.headers.accept?.includes('vnd.pgrst.object');
    const equal=(key:string)=>path.searchParams.get(key)?.replace(/^eq\./,'')??null;
    const collection=async(sql:string,args:unknown[]=[])=>{
      const result=await rows(sql,args);
      return send(single ? result[0]??null : result);
    };
    try{
      await f.db.exec("reset role;select set_config('test.admin','"+(role==='admin'?'true':'false')+"',false)");
      if(path.pathname.startsWith('/auth/')){
        if(!['admin','customer'].includes(role)){res.statusCode=401;return send({message:'Sin sesión QA'});}
        return send(user);
      }
      if(path.pathname.endsWith('/profiles'))return send({id:user.id,role,full_name:'QA',customer_tier:'retail'});
      if(path.pathname.includes('/rpc/')){
        let body='';for await(const chunk of req) body+=chunk;
        const b=JSON.parse(body||'{}');
        const rpc=path.pathname.split('/').at(-1);
        const routes:Record<string,[string,unknown[]]>={
          tracker_opportunities_v1:['select tracker_opportunities_v1($1) result',[b.f]],
          tracker_catalog_summary_v1:['select tracker_catalog_summary_v1($1) result',[b.supplier_input]],
          tracker_start_catalog_v1:['select tracker_start_catalog_v1($1,$2) result',[b.supplier_input,b.source_input]],
          tracker_preview_publication_v1:['select tracker_preview_publication_v1($1,$2) result',[b.item_input,b.input_value]],
          tracker_publish_opportunity_v1:['select tracker_publish_opportunity_v1($1,$2,$3) result',[b.item_input,b.revision_input,b.slug_input]],
        };
        if(rpc&&routes[rpc]){
          await f.db.exec('set role authenticated');
          const [sql,args]=routes[rpc];
          return send((await rows(sql,args))[0].result);
        }
        if(rpc==='tracker_request_tick_v1'){res.statusCode=404;return send({code:'PGRST202',message:'Sin pg_net en PGlite'});}
        return send(rpc==='store_exchange_public_v1'?null:[]);
      }
      if(path.pathname.endsWith('/supplier_tracker_items'))return equal('id')?collection('select * from supplier_tracker_items where id=$1',[equal('id')]):send([]);
      if(path.pathname.endsWith('/supplier_catalog_publication_reviews'))return collection('select input from supplier_catalog_publication_reviews where item_id=$1',[equal('item_id')]);
      if(path.pathname.endsWith('/suppliers'))return collection('select name,official_key,freshness_hours from suppliers where id=$1',[equal('id')]);
      if(path.pathname.endsWith('/categories'))return collection('select * from categories');
      if(path.pathname.endsWith('/products')){
        const slug=equal('slug');
        if(slug){
          await f.db.exec('set role anon');
          const product=(await rows(`select to_jsonb(p)||'{"product_variants":[]}'::jsonb product from products p where p.slug=$1`,[slug]))[0]?.product;
          return send(single ? product??null : product ? [product] : []);
        }
        return equal('id')?collection('select * from products where id=$1',[equal('id')]):send([]);
      }
      return send([]);
    }catch(error){
      res.statusCode=400;
      return send({code:'P0001',message:error instanceof Error?error.message:String(error)});
    }
  });
});
await new Promise<void>(r=>api.listen(compiledBackendPort,'127.0.0.1',r));
const apiPort=compiledBackendPort, tmp=createServer(),appPort=await port(tmp);
await new Promise<void>(r=>tmp.close(()=>r()));
const origin='http://127.0.0.1:'+appPort;
const app=spawn(process.execPath,[resolve(target,'node_modules/next/dist/bin/next'),'start','-p',String(appPort)],{
  cwd:target,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,
    NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:'+apiPort,NEXT_PUBLIC_SUPABASE_ANON_KEY:'isolated-public-test-key',
    SUPABASE_SERVICE_ROLE_KEY:'isolated-service-test-key',COMMERCE_CHECKOUT_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1'},
});
let log='';app.stdout.on('data',x=>log+=x);app.stderr.on('data',x=>log+=x);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  for(let i=0;i<90;i++){try{await fetch(origin+'/robots.txt');break;}catch{await new Promise(r=>setTimeout(r,250));}}
  const anon=await fetch(origin+'/admin/oportunidades',{redirect:'manual'});
  assert.equal(anon.status,307);
  const customer=await fetch(origin+'/admin/oportunidades',{redirect:'manual',headers:{cookie:'sb-127-auth-token='+cookie('customer')}});
  assert.equal(customer.headers.get('location'),'/cuenta');
  const ctx=await browser.newContext();
  await ctx.addCookies([{name:'sb-127-auth-token',value:cookie('admin'),url:origin}]);
  await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await ctx.newPage(),errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:850});
    await page.goto(origin+'/admin/oportunidades');
    await expect(page.getByRole('heading',{name:'Catálogo de oportunidades'})).toBeVisible();
    await expect(page.getByText(detail.title,{exact:true})).toBeVisible();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:resolve(folder,'oportunidades-'+width+'.png'),fullPage:true});
  }
  await page.getByRole('button',{name:'Sincronizar todos'}).click();
  await expect(page.getByText('Trabajo encolado para el próximo ciclo.')).toBeVisible();
  const queued=await f.db.query<{n:number}>("select count(*)::int n from supplier_tracker_runs where state='queued'");
  assert.equal(queued.rows[0].n,4);
  await page.getByLabel('Nombre, SKU, marca o modelo').fill(detail.sku);
  await page.getByRole('button',{name:'Aplicar filtros'}).click();
  await expect(page.getByText('1 resultados')).toBeVisible();
  await page.getByRole('link',{name:'Revisar oportunidad'}).click();
  await expect(page.getByRole('heading',{name:'Preparar publicación'})).toBeVisible();
  await page.setViewportSize({width:390,height:850});
  await page.getByLabel('Categoría MYA').selectOption(f.category);
  await page.getByLabel('Descripción comprobada en español').fill('Escenario aislado de QA para la presentación observada: '+detail.title);
  await page.getByRole('button',{name:'Guardar y ver vista previa'}).click();
  await expect(page.getByText('Confirmá el permiso de uso de las imágenes.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Publicar en MYA'})).toHaveCount(0);
  await page.getByLabel('Respaldo de identidad, permiso de imagen y requisitos comerciales').fill('Evidencia comercial controlada para la prueba aislada.');
  for(const label of ['Presentación exacta confirmada','Uso de las imágenes autorizado','Requisitos comerciales verificados'])await page.getByLabel(label).check();
  await page.getByLabel('Base de costos en JSON').fill(JSON.stringify({
    status:'COSTO_VERIFICADO',origin:String(detail.cost),currency:detail.currency,unitsPerUsd:'1',supplierUrl:detail.url,
    fxSource:'Cotización QA documentada',fxAt:f.now,settlementBasis:'usd',settlementDocument:'Liquidación QA aislada',
    document:'Evidencia económica QA aislada',costsComplete:true,identityVerified:true,accountingConfirmed:true,accountingBasis:'gross_no_vat',
    carrier:{kind:'fixed',unitUsd:'6',confirmed:true,document:'Lote QA documentado',validUntil:f.validUntil},components:[],
  }));
  await page.getByRole('button',{name:'Guardar y ver vista previa'}).click();
  await expect(page.getByRole('button',{name:'Publicar en MYA'})).toBeVisible();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:resolve(folder,'vista-previa-390.png'),fullPage:true});
  await page.getByRole('button',{name:'Publicar en MYA'}).click();
  await expect(page.getByRole('heading',{name:/Publicación creada y vinculada|Producto MYA vinculado/})).toBeVisible();
  const href=await page.getByRole('link',{name:'Ver en tienda'}).getAttribute('href');
  assert.ok(href?.startsWith('/producto/'));
  const publicResponse=await fetch(origin+href);
  const body=await publicResponse.text();
  assert.equal(publicResponse.status,200);
  assert.ok(body.includes(detail.sku));
  assert.ok(body.includes('application/ld+json'));
  assert.ok(!body.includes('Evidencia económica QA aislada'));
  assert.ok(!log.includes('TypeError'));
  assert.ok(!body.includes('BAILOUT_TO_CLIENT_SIDE_RENDERING'));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({widths:[320,390,1440],queued:4,search:true,blockedPreview:true,published:true,publicHttp:200,structuredData:true,privateCostsHidden:true}));
  await writeFile(resolve(folder,'browser.txt'),log);
}finally{await writeFile(resolve(folder,'browser.txt'),log);await browser.close();app.kill();api.close();await f.db.close();}
