import test from 'node:test';
import assert from 'node:assert/strict';
import type {SupabaseClient} from '@supabase/supabase-js';
import {searchSupplierOpportunities} from '../src/lib/supplier-opportunities';

const stamp=new Date().toISOString();
function fixture(failTable?:string){
 const offer={id:'exact',supplier_id:'active',external_id:'123',title:'Lattafa Asad EDP 100ml',brand:'Lattafa',model:'ASAD',source_url:'https://supplier.test/123',origin_cost:10,currency:'USD',availability:'in_stock',last_success_at:stamp,availability_checked_at:stamp,cost_checked_at:stamp,last_error:null,evidence:{availabilityBasis:'explicit'}};
 const tables:Record<string,unknown>={
  suppliers:[{id:'active',name:'Proveedor QA',official_key:'qa',is_active:true,freshness_hours:24}],categories:[],
  products:[{id:'p',title:offer.title,brand:'Lattafa',model:'ASAD',sku:'',specifications:{},has_variants:false}],
  supplier_market_references:[{product_id:'p',price_ars:100000,source_url:'https://articulo.mercadolibre.com.ar/MLA-QA',checked_at:stamp}],
  supplier_tracking_settings:{config:{acquisitionArsPerUsd:1600,shippingPaidByMya:false,shippingArs:0,fxConfirmedOn:stamp.slice(0,10),fxValidityHours:24}},
  import_cost_policies:{config:{generalPercent:20,confirmed:false}},
  supplier_offers:[offer,{...offer,id:'different-size',title:'Lattafa Asad EDP 50ml'},
   {...offer,id:'error',last_error:'HTTP 403'},
   {...offer,id:'listing',evidence:{availabilityBasis:'orderable_listing'}},
   {...offer,id:'inactive',supplier_id:'inactive'},
   {...offer,id:'expired',availability_checked_at:'2020-01-01T00:00:00Z'}],
 };
 return{from(table:string){const q={select(columns:string){assert.ok(table!=='products'||!columns.split(',').includes('source_url'),'Radar must not request the protected provider URL');return q;},eq(){return q;},is(){return q;},gte(){return q;},not(){return q;},gt(){return q;},order(){return q;},range(){return q;},limit(){return q;},maybeSingle(){return q;},
  then(resolve:(v:unknown)=>unknown){return Promise.resolve(resolve({data:tables[table],error:table===failTable?{message:'read failed'}:null}));}};return q;}} as unknown as SupabaseClient;
}
test('radar excludes inactive suppliers and treats failed, listing-only or expired stock as unknown',async()=>{
 const result=await searchSupplierOpportunities({pageSize:100},{client:fixture()});
 assert.equal(result.items.length,5);
 for(const id of ['error','listing','expired'])assert.equal(result.items.find(o=>o.offerId===id)?.availability,'unknown');
 assert.equal(result.items.find(o=>o.offerId==='exact')?.availability,'in_stock');
 const filtered=await searchSupplierOpportunities({onlyInStock:true,pageSize:100},{client:fixture()});
 assert.deepEqual(filtered.items.map(o=>o.offerId).sort(),['different-size','exact']);
});
test('ML reference requires exact presentation, rather than sharing one model across 50ml and 100ml',async()=>{
 const {items}=await searchSupplierOpportunities({pageSize:100},{client:fixture()});
 assert.equal(items.find(o=>o.offerId==='exact')?.mlPrice,100000);
 assert.equal(items.find(o=>o.offerId==='different-size')?.mlPrice,null);
});
test('reference read errors surface instead of silently returning an apparently complete radar',async()=>{
 await assert.rejects(searchSupplierOpportunities({}, {client:fixture('supplier_market_references')}),/configuración/);
});
