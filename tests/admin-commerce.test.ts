import test from 'node:test';import assert from 'node:assert/strict';
import { parseAccountCart,accountCartStorageKey,mergeGuestCart } from '../src/lib/account-cart';
import { adminDate,adminPageNumber,allowedOrderStatuses } from '../src/lib/admin-commerce-types';
import { renderTransactionalEmail } from '../src/lib/email-templates';
import type { CartLine } from '../src/lib/types';
test('carritos: solo referencias validas, aislamiento de cuentas y fusion de invitado sin duplicar',()=>{
 const id='11111111-1111-4111-8111-111111111111';
 assert.deepEqual(parseAccountCart([{id,quantity:2,price:1,secret:'discard'}]),[{id,variant_id:null,quantity:2}]);
 for(const v of [null,{},[{id,quantity:'2'}],[{id,quantity:101}],[{id,quantity:1},{id,quantity:1}]])assert.equal(parseAccountCart(v),null);
 assert.notEqual(accountCartStorageKey('one'),accountCartStorageKey('two'));assert.notEqual(accountCartStorageKey('one'),accountCartStorageKey());
 const line={product:{id},variantId:null,channel:'retail',quantity:2} as CartLine;
 assert.equal(mergeGuestCart([line],[{...line,quantity:3}]).length,1);assert.equal(mergeGuestCart([line],[{...line,quantity:3}])[0].quantity,3);
});
test('filtros y estados respetan fechas validas y acreditacion por Mercado Pago',()=>{
 assert.equal(adminDate('2026-02-30'),null);assert.equal(adminDate('2026-10-20'),'2026-10-20');assert.equal(adminPageNumber('-1'),1);
 assert.deepEqual(allowedOrderStatuses('pending','mercado_pago'),['pending','cancelled']);assert(allowedOrderStatuses('pending','transferencia').includes('paid'));
});
test('email de venta enlaza el pedido exacto y detalla variante, destinatario y cuenta sin filtrarlos al cliente',()=>{
 const id='11111111-1111-4111-8111-111111111111',snapshot={order_id:id,tracking_code:'MYA-123',buyer_name:'Cuenta PRIVADA',buyer_email:'account@example.test',shipping_name:'Destinatario',items:[{product_title:'Teléfono',variant_title:'Azul 256 GB',variant_sku:'SKU-256-BLUE',quantity:2,unit_price:1000}]};
 const admin=renderTransactionalEmail('order_created','admin',snapshot,'https://example.test');assert(admin.text.includes(`/admin/ventas/${id}`));assert(admin.text.includes('A nombre de: Destinatario'));assert(admin.text.includes('Cuenta PRIVADA'));assert(admin.text.includes('Azul 256 GB'));assert(admin.text.includes('SKU-256-BLUE'));
 const customer=renderTransactionalEmail('order_created','customer',snapshot,'https://example.test');assert(!customer.text.includes('Cuenta PRIVADA'));assert(!customer.html.includes('account@example.test'));assert(!customer.text.includes('/admin/'));assert(customer.text.includes('Azul 256 GB'));
});
