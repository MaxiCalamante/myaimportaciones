import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
type Product = Record<string, unknown> & {id:string; title:string; model:string; slug:string; description:string; sku:string; retail_price:number; image_url:string; specifications:Record<string,string>};
type Cost = Record<string,unknown> & {product_id:string};
const dir='docs/tools-percutores-2026-10-06';
const before: {products:Product[];product_costs:Cost[];categories:unknown[]} = JSON.parse(await fs.readFile(`${dir}/before.json`,'utf8'));
const after: typeof before = JSON.parse(await fs.readFile(`${dir}/after.json`,'utf8'));
const payload: {products:Product[];costs:Cost[];updates:Product[]} = JSON.parse(await fs.readFile(`${dir}/payload.json`,'utf8'));
assert.equal(after.products.length,before.products.length+1);
assert.equal(after.product_costs.length,before.product_costs.length+1);
assert.deepEqual(after.categories,before.categories);
for(const old of before.product_costs) assert.deepEqual(after.product_costs.find(p=>p.product_id===old.product_id),old);
for(const old of before.products){
 const current=after.products.find(p=>p.id===old.id)!;
 const update=payload.updates.find(p=>p.id===old.id);
 if(!update){assert.deepEqual(current,old);continue;}
 for(const key of Object.keys(old)){
  if(['title','description','tags','specifications'].includes(key))assert.deepEqual(current[key],update[key]);
  else if(key!=='updated_at')assert.deepEqual(current[key],old[key]);
 }
}
function equalField(actual:unknown,expected:unknown,key:string){if(key.endsWith('_at')&&actual&&expected)assert.equal(new Date(String(actual)).getTime(),new Date(String(expected)).getTime());else assert.deepEqual(actual,expected);}
for(const p of payload.products){const current=after.products.find(x=>x.id===p.id)!;for(const key of Object.keys(p))equalField(current[key],p[key],key);}
for(const c of payload.costs){const current=after.product_costs.find(x=>x.product_id===c.product_id)!;for(const key of Object.keys(c))equalField(current[key],c[key],key);}
const routes=[];
for(const p of [...payload.products,...payload.updates]){
 const url=`https://myaimportaciones.vercel.app/producto/${p.slug}`;
 const response=await fetch(url);assert.equal(response.status,200);
 const html=await response.text();
 const product=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])).find(p=>p['@type']==='Product');
 assert.equal(product.name,p.title);assert.equal(Number(product.offers.price),Number(p.retail_price));
 assert.ok(html.includes(p.specifications.Gama));
 assert.ok(!html.includes('totalherramientasoficial.com.py/produto/')&&!html.includes('source_document'));
 routes.push({model:p.model,tier:p.specifications.Gama,price:Number(p.retail_price),url,status:response.status});
}
const imageResponse=await fetch(payload.products[0].image_url);assert.equal(imageResponse.status,200);
const photo=sharp(Buffer.from(await imageResponse.arrayBuffer()));const metadata=await photo.metadata();await photo.raw().toBuffer();assert.ok(Math.max(metadata.width||0,metadata.height||0)>=1000);
const catalogUrl='https://myaimportaciones.vercel.app/catalogo?q=percutor%20y%20atornillador';
const catalog=await fetch(catalogUrl);assert.equal(catalog.status,200);const html=await catalog.text();for(const r of routes)assert.ok(html.includes(r.model));
const report={checkedAt:new Date().toISOString(),productsBefore:before.products.length,productsAfter:after.products.length,added:1,updated:2,otherProductsAndExistingCostsPreserved:true,routes,catalogUrl,image:{width:metadata.width,height:metadata.height,decoded:true},industrialPending:'96/136/166 Nm exhausted in supplier; 110V kit excluded',entryContributionBeforeExpenses:11268.25};
await fs.writeFile(`${dir}/verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
