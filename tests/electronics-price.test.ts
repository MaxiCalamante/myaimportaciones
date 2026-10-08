import { test } from 'node:test';
import assert from 'node:assert/strict';
import { electronicsDollarPrice, formatDollarPrice } from '../src/lib/electronics-price';

test('USD equivalent follows the actual ARS price after price edits', () => {
  const specifications = { 'Cotización USD/ARS': '1550' };
  assert.equal(electronicsDollarPrice({ retailPrice: 1550000, specifications }), 1000);
  assert.equal(electronicsDollarPrice({ retailPrice: 1705000, specifications }), 1100);
  assert.equal(electronicsDollarPrice({ retailPrice: 209500, specifications }), 135.16);
  assert.equal(formatDollarPrice(135.16), 'USD 135,16');
});
test('products without a valid quotation never show a misleading USD price', () => {
  for (const exchange of ['', '0', '-1', 'NaN', 'Infinity', 'abc']) {
    assert.equal(electronicsDollarPrice({ retailPrice: 155000, specifications: { 'Cotización USD/ARS': exchange } }), null);
  }
  assert.equal(electronicsDollarPrice({ retailPrice: 100, specifications: {} }), null);
});
