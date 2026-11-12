import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

function fixture(failedTable?:string,changedCount=false){
 const tables:Record<string,Array<Record<string,unknown>>>={
  products:Array.from({length:1001},(_,i)=>({id:`p${i}`,title:`Product ${i}`,is_active:i!==1000,deleted_at:i===1000?'2026-11-01':null})),
  product_variants:Array.from({length:1001},(_,i)=>({id:`v${i}`,product_id:i===1000?'p1000':'p0',title:`Variant ${i}`,is_active:true})),
  product_usd_prices:Array.from({length:1001},(_,i)=>({id:`u${i}`,product_id:`p${i}`,variant_id:null,retail_usd:'20',wholesale_usd:'18'})),
  supplier_offers:Array.from({length:5593},(_,i)=>({id:`o${i}`,product_id:i===5592?'p1000':'p0',variant_id:null,supplier_id:'s',availability:'in_stock',last_error:i===5592?'HTTP 404':null})),
  suppliers:[{id:'s',name:'Recorded supplier',is_active:true}],
 };
 const methods:string[]=[];
 const db=createClient('https://inventory.example.test','synthetic',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
  const url=new URL(String(input)),table=url.pathname.split('/').at(-1)!;
  const method=init?.method??'GET';methods.push(method);
  if(!['GET','HEAD'].includes(method))throw Error('Inventory attempted a write');
  if(table===failedTable)return Response.json({message:'Synthetic inventory read failure'},{status:503});
  const all=tables[table];if(!all)return Response.json({message:'Unexpected table'},{status:400});
  const offset=Number(url.searchParams.get('offset')??0),limit=Number(url.searchParams.get('limit')??1000);
  const rows=all.slice(offset,offset+limit),count=all.length+(changedCount&&table==='supplier_offers'?1:0);
  return new Response(method==='HEAD'?null:JSON.stringify(rows),{status:200,headers:{'Content-Type':'application/json','Content-Range':`${offset}-${offset+rows.length-1}/${count}`}});
 }}});
 return {db,methods};
}

test('read-only inventory includes capped pages, archived products and exact variants without declaring commercial availability',async()=>{
 const {readCatalogInventory}=await import('../scripts/simulate-catalog-audit.mjs');
 const f=fixture(),report=await readCatalogInventory(f.db);
 assert.equal(report.tables.products,1001);
 assert.equal(report.tables.variants,1001);
 assert.equal(report.tables.usdPrices,1001);
 assert.equal(report.tables.offers,5593);
 assert.equal(report.rows.length,2002);
 assert.equal(report.authoritative,false);
 assert.ok(report.rows.every(row=>row.auditStatus==='pending'));
 assert.equal(report.rows.find(row=>row.productId==='p1000'&&row.variantId===null)?.offerCount,1);
 assert.equal(report.rows.find(row=>row.variantId==='v1000')?.offerCount,0);
 assert.ok(f.methods.every(method=>['GET','HEAD'].includes(method)));
});

test('a source read failure aborts the inventory instead of treating missing evidence as no supplier',async()=>{
 const {readCatalogInventory}=await import('../scripts/simulate-catalog-audit.mjs');
 await assert.rejects(readCatalogInventory(fixture('supplier_offers').db),/lectura|inventario|catalog|supplier_offers/i);
});

test('inventory rejects a count mismatch instead of claiming complete coverage',async()=>{
 const {readCatalogInventory}=await import('../scripts/simulate-catalog-audit.mjs');
 await assert.rejects(readCatalogInventory(fixture(undefined,true).db),/incomplet|cambi|count/i);
});
