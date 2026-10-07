import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const dir='docs/tools-rubros-2026-10-06';
const payload=JSON.parse(await fs.readFile(`${dir}/payload.json`,'utf8'));
const images=[];
const composites=[];
for(let i=0;i<payload.rows.length;i++){
 const p=payload.rows[i].product;
 for(let j=0;j<p.image_urls.length;j++){
  const response=await fetch(p.image_urls[j]);assert.equal(response.status,200,`${p.model} image ${j}`);
  const buffer=Buffer.from(await response.arrayBuffer());const img=sharp(buffer);const meta=await img.metadata();await img.raw().toBuffer();
  assert.ok(Math.max(meta.width||0,meta.height||0)>=1000);
  images.push({model:p.model,index:j,width:meta.width,height:meta.height,decoded:true});
  if(j===0){
   const tile=await sharp(buffer).resize(340,260,{fit:'contain',background:'white'}).png().toBuffer();
   composites.push({input:tile,left:(i%3)*350,top:Math.floor(i/3)*300+35});
   const label=Buffer.from(`<svg width="350" height="35"><rect width="350" height="35" fill="white"/><text x="10" y="24" font-family="Arial" font-size="19">${p.model}</text></svg>`);
   composites.push({input:label,left:(i%3)*350,top:Math.floor(i/3)*300});
  }
 }
}
await sharp({create:{width:1050,height:Math.ceil(payload.rows.length/3)*300,channels:3,background:'white'}}).composite(composites).png().toFile(`${dir}/media-inspection.png`);
await fs.writeFile(`${dir}/media-check.json`,JSON.stringify(images,null,2));
if(process.argv.includes('--preflight')){console.log(JSON.stringify({preflight:true,products:payload.rows.length,images:images.length,allDecoded:true}));process.exit(0);}
const before=JSON.parse(await fs.readFile(`${dir}/before.json`,'utf8'));
const after=JSON.parse(await fs.readFile(`${dir}/after.json`,'utf8'));
const additions=payload.rows.filter((r:any)=>!r.old).length;
assert.equal(after.products.length,before.products.length+additions);
assert.equal(after.product_costs.length,before.product_costs.length+additions);
assert.deepEqual(after.categories,before.categories);
function eq(a:any,b:any,key:string){if(key.endsWith('_at')&&a&&b)assert.equal(new Date(a).getTime(),new Date(b).getTime());else if(['description','source_document'].includes(key)&&typeof a==='string'&&typeof b==='string')assert.equal(a.replace(/\r\n/g,'\n'),b.replace(/\r\n/g,'\n'),key);else assert.deepEqual(a,b,key);}
for(const old of before.products){
 const current=after.products.find((p:any)=>p.id===old.id);
 const row=payload.rows.find((r:any)=>r.product.id===old.id);
 const enrich=payload.enrich.find((u:any)=>u.id===old.id);
 if(!row&&!enrich){assert.deepEqual(current,old);continue;}
 for(const key of Object.keys(old)){
  if(key==='updated_at')continue;
  if(row&&key in row.product)eq(current[key],row.product[key],key);
  else if(enrich&&['tags','specifications'].includes(key))eq(current[key],enrich[key],key);
  else eq(current[key],old[key],key);
 }
}
for(const row of payload.rows){
 const current=after.products.find((p:any)=>p.id===row.product.id);
 for(const [key,value] of Object.entries(row.product))eq(current[key],value,key);
 assert.equal(current.is_active,true);assert.equal(current.stock,0);assert.equal(current.stock_verified_at,null);
 const cost=after.product_costs.find((c:any)=>c.product_id===current.id);
 for(const [key,value] of Object.entries(row.cost))eq(cost[key],value,key);
 assert.ok(current.retail_price<=row.reference.price*.9);
 assert.ok(current.retail_price>row.purchase);
 assert.equal(cost.expenses_confirmed,false);
}
for(const old of before.product_costs){if(!payload.rows.some((r:any)=>r.product.id===old.product_id))assert.deepEqual(after.product_costs.find((c:any)=>c.product_id===old.product_id),old);}
for(const key of ['sku','model','slug']){const values=after.products.map((p:any)=>p[key]).filter(Boolean);assert.equal(new Set(values).size,values.length,`Duplicate ${key}`);}
const routes=[];
for(const p of [...payload.rows.map((r:any)=>r.product),...payload.enrich.map((u:any)=>after.products.find((p:any)=>p.id===u.id))]){
 const url=`https://myaimportaciones.vercel.app/producto/${p.slug}`;const response=await fetch(url);assert.equal(response.status,200,url);
 const html=await response.text();
 const product=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])).find(x=>x['@type']==='Product');
 assert.equal(product.name,p.title);assert.equal(Number(product.offers.price),p.retail_price);
 assert.ok(html.includes(p.specifications.Gama));
 assert.ok(!html.includes('totalherramientasoficial.com.py/produto/')&&!html.includes('source_document'));
 const optimized=`https://myaimportaciones.vercel.app/_next/image?url=${encodeURIComponent(p.image_url)}&w=640&q=75`;
 const photo=await fetch(optimized);assert.equal(photo.status,200,`${p.model} storefront optimized image`);await sharp(Buffer.from(await photo.arrayBuffer())).raw().toBuffer();
 routes.push({model:p.model,gama:p.specifications.Gama,price:p.retail_price,url,status:200,optimizedImageDecoded:true});
}
const catalogs=[];
for(const query of ['Hidrolavadora','Cepillo','Nivel láser','Mini pulidora','Multiherramienta','Multímetro']){
 const url=`https://myaimportaciones.vercel.app/catalogo?q=${encodeURIComponent(query)}`;const response=await fetch(url);assert.equal(response.status,200);const html=await response.text();
 const selected=payload.rows.filter((r:any)=>r.product.title.toLowerCase().includes(query.toLowerCase()));
 for(const r of selected)assert.ok(html.includes(r.product.slug),`${query}: ${r.product.model}`);
 catalogs.push({query,url,verifiedProducts:selected.map((r:any)=>r.product.model)});
}
const report={checkedAt:new Date().toISOString(),productsBefore:before.products.length,productsAfter:after.products.length,added:additions,activated:payload.rows.length-additions,gamaUpdates:payload.enrich.length,unchangedProductsAndCostsPreserved:true,categoriesPreserved:true,noDuplicateIdentities:true,routes,catalogs,images};
await fs.writeFile(`${dir}/verification.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({added:report.added,activated:report.activated,gamaUpdates:report.gamaUpdates,routesVerified:routes.length,imagesDecoded:images.length,integrity:true,publicPrices:true}));
