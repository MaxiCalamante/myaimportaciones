import type { Audit, Comment, Snapshot, SourceKind } from './types';
export type CampaignConfig={title:string;prize:string;permalink:string;scheduledFor:string|null;published:boolean};
export const DEFAULT_CAMPAIGN:CampaignConfig={title:'SORTEO DÍA DE LA MADRE',prize:'Travel Kit SKIN1004 Centella',permalink:'https://www.instagram.com/p/DeIpHXtkYyf/',scheduledFor:null,published:false};
export type PrivateState={revision:number;config:CampaignConfig;datasetId:string|null;snapshot:Snapshot|null;round:PrivateRound|null;serverNow?:string};
export type PrivateRound={id:string;countdownAt:string;spinAt:string;revealAt:string;audit:Audit};
export type PublicGiveaway={version:1;serverNow:string;revision:number;available:boolean;config:Pick<CampaignConfig,'title'|'prize'|'permalink'|'scheduledFor'>;participantCount:number;source:SourceKind|null;snapshotHash:string|null;round:{id:string;countdownAt:string;spinAt:string;revealAt:string;attempt:number}|null;reel:Pick<Comment,'username'|'displayName'|'avatar'>[];winner:Comment|null;winnerStatus:Audit['status']|null;winnerAvatar:string|null;disqualificationReason:string|null};
export function publicPhase(state:PublicGiveaway,now:number):'waiting'|'countdown'|'spinning'|'revealing'|'winner'{
  if(!state.round||now<Date.parse(state.round.countdownAt))return'waiting';
  if(now<Date.parse(state.round.spinAt))return'countdown';
  if(now<Date.parse(state.round.revealAt))return'spinning';
  return state.winner?'winner':'revealing';
}
export function timeline(state:PublicGiveaway,now:number){const phase=publicPhase(state,now);return{phase,countdown:state.round?Math.max(1,Math.ceil((Date.parse(state.round.spinAt)-now)/1000)):5,progress:state.round?Math.max(0,Math.min(1,(now-Date.parse(state.round.spinAt))/(Date.parse(state.round.revealAt)-Date.parse(state.round.spinAt)))):0};}
export function validateConfig(input:unknown):CampaignConfig{
  if(!input||typeof input!=='object')throw new Error('Configuración inválida.');
  const c=input as CampaignConfig;
  if(typeof c.title!=='string'||c.title.trim().length<5||c.title.length>90||typeof c.prize!=='string'||c.prize.trim().length<3||c.prize.length>120||typeof c.published!=='boolean')throw new Error('Revisá título y premio.');
  let post:URL;try{post=new URL(c.permalink);}catch{throw new Error('Enlace de Instagram inválido.');}
  if(post.protocol!=='https:'||!['www.instagram.com','instagram.com'].includes(post.hostname)||!/^\/(?:p|reel)\/[\w-]+\/?$/.test(post.pathname)||post.username||post.password)throw new Error('Ingresá el permalink de la publicación de Instagram.');
  if(c.scheduledFor!==null&&(typeof c.scheduledFor!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(c.scheduledFor)||!Number.isFinite(Date.parse(c.scheduledFor))))throw new Error('Fecha y zona horaria del vivo inválidas.');
  return{title:c.title.trim(),prize:c.prize.trim(),permalink:post.toString(),scheduledFor:c.scheduledFor,published:c.published};
}
