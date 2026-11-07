import {mkdir,writeFile}from'node:fs/promises';
import {supplierAdapter}from'../src/lib/supplier-tracker/adapters/index';
import {fetchTrackerHtml}from'../src/lib/supplier-tracker/network';
const root='scratch/suppliers-private/tracker-2026-11-06/probes';await mkdir(root,{recursive:true});
const urls={ 'atacado-connect':'https://atacadoconnect.com/categoria/beleza-cuidado','star-company':'https://www.starcompany-py.com/index.php?fc=module&module=starcategorypremium&controller=category&id_category=100',total:'https://www.totalherramientasoficial.com.py/produtos/ferramentas/filter?d=1'};
const results:Array<Record<string,unknown>>=[];
await Promise.allSettled(Object.entries(urls).map(async([key,url])=>{try{const adapter=supplierAdapter(key);let html=await fetchTrackerHtml(url,adapter.key);await writeFile(`${root}/${key}-category.html`,html);const listing=adapter.listing(html,url,url);const first=listing.products[0];console.log(JSON.stringify({key,found:listing.products.length,pages:listing.pages,first}));await new Promise(r=>setTimeout(r,10000));let detail=null;if(first){html=await fetchTrackerHtml(first.nativeUrl??first.url,adapter.key);await writeFile(`${root}/${key}-detail.html`,html);detail=adapter.detail(html,first.nativeUrl??first.url);}const result={key,url,found:listing.products.length,pages:listing.pages,first,detail};results.push(result);console.log(JSON.stringify(result));}catch(e){const result={key,error:String(e)};results.push(result);console.log(JSON.stringify(result));}}));
await writeFile(`${root}/report.json`,JSON.stringify(results,null,2));
