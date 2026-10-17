import type { Audit } from './types';
import { csvCell } from './participants';
export function download(blob:Blob,name:string) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);
}
export function exportAudit(audit:Audit,kind:'json'|'csv') {
  if(kind==='json') download(new Blob([JSON.stringify(audit,null,2)],{type:'application/json'}),`mya-acta-${audit.id}.json`);
  else {
    const rows:unknown[][]=[['tipo','fecha','usuario','comment_id','comentario','estado_motivo','snapshot_sha256','hash_evento','indice','entropia_uint32']];
    audit.snapshot.review.valid.forEach(c=>rows.push(['participante',c.timestamp,c.username,c.id,c.text,'válido',audit.snapshotHash]));
    audit.snapshot.review.excluded.forEach(e=>rows.push(['excluido',e.comment.timestamp,e.comment.username,e.comment.id,e.comment.text,e.reason,audit.snapshotHash]));
    audit.draws.forEach(d=>{rows.push(['sorteo',d.at,d.winner.username,d.winner.id,d.winner.text,d.reason||'selección inicial',audit.snapshotHash,d.hash,d.winnerIndex,d.random.words.join('|')]);if(d.selection)rows.push(['seleccion',d.at,d.winner.username,d.id,'',JSON.stringify(d.selection),audit.snapshotHash,d.hash]);});
    audit.events.forEach(e=>rows.push([e.type,e.at,'',e.drawId,'',e.reason||JSON.stringify(e.checks),audit.snapshotHash,e.hash]));
    rows.push(['acta',audit.lockedAt,'',audit.id,'',audit.status,audit.snapshotHash,audit.signature]);
    rows.push(['reglas','','','','',JSON.stringify(audit.snapshot.rules)]);
    rows.push(['origen',audit.snapshot.source.importedAt,'','','',JSON.stringify(audit.snapshot.source)]);
    download(new Blob(['\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),`mya-acta-${audit.id}.csv`);
  }
}
export function recordingMime() {
  if(typeof MediaRecorder==='undefined')return null;
  return ['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))||null;
}
