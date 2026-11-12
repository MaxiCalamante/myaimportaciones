import test from 'node:test';
import assert from 'node:assert/strict';
import type {Product,ProductVariant} from '../src/lib/types';
import type {SupabaseClient} from '@supabase/supabase-js';
const product={id:'P',title:'Reference',retailPrice:900,wholesalePrice:700,hasVariants:false}as Product;
const row={productId:'P',variantId:null,retailUsd:'10',wholesaleUsd:'8',retailArs:15000,wholesaleArs:12000,rateId:'R'};

test('positive projected ARS remain reference-only without affirmative cost verification',async()=>{
 const projection=await import('../src/lib/usd-price-projection').catch(()=>null);
 assert.ok(projection,'price projection must separate reference amounts from verification');
 const [p]=projection.projectPublicUsdPrices([product],[row],[]);
 assert.equal(p.retailPrice,15000);assert.equal(p.wholesalePrice,12000);assert.equal(p.priceVerified,false);assert.equal(p.wholesalePriceVerified,false);assert.equal(p.isPurchasable,false);
 const [verified]=projection.projectPublicUsdPrices([product],[row],[{...row,productId:'P',variantId:null,retailVerified:true,wholesaleVerified:false}]);
 assert.equal(verified.priceVerified,true);assert.equal(verified.wholesalePriceVerified,false);assert.equal(verified.isPurchasable,true);
 const [changedFx]=projection.projectPublicUsdPrices([product],[row],[{...row,rateId:'NEW',retailVerified:true,wholesaleVerified:true}]);assert.equal(changedFx.priceVerified,false);
 const [changedPrice]=projection.projectPublicUsdPrices([product],[row],[{...row,retailArs:16000,retailVerified:true,wholesaleVerified:true}]);assert.equal(changedPrice.priceVerified,false);
 const [rpcError]=projection.projectPublicUsdPrices([product],[],[]);assert.equal(rpcError.retailPrice,900);assert.equal(rpcError.priceVerified,false);
});
test('variants keep exact independent verification and reference ranges when no variant is verified',async()=>{
 const {projectPublicUsdPrices}=await import('../src/lib/usd-price-projection');
 const p={...product,hasVariants:true,variants:[{id:'V',productId:'P',retailPrice:900,wholesalePrice:700,isActive:true}as ProductVariant]};
 const prices=[{...row,variantId:'V'}];
 let projected=projectPublicUsdPrices([p],prices,[])[0];assert.equal(projected.variants![0].priceVerified,false);assert.equal(projected.minPrice,15000);
 projected=projectPublicUsdPrices([p],prices,[{...row,productId:'P',variantId:'V',retailVerified:true,wholesaleVerified:true}])[0];
 assert.equal(projected.priceVerified,false);assert.equal(projected.variants![0].priceVerified,true);assert.equal(projected.variants![0].wholesalePriceVerified,true);
});
test('verification reader fails closed without service or on RPC errors while retaining successful batches',async()=>{
 const {readPublicPriceVerification}=await import('../src/lib/usd-price-projection');
 assert.deepEqual(await readPublicPriceVerification(['P'],null),[]);
 const failed={rpc:async()=>({error:{message:'private RPC unavailable'},data:[{productId:'P',retailVerified:true}]})}as unknown as SupabaseClient;
 assert.deepEqual(await readPublicPriceVerification(['P'],failed),[]);
 const throwing={rpc:async()=>{throw Error('network');}}as unknown as SupabaseClient;
 assert.deepEqual(await readPublicPriceVerification(['P'],throwing),[]);
 const ids=Array.from({length:101},(_,i)=>String(i));let calls=0;
 const partial={rpc:async(_name:string,args:{ids_input:string[]})=>{calls++;assert.ok(args.ids_input.length<=100);return calls===1?{error:{},data:null}:{error:null,data:[{productId:'100',variantId:null,retailVerified:true,wholesaleVerified:true}]};}}as unknown as SupabaseClient;
 assert.equal((await readPublicPriceVerification(ids,partial)).length,1);assert.equal(calls,2);
});
test('wholesale display verification binds the exact identity and shown offer or quantity tier to its validated amount',async()=>{
 const pricing=await import('../src/components/wholesale/public-price');
 assert.ok('isWholesaleDisplayVerified'in pricing,'display verification must bind the displayed wholesale amount');
 const verified={...product,wholesalePrice:12000,wholesalePriceVerified:true};
 const offer={productId:'P',variantId:null,unitPrice:12000,status:'ready' as const,reason:'Verified',tiers:[{minQty:5,unitPrice:10000}],validUntil:null,policyId:'policy'};
 assert.equal(pricing.isWholesaleDisplayVerified({...verified,wholesaleOffer:offer},null,1),true);
 assert.equal(pricing.isWholesaleDisplayVerified({...verified,wholesaleOffer:{...offer,unitPrice:11000}},null,1),false);
 assert.equal(pricing.isWholesaleDisplayVerified({...verified,wholesaleOffer:offer},null,5),false);
 const variant={id:'V',productId:'P',isActive:true,retailPrice:15000,wholesalePrice:12000,wholesalePriceVerified:true,wholesaleOffer:{...offer,variantId:'V'}}as ProductVariant;
 const variable={...verified,hasVariants:true,variants:[variant]};
 assert.equal(pricing.isWholesaleDisplayVerified(variable,null,1),false);
 assert.equal(pricing.isWholesaleDisplayVerified(variable,variant,1),true);
 assert.equal(pricing.isWholesaleDisplayVerified(variable,{...variant,wholesalePriceVerified:false},1),false);
 assert.equal(pricing.isWholesaleDisplayVerified(variable,{...variant,productId:'OTHER'},1),false);
});
test('a wholesale tier amount must match the exact verified amount before claiming verification',async()=>{
 const projection=await import('../src/lib/usd-price-projection');
 const check=(projection as unknown as {isWholesaleAmountVerified?:(p:unknown,n:number|null)=>boolean}).isWholesaleAmountVerified;
 assert.ok(check);assert.equal(check({wholesalePrice:12000,wholesalePriceVerified:true},12000),true);
 assert.equal(check({wholesalePrice:12000,wholesalePriceVerified:true},11000),false);
 assert.equal(check({wholesalePrice:12000,wholesalePriceVerified:false},12000),false);
 assert.equal(check({wholesalePrice:12000,wholesalePriceVerified:true},null),false);
});
