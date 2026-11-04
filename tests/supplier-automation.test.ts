import test from'node:test';import assert from'node:assert/strict';
import{parsePublicAmount,publicProductFromJsonLd,exactCatalogueMatch,totalVisibleOffer}from'../src/lib/supplier-public-data';
import{compatibleMarketIdentity,marketUrl,manualMarketUrl}from'../src/lib/supplier-market';
import{processSupplierJob,validateTrackingConfig,type TrackingConfig}from'../src/lib/supplier-automation';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {IntelligenceSupplier} from '../src/lib/supplier-intelligence';
test('precios públicos locales y miles no mezclan monedas',()=>{for(const[raw,n]of [['U$ 2.220,00',2220],['US$ 1,234.56',1234.56],['$ 159.00',159],['Gs 1.180.000',1180000]]as const)assert.equal(parsePublicAmount(raw),n);assert.equal(parsePublicAmount('Agotado'),null);assert.equal(parsePublicAmount('-9'),null);});
test('JSON-LD selecciona producto principal por URL y moneda explícita',()=>{
 const url='https://atacadoconnect.com/produto/telefono/123';
 const html='<script type="application/ld+json">'+JSON.stringify([{'@type':'Product',url:'https://example.test/related',name:'Relacionado',sku:'other',offers:{price:1,priceCurrency:'USD',availability:'https://schema.org/InStock'}},{'@type':'Product',url,name:'Producto exacto',sku:'123',offers:{price:100,priceCurrency:'USD',availability:'https://schema.org/OutOfStock'}}])+'</script>';
 const p=publicProductFromJsonLd(html,url,'123');assert.equal(p?.title,'Producto exacto');assert.equal(p?.origin_cost,100);assert.equal(p?.availability,'out_of_stock');assert.equal(publicProductFromJsonLd(html,'https://unknown.test/'),null);
});
test('duplicados y variantes nunca se vinculan por similitud',()=>{
 const p={external_id:'1',variant_key:'base',title:'Anua 200 ml',brand:'Anua',model:'',source_url:'https://example.test/',origin_cost:10,currency:'USD' as const,availability:'in_stock' as const};
 assert.equal(exactCatalogueMatch(p,[{id:'1',title:'ANUA 200 ML'}]),'1');assert.equal(exactCatalogueMatch(p,[{id:'1',title:'Anua 200 ml',hasVariants:true}]),null);assert.equal(exactCatalogueMatch(p,[{id:'1',title:p.title},{id:'2',title:p.title}]),null);assert.equal(exactCatalogueMatch(p,[{id:'1',title:'Anua 100 ml'}]),null);
});
test('Total toma el precio visible principal con impuestos y normaliza disponibilidad espaciada',()=>{
 const url='https://www.totalherramientasoficial.com.py/produto/p-1.html';
 const ld='<script type="application/ld+json">'+JSON.stringify({'@type':'Product',url,name:'Total exacto',sku:'123',offers:{price:77,priceCurrency:'USD',availability:'https://schema.org/out of stock'}})+'</script>';
 assert.equal(publicProductFromJsonLd(ld,url)?.availability,'out_of_stock');
 const html=ld+'<h1>Total exacto</h1><div class="product-price"><div>USD 84.70</div><link href="https://schema.org/InStock"/></div><div class="related"><div class="product-price">USD 1.00</div></div>';
 assert.deepEqual(totalVisibleOffer(html),{price:84.7,availability:'in_stock'});
 assert.equal(totalVisibleOffer('<div class="product-price">USD 1.00</div>'),null);
});
test('comparable exige identidad y sitio argentino, sin SSRF',()=>{
 const own={title:'Medicube Collagen Jelly Cream 50 ml',brand:'Medicube',model:'Collagen Jelly Cream 50 ml'};
 assert.equal(compatibleMarketIdentity(own,own.title),true);assert.equal(compatibleMarketIdentity(own,'Medicube Collagen Jelly Cream 100 ml'),false);assert.equal(compatibleMarketIdentity(own,'Otra marca Collagen Jelly Cream 50 ml'),false);
 assert.equal(compatibleMarketIdentity(own,'Medicube Collagen Jelly Cream 50 ml pack x 2'),false);
 assert.equal(compatibleMarketIdentity({title:'iPhone 16 128 GB Black',brand:'Apple',model:'A123'},'Funda iPhone 16 128 GB Black A123'),false);
 for(const u of ['http://mercadolibre.com.ar/x','https://mercadolibre.com.ar.evil.test/x','https://127.0.0.1/','https://u:p@mercadolibre.com.ar/x'])assert.throws(()=>marketUrl(u));assert.equal(marketUrl('https://articulo.mercadolibre.com.ar/MLA-123'),'https://articulo.mercadolibre.com.ar/MLA-123');
 for(const u of ['javascript:alert(1)','http://tienda.com.ar/x','https://localhost/x','https://127.0.0.1/x','https://tienda.internal/x'])assert.throws(()=>manualMarketUrl(u));
 assert.equal(manualMarketUrl('https://tienda.com.ar/producto'),'https://tienda.com.ar/producto');
});
test('parámetros de automatización rechazan valores peligrosos y soportan autoPauseWhenOutOfStock',()=>{
 const c={enabled:true,autoStock:true,autoPrices:true,autoPauseWhenOutOfStock:true,acquisitionArsPerUsd:1600,fxConfirmedOn:'2026-10-20',shippingPaidByMya:false,shippingArs:0,targetMarginPercent:20,marketDiscountPercent:10,roundArs:100,maxPriceChangePercent:20,freshnessHours:24,marketFreshnessHours:48,fxValidityHours:72,notes:''}satisfies TrackingConfig;
 assert.equal(validateTrackingConfig(c),c);
 assert.equal(validateTrackingConfig({...c, autoPauseWhenOutOfStock: false}).autoPauseWhenOutOfStock, false);
 for(const p of[{acquisitionArsPerUsd:0},{targetMarginPercent:100},{marketDiscountPercent:100},{roundArs:0},{maxPriceChangePercent:101}])assert.throws(()=>validateTrackingConfig({...c,...p}));
});

