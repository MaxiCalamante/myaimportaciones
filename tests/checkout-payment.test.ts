import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutPayments } from '../src/lib/checkout-payment';

test('checkout offers only payment methods shared by every product and enabled by the store',()=>{
 const both={paymentMethods:['transferencia','mercado_pago']};
 assert.deepEqual(checkoutPayments([both,{paymentMethods:['transferencia']}],true),['transferencia']);
 assert.deepEqual(checkoutPayments([both,{paymentMethods:['mercado_pago']}],true),['mercado_pago']);
 assert.deepEqual(checkoutPayments([both],false),['transferencia']);
 assert.deepEqual(checkoutPayments([{paymentMethods:['transferencia']},{paymentMethods:['mercado_pago']}],true),[]);
 assert.deepEqual(checkoutPayments([{}],true),['transferencia']);
});
