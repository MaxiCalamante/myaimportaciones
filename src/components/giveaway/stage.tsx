'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { renderStage, type Phase } from '@/lib/giveaway/visual';
import { download, recordingMime } from '@/lib/giveaway/exports';
import type { Audit, Comment, SourceKind } from '@/lib/giveaway/types';

export type StageHandle = { png:()=>Promise<void>; startRecording:()=>boolean; stopRecording:()=>void; canvas:()=>HTMLCanvasElement|null };
type Props={ phase:Phase; countdown:number; progress:number; pool:Comment[]; audit:Audit|null; source?:SourceKind; portrait:boolean; reduceMotion:boolean; onRecorded:(blob:Blob)=>void; onRecordingError:(message:string)=>void; winner?:Comment; winnerStatus?:Audit['status']; winnerAvatar?:string;winnerRoundId?:string; participantCount?:number;title?:string;prize?:string;liveClock?:{serverMs:number;performanceMs:number;spinAt:number;revealAt:number;countdownAt:number} };
async function loadImage(src:string) {const img=new Image();img.src=src;await img.decode();return img;}
export const Stage=forwardRef<StageHandle,Props>(function Stage(props,ref) {
  const canvas=useRef<HTMLCanvasElement>(null),state=useRef(props),logo=useRef<HTMLImageElement|undefined>(undefined),avatar=useRef<HTMLImageElement|undefined>(undefined),recorder=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]),frame=useRef(0);
  const draw=props.audit?.draws.at(-1),manualAvatar=props.winnerAvatar||(draw?props.audit?.avatars[draw.id]?.dataUrl:undefined),roundId=draw?.id||props.winnerRoundId;
  const avatarUrl=manualAvatar||(props.phase==='winner'&&roundId?`/api/sorteo/foto?round=${encodeURIComponent(roundId)}`:undefined);
  state.current=props;
  useEffect(()=>{let live=true;loadImage('/logo.png').then(img=>{if(live)logo.current=img;}).catch(()=>{});return()=>{live=false;};},[]);
  useEffect(()=>{let live=true;avatar.current=undefined;if(avatarUrl)loadImage(avatarUrl).then(img=>{if(live)avatar.current=img;}).catch(()=>{});return()=>{live=false;};},[avatarUrl]);
  useEffect(()=>{
    const started=performance.now();
    function paint(now:number) {
      const el=canvas.current;if(!el)return;const ctx=el.getContext('2d');if(!ctx)return;
      const p=state.current,d=p.audit?.draws.at(-1);
      const clock=p.liveClock,serverNow=clock?clock.serverMs+now-clock.performanceMs:0;
      const countdown=clock?Math.max(1,Math.ceil((clock.spinAt-serverNow)/1000)):p.countdown;
      const progress=clock?Math.max(0,Math.min(1,(serverNow-clock.spinAt)/(clock.revealAt-clock.spinAt))):p.progress;
      renderStage(ctx,el.width,el.height,{...p,countdown,progress,winner:p.winner||d?.winner,status:p.winnerStatus||p.audit?.status,elapsed:clock?Math.max(0,serverNow-clock.revealAt):now-started,avatar:avatar.current,logo:logo.current});
      frame.current=requestAnimationFrame(paint);
    }
    frame.current=requestAnimationFrame(paint);
    return()=>{cancelAnimationFrame(frame.current);const r=recorder.current;if(r&&r.state!=='inactive')r.stop();r?.stream.getTracks().forEach(t=>t.stop());};
  },[]);
  useImperativeHandle(ref,()=>({
    async png() {
      const p=state.current,d=p.audit?.draws.at(-1);if(!d)throw new Error('Realizá un sorteo antes de exportar.');
      await document.fonts.ready;
      const el=document.createElement('canvas');el.width=1080;el.height=1920;
      const photo=avatarUrl?await loadImage(avatarUrl).catch(()=>undefined):undefined;
      renderStage(el.getContext('2d')!,1080,1920,{...p,phase:'winner',winner:d.winner,status:p.audit?.status,portrait:true,elapsed:6000,avatar:photo,logo:logo.current});
      const blob=await new Promise<Blob>((resolve,reject)=>el.toBlob(b=>b?resolve(b):reject(new Error('No se pudo crear la imagen.')),'image/png'));
      download(blob,`mya-ganador-${d.winner.username}-1080x1920.png`);
    },
    startRecording() {
      const mime=recordingMime(),el=canvas.current;if(!mime||!el?.captureStream) {state.current.onRecordingError('Este navegador no permite grabar el escenario. Usá Chrome o Edge de escritorio, o grabá la pantalla.');return false;}
      if(recorder.current?.state==='recording')return true;
      try {
        const stream=el.captureStream(30);const r=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8_000_000});chunks.current=[];
        r.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data);};
        r.onstop=()=>{stream.getTracks().forEach(t=>t.stop());if(chunks.current.length)state.current.onRecorded(new Blob(chunks.current,{type:r.mimeType}));};
        r.onerror=()=>{state.current.onRecordingError('La grabación falló. Podés exportar la imagen o grabar la pantalla.');stream.getTracks().forEach(t=>t.stop());};
        recorder.current=r;r.start(1000);return true;
      }catch {state.current.onRecordingError('No se pudo iniciar la grabación en este navegador.');return false;}
    },
    stopRecording(){if(recorder.current?.state==='recording')recorder.current.stop();},
    canvas(){return canvas.current;}
  }),[avatarUrl]);
  const currentWinner=props.winner||draw?.winner;
  const description=props.phase==='winner'&&currentWinner?`Ganador: @${currentWinner.username}. ${(props.winnerStatus||props.audit?.status)==='confirmed'?'Condiciones revisadas.':'Pendiente de revisión manual.'}`:props.phase==='countdown'?`El sorteo comienza en ${props.countdown}`:props.phase==='spinning'?'Eligiendo al ganador':`${props.participantCount??props.pool.length} participantes. Escenario del sorteo.`;
  const accessibleDescription=props.source==='demo'?`Ensayo privado, sin validez. ${description}`:description;
  return <div className={`giveaway-stage-shell ${props.portrait?'giveaway-vertical':'giveaway-landscape'}`}><canvas ref={canvas} width={props.portrait?1080:1920} height={props.portrait?1920:1080} role="img" aria-label={accessibleDescription}/><span className="sr-only" aria-live="polite">{accessibleDescription}</span></div>;
});
