import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Audit } from '../types';
import { canonical } from '../canonical';
import { reviewComments } from '../participants';
import { secureIndex } from '../random';
import { digest } from './audit';
import { secretKey } from './key';
import { validateSelection, selectionPool } from '../selection';
export function verifyAudit(audit:Audit,verifySignature=false) {
  const assert=(condition:boolean,message:string)=>{if(!condition)throw new Error(message);};
  assert(audit.version===1 && audit.draws.length>0,'Acta sin selección o versión inválida.');
  assert(digest(audit.snapshot)===audit.snapshotHash,'El hash de la lista no coincide.');
  assert(canonical(reviewComments(audit.snapshot.comments,audit.snapshot.rules))===canonical(audit.snapshot.review),'La lista no corresponde a las reglas registradas.');
  let previous=audit.snapshotHash, state:Audit['status']='pending';const used:string[]=[];
  for(let index=0;index<audit.draws.length;index++) {
    const d=audit.draws[index],{hash,...payload}=d;
    assert(digest(payload)===hash,`Hash de selección ${index+1} inválido.`);
    assert(d.previousHash===previous,'Cadena de hashes interrumpida.');
    if(index>0) {
      if (d.selection?.repeat) assert(Boolean(d.reason) && d.reason!.trim().length >= 5, 'Repetición sin motivo registrado.');
      else {
      assert(state==='disqualified','Repetición sin descalificación registrada.');
      const event=audit.events.findLast(e=>e.drawId===audit.draws[index-1].id&&e.type==='disqualification');
      assert(d.reason===event?.reason,'El motivo de repetición no coincide.');
      }
    } else assert(d.reason===null,'La selección inicial no puede tener motivo de reemplazo.');
    const settings=d.selection?validateSelection(d.selection):null;
    const pool=settings?selectionPool(audit.snapshot.review.valid,audit.draws.slice(0,index),audit.events.filter(e=>audit.draws.slice(0,index).some(prior=>prior.id===e.drawId)),settings):audit.snapshot.review.valid.filter(c=>!used.includes(c.username));
    let cursor=0;
    if(settings?.designatedUsername){
      assert(d.selection?.method==='designated' && d.winner.username===settings.designatedUsername && d.random.algorithm==='administrator-designated-v1' && d.random.words.length===0 && d.random.ceiling===0,'Designación administrativa inválida.');
    } else {
    const computed=secureIndex(pool.length,()=>d.random.words[cursor++]);
    assert(d.random.algorithm==='uint32-rejection-v1'&&computed.index===d.winnerIndex&&computed.ceiling===d.random.ceiling&&cursor===d.random.words.length,'La entropía no reproduce el índice ganador.');
    assert(!d.selection || d.selection.method==='random','Método de selección inconsistente.');
    }
    assert(d.size===pool.length&&canonical(pool[d.winnerIndex])===canonical(d.winner),'El ganador no corresponde a la lista elegible.');
    used.push(d.winner.username);previous=hash;state='pending';
    for(const e of audit.events.filter(e=>e.drawId===d.id)) {
      const {hash:eventHash,...eventPayload}=e;
      assert(digest(eventPayload)===eventHash&&e.previousHash===previous,'Evento o cadena de eventos inválida.');
      if(e.type==='disqualification'){assert(state==='pending'&&Boolean(e.reason)&&e.reason!.length>=5,'Descalificación inválida.');state='disqualified';}
      else if(e.type==='review'){assert(state==='pending'&&e.checks?.follows===true&&e.checks.likes===true&&e.checks.story===true,'Confirmación manual inválida.');state='confirmed';}
      previous=eventHash;
    }
  }
  assert(audit.events.every(e=>audit.draws.some(d=>d.id===e.drawId)),'Evento huérfano.');
  assert(state===audit.status,'Estado final inconsistente.');
  for(const [id,avatar] of Object.entries(audit.avatars||{}))assert(digest(avatar.dataUrl)===avatar.hash&&audit.draws.find(d=>d.id===id)?.winner.username===avatar.username&&audit.events.some(e=>e.drawId===id&&e.avatarHash===avatar.hash),'Foto sin identidad o evidencia válida.');
  if(verifySignature) {
    const {signature,...payload}=audit;
    const actual=createHmac('sha256',secretKey()).update(canonical(payload)).digest();
    const expected=Buffer.from(signature,'hex');
    assert(expected.length===actual.length&&timingSafeEqual(actual,expected),'Firma del servidor inválida.');
  }
  return { snapshot:true, rules:true, selection:true, chain:true, signature:verifySignature?'verificada con clave local':'no verificada; requiere clave privada del servidor', independentEntropy:false };
}
