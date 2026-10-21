// Synthetic local UI validation. All database traffic goes to this process; no supplier/network writes.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const root=resolve("../scratch/supplier-intelligence-2026-10-20");
await mkdir(root,{recursive:true});
const migration=await readFile("supabase/migrations/20261020120000_supplier_intelligence.sql","utf8");
const config=JSON.parse(migration.match(/insert into public.import_cost_policies\(config\) values \('([\s\S]*?)'\);/)[1]);
config.carrierFxDate=new Date().toISOString().slice(0,10);
const policyId="33333333-3333-4333-8333-333333333333", productId="44444444-4444-4444-8444-444444444444";
const supplierId="55555555-5555-4555-8555-555555555555";
const stamp=new Date().toISOString();
const suppliers=[{id:supplierId,name:"Proveedor ficticio QA",website:"https://www.starcompany-py.com/",official_key:"star-company",query_mode:"product_page",automation_authorized:false,freshness_hours:24,is_active:true,capabilities:{details:"Datos sintéticos para probar la interfaz; no es una cotización real.",reviewed_on:"2026-10-20"}}];
const offers=[{id:"66666666-6666-4666-8666-666666666666",supplier_id:supplierId,product_id:productId,variant_id:null,external_id:"123",variant_key:"50ml",title:"Producto ficticio QA 50 ml",brand:"QA",model:"QA50",gtin:null,source_url:"https://www.starcompany-py.com/qa",origin_cost:100,currency:"USD",availability:"in_stock",verification:"verified",cost_checked_at:stamp,availability_checked_at:stamp,last_success_at:stamp,last_attempt_at:stamp,last_error:null}];
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
  if(path.endsWith("/profiles")) return done({id:user.id,email:user.email,role,full_name:"QA",customer_tier:"retail"});
  const body=req.method==="POST"||req.method==="PATCH"?JSON.parse(await new Promise(resolve=>{let b="";req.on("data",c=>b+=c);req.on("end",()=>resolve(b||"{}"));})):null;
  if(/\/(products|orders|product_variants|product_costs)$/.test(path)&&req.method!=="GET") forbiddenWrites++;
  const filter=rows=>url.searchParams.has("id")?rows.find(r=>r.id===url.searchParams.get("id").replace(/^eq\./,""))??null:rows;
  if(path.endsWith("/rpc/admin_catalog_page")) return done([{id:productId,title:"Producto ficticio QA 50 ml",brand:"QA",model:"QA50",sku:"QA50",retail_price:250000,stock:0,fulfillment_mode:"supplier",supplier_available:true}]);
  if(path.endsWith("/suppliers")) return done(filter(suppliers));
  if(path.endsWith("/supplier_offers")) return done(filter(offers));
  if(path.endsWith("/product_variants")) return done([]);
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
await new Promise(resolve=>api.listen(3421,"127.0.0.1",resolve));
const app=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","-p","3422"],{windowsHide:true,stdio:["ignore","pipe","pipe"],env:{...process.env,NEXT_DIST_DIR:".next-email-qa",NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:3421",NEXT_PUBLIC_SUPABASE_ANON_KEY:"synthetic",SUPABASE_SERVICE_ROLE_KEY:"synthetic",NEXT_PUBLIC_SITE_URL:"http://localhost:3422",TRANSACTIONAL_EMAILS_ENABLED:"false",RESEND_API_KEY:"",COMMERCE_CHECKOUT_ENABLED:"false"}});
let log="",browser;
app.stdout.on("data",c=>log+=c);app.stderr.on("data",c=>log+=c);
try {
  for(let i=0;i<90&&!log.includes("Ready in");i++){if(app.exitCode!==null)throw new Error(log);await new Promise(r=>setTimeout(r,1000));}
  if(!log.includes("Ready in"))throw new Error("Next did not start: "+log);
  browser=await chromium.launch({channel:"chrome",headless:true});
  const ctx=await browser.newContext();
  await ctx.route("**/*",r=>new URL(r.request().url()).hostname==="localhost"?r.continue():r.abort());
  await ctx.addInitScript(()=>localStorage.setItem("mya_analytics_consent","denied"));
  const page=await ctx.newPage(),errors=[];
  page.setDefaultNavigationTimeout(180000);page.setDefaultTimeout(30000);
  page.on("pageerror",e=>errors.push(e.message));
  const url="http://localhost:3422/admin/proveedores/inteligencia";
  await page.goto(url,{waitUntil:"networkidle"});assert.match(page.url(),/login/);
  const enc=v=>Buffer.from(JSON.stringify(v)).toString("base64url"),now=Math.floor(Date.now()/1000);
  const session={access_token:`${enc({alg:"HS256",typ:"JWT"})}.${enc({sub:user.id,exp:now+3600,iat:now,aud:"authenticated",role:"authenticated"})}.synthetic`,refresh_token:"synthetic",token_type:"bearer",expires_at:now+3600,expires_in:3600,user};
  await ctx.addCookies([{name:"sb-127-auth-token",value:`base64-${enc(session)}`,url:"http://localhost:3422"}]);
  role="customer";await page.goto(url,{waitUntil:"networkidle"});assert.match(page.url(),/cuenta/);role="admin";
  const checks=[];
  for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:1000});await page.goto(url,{waitUntil:"networkidle"});
    await page.getByRole("heading",{name:"Compras y proveedores",exact:true}).waitFor();
    for(const tab of ["Productos y proveedores","Seguimiento","Proveedores","Comparador","Simulador","Pasador y logística","Precios y stock","Nuevos productos","Historial"]){
      await page.getByRole("navigation",{name:"Herramientas de proveedores"}).getByRole("button",{name:tab,exact:true}).click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${tab} overflow ${width}`);
      await page.screenshot({path:resolve(root,`${width}-${tab.replaceAll(" ","-")}.png`),fullPage:true});checks.push({width,tab,overflow:false});
    }
    await page.getByRole("button",{name:"Simulador",exact:true}).click();await page.getByRole("button",{name:"Agregar artículo manual"}).click();
    await page.getByLabel("Producto / variante exacta",{exact:true}).fill("TV de prueba QA 55 pulgadas");
    await page.getByLabel("Costo unitario original",{exact:true}).fill("300");
    await page.getByLabel("ARS por unidad de moneda (adquisición)",{exact:true}).fill("1500");
    await page.getByLabel("Pulgadas exactas",{exact:true}).fill("55");
    await page.getByText(/falta tarifa para TV de 55/).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.getByLabel("Pulgadas exactas",{exact:true}).fill("50");
    await page.getByText(/Pasador USD 60/).first().waitFor();
  }
  await page.getByRole("button",{name:"Comparador",exact:true}).click();
  await page.getByLabel("ARS por unidad de moneda de compra",{exact:true}).fill("1500");
  await page.getByRole("button",{name:"Agregar a simulación"}).click();
  await page.getByRole("button",{name:"Quitar",exact:true}).first().click();
  await page.getByLabel("Nombre de simulación",{exact:true}).fill("Simulación ficticia QA");
  await page.getByLabel(/Confirmé todos los gastos/).check();
  await page.getByRole("button",{name:"Guardar simulación",exact:true}).click();
  await page.getByRole("status").filter({hasText:/Simulación guardada/}).waitFor();assert.equal(simulations.length,1);assert.equal(simulations[0].result.totalArs,182000);
  await page.getByRole("button",{name:"Historial",exact:true}).click();
  await page.getByRole("heading",{name:"Simulación ficticia QA",exact:true}).waitFor();
  await page.getByLabel("Referencia de aprobación / observaciones",{exact:true}).fill("Sólo prueba local sintética");
  await page.getByLabel(/Apruebo convertir esta simulación/).check();
  await page.getByRole("button",{name:"Registrar compra aprobada",exact:true}).click();
  await page.getByText("Compra registrada administrativamente",{exact:true}).waitFor();assert.equal(purchases.length,1);
  await page.getByRole("button",{name:"Proveedores",exact:true}).click();
  await page.getByLabel("Contenido CSV",{exact:true}).fill(`external_id,variant_key,title,source_url,origin_cost,currency,availability,verification,observed_at\n123,50ml,Producto QA,https://www.starcompany-py.com/qa,100,USD,in_stock,verified,${stamp}`);
  await page.getByRole("button",{name:"Validar y mostrar vista previa"}).click();
  await page.getByLabel(/Apruebo registrar estas 1 ofertas privadas/).check();
  await page.getByRole("button",{name:"Importar lote revisado"}).click();
  await page.getByRole("status").filter({hasText:"1 ofertas registradas"}).waitFor();assert.equal(observations.length,1);
  await page.getByRole("button",{name:"Pasador y logística",exact:true}).click();
  await page.getByLabel("Agregar tamaño (pulgadas)",{exact:true}).fill("55");
  await page.getByRole("button",{name:"Agregar tamaño para cotizar",exact:true}).click();
  assert.equal(await page.getByLabel("Tarifa USD 55 pulgadas",{exact:true}).inputValue(),"");
  await page.getByLabel("Tarifa USD 55 pulgadas",{exact:true}).fill("65");
  await page.getByLabel(/Apruebo guardar esta nueva versión/).check();
  await page.getByRole("button",{name:"Guardar versión de tarifas",exact:true}).click();
  await page.getByRole("status").filter({hasText:/Nueva versión de tarifas guardada/}).waitFor();
  assert.equal(policies.length,2);assert.equal(policies[0].config.tvUsd['55'],65);
  await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
  await page.getByLabel('Producto a buscar en proveedores',{exact:true}).fill('JBL Flip 7');
  await page.getByRole('button',{name:/Solicitar búsqueda/}).click();
  await page.getByRole('status').filter({hasText:/Búsqueda registrada/}).waitFor();assert.equal(searches.length,1);
  assert.equal(forbiddenWrites,0);assert.deepEqual(errors,[]);
  await writeFile(resolve(root,"ui-results.json"),JSON.stringify({synthetic:true,checks,anonymousDenied:true,customerDenied:true,simulationSaved:true,purchaseRecorded:true,csvPreviewAndSave:true,versionedTariffs:true,forbiddenWrites,errors},null,2));
  console.log(JSON.stringify({views:checks.length,errors,forbiddenWrites,simulationSaved:true,purchaseRecorded:true,csvSaved:true,versionedTariffs:true}));
}catch(e){await writeFile(resolve(root,"failure.log"),String(e)+"\n"+log);throw e;}
finally{await browser?.close();app.kill();api.close();}
