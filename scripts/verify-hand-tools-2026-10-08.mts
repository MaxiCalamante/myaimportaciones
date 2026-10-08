import fs from 'node:fs/promises';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import sharp from 'sharp';
nextEnv.loadEnvConfig(process.cwd());
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const dir='docs/mango-fuerza-2026-10-08',before=JSON.parse(await fs.readFile(`${dir}/before.json`,'utf8')),after:any={checkedAt:new Date().toISOString()};
for(const table of ['products','product_costs','categories']){const r=await db.from(table).select('*');if(r.error)throw r.error;after[table]=r.data;}
const concurrentChanges:any[]=[];
for(const table of ['products','product_costs','categories']){const key=table==='product_costs'?'product_id':'id';for(const row of before[table]){const current=after[table].find((r:any)=>r[key]===row[key]);try{assert.deepEqual(current,row);}catch{concurrentChanges.push({table,id:row[key],title:row.title,change:current?'changed':'missing'});}}}
assert.equal(after.products.filter((r:any)=>!before.products.some((p:any)=>p.id===r.id)).length,2);
const reports=[];
for(const name of ['payload','torquimetro-payload']){
 const {product:p,cost:c}=JSON.parse(await fs.readFile(`${dir}/${name}.json`,'utf8'));
 assert.equal(after.products.filter((r:any)=>r.model===p.model).length,1);
 assert.equal(after.products.find((r:any)=>r.id===p.id).is_active,true);
 const cost=after.product_costs.find((r:any)=>r.product_id===p.id);assert.equal(cost.origin_cost,c.origin_cost);assert.equal(cost.expenses_confirmed,false);
 const url=`https://myaimportaciones.vercel.app/producto/${p.slug}`,r=await fetch(url);assert.equal(r.status,200);const html=await r.text();
 const data=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])).find(d=>d['@type']==='Product');assert.equal(data.name,p.title);assert.equal(Number(data.offers.price),p.retail_price);
 assert.ok(!html.includes('source_document')&&!html.includes('totalherramientasoficial.com.py/produto/'));
 const img=await fetch(`https://myaimportaciones.vercel.app/_next/image?url=${encodeURIComponent(p.image_url)}&w=640&q=75`);assert.equal(img.status,200);await sharp(Buffer.from(await img.arrayBuffer())).raw().toBuffer();
 const catalog=await fetch(`https://myaimportaciones.vercel.app/catalogo?q=${p.model}`);assert.equal(catalog.status,200);assert.ok((await catalog.text()).includes(p.slug));
 reports.push({model:p.model,url,price:p.retail_price,purchase:c.origin_cost,publicPage:true,optimizedImage:true,search:true,privateCostNotExposed:true});
}
await fs.writeFile(`${dir}/after.json`,JSON.stringify(after,null,2));await fs.writeFile(`${dir}/verification.json`,JSON.stringify({checkedAt:new Date().toISOString(),concurrentChanges,added:2,reports},null,2));console.log(JSON.stringify({concurrentChanges,added:2,reports}));
