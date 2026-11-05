import test from 'node:test';
import assert from 'node:assert/strict';
import { incrementCartLine } from '../src/lib/cart-mutations';
import type {CartLine} from '../src/lib/types';
import {reconcileCart} from '../src/lib/cart-reconcile';
const line={product:{id:'p',stock:8,stockVerifiedAt:'2026-11-04',fulfillmentMode:'own_stock'},quantity:3,channel:'retail'} as CartLine;
test('adding to an existing line uses the current cart stock and never reduces its quantity',()=>{
 assert.equal(incrementCartLine(line,1).quantity,4);
 assert.equal(incrementCartLine({...line,quantity:8},1).quantity,8);
});
test('wholesale physical stock has the same limit before and after refresh',()=>{
 const wholesale={...line,channel:'wholesale' as const,quantity:10};
 assert.equal(reconcileCart([wholesale],[line.product])[0].quantity,8);
});
