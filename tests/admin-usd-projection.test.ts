import test from 'node:test';
import assert from 'node:assert/strict';
import type {Product} from '../src/lib/types';
import {projectAdminUsdAmounts} from '../src/lib/admin-usd-projection';
const product:Product={id:'P',title:'QA',slug:'qa',description:'QA',categoryId:'QA',categoryName:'QA',imageUrl:'/qa.png',retailPrice:3527922,wholesalePrice:2970874,active:false,stock:0,paymentMethods:['transferencia'],tags:[],featured:false,wholesaleOnly:false,wholesaleMinQuantity:1};
const rows=[{product_id:'P',variant_id:null,retail_usd:'2074.29',wholesale_usd:null,state:'active'}];
test('admin uses canonical USD and the current ARS rate, retaining inactive records and wholesale exclusions',()=>{
 const [p]=projectAdminUsdAmounts([product],rows,'1661.15','1');
 assert.equal(p.retailPrice,3445707);assert.equal(p.wholesalePrice,0);assert.equal(p.retailUsd,'2074.29');assert.equal(p.active,false);
 assert.equal(product.retailPrice,3527922);
 const [next]=projectAdminUsdAmounts([product],rows,'1700','1');assert.equal(next.retailUsd,p.retailUsd);assert.equal(next.retailPrice,3526293);
});
test('admin retains legacy references when FX is unavailable and does not borrow another identity cost',()=>{
 const [p]=projectAdminUsdAmounts([product],rows,null,'1');assert.equal(p.retailPrice,3527922);assert.match(p.priceWarning??'',/cotización/i);
 const [other]=projectAdminUsdAmounts([product],[{...rows[0],product_id:'OTHER'}],'1661.15','1');assert.equal(other.retailPrice,3527922);
});
test('admin variants use their exact USD rows, including review prices without hiding the record',()=>{
 const p:Product={...product,hasVariants:true,variants:[{id:'V',productId:'P',title:'Exact',retailPrice:1,wholesalePrice:1,isActive:true,stock:0,fulfillmentMode:'supplier',supplierAvailable:true,options:{},displayOrder:0}]};
 const [result]=projectAdminUsdAmounts([p],[{product_id:'P',variant_id:'V',retail_usd:'10',wholesale_usd:'8',state:'review'}],'1661.15','1');
 assert.equal(result.variants?.[0].retailPrice,16612);assert.equal(result.variants?.[0].wholesalePrice,13289);assert.equal(result.minPrice,16612);assert.match(result.variants?.[0].priceWarning??'',/revisión/i);
});