test('seguimiento conserva borradores y solo pausa agotamiento confirmado sin confundir el resultado de la RPC',async()=>{
 const original=globalThis.fetch;
 const config:TrackingConfig={enabled:true,autoStock:true,autoPrices:false,acquisitionArsPerUsd:1600,fxConfirmedOn:'2026-11-01',shippingPaidByMya:false,shippingArs:0,targetMarginPercent:20,marketDiscountPercent:10,roundArs:100,maxPriceChangePercent:20,freshnessHours:24,marketFreshnessHours:48,fxValidityHours:72,notes:''};
 const supplier:IntelligenceSupplier={id:'11111111-1111-4111-8111-111111111111',name:'Star',website:'https://www.starcompany-py.com',official_key:'star-company',query_mode:'product_page',automation_authorized:true,freshness_hours:24,is_active:true,capabilities:{}};
 globalThis.fetch=async()=>new Response('<div id="product-details" data-product=\'{"id_product":123,"id_product_attribute":0,"name":"Anua Serum 50ml","quantity":0,"manufacturer_name":"Anua","price_amount":10,"price_currency_code":"USD"}\'></div>');
 try{
  for(const scenario of [
   {name:'ficha desaparecida',active:true,available:true,status:'in_stock',applied:false,variants:false,want:true,missing:true},
   {name:'borrador disponible',active:false,available:true,status:'in_stock',applied:true,variants:false,want:false},
   {name:'agotamiento aplicado',active:true,available:false,status:'out_of_stock',applied:true,variants:false,want:false},
   {name:'sin evidencia',active:true,available:false,status:'out_of_stock',applied:false,variants:false,want:true},
   {name:'disponibilidad desconocida',active:true,available:false,status:'unknown',applied:true,variants:false,want:true},
   {name:'variante disponible sin agregado completo',active:true,available:false,status:'out_of_stock',applied:true,variants:true,want:true},
  ]){
   const product:Record<string,unknown>={id:'22222222-2222-4222-8222-222222222222',title:'Anua Serum 50ml',brand:'Anua',model:'',sku:'',is_active:scenario.active,supplier_available:scenario.available,supplier_stock_status:scenario.status,fulfillment_mode:'supplier',has_variants:scenario.variants,stock:7};
   const db={rpc:async(name:string)=>({data:name==='refresh_supplier_availability_v1'?scenario.applied:'offer',error:null}),from(table:string){
    let patch:Record<string,unknown>|null=null;const filters:Array<[string,unknown]>=[];
    const execute=()=>{if(table==='products'&&patch&&filters.every(([key,value])=>product[key]===value))Object.assign(product,patch);return{data:table==='products'?product:null,error:null};};
    const q={select(){return q;},eq(key:string,value:unknown){filters.push([key,value]);return q;},is(key:string,value:unknown){filters.push([key,value]);return q;},update(value:Record<string,unknown>){patch=value;return q;},upsert(){return q;},single:async()=>execute(),then(resolve:(value:ReturnType<typeof execute>)=>unknown){return Promise.resolve(execute()).then(resolve);}};return q;
   }}as unknown as SupabaseClient;
   const fetchEvidence=globalThis.fetch;
   if(scenario.missing)globalThis.fetch=async(url)=>String(url).endsWith('/robots.txt')?new Response('User-agent: *'):new Response(null,{status:404});
   const result=await processSupplierJob(db,{id:'job',supplier_id:supplier.id,product_id:String(product.id),variant_id:null,offer_id:null,source_url:'https://www.starcompany-py.com/product/123',attempts:0},supplier,config);
   assert.equal(result.ok,!scenario.missing,scenario.name);
   assert.equal(product.is_active,scenario.want,scenario.name);
   assert.equal(product.stock,7,scenario.name);
   globalThis.fetch=fetchEvidence;
  }
 }finally{globalThis.fetch=original;}
});
