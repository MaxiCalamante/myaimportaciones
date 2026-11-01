import test from 'node:test';
import assert from 'node:assert/strict';
import { planCatalogImport, validateCatalogFilters } from '../src/lib/catalog-import-plan';
import type { SupplierOffer } from '../src/lib/supplier-intelligence';
const offer=(id:string,title='Lattafa Asad EDP 100ml'):SupplierOffer=>({id,supplier_id:'supplier-'+id,product_id:null,variant_id:null,external_id:id,variant_key:'base',title,brand:'Lattafa',model:'',gtin:null,source_url:'https://supplier.test/'+id,origin_cost:10,currency:'USD',availability:'unknown',verification:'pending',cost_checked_at:null,availability_checked_at:null,last_success_at:null,last_attempt_at:null,last_error:null});
const category='11111111-1111-4111-8111-111111111111';
test('plan groups exact supplier identities but sends 50ml separately for review',()=>{
 const rows=planCatalogImport([offer('a'),offer('b'),offer('c','Lattafa Asad EDP 50ml')],[],category,()=>null);
 assert.equal(rows[0].payload.action,'new');
 assert.equal(rows[1].payload.action,'new');
 assert.equal(rows[0].payload.identity_key,rows[1].payload.identity_key);
 assert.notEqual(rows[0].payload.identity_key,rows[2].payload.identity_key);
 assert.equal(rows[0].payload.product?.retail_price,0);
 assert.equal(rows[0].payload.product?.description,'');
});
test('plan never copies provider image or invents commercial attributes',()=>{
 const [r]=planCatalogImport([offer('a')],[],category,()=>null);
 assert.equal(r.payload.product?.brand,'Lattafa');
 assert.ok(!('image_url' in r.payload.product!));
 assert.equal(r.payload.cost,undefined);
 assert.equal(r.payload.offer.availability,'unknown');
});
test('repeated linked source skips and a different size stays a separate draft',()=>{
 const target={productId:'p',variantId:null,title:'Lattafa Asad EDP 100ml',brand:'Lattafa',model:'',sku:'',specifications:{},sourceUrl:null};
 const rows=planCatalogImport([{...offer('a'),product_id:'p'},offer('b','Lattafa Asad EDP 50ml')],[target],category,()=>null);
 assert.equal(rows[0].payload.action,'skip');
 assert.equal(rows[1].payload.action,'new');
 assert.notEqual(rows[0].payload.identity_key,rows[1].payload.identity_key);
});
test('filters reject malformed IDs, unbounded sizes and invalid money before queries',()=>{
 for(const f of [{supplierId:'bad'},{pageSize:1001},{minCost:-1},{minCost:10,maxCost:2},{availability:'yes'}])assert.throws(()=>validateCatalogFilters(f as Parameters<typeof validateCatalogFilters>[0]));
 assert.deepEqual(validateCatalogFilters({query:'  Total  ',page:2}),{query:'Total',page:2,pageSize:30});
});
