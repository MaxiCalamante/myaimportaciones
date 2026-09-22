import test from 'node:test';
import assert from 'node:assert/strict';
import { safeAuthNext } from '../src/lib/auth-navigation';
import { parseFavoriteIds } from '../src/lib/browser-commerce';
import { purchasableQuantity, isVerifiedStock } from '../src/lib/commerce-policy';
import { calculateShipping, isProductImmediateStock } from '../src/lib/shipping';
test('login keeps internal destination and rejects external redirect tricks', () => {
  assert.equal(safeAuthNext('/checkout?step=shipping'), '/checkout?step=shipping');
  for (const value of ['https://evil.test','//evil.test','/%2fevil.test','/\\evil.test','/%5cevil.test','/\nevil.test','/%0aevil.test','/%zz', null]) assert.equal(safeAuthNext(value), '/cuenta');
});
test('corrupt browser favorites cannot break the storefront', () => {
  const id='3628d0d5-1f17-5add-a05c-31cf4678f976';
  for (const value of [null,'{','{}','null','42']) assert.deepEqual(parseFavoriteIds(value), []);
  assert.deepEqual(parseFavoriteIds(JSON.stringify([id,id,123,'broken'])),[id]);
});
test('supplier availability is independent of physical units and immediate dispatch', () => {
  const product={stock:0,fulfillmentMode:'supplier',supplierAvailable:true};
  assert.equal(purchasableQuantity(product),100);
  assert.equal(isVerifiedStock(product),true);
  assert.equal(isProductImmediateStock(product),false);
  assert.equal(purchasableQuantity({...product,supplierAvailable:false,stock:500}),0);
  assert.equal(purchasableQuantity({stock:50}),0);
  assert.equal(purchasableQuantity({stock:3,stockVerifiedAt:'2026-09-22'}),3);
});
test('unconfigured supplier delivery is a quote, never free or local pickup', () => {
  const previous=process.env.NEXT_PUBLIC_SUPPLIER_SHIPPING_RATES_JSON;
  try {
    for(const config of ['{}','null','bad','{"local_tandil":-1}','{"local_tandil":"1000"}']) {
      process.env.NEXT_PUBLIC_SUPPLIER_SHIPPING_RATES_JSON=config;
      const quote=calculateShipping('7000',54900,false,true);
      assert.equal(quote.options.length,1);
      assert.equal(quote.options[0].type,'domicilio');
      assert.equal(quote.options[0].requiresQuote,true);
      assert.equal(quote.options[0].isFree,false);
    }
    process.env.NEXT_PUBLIC_SUPPLIER_SHIPPING_RATES_JSON='{"caba":10000}';
    const quote=calculateShipping('1425',54900,false,true);
    assert.equal(quote.options[0].price,10000);
    assert.equal(quote.options[0].requiresQuote,false);
    assert.equal(calculateShipping('7000',54900,false,true).options[0].requiresQuote,true);
  } finally { if(previous===undefined) delete process.env.NEXT_PUBLIC_SUPPLIER_SHIPPING_RATES_JSON; else process.env.NEXT_PUBLIC_SUPPLIER_SHIPPING_RATES_JSON=previous; }
});
