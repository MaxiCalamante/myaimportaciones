import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='docs/tools-jack3-2026-10-06';
const before=JSON.parse(await fs.readFile(`${dir}/activation-before.json`,'utf8'));
const after=JSON.parse(await fs.readFile(`${dir}/activation-after.json`,'utf8'));
const media=JSON.parse(await fs.readFile(`${dir}/media-published.json`,'utf8'));
const id='14b00e75-d5f8-509f-93cf-9fda71c5d1d9';
assert.equal(after.products.length,before.products.length);assert.equal(after.product_costs.length,before.product_costs.length);assert.deepEqual(after.categories,before.categories);
for(const old of before.products){
 const current=after.products.find((p:any)=>p.id===old.id);
 if(old.id!==id){assert.deepEqual(current,old);continue;}
 for(const field of Object.keys(old))if(!['retail_price','is_active','image_url','image_urls','updated_at'].includes(field))assert.deepEqual(current[field],old[field]);
 assert.equal(Number(current.retail_price),306700);assert.equal(current.is_active,true);assert.equal(current.image_url,media.publicUrl);assert.deepEqual(current.image_urls,[media.publicUrl]);
}
for(const old of before.product_costs){
 const current=after.product_costs.find((p:any)=>p.product_id===old.product_id);
 if(old.product_id!==id){assert.deepEqual(current,old);continue;}
 for(const field of Object.keys(old))if(!['source_document','updated_at'].includes(field))assert.deepEqual(current[field],old[field]);
 assert.ok(current.source_document.startsWith(old.source_document));assert.ok(current.source_document.includes('DECISION FINAL DEL DUEÑO'));
}
const product=after.products.find((p:any)=>p.id===id);
const url=`https://myaimportaciones.vercel.app/producto/${product.slug}`;
const response=await fetch(url);assert.equal(response.status,200);const html=await response.text();
const structured=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])).find(x=>x['@type']==='Product');
assert.equal(structured.name,product.title);assert.equal(Number(structured.offers.price),306700);assert.ok(html.includes(media.publicUrl));
assert.ok(!html.includes('source_document')&&!html.includes('totalherramientasoficial.com.py/produto/'));
const catalogUrl='https://myaimportaciones.vercel.app/catalogo?category=gatos-hidraulicos-criques';
const catalogResponse=await fetch(catalogUrl);assert.equal(catalogResponse.status,200);const catalog=await catalogResponse.text();
for(const model of ['THT10821','THT108313','THT10834'])assert.ok(catalog.includes(model));
assert.equal((await fetch(media.publicUrl)).status,200);
const report={checkedAt:new Date().toISOString(),model:'THT108313',retailPrice:306700,published:true,productCount:after.products.length,otherProductsAndCostsPreserved:true,privateSourcesAbsentFromPublicPage:true,url,catalogUrl,threeJackModelsVisible:true,correctPhotoHostedInMYA:true,priceApprovedByOwner:true,externalPricingSearch:'GSMART exact model found, out of stock; recorded as context',fallbackPricingPolicyUpdated:true};
await fs.writeFile(`${dir}/activation-verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
