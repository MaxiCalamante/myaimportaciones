import test from'node:test';import assert from'node:assert/strict';
import{matchTargets,matchSupplierProduct,discoveryPlan,validGtin,supplierLinkCounts,type MatchProduct}from'../src/lib/supplier-matching';
const base:MatchProduct={id:'a',title:'Medicube Collagen Jelly Cream 50 ml',brand:'Medicube',model:'Collagen Jelly Cream 50 ml'};
test('varios proveedores exige la misma variante, no combinar tamaños diferentes',()=>{
 const offers=[{product_id:'p',variant_id:'50ml',supplier_id:'s1',verification:'verified'},{product_id:'p',variant_id:'100ml',supplier_id:'s2',verification:'verified'}];
 assert.equal(supplierLinkCounts(offers).multipleProducts.size,0);
 assert.equal(supplierLinkCounts([...offers,{...offers[0],supplier_id:'s2',verification:'pending'}]).multipleProducts.size,0);
 assert.equal(supplierLinkCounts([...offers,{...offers[0],supplier_id:'s2'}]).multipleProducts.size,1);
});
test('relación exacta multiproveedor conserva fórmula y presentación',()=>{
 const targets=matchTargets([base,{...base,id:'b',title:'Medicube Collagen Jelly Cream 110 ml'}],[]);
 for(const title of['MEDICUBE COLLAGEN JELLY CREAM 50ML','Medicube creme collagen jelly 50 ml'])assert.equal(matchSupplierProduct({title},targets).target?.productId,'a');
 assert.equal(matchSupplierProduct({title:'MEDICUBE CREME FACIAL COLLAGEN JELLY CREAM 50ML (X004E3I7I7)'},targets).target?.productId,'a');
 for(const title of['Medicube Jelly Cream 50 ml','Medicube Collagen Jelly Cream 50 ml kit x2','Medicube Collagen Jelly Cream 100 ml','Medicube Collagen Jelly Cream 50 ml refill'])assert.notEqual(matchSupplierProduct({title},targets).status,'exact');
 assert.equal(matchSupplierProduct({title:base.title},matchTargets([base,{...base,id:'c'}],[])).status,'review');
});
test('modelo de herramienta no confunde accesorios, kit ni potencia',()=>{
 const targets=matchTargets([{id:'t',title:'Total Rotomartillo SDS Plus 1500W 5,5J TH1153236',brand:'Total',model:'TH1153236'}],[]);
 assert.equal(matchSupplierProduct({title:'TOTAL MARTELO 1500W TH1153236'},targets).status,'exact');
 for(const title of['Total TH1153236 800W','Kit Total TH1153236 1500W','Escobillas para Total TH1153236 1500W']){
  const result=matchSupplierProduct({title},targets);assert.notEqual(result.status,'exact');
 }
});
test('hardware exige capacidad y color completos y excluye unidades usadas',()=>{
 const targets=matchTargets([{id:'s',title:'Samsung Galaxy A16 4 GB 128 GB Verde SM-A165M',brand:'Samsung',model:'Galaxy A16',specifications:{'Modelo / referencia':'SM-A165M'}}],[]);
 assert.equal(matchSupplierProduct({title:'Samsung Galaxy A16 4GB 128GB Green SM-A165M'},targets).status,'exact');
 for(const title of['Samsung A16 8GB 256GB Green SM-A165M','Samsung A16 4GB 128GB SM-A165M','Samsung Galaxy A16 4GB 128GB Green SM-A165M usado'])assert.notEqual(matchSupplierProduct({title},targets).status,'exact');

 // Soporta normalización de RAM/almacenamiento taquigráfico mayorista y prefijos Samsung
 const a17Target = matchTargets([{id:'a17',title:'Samsung Galaxy A17 · 4 GB / 128 GB · Negro · SM-A175F',brand:'Samsung',model:'Galaxy A17',specifications:{'Modelo / referencia':'SM-A175F'}}],[]);
 assert.equal(matchSupplierProduct({title:'CEL SAMSUNG A17 SM-A175F DS/128GB/4 6.7" NEGRO SLIM GLOBAL'},a17Target).status,'exact');

 // Soporta códigos regionales Apple pegados y chips Pro sin confundir versión Pro de dispositivo
 const iphone16Target = matchTargets([{id:'ip16',title:'Apple iPhone 16 · 128 GB · Blanco · SIM física + eSIM · A3287 HN/A',brand:'Apple',model:'iPhone 16'}],[]);
 assert.equal(matchSupplierProduct({title:'Apple IPhone 16 HN/A3287 6.1" 128GB - White'},iphone16Target).status,'exact');

 const macbookNeoTarget = matchTargets([{id:'mbneo',title:'Apple MacBook Neo 13″ · 8 GB / 512 GB · Cítrico · MHFE4LL/A',brand:'Apple',model:'MacBook Neo'}],[]);
 assert.equal(matchSupplierProduct({title:'APPLE MACBOOK NEO DE 13" MHFE4LL/A A18 PRO 8GB RAM/512GB - CITRUS'},macbookNeoTarget).status,'exact');
});
test('variantes y condición sellada no se adivinan',()=>{
 const targets=matchTargets([{id:'p',title:'Anua Cream 50 ml',brand:'Anua',has_variants:true}],[]);assert.deepEqual(targets,[]);
 const phone=matchTargets([{id:'i',title:'iPhone 16 128 GB Black',brand:'Apple'}],[]);
 assert.notEqual(matchSupplierProduct({title:'iPhone 16 128GB Black',supplierKey:'atacado-connect'},phone).status,'exact');
 assert.equal(matchSupplierProduct({title:'iPhone 16 128GB Black nuevo sellado',supplierKey:'atacado-connect'},phone).status,'exact');
});
test('plan cubre todos los productos por proveedor sin depender de portada',()=>{
 const products=[base,{...base,id:'b'}, {id:'t',title:'Total THT123456',brand:'Total',model:'THT123456'}];const jobs=discoveryPlan(products,[{id:'s',official_key:'star-company'},{id:'t',official_key:'total'}]);
 for(const supplier of['s','t'])assert.deepEqual([...new Set(jobs.filter(j=>j.supplier_id===supplier).flatMap(j=>j.product_ids))].sort(),['a','b','t']);
 assert.equal(validGtin('8800256112227'),true);assert.equal(validGtin('8800256112228'),false);
});
