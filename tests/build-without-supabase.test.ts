import test from 'node:test';
import assert from 'node:assert/strict';
import * as nodeModule from 'node:module';
// The runtime is Node24; the project still carries Node20 type definitions.
const {registerHooks}=nodeModule as unknown as {registerHooks(hooks:{
 resolve(specifier:string,context:unknown,nextResolve:(s:string,c:unknown)=>unknown):unknown;
 load?(url:string,context:unknown,nextLoad:(u:string,c:unknown)=>unknown):unknown;
}):unknown};
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const emptyUrl=pathToFileURL(resolve('tests/empty.js')).href;
registerHooks({resolve(specifier,context,nextResolve){return specifier==='server-only'?{url:emptyUrl,shortCircuit:true}:nextResolve(specifier,context);}});
import {renderToStaticMarkup} from 'react-dom/server';

test('private administrative pages are evaluated per request, never prerendered',async()=>{
 const layout=await import('../src/app/admin/layout');
 assert.equal((layout as {dynamic?:string}).dynamic,'force-dynamic');
});
test('password reset without public Supabase configuration never constructs a client',async()=>{
 const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 try{delete process.env.NEXT_PUBLIC_SUPABASE_URL;delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const {default:ResetPassword}=await import('../src/app/restablecer-clave/page');
 const html=renderToStaticMarkup(await ResetPassword());assert.match(html,/configuraci[oó]n|preparaci[oó]n/i);assert.doesNotMatch(html,/<form/);
 }finally{if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=oldKey;}
});
test('sitemap reads live catalog per request rather than failing an unconfigured build',async()=>{
 const sitemap=await import('../src/app/sitemap');
 assert.equal((sitemap as {dynamic?:string}).dynamic,'force-dynamic');
});
