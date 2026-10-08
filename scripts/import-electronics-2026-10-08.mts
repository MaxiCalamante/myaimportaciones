import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
nextEnv.loadEnvConfig(process.cwd());
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const dir='docs/electronics-atacado-2026-10-08';
const rows=JSON.parse(await fs.readFile(`${dir}/priced.json`,'utf8'));
assert.equal(rows.length,137);assert.equal(new Set(rows.map((r:any)=>r.sku)).size,137);
const snapshot:any={checkedAt:new Date().toISOString()};
for(const table of ['products','product_costs','categories']){
 const all:any[]=[];
 for(let offset=0;;offset+=1000){const r=await db.from(table).select('*').order(table==='product_costs'?'product_id':'id').range(offset,offset+999);if(r.error)throw r.error;all.push(...r.data);if(r.data.length<1000)break;}
 snapshot[table]=all;
}
try{await fs.writeFile(`${dir}/before.json`,JSON.stringify(snapshot,null,2),{flag:'wx'});}catch(e:any){if(e.code!=='EEXIST')throw e;}
const existing=snapshot.products.filter((p:any)=>rows.some((r:any)=>r.sku===p.sku||r.id===p.id));
if(!process.argv.includes('--verify'))assert.equal(existing.length,0,'Import already present: verify it instead of duplicating.');
const root={id:'9d64c87a-12d6-4501-afbd-f35b5f9e4a90',parent_id:null,name:'Electrónica',slug:'electronica',description:'Apple y Samsung: smartphones, tablets, notebooks y computadoras. Elegí marca, gama, modelo, capacidad y color.',is_wholesale_only:false,display_order:50};
const categories=[root,
 {id:'cfa5bcfb-99e3-48cf-ab99-3e8c728dfb27',parent_id:root.id,name:'Smartphones',slug:'electronica-smartphones',description:'iPhone y Samsung Galaxy: variantes de almacenamiento, color y conectividad.',is_wholesale_only:false,display_order:1},
 {id:'9486dac3-29c0-438b-befd-707606c52b6f',parent_id:root.id,name:'Tablets',slug:'electronica-tablets',description:'iPad y Galaxy Tab: versiones Wi-Fi, LTE y 5G identificadas en cada ficha.',is_wholesale_only:false,display_order:2},
 {id:'919ccf5b-6dd5-4385-bc68-8cdb9d4b29e9',parent_id:root.id,name:'Notebooks',slug:'electronica-notebooks',description:'MacBook Air, Pro y Neo. Compará procesador, memoria, capacidad y teclado.',is_wholesale_only:false,display_order:3},
 {id:'eb3b63f5-c345-4815-9c7d-3dd9c61d560d',parent_id:root.id,name:'Computadoras de escritorio',slug:'electronica-computadoras-escritorio',description:'iMac y Mac mini: distintas generaciones y configuraciones.',is_wholesale_only:false,display_order:4}];
