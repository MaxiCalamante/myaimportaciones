import fs from 'node:fs/promises';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
nextEnv.loadEnvConfig(process.cwd());
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const dir='docs/mango-fuerza-2026-10-08';
await fs.mkdir(dir,{recursive:true});
const snapshot:any={checkedAt:new Date().toISOString()};
for(const table of ['products','product_costs','categories']){
 const data:any[]=[];for(let offset=0;;offset+=1000){const r=await db.from(table).select('*').order(table==='product_costs'?'product_id':'id').range(offset,offset+999);if(r.error)throw r.error;data.push(...r.data);if(r.data.length<1000)break;}snapshot[table]=data;
}
if(!process.argv.includes('--publish')){await fs.writeFile(`${dir}/before.json`,JSON.stringify(snapshot,null,2));}
const rows=snapshot.products.filter((p:any)=>p.model==='THTFX12151'||p.sku==='456517');
console.log(JSON.stringify({count:snapshot.products.length,products:rows,costs:snapshot.product_costs.filter((c:any)=>rows.some((p:any)=>p.id===c.product_id))},null,2));
if(process.argv.includes('--publish')){
 assert.equal(rows.length,0,'Already exists');
 assert.ok(!snapshot.products.some((p:any)=>/THTFX12151/i.test(p.title)));
 const supplier='https://www.totalherramientasoficial.com.py/produto/total-cheve-flexivel--thtfx12151-12-40719.html';
 const html=await fs.readFile(`${dir}/supplier.html`,'utf8');assert.ok(html.includes('content="in stock"'));
 const stamp=new Date().toISOString(),id=randomUUID();
 const imageBytes=await fs.readFile(`${dir}/product.jpg`);await sharp(imageBytes).raw().toBuffer();
 const imagePath='catalog-2026-10-08-total-thtfx12151.jpg';
 const upload=await db.storage.from('product-images').upload(imagePath,imageBytes,{contentType:'image/jpeg',upsert:false});if(upload.error)throw upload.error;
 const imageUrl=db.storage.from('product-images').getPublicUrl(imagePath).data.publicUrl;
 const product={id,category_id:snapshot.categories.find((c:any)=>c.slug==='llaves-tubos-criques').id,title:'Total Mango de fuerza articulado 1/2 pulgada 375 mm THTFX12151',slug:'total-mango-de-fuerza-articulado-1-2-375-mm-thtfx12151',description:'Mango de fuerza articulado Total para trabajar con tubos y bocallaves de encastre de 1/2 pulgada. Su cabezal articulado permite orientar el tubo según el acceso a la tuerca o al tornillo. Tiene 375 mm de largo (15 pulgadas) y está fabricado en acero al cromo vanadio (Cr-V), con acabado cromado.\nIncluye un mango de fuerza; los tubos y bocallaves se venden por separado.\nConsultá disponibilidad y condiciones de entrega antes de comprar.',image_url:imageUrl,image_urls:[imageUrl],retail_price:24200,wholesale_price:0,wholesale_min_qty:1,stock:0,stock_verified_at:null,brand:'Total',model:'THTFX12151',sku:'456517',tags:['Total','Herramientas','Mango de fuerza','Llave flexible','Articulado','Automotor','Taller'],is_active:false,is_featured:false,is_wholesale_only:false,source_url:supplier,fulfillment_mode:'supplier',supplier_available:true,supplier_last_checked_at:stamp,supplier_stock_status:'in_stock',supplier_live_price:12614.99,specifications:{Gama:'Industrial',Encastre:'1/2 pulgada',Longitud:'375 mm (15 pulgadas)',Cabezal:'Articulado',Material:'Acero al cromo vanadio (Cr-V)',Acabado:'Cromado',Incluye:'1 mango de fuerza',Bocallaves:'No incluidas'},warranty_terms:'Consultá las condiciones de garantía y posventa de MYA antes de confirmar la compra.'};
 const ml='https://www.mercadolibre.com.ar/mango-de-fuerza-375mm-articulado-12-total-thtfx12151/up/MLAU220077032?wid=MLA1152296611';
 const cost={product_id:id,origin_cost:12614.99,currency:'ARS',exchange_rate:1,freight_per_unit:0,other_landed_cost:0,variable_cost:0,payment_fee_percent:0,minimum_contribution:0,expenses_confirmed:false,supplier_url:supplier,verified_at:stamp,ml_price:26999,ml_url:ml,ml_checked_at:stamp,source_document:'Alta solicitada por el dueño el 08/10/2026. Costo indicado R$38,41 × ARS328,43/BRL = ARS12614,9863, redondeado ARS12614,99. Se guarda convertido en ARS porque el esquema admite ARS/USD/PYG, manteniendo el original BRL y FX en esta nota. Prevalece el costo de la operación indicado por el dueño sobre la cotización diferente del sitio. Proveedor verificado disponible; foto exacta con 375mm, especificaciones corroboradas con catálogo Total Argentina. ML exacto THTFX12151, 375mm, encastre1/2, HL HERRAMIENTAS, stock disponible4, ARS26999 con impuestos; ficha verificada en navegador el08/10/2026. Venta ARS24200 = referencia ×0,90 redondeada hacia abajo a ARS100. Diferencia ARS11585,01 antes de gastos, no ganancia neta. Gastos pendientes y ceros obligatorios no significan gastos gratuitos. Sin stock físico propio confirmado. Fuentes y costos privados.'};
 await fs.writeFile(`${dir}/payload.json`,JSON.stringify({product:{...product,is_active:true},cost},null,2));
 const inserted=await db.from('products').insert(product);if(inserted.error)throw inserted.error;
 const costs=await db.from('product_costs').insert(cost);if(costs.error)throw costs.error;
 const activated=await db.from('products').update({is_active:true,updated_at:stamp}).eq('id',id).eq('is_active',false).select('id');if(activated.error)throw activated.error;assert.equal(activated.data.length,1);
 const {data:current,error}=await db.from('products').select('*').eq('id',id).single();if(error)throw error;assert.equal(current.retail_price,24200);assert.equal(current.is_active,true);
 await fs.writeFile(`${dir}/published.json`,JSON.stringify({checkedAt:stamp,product:current,cost,mlReference:ml},null,2));
 console.log(JSON.stringify({published:true,url:`https://myaimportaciones.vercel.app/producto/${product.slug}`,price:24200,cost:12614.99}));
}
