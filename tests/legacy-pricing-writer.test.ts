import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Running a retired entrypoint must stop before credentials or any database I/O,
// including when an operator supplies the former dry-run flag.
for(const name of ['load-curated-catalog-200.mts','sync-wholesale-complete.mts','import-curated-catalog-200.ts']){
 for(const args of [[],['--dry-run']])test(`${name} ${args.join(' ')} rejects execution before loading environment or clients`,()=>{
  const cwd=mkdtempSync(resolve(tmpdir(),'mya-retired-pricing-'));
  try{
   const env={...process.env};
   for(const key of Object.keys(env))if(key.includes('SUPABASE')||key==='NODE_OPTIONS')delete env[key];
   const result=spawnSync(process.execPath,['--import',pathToFileURL(resolve('node_modules/tsx/dist/loader.mjs')).href,resolve('scripts',name),...args],{cwd,env,encoding:'utf8',timeout:10000});
   assert.equal(result.error,undefined);
   assert.equal(result.status,1);
   assert.match(result.stderr,/LEGACY_PRICING_DISABLED/);
   assert.doesNotMatch(result.stderr,/Missing Supabase|supabaseUrl is required|ENOENT|ERR_MODULE_NOT_FOUND/);
  }finally{rmSync(cwd,{recursive:true,force:true});}
 });
}
