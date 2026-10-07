import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='docs/tools-jack3-2026-10-06';
const before=JSON.parse(await fs.readFile(`${dir}/before.json`,'utf8'));
const after=JSON.parse(await fs.readFile(`${dir}/after.json`,'utf8'));
const payload=JSON.parse(await fs.readFile(`${dir}/payload.json`,'utf8'));
assert.equal(after.products.length,before.products.length+1);
assert.equal(after.product_costs.length,before.product_costs.length+1);
assert.deepEqual(after.categories,before.categories);
for(const old of before.products)assert.deepEqual(after.products.find((p:any)=>p.id===old.id),old);
for(const old of before.product_costs)assert.deepEqual(after.product_costs.find((p:any)=>p.product_id===old.product_id),old);
for(const [table,key,expected] of [['products','id',payload.products[0]],['product_costs','product_id',payload.costs[0]]] as const){
 const actual=after[table].find((p:any)=>p[key]===expected[key]);
 for(const field of Object.keys(expected)){
  if(field.endsWith('_at')&&expected[field])assert.equal(new Date(actual[field]).getTime(),new Date(expected[field]).getTime());
  else assert.deepEqual(actual[field],expected[field]);
 }
}
const draft=payload.products[0];
assert.equal(draft.is_active,false);assert.equal(draft.retail_price,0);
const route=await fetch(`https://myaimportaciones.vercel.app/producto/${draft.slug}`);
assert.equal(route.status,404);
const catalog=await fetch('https://myaimportaciones.vercel.app/catalogo?q=THT108313');
assert.equal(catalog.status,200);assert.ok(!(await catalog.text()).includes(`/producto/${draft.slug}`));
const report={checkedAt:new Date().toISOString(),productsBefore:before.products.length,productsAfter:after.products.length,addedInactiveDraft:'THT108313',draftHasNoApprovedRetailPrice:true,otherProductsCostsAndCategoriesPreserved:true,draftPublicRouteStatus:route.status,draftAbsentFromPublicCatalog:true,standardPending:'THT10832: supplier exhausted; current USD quote unavailable',professionalAlreadyPublished:'THT10834: unchanged'};
await fs.writeFile(`${dir}/verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
