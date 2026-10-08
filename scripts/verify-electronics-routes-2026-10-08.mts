import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import {createClient} from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd());
const dir='docs/electronics-atacado-2026-10-08';
const rows=JSON.parse(await fs.readFile(`${dir}/priced.json`,'utf8'));
const base=process.argv.find(a=>/^https?:/.test(a))??'http://localhost:3108';
const eligible=rows.filter((r:any)=>r.eligible),drafts=rows.filter((r:any)=>!r.eligible);
const results:any[]=[];let next=0;
await Promise.all(Array.from({length:4},async()=>{
 while(next<eligible.length){
  const r=eligible[next++],url=`${base}/producto/${r.slug}`,response=await fetch(url),text=await response.text();
  assert.equal(response.status,200,url);assert.ok(text.includes(r.title),`Missing exact title: ${r.sku}`);
  assert.ok(text.includes('USD '),`Missing dollar equivalent: ${r.sku}`);
  const scripts=[...text.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(x=>JSON.parse(x[1]));
  const product=scripts.find(x=>x['@type']==='Product');assert.ok(product,`Missing product schema ${r.sku}`);assert.equal(Number(product.offers.price),r.retail_price);assert.equal(product.offers.priceCurrency,'ARS');
  assert.ok(!/origin_cost|purchase_usd|atacadousa|ml_price|sourceUrl/.test(text),`Private evidence in public response ${r.sku}`);
  results.push({sku:r.sku,status:response.status,ars:r.retail_price,usd:Math.round(r.retail_price/1550*100)/100,jsonLdPriceVerified:true});
 }
}));
for(const r of drafts.slice(0,2)){const response=await fetch(`${base}/producto/${r.slug}`);assert.equal(response.status,404);}
for(const category of ['electronica','electronica-smartphones','electronica-tablets','electronica-notebooks','electronica-computadoras-escritorio']){const response=await fetch(`${base}/catalogo?category=${category}`);assert.equal(response.status,200);}
const search=await fetch(`${base}/api/search?q=iPhone%2017e`),json=await search.json();assert.ok(json.results.some((r:any)=>r.title.includes('iPhone 17e')));
const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false}});
const guest=await anon.from('products').select('id,title').in('id',rows.map((r:any)=>r.id));if(guest.error)throw guest.error;assert.equal(guest.data.length,eligible.length);
const costs=await anon.from('product_costs').select('origin_cost').limit(1);assert.ok(costs.error||costs.data?.length===0,'Guest must not see any private cost row.');
const supplier=await anon.from('products').select('source_url').eq('id',eligible[0].id);assert.ok(supplier.error);
const report={checkedAt:new Date().toISOString(),base,productRoutesVerified:results.length,categoryRoutesVerified:5,draftRoutesHidden:true,guestVisible:guest.data.length,privateCostReadDenied:true,supplierFieldReadDenied:true,productSchemaCurrency:'ARS',results};
await fs.writeFile(`${dir}/${base.startsWith('https:')?'production-routes-private':'local-routes-private'}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,results:undefined}));
if(base.startsWith('https:')){
 const verification=JSON.parse(await fs.readFile(`${dir}/verification.json`,'utf8'));
 Object.assign(verification,{productionFrontendVerified:true,productionCheckedAt:report.checkedAt,productRoutesVerified:results.length,privateCostReadDenied:true,supplierFieldReadDenied:true});
 await fs.writeFile(`${dir}/verification.json`,JSON.stringify(verification,null,2));
}
