// Read-only inventory of identities to review. Never converts or updates production data.
import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readAllPages} from '../src/lib/read-all-pages';
import {validateDollarResponse} from '../src/lib/exchange-rate';
import {arsToUsd,usdToArs,moneyCents} from '../src/lib/money';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('Falta la configuración privada de Supabase.');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const [products,variants,costs]=await Promise.all([
 readAllPages<{id:string;title:string;retail_price:number;wholesale_price:number;has_variants:boolean;is_active:boolean;deleted_at:string|null}>((from,to)=>db.from('products').select('id,title,retail_price,wholesale_price,has_variants,is_active,deleted_at').order('id').range(from,to)),
 readAllPages<{id:string;product_id:string;title:string;retail_price:number;wholesale_price:number;is_active:boolean}>((from,to)=>db.from('product_variants').select('id,product_id,title,retail_price,wholesale_price,is_active').order('id').range(from,to)),
 readAllPages<{product_id:string;currency:string;expenses_confirmed:boolean;verified_at:string|null;source_document:string|null}>((from,to)=>db.from('product_costs').select('product_id,currency,expenses_confirmed,verified_at,source_document').order('product_id').range(from,to)),
]);
const at=new Date().toISOString();
let referenceRate:{rate:string;sourceAt:string;fetchedAt:string;url:string;kind:string;side:string}|null=null;
try{
 const response=await fetch('https://dolarapi.com/v1/dolares/blue',{signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw Error('DolarAPI no disponible');
 const quote=validateDollarResponse(await response.json(),'blue',null,20);
 referenceRate={...quote,fetchedAt:new Date().toISOString(),url:'https://dolarapi.com/v1/dolares/blue',kind:'blue',side:'venta'};
}catch{console.log('Sin referencia vigente: el informe no calcula conversiones.');}
const existing=await db.from('product_usd_prices').select('product_id,variant_id');
if(existing.error&&!['42P01','PGRST205'].includes(existing.error.code))throw Error('No se pudo comprobar si existen bases USD previas.');
const rows=products.flatMap(p=>[{product:p,variant:null},...variants.filter(v=>v.product_id===p.id).map(v=>({product:p,variant:v}))]).map(({product:p,variant:v})=>{
 const c=costs.find(c=>c.product_id===p.id),amount=v??p;
 const alreadyUsd=existing.data?.some(row=>row.product_id===p.id&&(row.variant_id??null)===(v?.id??null))??false;
 const reasons=['Pendiente de aprobar referencia de conversión ARS/USD'];
 if(!(Number(amount.retail_price)>0))reasons.push('Precio minorista cero o ausente');
 if(!(Number(amount.wholesale_price)>0))reasons.push('Precio mayorista cero o ausente');
 if(v)reasons.push('Revisar costos propios de esta variante exacta');
 if(!c?.expenses_confirmed)reasons.push('Gastos sin confirmar');
 if(!c?.source_document)reasons.push('Sin documento de costos');
 if(!c?.verified_at||Date.now()-Date.parse(c.verified_at)>30*86400000)reasons.push('Costo sin fecha vigente');
 if(alreadyUsd)reasons.push('Ya tiene base USD: excluir de nueva conversión');
 const proposedRetailUsd=!alreadyUsd&&referenceRate&&Number(amount.retail_price)>0?arsToUsd(String(amount.retail_price),referenceRate.rate):null;
 const proposedWholesaleUsd=!alreadyUsd&&referenceRate&&Number(amount.wholesale_price)>0?arsToUsd(String(amount.wholesale_price),referenceRate.rate):null;
 const roundTripArs=proposedRetailUsd&&referenceRate?usdToArs(proposedRetailUsd,referenceRate.rate,'1'):null;
 return {productId:p.id,variantId:v?.id??null,title:p.title,variantTitle:v?.title??null,active:amount.is_active,deleted:Boolean(p.deleted_at),alreadyUsd,legacyCurrency:'ARS',currencyEvidence:'Contrato de la aplicación: formatCurrency, checkout y Mercado Pago ARS; validar contra listado aprobado antes de convertir.',retailArs:amount.retail_price,wholesaleArs:amount.wholesale_price,proposedRetailUsd,proposedWholesaleUsd,roundTripArs,roundingDifferenceArs:roundTripArs===null?null:(moneyCents(roundTripArs)-moneyCents(String(amount.retail_price)))/100,costCurrency:c?.currency??null,review:reasons};
});
const output=resolve('scratch/suppliers-private/usd-migration-2026-11-06');await mkdir(output,{recursive:true});
await writeFile(resolve(output,'review.json'),JSON.stringify({at,mode:'read-only',referenceRate,products:products.length,variants:variants.length,rows},null,2));
const escape=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`;
await writeFile(resolve(output,'review.csv'),'product_id,variant_id,title,variant_title,active,retail_ars,wholesale_ars,proposed_retail_usd,proposed_wholesale_usd,rounding_difference_ars,review\n'+rows.map(r=>[r.productId,r.variantId,r.title,r.variantTitle,r.active,r.retailArs,r.wholesaleArs,r.proposedRetailUsd,r.proposedWholesaleUsd,r.roundingDifferenceArs,r.review.join(' | ')].map(escape).join(',')).join('\n'));
console.log(JSON.stringify({output,at,referenceRate,products:products.length,variants:variants.length,identities:rows.length,confirmedCosts:costs.filter(c=>c.expenses_confirmed).length,missingCostDocument:rows.filter(r=>r.review.includes('Sin documento de costos')).length,missingRetail:rows.filter(r=>!(Number(r.retailArs)>0)).length,missingWholesale:rows.filter(r=>!(Number(r.wholesaleArs)>0)).length}));
