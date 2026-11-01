import test from 'node:test';
import assert from 'node:assert/strict';
import {mapProduct,type DbProduct} from '../src/lib/catalog-data';
test('public supplier availability expires without changing physical stock or admin evidence',()=>{
 const p={id:'p',title:'Equipo',slug:'equipo',fulfillment_mode:'supplier',supplier_available:true,supplier_last_checked_at:'2020-01-01T00:00:00Z',stock:7} as DbProduct;
 assert.equal(mapProduct(p).supplierAvailable,false);
 assert.equal(mapProduct(p,true).supplierAvailable,true);
 assert.equal(mapProduct(p).stock,7);
 assert.equal(mapProduct({...p,supplier_last_checked_at:new Date().toISOString()}).supplierAvailable,true);
 assert.equal(mapProduct({...p,supplier_last_checked_at:null}).supplierAvailable,false);
});
