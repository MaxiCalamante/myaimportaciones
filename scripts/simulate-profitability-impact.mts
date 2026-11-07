// SELECT-only production inventory. No RPCs, writes, external FX refreshes or migrations.
import{createClient}from'@supabase/supabase-js';import{mkdir,writeFile}from'node:fs/promises';import{resolve}from'node:path';
import{readAllPages}from'../src/lib/read-all-pages';import{COST_STATUSES,type CostStatus}from'../src/lib/profitability';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Configuración privada ausente');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),at=new Date().toISOString();
type Row=Record<string,unknown>;
const all=(table:string,order='id')=>readAllPages<Row>((from,to)=>db.from(table).select('*').order(order).range(from,to));
const[products,variants,costs,offers,suppliers,usd,rates]=await Promise.all([all('products'),all('product_variants'),all('product_costs','product_id'),all('supplier_offers'),all('suppliers'),all('product_usd_prices'),db.from('store_exchange_rates').select('id,rate,source_at,expires_at,kind,source').order('fetched_at',{ascending:false}).limit(1)]);
if(rates.error)throw Error('No se pudo leer la cotización persistida');
// A missing prepared table is explicit. No fallback invents a completed cost profile.
const pr=await db.from('store_profitability_profiles').select('*'),policy=await db.from('store_profitability_policy').select('*');
for(const r of[pr,policy])if(r.error&&!['42P01','PGRST205'].includes(r.error.code))throw Error(r.error.message);
const profiles=(pr.data??[])as Row[],configuration=(policy.data??[])as Row[];
const stale=(v:unknown)=>!v||!Number.isFinite(Date.parse(String(v)))||Date.parse(String(v))<Date.parse(at)-86400000||Date.parse(String(v))>Date.parse(at)+300000;
const rows=products.filter(p=>!p.deleted_at).flatMap(p=>[{product:p,variant:null as Row|null},...variants.filter(v=>v.product_id===p.id).map(variant=>({product:p,variant}))]).map(({product:p,variant:v})=>{
 const c=costs.find(c=>c.product_id===p.id),exact=profiles.find(c=>c.product_id===p.id&&(c.variant_id??null)===(v?.id??null));
 const b=exact?.basis as Row|undefined,reasons:string[]=[];let status:CostStatus;
 if(b){status=COST_STATUSES.includes(b.status as CostStatus)?b.status as CostStatus:'REVISION_MANUAL';if(stale(b.checkedAt)&&status==='COSTO_VERIFICADO')status='COSTO_DESACTUALIZADO';if(!b.costsComplete||!b.accountingConfirmed||!b.identityVerified){status='COSTO_INCOMPLETO';reasons.push('Desglose sin confirmación completa');}}
 else if(v){status='SIN_COSTO';reasons.push('El costo del padre no prueba el costo de esta variante');}
 else if(!c){status='SIN_COSTO';}
 else if(!c.expenses_confirmed){status='COSTO_INCOMPLETO';}
 else if(stale(c.verified_at)){status='COSTO_DESACTUALIZADO';}
 else{status='COSTO_INCOMPLETO';reasons.push('Costo heredado sin base contable, tarifa por método y desglose v2 confirmados');}
 const validOffers=offers.filter(o=>o.product_id===p.id&&(o.variant_id??null)===(v?.id??null)&&!o.archived_at&&suppliers.some(s=>s.id===o.supplier_id&&s.is_active&&s.monitor_enabled&&!s.archived_at));
 if((v??p).fulfillment_mode==='supplier'&&!validOffers.some(o=>o.verification==='verified'&&o.availability==='in_stock'&&!o.last_error&&!stale(o.availability_checked_at)&&!stale(o.cost_checked_at)))reasons.push('Disponibilidad, vínculo exacto o costo vigente de proveedor pendiente');
 if(!configuration.length)reasons.push('Política v2 y comisiones por medio de pago todavía sin instalar/configurar');
 if(!exact)reasons.push('No existe perfil exacto v2 validado');
 if(status!=='COSTO_VERIFICADO')reasons.push(status);
 if(v?.is_active&&!p.has_variants)reasons.push('Variante activa con bandera del padre inconsistente');
 if(!(Number((v??p).wholesale_price)>0))reasons.push('Precio mayorista heredado ausente/cero');
 return{productId:p.id,variantId:v?.id??null,title:p.title,variantTitle:v?.title??null,active:Boolean(p.is_active&&(v?.is_active??true)),saleIdentity:v!==null||!p.has_variants,status,legacyRetailArs:(v??p).retail_price,legacyWholesaleArs:(v??p).wholesale_price,costSource:c?.source_document??null,costCheckedAt:c?.verified_at??null,linkedCurrentOffers:validOffers.length,hasUsd:usd.some(u=>u.product_id===p.id&&(u.variant_id??null)===(v?.id??null)),readyForAutomaticProposal:status==='COSTO_VERIFICADO'&&reasons.length===0,reasons};
});
const active=rows.filter(r=>r.active),sale=active.filter(r=>r.saleIdentity);
const counts=(rs:typeof rows)=>Object.fromEntries(COST_STATUSES.map(s=>[s,rs.filter(r=>r.status===s).length]));
const summary={at,mode:'production SELECT only; local simulation; no prices, stock, orders or settings changed',policy:{retailTarget:30,wholesaleTarget:18,minimumMargin:10,enforcement:'not activated'},products:products.length,activeProducts:products.filter(p=>p.is_active&&!p.deleted_at).length,variants:variants.length,activeSaleIdentities:sale.length,statusesActiveProducts:counts(active.filter(r=>!r.variantId)),statusesSaleIdentities:counts(sale),readyAutomaticActiveProducts:active.filter(r=>!r.variantId&&r.readyForAutomaticProposal).length,readyAutomaticSaleIdentities:sale.filter(r=>r.readyForAutomaticProposal).length,pendingReviewSaleIdentities:sale.filter(r=>!r.readyForAutomaticProposal).length,newCheckoutBlocksIfEnforced:sale.filter(r=>!r.readyForAutomaticProposal).length,existingUsdRows:usd.length,v2Profiles:profiles.length,latestPersistedPublicRate:rates.data[0]??null,note:'Candidate count is conservative. No legacy fee=0 is accepted as confirmation, and no parent cost is copied to a variant. Legacy below-cost figures alone do not prove real profitability.'};
const output=resolve('scratch/suppliers-private/profitability-impact-2026-11-06');await mkdir(output,{recursive:true});
await writeFile(resolve(output,'impact.json'),JSON.stringify({summary,rows},null,2));
const esc=(v:unknown)=>'"'+String(v??'').replaceAll('"','""')+'"';
await writeFile(resolve(output,'manual-review.csv'),'product_id,variant_id,title,variant_title,active,sale_identity,status,legacy_retail_ars,legacy_wholesale_ars,review\n'+rows.map(r=>[r.productId,r.variantId,r.title,r.variantTitle,r.active,r.saleIdentity,r.status,r.legacyRetailArs,r.legacyWholesaleArs,r.reasons.join(' | ')].map(esc).join(',')).join('\n'));
await writeFile(resolve(output,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({output,...summary},null,2));
