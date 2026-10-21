import{createRequire}from'node:module';import{writeFile,mkdir}from'node:fs/promises';
import{createClient}from'@supabase/supabase-js';import{chromium}from'@playwright/test';
import{readCrosslinkCatalog,seedSupplierDiscovery,reconcileSupplierOffers,runSupplierDiscovery}from'../src/lib/supplier-crosslinks';
import{boundedWorkerFetch}from'../src/lib/worker-fetch';
const require=createRequire(import.meta.url);require('@next/env').loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const{collectPublicCatalog}=await import('./lib/supplier-browser.mjs');
if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Falta configuración privada MYA.');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:boundedWorkerFetch()}});
const catalog=await readCrosslinkCatalog(db);const planned=await seedSupplierDiscovery(db,catalog);const linked=await reconcileSupplierOffers(db,catalog);
let discovery:unknown=null;
if(process.argv.includes('--cycle')){const browser=await chromium.launch({headless:true,timeout:45000});try{discovery=await runSupplierDiscovery(db,catalog,(supplier,query,url,beforeSearch)=>collectPublicCatalog(browser,supplier,query,10000,url,beforeSearch),{limit:30,timeBudgetMs:240000});}finally{await browser.close();}}
const report={checkedAt:new Date().toISOString(),products:catalog.products.length,plannedQueries:planned,reconciliation:linked,discovery};
await mkdir('scratch/suppliers-private',{recursive:true});await writeFile('scratch/suppliers-private/latest-crosslink-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
