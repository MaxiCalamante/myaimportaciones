import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig,hasSupabaseConfig } from '@/lib/supabase/env';
import { createCommerceService } from '@/lib/supabase/service';
import type { Audit,Snapshot } from '../types';
import { DEFAULT_CAMPAIGN,type CampaignConfig,type PrivateState,type PublicGiveaway } from '../live';
import { GiveawayError } from './http';
export type RawPrivateState=PrivateState&{round:({id:string;countdownAt:string;spinAt:string;revealAt:string;audit:Audit})|null};
export function missing(error:{code?:string}|null){return Boolean(error&&['42P01','PGRST202','PGRST205'].includes(error.code||''));}
export async function privateState():Promise<RawPrivateState>{
  const db=createCommerceService();
  const {data:c,error}=await db.from('giveaway_campaign').select('revision,config,dataset_id,snapshot,active_round').eq('id',1).single();
  if(missing(error))throw new GiveawayError('Falta activar la migración del sorteo en Supabase.',503);
  if(error||!c)throw new GiveawayError('No se pudo leer la configuración privada.',503);
  let round:RawPrivateState['round']=null;
  if(c.active_round){const {data:r,error:roundError}=await db.from('giveaway_rounds').select('id,countdown_at,spin_at,reveal_at,audit').eq('id',c.active_round).single();if(roundError||!r)throw new GiveawayError('No se pudo recuperar el resultado registrado.',503);round={id:r.id,countdownAt:r.countdown_at,spinAt:r.spin_at,revealAt:r.reveal_at,audit:r.audit as Audit};}
  return{revision:c.revision,config:c.config as CampaignConfig,datasetId:c.dataset_id,snapshot:c.snapshot as Snapshot|null,round,serverNow:new Date().toISOString()};
}
export function unavailable():PublicGiveaway{return{version:1,serverNow:new Date().toISOString(),revision:0,available:false,config:{...DEFAULT_CAMPAIGN},participantCount:0,source:null,snapshotHash:null,round:null,reel:[],winner:null,winnerStatus:null,winnerAvatar:null,disqualificationReason:null};}
let cached:{value:PublicGiveaway;until:number}|null=null;
let inflight:Promise<PublicGiveaway>|null=null;
export async function publicState():Promise<PublicGiveaway>{
  if(!hasSupabaseConfig())return unavailable();
  if(cached&&Date.now()<cached.until)return cached.value;
  if(inflight)return inflight;
  inflight=(async()=>{
    const {url,anonKey}=getSupabaseConfig();const db=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,cache:'no-store'})}});
    const {data,error}=await db.rpc('public_giveaway_v1');
    if(missing(error))return unavailable();
    if(error||!data)throw new GiveawayError('No se pudo sincronizar el sorteo. Reintentá en unos segundos.',503);
    const result=data as PublicGiveaway;cached={value:result,until:Date.now()+200};return result;
  })();
  try{return await inflight;}finally{inflight=null;}
}
export function dbError(error:{message?:string;code?:string}|null){
  if(!error)return;
  if(missing(error))throw new GiveawayError('Falta activar la migración del sorteo en Supabase.',503);
  const messages:Record<string,string>={giveaway_conflict:'La configuración cambió en otro dispositivo. Recargá antes de continuar.',giveaway_locked:'La lista está bloqueada durante la cuenta regresiva y la animación.',giveaway_reason_required:'Registrá un motivo de al menos 5 caracteres.',giveaway_disqualification_required:'Primero registrá la descalificación del ganador.',giveaway_empty:'Publicá un conjunto con participantes válidos antes de iniciar.',giveaway_reviewed:'El ganador ya tiene una revisión registrada.'};
  throw new GiveawayError(messages[error.message||'']||'No se pudo guardar el sorteo. Revisá configuración y permisos.');
}
