import { enrichProfiles } from '@/lib/giveaway/server/profiles';
import { readInstagramComments, mergeComments } from '@/lib/giveaway/server/instagram';
import { randomUUID } from 'node:crypto';
import { getAdminClient } from '@/lib/admin-auth';
import { createCommerceService } from '@/lib/supabase/service';
import { reviewComments,validateRules } from '@/lib/giveaway/participants';
import { validateConfig } from '@/lib/giveaway/live';
import { createAudit,draw,confirmWinner,disqualify,addEvent,digest } from '@/lib/giveaway/server/audit';
import { dbError,privateState } from '@/lib/giveaway/server/data';
import { body,checkOrigin,fail,response,GiveawayError } from '@/lib/giveaway/server/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
async function admin(){const db=await getAdminClient();const {data:{user}}=await db.auth.getUser();if(!user)throw new GiveawayError('Iniciá sesión.',401);return user.id;}
export async function GET(){try{await admin();const state=await privateState();return response(state);}catch(e){return fail(e);}}
export async function POST(request:Request){
  try{
    checkOrigin(request);const actor=await admin(),input=await body(request),db=createCommerceService();
    if(!Number.isSafeInteger(input.revision)||input.revision<0)throw new GiveawayError('Versión inválida.');
    const current=await privateState();
    if(input.action==='redraw'&&current.round&&current.round.id!==input.roundId&&current.round.audit.draws.at(-2)?.id===input.roundId)return response(current);
    if(input.action==='sync-instagram'){
      if(current.round&&(Date.now()<Date.parse(current.round.revealAt)||String(input.reason||'').trim().length<5))throw new GiveawayError('La lista está bloqueada. Para preparar otra después del vivo, registrá el motivo.',409);
      if(current.revision!==input.revision)throw new GiveawayError('El estado cambió. Actualizá antes de sincronizar.',409);
      const config=validateConfig(input.config),rules=validateRules(input.rules);
      const fresh=await readInstagramComments(config.permalink);
      const previous=current.snapshot?.source.kind==='instagram'&&current.snapshot.source.mediaId===fresh.mediaId?current.snapshot.comments:[];
      const merged=mergeComments(previous,fresh.comments);
      const comments=await enrichProfiles(merged,previous);
      const snapshot={version:1 as const,source:{kind:'instagram' as const,label:'API oficial de Instagram',permalink:config.permalink,importedAt:new Date().toISOString(),mediaId:fresh.mediaId,reportedCount:fresh.reportedCount,warning:'Comentarios y respuestas accesibles por la API. Las actualizaciones conservan los registros ya importados por ID.'},rules,comments,review:reviewComments(comments,rules)};
      const {error}=await db.rpc('giveaway_save_v1',{revision_input:input.revision,config_input:config,dataset_input:randomUUID(),snapshot_input:snapshot,reason_input:current.round?String(input.reason).trim().slice(0,500):'Actualización desde la API oficial de Instagram',actor_input:actor});dbError(error);
    }else if(input.action==='import'){
      if(input.kind!=='existing')throw new GiveawayError('La carga de participantes se realiza mediante la API de Instagram.');

      if(!current.snapshot)throw new GiveawayError('No hay lista guardada.');
      const config=validateConfig(input.config),rules=validateRules(input.rules);
      if(config.permalink!==current.config.permalink)throw new GiveawayError('Al cambiar la publicación, cargá sus comentarios desde Instagram antes de guardar.');
      const comments=current.snapshot.comments,source={...current.snapshot.source,permalink:config.permalink};
      const snapshot={version:1 as const,source,rules,comments,review:reviewComments(comments,rules)};
      const {error}=await db.rpc('giveaway_save_v1',{revision_input:input.revision,config_input:config,dataset_input:randomUUID(),snapshot_input:snapshot,reason_input:String(input.reason||'').slice(0,500),actor_input:actor});dbError(error);
    }else if(input.action==='start'||input.action==='redraw'){
      if(!current.snapshot||!current.datasetId)throw new GiveawayError('Cargá primero los comentarios.');
      let audit;
      try{
        if(input.action==='start')audit=createAudit({id:current.datasetId,comments:current.snapshot.comments,source:current.snapshot.source},current.snapshot.rules);
        else{if(!current.round||current.round.audit.status!=='disqualified')throw new Error('Primero registrá una descalificación.');audit=structuredClone(current.round.audit);draw(audit,audit.events.findLast(e=>e.type==='disqualification')!.reason!);}
      }catch(e){throw new GiveawayError((e as Error).message);}
      const {error}=await db.rpc('giveaway_start_v1',{revision_input:input.revision,audit_input:audit,mode_input:input.action==='start'?'initial':'redraw',expected_round:input.roundId||null,actor_input:actor});dbError(error);
    }else if(['confirm','disqualify','avatar'].includes(input.action)){
      if(!current.round||input.roundId!==current.round.id)throw new GiveawayError('El resultado cambió. Recargá la pantalla.');
      const audit=structuredClone(current.round.audit);
      try{
        if(input.action==='confirm')confirmWinner(audit,input.checks);
        if(input.action==='disqualify')disqualify(audit,input.reason);
        if(input.action==='avatar'){
          const winner=audit.draws.at(-1)!.winner;
          if(input.username!==winner.username||input.confirmIdentity!==true)throw new Error('Confirmá la identidad de esta foto.');
          if(typeof input.dataUrl!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(input.dataUrl)||input.dataUrl.length>2_000_000)throw new Error('Foto PNG inválida o demasiado grande.');
          const bytes=Buffer.from(input.dataUrl.split(',')[1],'base64');if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Foto PNG inválida.');
          const hash=digest(input.dataUrl);audit.avatars[current.round.id]={dataUrl:input.dataUrl,hash,username:winner.username};addEvent(audit,{type:'avatar',avatarHash:hash,reason:'Foto manual asociada por el organizador a la cuenta ganadora.'});
        }
      }catch(e){throw new GiveawayError((e as Error).message);}
      const {error}=await db.rpc('giveaway_review_v1',{revision_input:input.revision,round_input:input.roundId,audit_input:audit,action_input:input.action,actor_input:actor});dbError(error);
    }else throw new GiveawayError('Acción inválida.');
    return response(await privateState());
  }catch(e){return fail(e);}
}
