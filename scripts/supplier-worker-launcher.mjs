// Start with Node built-ins so an import-loader stall is visible and bounded too.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const started=Date.now();
const directory=resolve('scratch/suppliers-private');mkdirSync(directory,{recursive:true});
const log=(phase,extra={})=>console.log(JSON.stringify({phase,at:new Date().toISOString(),...extra}));
log('bootstrap-started',{pid:process.pid});
const startupTimer=setTimeout(()=>{
 if(!Reflect.get(globalThis,Symbol.for('mya.supplier.runtime-ready'))){console.error(JSON.stringify({phase:'startup-timeout',elapsedMs:Date.now()-started,message:'El runtime TypeScript no completó el arranque en tres minutos.'}));process.exit(1);}
},180000);
const totalTimer=setTimeout(()=>{console.error(JSON.stringify({phase:'worker-timeout',elapsedMs:Date.now()-started,message:'Ciclo local excedió el límite de 18 minutos; no se repiten escrituras.'}));process.exit(1);},18*60000);
try{
 // A fresh transform avoids reusing a stalled cache left by an interrupted Windows run.
 process.env.TSX_DISABLE_CACHE='1';
 await import('tsx');log('typescript-loader-ready',{cache:false});
 await import('./supplier-worker.mts');
 log('bootstrap-completed',{elapsedMs:Date.now()-started});
}catch(error){console.error(JSON.stringify({phase:'bootstrap-failed',message:error instanceof Error?error.message:'Error de arranque'}));process.exitCode=1;}
finally{clearTimeout(startupTimer);clearTimeout(totalTimer);}
