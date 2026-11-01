import test from 'node:test';
import assert from 'node:assert/strict';
import { atlanticoPublicProduct } from '../src/lib/atlantico-product';
import { matchSupplierProduct,matchTargets } from '../src/lib/supplier-matching';

const url='https://www.atlanticoshop.com.py/index.php?route=product/product&product_id=43337';
function page(stock='En stock',currency='USD') {
  return `<link href="${url.replace(/&/g,'&amp;')}" rel="canonical"><button class="btn btn-currency"><strong>${currency}</strong></button><h1>Ingresar</h1><h1 class="product-name">Apple Adaptador USB-C 20W - White</h1><li class="price"><span>$19.80</span></li><li>Marca: <span>APPLE</span></li><li>Disponibilidad: <span id="cuadro_stock">${stock}</span></li><div id="product"><input type="hidden" name="product_id" value="43337"></div><aside><li class="price">$1.00</li><span id="cuadro_stock">En stock</span></aside>`;
}
test('Atlántico requires primary form and canonical identity; ignores related stock and prices',()=>{
  const p=atlanticoPublicProduct(page('Agotado'),url);
  assert.equal(p?.external_id,'43337');assert.equal(p?.origin_cost,19.8);assert.equal(p?.currency,'USD');assert.equal(p?.availability,'out_of_stock');assert.equal(p?.brand,'APPLE');
  assert.equal(atlanticoPublicProduct(page().replace('value="43337"','value="999"'),url),null);
  assert.equal(atlanticoPublicProduct(page().replace('product_id=43337" rel','product_id=999" rel'),url),null);
  assert.equal(atlanticoPublicProduct(page(),url.replace('43337','999')),null);
  assert.equal(atlanticoPublicProduct(page(),'https://www.atlanticoshop.com.py/'),null);
});
test('Atlántico preserves unknown stock and does not assume USD from dollar signs',()=>{
  assert.equal(atlanticoPublicProduct(page('Consultar'),url)?.availability,'unknown');
  assert.equal(atlanticoPublicProduct(page('En stock','PYG'),url)?.origin_cost,null);
  assert.equal(atlanticoPublicProduct(page().replace('id="cuadro_stock"','id="other"'),url)?.availability,'unknown');
  assert.equal(atlanticoPublicProduct(page().replace('class="product-name"','class="other"'),url),null);
});

test('public catalogue RAM/storage notation retains both dimensions and explicit mobile network',()=>{
  const targets=matchTargets([{id:'1',title:'Samsung Galaxy A37 8 GB 256 GB Lavanda SM-A376B',brand:'Samsung',model:'SM-A376B',specifications:{Conectividad:'5G'}}],[]);
  const source={title:'Samsung Galaxy A37 SM-A376B 5G 8/256GB Lavender'};
  assert.equal(matchSupplierProduct(source,targets).status,'exact');
  assert.notEqual(matchSupplierProduct({...source,title:source.title.replace('8/256','6/256')},targets).status,'exact');
  assert.notEqual(matchSupplierProduct({...source,title:source.title.replace('5G','4G')},targets).status,'exact');
  assert.notEqual(matchSupplierProduct(source,matchTargets([{id:'1',title:'Samsung Galaxy A37 8 GB 256 GB Lavanda SM-A376B',brand:'Samsung',model:'SM-A376B'}],[])).status,'exact');
  const mac=matchTargets([{id:'2',title:'Apple MacBook Air M5 24 GB 1 TB Blanco estrella MDHD4LL/A',brand:'Apple',model:'MDHD4LL/A'}],[]);
  assert.equal(matchSupplierProduct({title:'Apple MacBook Air M5 MDHD4LL/A 24/1TB Starlight'},mac).status,'exact');
  const tablet=matchTargets([{id:'3',title:'Samsung Galaxy Tab S10 Lite 6 GB 128 GB Gris + S Pen SM-X400',brand:'Samsung',model:'SM-X400'}],[]);
  assert.notEqual(matchSupplierProduct({title:'Samsung Galaxy Tab S10 Lite SM-X400 6/128GB Gray + Cover'},tablet).status,'exact');
  const phone=matchTargets([{id:'4',title:'Apple iPhone 17 A3520 256GB Black',brand:'Apple',model:'A3520'}],[]);
  assert.notEqual(matchSupplierProduct({title:'Apple iPhone 17 A3520 256GB Black SWAP'},phone).status,'exact');
  assert.notEqual(matchSupplierProduct({title:'Apple iPhone 17 A3520 256GB Black Sin Lacre'},phone).status,'exact');
  const cpo=matchTargets([{id:'5',title:'Apple iPhone 17 A3520 256GB Black CPO',brand:'Apple',model:'A3520'}],[]);
  assert.notEqual(matchSupplierProduct({title:'Apple iPhone 17 A3520 256GB Black SWAP'},cpo).status,'exact');
});
