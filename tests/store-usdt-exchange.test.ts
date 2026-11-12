import test from 'node:test';
import assert from 'node:assert/strict';
import type {SupabaseClient} from '@supabase/supabase-js';
import {refreshExchangeRate} from '../src/lib/exchange-rate';

test('commercial USDT refresh uses the verified purchase quote pipeline instead of a DolarAPI dollar',async()=>{
 const calls:Array<{name:string;args:Record<string,unknown>}>=[],urls:string[]=[];
 const db={rpc:async(name:string,args:Record<string,unknown>)=>{
  calls.push({name,args});
  return{error:null,data:name==='claim_store_exchange_refresh_v1'?{token:'lease',kind:'usdt',previous:'1660',maxChange:20}:name==='record_supplier_usdt_quote_v1'?'quote-id':null};
 }} as unknown as SupabaseClient;
 const stamp=Math.floor(Date.now()/1000);
 await refreshExchangeRate(db,true,async input=>{
  const url=String(input);urls.push(url);
  return Response.json(url.includes('criptoya.com')?{binance:{ask:1660,totalAsk:1660.55,time:stamp}}:{symbol:'USDTARS',askPrice:'1660'});
 });
 assert.equal(urls.length,2);
 assert.ok(urls.every(url=>!url.includes('dolarapi')));
 assert.equal(calls[1].name,'record_supplier_usdt_quote_v1');
 assert.equal(calls.at(-1)?.args.rate_input,'1660.55');
 assert.equal(calls.at(-1)?.args.source_at_input,new Date(stamp*1000).toISOString());
});

test('a failed USDT source check preserves the commercial quote and records the failure',async()=>{
 const calls:Array<{name:string;args:Record<string,unknown>}>=[];
 const db={rpc:async(name:string,args:Record<string,unknown>)=>{
  calls.push({name,args});return{error:null,data:{token:'lease',kind:'usdt',previous:'1660',maxChange:20}};
 }} as unknown as SupabaseClient;
 await assert.rejects(refreshExchangeRate(db,true,async input=>Response.json(String(input).includes('criptoya.com')?{binance:{ask:1660,totalAsk:1660.55,time:Math.floor(Date.now()/1000)}}:{symbol:'USDTARS',askPrice:'1000'})),/USDT/);
 assert.equal(calls.length,2);
 assert.equal(calls.at(-1)?.args.rate_input,null);
 assert.match(String(calls.at(-1)?.args.error_input),/USDT/);
});
