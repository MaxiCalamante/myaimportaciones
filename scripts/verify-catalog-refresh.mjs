import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd());
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const products=[];
for(let offset=0;;offset+=500){const {data,error}=await db.from('products').select('*').order('id').range(offset,offset+499);if(error)throw error;products.push(...data);if(data.length<500)break;}
const active=products.filter(p=>p.is_active&&!/iphone|smartphone|celular/i.test(p.title));
const sources=new Map((await fs.readFile('docs/catalog-audit/supplier-details.jsonl','utf8')).trim().split('\n').map(s=>{const p=JSON.parse(s);return[p.sku,p];}));
const problems=[],quality=[];
for(const p of active){
  if(!p.brand||!p.description||!p.image_url||!(p.retail_price>0))problems.push({id:p.id,problem:'Incomplete product'});
  if(p.image_url.startsWith('/')){
    try{const m=await sharp(path.join(process.cwd(),'public',decodeURIComponent(p.image_url))).metadata();quality.push({id:p.id,width:m.width,height:m.height,source:'local'});}catch{problems.push({id:p.id,problem:'Local image missing'});}
  }else{
    const source=sources.get(p.sku);
    if(!source||!source.images.includes(p.image_url))problems.push({id:p.id,problem:'Image not matched to exact supplier SKU'});
    else quality.push({id:p.id,width:source.width,height:source.height,source:'supplier original checked 2026-09-21'});
  }
}
const {data:privateCosts,error:costError}=await db.from('product_costs').select('product_id').limit(1);
if(privateCosts?.length)problems.push({problem:'Private costs visible anonymously'});
const report={date:'2026-09-21',activeProducts:active.length,withImages:quality.length,originalAtLeast800:quality.filter(p=>Math.max(p.width,p.height)>=800).length,lowerResolution:quality.filter(p=>Math.max(p.width,p.height)<800),anonymousCostsVisible:privateCosts?.length??0,anonymousCostQueryError:costError?.code??null,problems};
await fs.writeFile('docs/catalog-audit/products-after.json',JSON.stringify(products,null,2));
await fs.writeFile('docs/catalog-verification.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,lowerResolution:report.lowerResolution.length},null,2));
if(problems.length)process.exitCode=1;
