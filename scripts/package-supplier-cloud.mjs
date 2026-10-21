// Prepare an explicit source bundle for Supabase; no secrets, browser binaries or local scheduler.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,posix} from 'node:path';
const entry='supabase/functions/supplier-tracking/index.ts',config='supabase/functions/supplier-tracking/deno.json';
const files=new Map();
async function add(name){
 if(files.has(name))return;
 let content=await readFile(resolve(name),'utf8');
 const dependencies=[];
 content=content.replace(/(from\s*['"])(\.[^'"]+)(['"])/g,(_match,start,path,end)=>{
  const target=/\.[cm]?[jt]s$/.test(path)?path:`${path}.ts`;
  dependencies.push(posix.normalize(posix.join(posix.dirname(name),target)));
  return `${start}${target}${end}`;
 });
 files.set(name,content);
 for(const dependency of dependencies)await add(dependency);
}
await add(entry);files.set(config,await readFile(config,'utf8'));
const output=resolve('scratch/suppliers-private/supplier-cloud-bundle.json');await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify({entrypoint_path:entry,import_map_path:config,files:[...files].map(([name,content])=>({name,content}))}));
console.log(JSON.stringify({files:files.size,bytes:[...files.values()].reduce((n,s)=>n+Buffer.byteLength(s),0),output}));
