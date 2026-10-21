import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedWorkerFetch } from '../src/lib/worker-fetch';
test('local worker network calls time out, preserve cancellation, and never retry writes',async()=>{
 let calls=0;
 const slow:typeof fetch=async(_input,init)=>{calls++;return new Promise<Response>((_resolve,reject)=>{const signal=init!.signal!;if(signal.aborted)reject(signal.reason);else signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});};
 const keepAlive=setInterval(()=>{},1000);
 try{
  await assert.rejects(boundedWorkerFetch(20,slow)('https://example.test',{method:'POST',body:'private body'}),e=>e instanceof DOMException&&e.name==='TimeoutError');
  assert.equal(calls,1);
  const controller=new AbortController();controller.abort(new Error('Caller cancelled'));
  await assert.rejects(boundedWorkerFetch(1000,slow)('https://example.test',{signal:controller.signal}),/Caller cancelled/);
  const request=new Request('https://example.test',{signal:controller.signal});
  await assert.rejects(boundedWorkerFetch(1000,slow)(request),/Caller cancelled/);
  const fast:typeof fetch=async()=>new Response('ok',{status:200});assert.equal(await(await boundedWorkerFetch(1000,fast)('https://example.test')).text(),'ok');
 }finally{clearInterval(keepAlive);}
});
