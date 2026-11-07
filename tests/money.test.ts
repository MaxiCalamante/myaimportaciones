import test from 'node:test';
import assert from 'node:assert/strict';
import {usdToArs,arsToUsd,decimalUnits,moneyCents,moneyPercent} from '../src/lib/money';
import {validateDollarResponse,refreshExchangeRate} from '../src/lib/exchange-rate';
import type {SupabaseClient} from '@supabase/supabase-js';
test('USD conversion rounds exactly once, half up, without binary floating point drift',()=>{
 assert.equal(usdToArs('40','1450'),58000);
 assert.equal(usdToArs('0.1','0.2'),.02);
 assert.equal(usdToArs('1.005','1'),1.01);
 assert.equal(usdToArs('35','1450','100'),50800);
 assert.equal(usdToArs('2.675','1'),2.68);
 assert.equal(moneyCents('10.01'),1001);
 assert.equal(arsToUsd('58000','1450'),'40.000000');
 assert.equal(moneyPercent('100.01','3'),3.01);
 assert.throws(()=>usdToArs('40','0'));
 assert.throws(()=>decimalUnits('USD 35'));
 assert.throws(()=>decimalUnits('-1'));
 assert.throws(()=>decimalUnits('0.0000001'));
});
test('DolarAPI rejects wrong currency, side, date, type, null and suspicious jumps',()=>{
 const now=Date.now(),valid={moneda:'USD',casa:'blue',compra:1400,venta:1450,fechaActualizacion:new Date(now).toISOString()};
 assert.equal(validateDollarResponse(valid,'blue',null,20,now).rate,'1450');
 for(const override of [{moneda:'ARS'},{casa:'oficial'},{venta:0},{venta:null},{venta:'1450'},{venta:Infinity},{compra:1500},{fechaActualizacion:new Date(now+600000).toISOString()},{fechaActualizacion:'invalid'}])assert.throws(()=>validateDollarResponse({...valid,...override},'blue',null,20,now));
 assert.throws(()=>validateDollarResponse(valid,'blue','1000',20,now),/sospechosa/);
});
test('outage records an error and never replaces the last valid rate with zero; leases skip extra calls',async()=>{
 const calls:Array<{name:string;args:Record<string,unknown>}> = [];
 let claimed=true,fetches=0;
 const db={rpc:async(name:string,args:Record<string,unknown>)=>{calls.push({name,args});return{error:null,data:name==='claim_store_exchange_refresh_v1'&&claimed?{token:'lease',kind:'blue',previous:'1450',maxChange:20}:{}};}} as unknown as SupabaseClient;
 const fail=async()=>{fetches++;throw Error('timeout');};
 await refreshExchangeRate(db,false,fail as typeof fetch);
 assert.equal(calls.at(-1)?.args.rate_input,null);
 assert.equal(calls.at(-1)?.args.error_input,'timeout');
 claimed=false;await refreshExchangeRate(db,false,fail as typeof fetch);assert.equal(fetches,1);
 claimed=true;await assert.rejects(refreshExchangeRate(db,true,fail as typeof fetch),/timeout/);
});
