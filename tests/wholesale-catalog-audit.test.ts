import test from 'node:test';
import assert from 'node:assert/strict';
import {auditWholesaleCatalog} from '../src/lib/wholesale-catalog-audit';
const stamp='2026-11-02T15:00:00Z',now=Date.parse(stamp);
const p={id:'p',title:'Lattafa Asad EDP 100ml',slug:'asad',brand:'Lattafa',sku:'ASAD100',category_id:'cat',description:'Descripción factual del producto con su presentación exacta y datos revisados en la ficha del fabricante, sin promesas inventadas.',image_url:'https://mya.test/100.jpg',source_url:'https://supplier.test/100',retail_price:100,wholesale_price:80,is_active:true,fulfillment_mode:'supplier',stock:0};
const data={products:[p],variants:[],costs:[{product_id:'p',origin_cost:10,exchange_rate:1,landed_cost:20,variable_cost:2,payment_fee_percent:5,expenses_confirmed:true,verified_at:stamp,source_document:'Comprobante de costos completos'}],offers:[{id:'o',product_id:'p',supplier_id:'s',verification:'verified',availability_checked_at:stamp,external_id:'100'}],suppliers:[{id:'s',is_active:true,freshness_hours:24}],categories:[{id:'cat',slug:'perfumes'}],controls:[{product_id:'p',variant_id:null,identity_confirmed:true,eligibility_confirmed:true,media_authorized:true,compliance_confirmed:true,evidence:'Documentación y material de la presentación exacta comprobados'}]};
test('audit assesses every row and separates deleted rows without mutating catalog or costs',()=>{
 const input={...data,products:[p,{...p,id:'deleted',deleted_at:stamp}]};const before=JSON.stringify(input);
 const report=auditWholesaleCatalog(input,now);assert.equal(report.assessed,2);assert.equal(report.ready,1);assert.equal(report.archived,1);assert.equal(JSON.stringify(input),before);
});
test('unknown costs, failed sources and missing commercial evidence remain pending',()=>{
 const report=auditWholesaleCatalog({...data,costs:[],controls:[],offers:[{...data.offers[0],last_error:'HTTP 404'}]},now);
 assert.equal(report.ready,0);for(const code of ['cost','expenses','cost_evidence','supplier','source_error','eligibility'])assert.ok(report.items[0].findings.some(f=>f.code===code),code);
});
test('50ml and 100ml are separate identities; matching SKU is a review candidate, never an automatic merge',()=>{
 const report=auditWholesaleCatalog({...data,products:[p,{...p,id:'small',title:'Lattafa Asad EDP 50ml',sku:'ASAD50'},{...p,id:'copy'}]},now);
 assert.equal(report.assessed,3);assert.equal(report.duplicateGroups,1);assert.equal(report.duplicateCandidates,2);assert.deepEqual(report.items.find(i=>i.id==='small')?.duplicateCandidates,[]);
});
test('variants cannot borrow parent cost or a different variant supplier identity',()=>{
 const report=auditWholesaleCatalog({...data,variants:[{id:'v',product_id:'p',is_active:true}]},now);
 assert.ok(report.items[0].findings.some(f=>f.code==='variant_source'));assert.ok(report.items[0].findings.some(f=>f.code==='variant_cost'));
});
