import test from 'node:test';
import assert from 'node:assert/strict';
import { safeAuthNext } from '../src/lib/auth-navigation';
import { parseFavoriteIds } from '../src/lib/browser-commerce';
import { purchasableQuantity, isVerifiedStock } from '../src/lib/commerce-policy';
import { calculateShipping, isProductImmediateStock, getProductShippingTimeInfo } from '../src/lib/shipping';
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

test('separately quoted nationwide shipping never becomes free or invents delivery time', () => {
  const previous = process.env.NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY;
  process.env.NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY = 'quote_separately';
  try {
    for (const postcode of ['7000', '1425', '1800', '5000', '5500', '9410']) {
      for (const supplier of [true, false]) {
        const quote = calculateShipping(postcode, 54900, !supplier, supplier);
        assert.equal(quote.isValid, true);
        assert.equal(quote.options.length, 1);
        assert.equal(quote.options[0].id, 'delivery_quote_separately');
        assert.equal(quote.options[0].requiresQuote, true);
        assert.equal(quote.options[0].isFree, false);
        assert.equal(quote.options[0].price, 0);
        assert.equal(quote.options[0].type, 'domicilio');
        assert.match(quote.options[0].estimatedDays, /por separado/);
      }
    }
    assert.match(getProductShippingTimeInfo({fulfillmentMode:'supplier',supplierAvailable:true}).shippingTimeDescription, /por separado/);
    assert.equal(calculateShipping('invalid', 54900, false, true).isValid, false);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY;
    else process.env.NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY = previous;
  }
});

test('Correo Argentino calculates actual rates for domicile and branches by province and postal code', () => {
  const previousPolicy = process.env.NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY;
  delete process.env.NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY;
  try {
    // 1. CABA
    const caba = calculateShipping('1425', 25000, true, false, 'C');
    assert.equal(caba.isValid, true);
    assert.equal(caba.zoneId, 'caba');
    const cabaHome = caba.options.find(o => o.id === 'correo_domicilio');
    assert.ok(cabaHome);
    assert.equal(cabaHome.price, 6800);
    assert.equal(cabaHome.carrier, 'Correo Argentino Paq.ar');

    // 2. Córdoba (Centro y Litoral)
    const cba = calculateShipping('5000', 30000, true, false, 'X');
    assert.equal(cba.isValid, true);
    assert.equal(cba.zoneId, 'centro_litoral');
    const cbaHome = cba.options.find(o => o.id === 'correo_domicilio');
    assert.ok(cbaHome);
    assert.equal(cbaHome.price, 8600);

    // 3. Mendoza (Cuyo)
    const mendoza = calculateShipping('5500', 40000, true, false, 'M');
    assert.equal(mendoza.isValid, true);
    assert.equal(mendoza.zoneId, 'cuyo_noa');
    const mendozaHome = mendoza.options.find(o => o.id === 'correo_domicilio');
    assert.ok(mendozaHome);
    assert.equal(mendozaHome.price, 9800);

    // 4. Tandil (Local headquarters)
    const tandil = calculateShipping('7000', 15000, true, false, 'B', 'Tandil');
    assert.equal(tandil.isValid, true);
    assert.equal(tandil.zoneId, 'local_tandil');
    const pickup = tandil.options.find(o => o.id === 'pickup_tandil');
    assert.ok(pickup);
    assert.equal(pickup.price, 0);
  } finally {
    if (previousPolicy === undefined) delete process.env.NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY;
    else process.env.NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY = previousPolicy;
  }
});

test('Shipping rate dynamically adapts when user changes postal code, address, or city without getting stuck', () => {
  const previousPolicy = process.env.NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY;
  delete process.env.NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY;
  try {
    // 1. Changing CP from 7000 to 5000 (Cordoba) while previous province was B MUST compute Cordoba (Centro/Litoral $8600)
    const cordobaOverride = calculateShipping('5000', 20000, true, false, 'B', '');
    assert.equal(cordobaOverride.isValid, true);
    assert.equal(cordobaOverride.zoneId, 'centro_litoral');
    const cordobaHome = cordobaOverride.options.find(o => o.id === 'correo_domicilio');
    assert.equal(cordobaHome?.price, 8600);

    // 2. Changing CP to 8300 (Neuquen) while previous province was B MUST compute Patagonia ($12500)
    const neuquenOverride = calculateShipping('8300', 20000, true, false, 'B', '');
    assert.equal(neuquenOverride.isValid, true);
    assert.equal(neuquenOverride.zoneId, 'patagonia');
    const patagoniaHome = neuquenOverride.options.find(o => o.id === 'correo_domicilio');
    assert.equal(patagoniaHome?.price, 12500);

    // 3. Changing CP to 1425 (CABA) while previous province was B MUST compute CABA ($6800)
    const cabaOverride = calculateShipping('1425', 20000, true, false, 'B', '');
    assert.equal(cabaOverride.isValid, true);
    assert.equal(cabaOverride.zoneId, 'caba');
    const cabaHome = cabaOverride.options.find(o => o.id === 'correo_domicilio');
    assert.equal(cabaHome?.price, 6800);

    // 4. Changing CP to 1640 (Martinez, GBA) MUST compute GBA ($7200)
    const gbaOverride = calculateShipping('1640', 20000, true, false, 'B', '');
    assert.equal(gbaOverride.isValid, true);
    assert.equal(gbaOverride.zoneId, 'gba');
    const gbaHome = gbaOverride.options.find(o => o.id === 'correo_domicilio');
    assert.equal(gbaHome?.price, 7200);

    // 5. Entering address or city text (e.g. Rosario, Bariloche, Tandil) without CP resolves dynamically
    const rosarioText = calculateShipping('', 20000, true, false, '', 'Rosario', 'San Martín 1200');
    assert.equal(rosarioText.isValid, true);
    assert.equal(rosarioText.zoneId, 'centro_litoral');

    const barilocheText = calculateShipping('', 20000, true, false, '', 'Bariloche', 'Mitre 450');
    assert.equal(barilocheText.isValid, true);
    assert.equal(barilocheText.zoneId, 'patagonia');

    const tandilText = calculateShipping('', 20000, true, false, '', 'Tandil', 'Belgrano 500');
    assert.equal(tandilText.isValid, true);
    assert.equal(tandilText.zoneId, 'local_tandil');
  } finally {
    if (previousPolicy === undefined) delete process.env.NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY;
    else process.env.NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY = previousPolicy;
  }
});

