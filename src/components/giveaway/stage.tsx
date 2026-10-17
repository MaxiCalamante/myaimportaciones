'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { renderStage, type Phase } from '@/lib/giveaway/visual';
import { download, recordingMime } from '@/lib/giveaway/exports';
import type { Audit, Comment, SourceKind } from '@/lib/giveaway/types';

export type StageHandle = { png:()=>Promise<void>; startRecording:()=>boolean; stopRecording:()=>void; discardRecording:()=>void; canvas:()=>HTMLCanvasElement|null };
type Props={ phase:Phase; countdown:number; progress:number; pool:Comment[]; audit:Audit|null; source?:SourceKind; portrait:boolean; reduceMotion:boolean; onRecorded:(blob:Blob)=>void; onRecordingError:(message:string)=>void; winner?:Comment; winnerStatus?:Audit['status']; winnerAvatar?:string;winnerRoundId?:string; participantCount?:number;scheduledFor?:string|null;title?:string;prize?:string;liveClock?:{serverMs:number;performanceMs:number;spinAt:number;revealAt:number;countdownAt:number} };
async function loadImage(src:string) {const img=new Image();img.crossOrigin='anonymous';img.src=src;await img.decode();return img;}
export const Stage=forwardRef<StageHandle,Props>(function Stage(props,ref) {
  const canvas=useRef<HTMLCanvasElement>(null),state=useRef(props),logo=useRef<HTMLImageElement|undefined>(undefined),avatars=useRef(new Map<string,HTMLImageElement>()),avatar=useRef<HTMLImageElement|undefined>(undefined),recorder=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]),frame=useRef(0);
  const draw=props.audit?.draws.at(-1),manualAvatar=props.winnerAvatar||(draw?props.audit?.avatars[draw.id]?.dataUrl:undefined),roundId=draw?.id||props.winnerRoundId;
  const avatarUrl=manualAvatar||(props.phase==='winner'&&roundId?`/api/sorteo/foto?round=${encodeURIComponent(roundId)}`:undefined);
  state.current=props;
  const poolPhotos=props.pool.filter(c=>c.avatar).slice(0,96).map(c=>[c.username,c.avatar!] as const);
  const photoKey=JSON.stringify(poolPhotos);
  useEffect(()=>{let live=true,index=0;const loaded=avatars.current;loaded.clear();canvas.current?.setAttribute('data-loaded-avatars','0');const entries=JSON.parse(photoKey) as [string,string][];void Promise.all(Array.from({length:4},async()=>{while(live&&index<entries.length){const [handle,url]=entries[index++];try{const image=await loadImage(url);if(live){loaded.set(handle,image);canvas.current?.setAttribute('data-loaded-avatars',String(loaded.size));}}catch{}}}));return()=>{live=false;loaded.clear();};},[photoKey]);
  useEffect(()=>{let live=true;loadImage('/logo.png').then(img=>{if(live)logo.current=img;}).catch(()=>{});return()=>{live=false;};},[]);
  useEffect(()=>{let live=true;avatar.current=undefined;if(avatarUrl){void (async()=>{for(let attempt=0;attempt<3&&live;attempt++){try{const image=await loadImage(avatarUrl);if(live)avatar.current=image;return;}catch{if(attempt<2)await new Promise(r=>setTimeout(r,500*(attempt+1)));}}})();}return()=>{live=false;};},[avatarUrl]);
  useEffect(()=>{
    const started=performance.now();let lastPhase=state.current.phase,lastRound=state.current.audit?.draws.at(-1)?.id||state.current.winnerRoundId,phaseAt=started,lastPaint=0;
    function paint(now:number) {
      const el=canvas.current;if(!el)return;const ctx=el.getContext('2d');if(!ctx)return;
      const p=state.current,d=p.audit?.draws.at(-1);
      const currentRound=d?.id||p.winnerRoundId;
      if(lastPhase!==p.phase||lastRound!==currentRound){lastPhase=p.phase;lastRound=currentRound;phaseAt=now;lastPaint=0;}
      const moving=p.phase==='countdown'||p.phase==='spinning'||p.phase==='winner'&&now-phaseAt<6500;
      const interval=moving&&!p.reduceMotion?1000/60:moving?100:250;
      if(now-lastPaint<interval){frame.current=requestAnimationFrame(paint);return;}lastPaint=now;
      const clock=p.liveClock,serverNow=clock?clock.serverMs+now-clock.performanceMs:0;
      const countdown=clock?Math.max(1,Math.ceil((clock.spinAt-serverNow)/1000)):p.countdown;
      const progress=clock?Math.max(0,Math.min(1,(serverNow-clock.spinAt)/(clock.revealAt-clock.spinAt))):p.progress;
      renderStage(ctx,el.width,el.height,{...p,countdown,progress,phaseElapsed:now-phaseAt,countdownProgress:clock?Math.max(0,Math.min(1,1-(clock.spinAt-serverNow)/5000)):undefined,avatars:avatars.current,winner:p.winner||d?.winner,status:p.winnerStatus||p.audit?.status,elapsed:clock?Math.max(0,serverNow-clock.revealAt):now-phaseAt,avatar:avatar.current,logo:logo.current});
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
      const previous=recorder.current;recorder.current=null;
      if(previous&&previous.state!=='inactive')previous.stop();
      previous?.stream.getTracks().forEach(t=>t.stop());
      try {
        const stream=el.captureStream(30);const r=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8_000_000});const recordingChunks:Blob[]=[];chunks.current=recordingChunks;
        r.ondataavailable=e=>{if(e.data.size)recordingChunks.push(e.data);};
        r.onstop=()=>{stream.getTracks().forEach(t=>t.stop());if(recordingChunks.length&&recorder.current===r)state.current.onRecorded(new Blob(recordingChunks,{type:r.mimeType}));};
        r.onerror=()=>{state.current.onRecordingError('La grabación falló. Podés exportar la imagen o grabar la pantalla.');stream.getTracks().forEach(t=>t.stop());};
        recorder.current=r;r.start(1000);return true;
      }catch {state.current.onRecordingError('No se pudo iniciar la grabación en este navegador.');return false;}
    },
    stopRecording(){if(recorder.current?.state==='recording')recorder.current.stop();},
    discardRecording(){const previous=recorder.current;recorder.current=null;if(previous&&previous.state!=='inactive')previous.stop();previous?.stream.getTracks().forEach(t=>t.stop());chunks.current=[];},
    canvas(){return canvas.current;}
  }),[avatarUrl]);
  const currentWinner=props.winner||draw?.winner;
  const description=props.phase==='winner'&&currentWinner?`Ganador: @${currentWinner.username}. ${(props.winnerStatus||props.audit?.status)==='confirmed'?'Condiciones revisadas.':'Pendiente de revisión manual.'}`:props.phase==='countdown'?`El sorteo comienza en ${props.countdown}`:props.phase==='spinning'?'Eligiendo al ganador':`${props.participantCount??props.pool.length} participantes. Escenario del sorteo.`;
  const accessibleDescription=props.source==='demo'?`Ensayo privado, sin validez. ${description}`:description;
  return <div className={`giveaway-stage-shell ${props.portrait?'giveaway-vertical':'giveaway-landscape'}`}><canvas ref={canvas} width={props.portrait?1080:1920} height={props.portrait?1920:1080} role="img" aria-label={accessibleDescription}/><span className="sr-only" aria-live="polite">{accessibleDescription}</span></div>;
});