for(const c of categories){const old=snapshot.categories.find((x:any)=>x.slug===c.slug);assert.ok(!old||old.id===c.id,`Category slug already owned: ${c.slug}`);}
const stamp=new Date().toISOString(),fx=JSON.parse(await fs.readFile(`${dir}/fx.json`,'utf8')).venta;
const assets=new Map<string,{file:string,remote:string,hash:string}>();
const products=rows.map((r:any)=>{
 assert.ok(r.images.length>0&&r.title&&r.description);assert.ok(Number.isFinite(r.retail_price)&&r.retail_price>0);
 const urls=r.images.map((i:any)=>{const remote=`electronics-2026-10-08/${path.basename(i.file)}`;assets.set(remote,{file:i.file,remote,hash:path.basename(i.file,'.jpg')});return db.storage.from('product-images').getPublicUrl(remote).data.publicUrl;});
 const category=categories.find(c=>c.slug===`electronica-${r.kind}`);assert.ok(category);
 return {id:r.id,category_id:category.id,title:r.title,slug:r.slug,description:r.description,image_url:urls[0],image_urls:urls,retail_price:r.retail_price,wholesale_price:0,wholesale_min_qty:1,stock:0,stock_verified_at:null,payment_methods:['transferencia','mercado_pago'],tags:[r.brand,'Electrónica',r.family,r.specifications.Color,r.specifications.Condición],is_featured:false,is_wholesale_only:false,is_active:false,brand:r.brand,model:r.family,sku:r.sku,source_url:null,fulfillment_mode:'supplier',supplier_available:true,supplier_last_checked_at:stamp,supplier_stock_status:'listed_in_supplier_quote',supplier_live_price:r.purchase_usd,specifications:r.specifications,warranty_terms:'Consultá disponibilidad de la unidad, condiciones de garantía y posventa antes de confirmar la compra.'};
});
const costs=rows.map((r:any)=>({product_id:r.id,origin_cost:r.purchase_usd,currency:'USD',exchange_rate:fx,freight_per_unit:0,other_landed_cost:0,payment_fee_percent:0,variable_cost:0,minimum_contribution:r.purchase_ars*.15,expenses_confirmed:false,supplier_url:'https://atacadousa.com.py/',verified_at:stamp,ml_price:r.reference_ars,ml_url:r.reference?.url??null,ml_checked_at:r.reference?stamp:null,source_page:r.row,source_document:`Atacado USA · ${r.file}, fila ${r.row}, SKU ${r.sku}, lista 08/10/2026. Cotización DolarAPI blue venta ${fx} ARS/USD del 08/10. Dueño delegó criterio de electrónica: rentabilidad y precio competitivo. Propuesta 3% bajo techo competitivo, redondeada a ARS100; piso de 15% sobre compra antes de gastos. Referencia ${r.reference?.url??'pendiente'}; techo conservador ARS ${r.competitive_ceiling_ars??'sin comparable'}. ${r.reference?.method??'Fuente argentina directa por SKU/color/configuración.'} ${r.reference?.bundle_note??''} Diferencia ARS ${r.gross_before_expenses} antes de gastos, no ganancia neta. Flete, internación, comisiones y otros gastos pendientes; ceros obligatorios no significan gastos gratuitos. Sin stock físico propio verificado: oferta a pedido según lista del proveedor, confirmar disponibilidad antes de comprar. ${r.eligible?'Apto por identidad/precio; publicación solicitada por el dueño.':'BORRADOR: '+r.pending.join(' | ')}${!r.reference?' Precio provisional compra +25%, sólo borrador, no comparable certificado.':''}`}));
for(const c of categories){
 const kind=c===root?'smartphones':c.slug.replace('electronica-','');
 const product=products.find((p:any)=>rows.some((r:any)=>r.id===p.id&&r.eligible&&r.kind===kind));
 if(product)Object.assign(c,{image_url:product.image_url});
}
const payload={preparedAt:stamp,categories,products,costs,eligibleIds:rows.filter((r:any)=>r.eligible).map((r:any)=>r.id)};
await fs.writeFile(`${dir}/payload.json`,JSON.stringify(payload,null,2));
console.log(JSON.stringify({before:snapshot.products.length,products:products.length,categories:categories.length,images:assets.size,eligible:payload.eligibleIds.length,drafts:products.length-payload.eligibleIds.length}));
if(process.argv.includes('--import')){
 let index=0;
 for(const a of assets.values()){
  const bytes=await fs.readFile(a.file);await sharp(bytes).raw().toBuffer();assert.ok(bytes.length<5*1024*1024);
  const upload=await db.storage.from('product-images').upload(a.remote,bytes,{contentType:'image/jpeg',upsert:false});
  if(upload.error){assert.ok(/already exists|duplicate/i.test(upload.error.message),upload.error.message);const saved=await db.storage.from('product-images').download(a.remote);if(saved.error)throw saved.error;assert.equal(createHash('sha256').update(Buffer.from(await saved.data.arrayBuffer())).digest('hex'),createHash('sha256').update(bytes).digest('hex'));}
  if(++index%20===0)console.log(`Images verified: ${index}/${assets.size}`);
 }
 const newCategories=categories.filter(c=>!snapshot.categories.some((x:any)=>x.id===c.id));
 if(newCategories.length){const result=await db.from('categories').insert(newCategories);if(result.error)throw result.error;}
 const inserted=await db.from('products').insert(products);if(inserted.error)throw inserted.error;
 const costResult=await db.from('product_costs').insert(costs);if(costResult.error)throw costResult.error;
 // All rows remain drafts until both the product and its private cost exist.
 const check=await db.from('product_costs').select('product_id').in('product_id',products.map((p:any)=>p.id));if(check.error)throw check.error;assert.equal(check.data.length,137);
 const activate=await db.from('products').update({is_active:true,updated_at:stamp}).in('id',payload.eligibleIds).eq('is_active',false).select('id');if(activate.error)throw activate.error;assert.equal(activate.data.length,payload.eligibleIds.length);
}
if(process.argv.includes('--import')||process.argv.includes('--verify')){
 if(process.argv.includes('--category-images'))for(const c of categories){
  const result=await db.from('categories').update({image_url:(c as any).image_url,updated_at:stamp}).eq('id',c.id).eq('slug',c.slug).select('id');if(result.error)throw result.error;assert.equal(result.data.length,1);
 }
 const r=await db.from('products').select('*').in('id',products.map((p:any)=>p.id));if(r.error)throw r.error;assert.equal(r.data.length,137);
 const c=await db.from('product_costs').select('*').in('product_id',products.map((p:any)=>p.id));if(c.error)throw c.error;assert.equal(c.data.length,137);
 for(const p of r.data){const expected=products.find((x:any)=>x.id===p.id)!;assert.equal(p.retail_price,expected.retail_price);assert.equal(p.sku,expected.sku);assert.equal(p.is_active,payload.eligibleIds.includes(p.id));assert.equal(p.stock,0);assert.equal(p.stock_verified_at,null);assert.deepEqual(p.specifications,expected.specifications);assert.equal(p.description.replace(/\r\n/g,'\n'),expected.description);assert.deepEqual(p.image_urls,expected.image_urls);}
 for(const a of assets.values()){const url=db.storage.from('product-images').getPublicUrl(a.remote).data.publicUrl;const response=await fetch(url);assert.equal(response.status,200);await sharp(Buffer.from(await response.arrayBuffer())).raw().toBuffer();}
 await fs.writeFile(`${dir}/after-private.json`,JSON.stringify({checkedAt:stamp,products:r.data,costs:c.data},null,2));
 await fs.writeFile(`${dir}/verification.json`,JSON.stringify({checkedAt:stamp,records:137,publicEligible:payload.eligibleIds.length,drafts:137-payload.eligibleIds.length,photosChecked:assets.size,ownStock:0,pricesCurrencies:['ARS','USD'],databaseVerified:true,productionFrontendVerified:false},null,2));
 console.log('Catalog, private costs and all public image URLs verified.');
}
