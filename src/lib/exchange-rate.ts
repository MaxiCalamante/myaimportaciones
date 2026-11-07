import type { SupabaseClient } from '@supabase/supabase-js';
import { decimalUnits } from './money';
export const DOLLAR_TYPES = {blue:'Blue',bolsa:'MEP',oficial:'Oficial',contadoconliqui:'CCL',cripto:'Cripto',tarjeta:'Tarjeta',mayorista:'Mayorista bancario'} as const;
export type DollarType = keyof typeof DOLLAR_TYPES;
export interface ExchangeSnapshot {
  refreshSeconds?:number;
  id:string|null; kind:DollarType; rate:string|null; rawRate:string|null;
  sourceAt:string|null; fetchedAt:string|null; expiresAt:string|null;
  status:'valid'|'stale'|'missing'; source:'dolarapi'|'manual'; adjustment:string; roundArs:string;
}
export function validateDollarResponse(value:unknown, kind:DollarType, previous:string|null, maxChange:number, now=Date.now()) {
  if (!value || typeof value !== 'object') throw Error('Respuesta de cotización inválida.');
  const v=value as Record<string,unknown>;
  if(v.moneda!=='USD'||v.casa!==kind||typeof v.venta!=='number'||!Number.isFinite(v.venta)||v.venta<=0||v.venta>1e7
    ||typeof v.compra!=='number'||!Number.isFinite(v.compra)||v.compra<0||v.compra>v.venta
    ||typeof v.fechaActualizacion!=='string') throw Error('Cotización inválida o moneda incorrecta.');
  decimalUnits(v.venta);
  const stamp=Date.parse(v.fechaActualizacion);
  if(!Number.isFinite(stamp)||stamp>now+300000||stamp<now-7*86400000)throw Error('Fecha de fuente inválida o vencida.');
  if(previous&&Math.abs(v.venta/Number(previous)-1)*100>maxChange)throw Error('Variación sospechosa: requiere revisión administrativa.');
  return {rate:String(v.venta),sourceAt:new Date(stamp).toISOString()};
}
/** Shared PostgreSQL lease prevents fan-out across serverless instances and Edge workers. */
export async function refreshExchangeRate(db:SupabaseClient, force=false, fetcher:typeof fetch=fetch) {
  const claim=await db.rpc('claim_store_exchange_refresh_v1',{force_input:force});
  if(claim.error)throw Error('No se pudo leer la configuración monetaria.');
  const lease=claim.data as {token?:string;kind:DollarType;previous:string|null;maxChange:number};
  if(!lease?.token)return;
  try {
    const response=await fetcher(`https://dolarapi.com/v1/dolares/${lease.kind}`,{cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw Error(`DolarAPI respondió HTTP ${response.status}.`);
    const parsed=validateDollarResponse(await response.json(),lease.kind,lease.previous,lease.maxChange);
    const saved=await db.rpc('finish_store_exchange_refresh_v1',{token_input:lease.token,rate_input:parsed.rate,source_at_input:parsed.sourceAt,error_input:null});
    if(saved.error)throw Error('No se pudo conservar la cotización validada.');
  } catch(e) {
    const error=e instanceof Error?e.message:'No se pudo consultar DolarAPI.';
    await db.rpc('finish_store_exchange_refresh_v1',{token_input:lease.token,rate_input:null,source_at_input:null,error_input:error});
    if(force)throw Error(error);
  }
}
