// Synthetic local UI validation. All database traffic goes to this process; no supplier/network writes.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const root=resolve("../scratch/qa-market-opportunities");
await mkdir(root,{recursive:true});
const migration=await readFile("supabase/migrations/20261020120000_supplier_intelligence.sql","utf8");
const config=JSON.parse(migration.match(/insert into public.import_cost_policies\(config\) values \('([\s\S]*?)'\);/)[1]);
config.carrierFxDate=new Date().toISOString().slice(0,10);
const policyId="33333333-3333-4333-8333-333333333333", productId="44444444-4444-4444-8444-444444444444";
const supplierId="55555555-5555-4555-8555-555555555555";
const stamp=new Date().toISOString();
const suppliers=[{id:supplierId,name:"Proveedor ficticio QA",website:"https://www.starcompany-py.com/",official_key:"star-company",query_mode:"product_page",automation_authorized:false,freshness_hours:24,is_active:true,capabilities:{details:"Datos sintéticos para probar la interfaz; no es una cotización real.",reviewed_on:"2026-10-20"}}];
const offers=[{id:"66666666-6666-4666-8666-666666666666",supplier_id:supplierId,product_id:null,variant_id:null,external_id:"123",variant_key:"50ml",title:"Producto ficticio QA 50 ml",brand:"QA",model:"QA50",gtin:null,source_url:"https://www.starcompany-py.com/qa",origin_cost:100,currency:"USD",availability:"in_stock",verification:"verified",cost_checked_at:stamp,availability_checked_at:stamp,last_success_at:stamp,last_attempt_at:stamp,last_error:null}];
const simulations=[],purchases=[],observations=[],policies=[{id:policyId,config,created_at:stamp}];
const searches=[];
const automationMigration=await readFile('supabase/migrations/20261020170000_supplier_automation.sql','utf8');
let trackingConfig=JSON.parse(automationMigration.match(/insert into supplier_tracking_settings\(config\) values \('([\s\S]*?)'\);/)[1]);
let role="admin", forbiddenWrites=0;
const user={id:"22222222-2222-4222-8222-222222222222",aud:"authenticated",role:"authenticated",email:"qa@example.test",app_metadata:{},user_metadata:{},created_at:stamp};
const api=createServer(async(req,res)=>{
  const url=new URL(req.url,"http://localhost"), path=url.pathname;
  res.setHeader("Content-Type","application/json");
  if(req.method==="OPTIONS") return res.end();
  const done=v=>res.end(JSON.stringify(v));
  if(path.endsWith("/auth/v1/user")) return done(user);
  if(path.endsWith("/profiles")) { const profile={id:user.id,email:user.email,role,full_name:"QA",customer_tier:"retail",created_at:stamp}; if(req.method==="HEAD") {res.setHeader("Content-Range","0-0/1");return res.end();} return done(url.searchParams.has("id") ? profile : [profile]); }
  const body=req.method==="POST"||req.method==="PATCH"?JSON.parse(await new Promise(resolve=>{let b="";req.on("data",c=>b+=c);req.on("end",()=>resolve(b||"{}"));})):null;
  if(/\/(products|orders|product_variants|product_costs)$/.test(path)&&!(["GET","HEAD"].includes(req.method))) forbiddenWrites++;
  const filter=rows=>url.searchParams.has("id")?rows.find(r=>r.id===url.searchParams.get("id").replace(/^eq\./,""))??null:rows;
  if(path.endsWith("/rpc/admin_catalog_page")) return done([{id:productId,title:"Producto ficticio QA 50 ml",slug:"producto-qa",category_id:"77777777-7777-4777-8777-777777777777",brand:"QA",model:"QA50",sku:"QA50",retail_price:250000,stock:0,fulfillment_mode:"supplier",supplier_available:true}]);
  if(path.endsWith("/suppliers")) return done(filter(suppliers));
  if(path.endsWith("/supplier_offers")) return done(filter(offers));
  if(path.endsWith("/product_variants")) return done([]);
  if(path.endsWith("/categories")) return done([{id:"77777777-7777-4777-8777-777777777777",name:"Herramientas y equipamiento",slug:"herramientas-equipamiento",parent_id:null,image_url:null}]);
  if(path.endsWith("/products") && req.method === "HEAD") {res.setHeader("Content-Range","0-0/1");return res.end();}
  if(path.endsWith("/products")) return done([{id:productId,slug:"producto-qa",title:"Producto de prueba QA con título largo y modelo QA50",image_url:null,category_id:"77777777-7777-4777-8777-777777777777",retail_price:250000,wholesale_price:null,wholesale_min_qty:1,brand:"QA",model:"QA50",is_active:true,supplier_available:true}]);
  if(path.endsWith("/product_costs")) return done([{product_id:productId,landed_cost:150000}]);
  if(path.endsWith("/supplier_market_references")) return done([{id:"88888888-8888-4888-8888-888888888888",product_id:productId,price_ars:300000,source_url:"https://www.mercadolibre.com.ar/producto/p/MLA12345678",identity_verified:true,variant_id:null,checked_at:stamp}]);
  if(path.endsWith("/import_cost_policies")) { if(body) policies.unshift({id:crypto.randomUUID(),config:body.config,created_at:new Date().toISOString()}); return done(filter(policies)); }
  if(path.endsWith("/import_simulations")) { if(body) {const s={...body,id:crypto.randomUUID(),created_at:new Date().toISOString()};simulations.unshift(s);return done({id:s.id});}return done(filter(simulations)); }
  if(path.endsWith("/import_purchases")) {if(body)purchases.push({...body,id:crypto.randomUUID(),approved_at:new Date().toISOString()});return done(purchases);}
  if(path.endsWith("/supplier_observations")) return done(observations);
  if(path.endsWith("/supplier_proposals")) return done([]);
  if(path.endsWith('/supplier_tracking_settings')){if(body)trackingConfig=body.config;return done({id:true,config:trackingConfig});}
  if(path.endsWith('/supplier_sync_queue')){res.setHeader('Content-Range','0-0/1');return done([]);}
  if(path.endsWith('/supplier_sync_runs'))return done([{id:policyId,worker:'local-public-catalog',started_at:stamp,completed_at:stamp,status:'success',report:{}}]);
  if(path.endsWith('/supplier_source_health'))return done([{supplier_id:supplierId,status:'connected',message:'Datos sintéticos de QA',last_attempt_at:stamp,last_success_at:stamp,products_seen:1}]);
  if(path.endsWith('/supplier_price_decisions'))return done([]);
  if(path.endsWith('/supplier_search_requests')){if(body)searches.unshift({id:crypto.randomUUID(),query:body.query,state:'queued',created_at:new Date().toISOString()});return done(searches);}
  if(path.endsWith("/rpc/import_supplier_observations_v1")) { observations.push(...body.rows_input);return done(body.rows_input.length); }
  return done([]);
});
await new Promise(resolve=>api.listen(3431,"127.0.0.1",resolve));
const app=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--webpack","-p","3432"],{windowsHide:true,stdio:["ignore","pipe","pipe"],env:{...process.env,NEXT_DIST_DIR:".next-opportunities-webpack-qa",NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:3431",NEXT_PUBLIC_SUPABASE_ANON_KEY:"synthetic",SUPABASE_SERVICE_ROLE_KEY:"synthetic",NEXT_PUBLIC_SITE_URL:"http://localhost:3432",TRANSACTIONAL_EMAILS_ENABLED:"false",RESEND_API_KEY:"",COMMERCE_CHECKOUT_ENABLED:"false"}});
let log="",browser;
app.stdout.on("data",c=>{log+=c; process.stdout.write(c)});app.stderr.on("data",c=>{log+=c; process.stderr.write(c)});
try {
 for(let i=0;i<100&&!log.includes("Ready in");i++) await new Promise(r=>setTimeout(r,1000));
 if(!log.includes("Ready in")) throw new Error("Next no inició: "+log);
 browser=await chromium.launch({channel:"chrome",headless:true});
 const ctx=await browser.newContext();
 await ctx.route("**/*",r=>new URL(r.request().url()).hostname==="localhost"?r.continue():r.abort());
 const enc=v=>Buffer.from(JSON.stringify(v)).toString("base64url"),now=Math.floor(Date.now()/1000);
 const session={access_token:`${enc({alg:"HS256",typ:"JWT"})}.${enc({sub:user.id,exp:now+3600,iat:now,aud:"authenticated",role:"authenticated"})}.synthetic`,refresh_token:"synthetic",token_type:"bearer",expires_at:now+3600,expires_in:3600,user};
 await ctx.addCookies([{name:"sb-127-auth-token",value:`base64-${enc(session)}`,url:"http://localhost:3432"}]);
 const page=await ctx.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
 for(const width of [320,390,768,1440]) for(const route of ["oportunidades","precios"]){
  console.log(`Probando ${route} ${width}`); await page.setViewportSize({width,height:900}); await page.goto(`http://localhost:3432/admin/${route}`,{waitUntil:"domcontentloaded",timeout:90000});
  await page.getByRole("heading",{name:route==="oportunidades"?"Descubrí y sumá oportunidades para revisar":"Revisá tus precios y referencias de mercado"}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${route} ${width} overflow`);
  await page.screenshot({path:resolve(root,`${route}-${width}.png`),fullPage:true});
  if(route==="oportunidades") { assert.ok((await page.getByLabel("Buscar en Mercado Libre").first().getAttribute("href")).includes("producto")); await page.getByTitle("Personalizar título o precios antes de agregar").first().click(); }
  else { if(width >= 1024) await page.getByTitle("Editar precio o link de Mercado Libre").first().click(); else await page.getByRole("button",{name:/Actualizar referencia|Vincular referencia/}).first().click(); }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${route} modal ${width} overflow`);
  await page.keyboard.press("Escape");
 }
 for(const width of [320,390,768,1440]) {
  console.log(`Probando panel admin ${width}`); await page.setViewportSize({width,height:900});await page.goto("http://localhost:3432/admin",{waitUntil:"domcontentloaded",timeout:90000});
  await page.getByRole("heading",{name:"Panel de administración"}).waitFor();
  for(const section of ["Productos","Categorías","Pedidos","Clientes"]) {
    await page.getByRole("navigation",{name:"Herramientas del panel"}).getByRole("button",{name:section,exact:true}).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`admin ${section} ${width} overflow`);
  }
  await page.getByRole("navigation",{name:"Herramientas del panel"}).getByRole("button",{name:"Productos",exact:true}).click();
  await page.getByText("Procesar lote de seguimiento",{exact:true}).waitFor();
  await page.screenshot({path:resolve(root,`admin-${width}.png`),fullPage:true});
 }
 assert.deepEqual(errors,[]);assert.equal(forbiddenWrites,0);console.log("UI aislada: ambas rutas, 320/390/768/1440, modales, enlaces y sin escrituras: OK");
} catch(e){console.error(e,log.slice(-5000));process.exitCode=1;} finally {await browser?.close();app.kill();api.close();}
