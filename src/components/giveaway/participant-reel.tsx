'use client';
import { useEffect,useRef } from 'react';
import type { Comment } from '@/lib/giveaway/types';
import { renderParticipantReel } from '@/lib/giveaway/reel';
import styles from './experience.module.css';

export function ParticipantReel({pool,winner,spinAt,revealAt,anchor,reduce}:{pool:Comment[];winner?:Comment;spinAt:number;revealAt:number;anchor:React.RefObject<{serverMs:number;performanceMs:number}>;reduce:boolean}){
  const canvas=useRef<HTMLCanvasElement>(null),latest=useRef({pool,winner,spinAt,revealAt,reduce}),photos=useRef(new Map<string,HTMLImageElement>());
  useEffect(()=>{latest.current={pool,winner,spinAt,revealAt,reduce};},[pool,winner,spinAt,revealAt,reduce]);
  const photoKey=JSON.stringify([...pool,...(winner?[winner]:[])].filter(c=>c.avatar).map(c=>[c.username,c.avatar]));
  useEffect(()=>{
    let alive=true,index=0;const loaded=photos.current;loaded.clear();canvas.current?.setAttribute('data-loaded-avatars','0');
    const entries=JSON.parse(photoKey) as [string,string][];
    void Promise.all(Array.from({length:4},async()=>{while(alive&&index<entries.length){const [handle,src]=entries[index++],img=new Image();img.crossOrigin='anonymous';img.src=src;try{await img.decode();if(alive){loaded.set(handle,img);canvas.current?.setAttribute('data-loaded-avatars',String(loaded.size));}}catch{}}}));
    return()=>{alive=false;loaded.clear();};
  },[photoKey]);
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    let frame=0,last=0;const resize=()=>{const box=el.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);el.width=Math.round(box.width*dpr);el.height=Math.round(box.height*dpr);last=0;};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    function paint(time:number){
      if(!el)return;const p=latest.current,ctx=el.getContext('2d');if(!ctx)return;
      if(time-last>(p.reduce?150:1000/60)&&!document.hidden){last=time;const dpr=Math.min(devicePixelRatio||1,2),clock=anchor.current,now=clock.serverMs+time-clock.performanceMs;
        ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,el.width/dpr,el.height/dpr);renderParticipantReel(ctx,el.width/dpr,el.height/dpr,{...p,progress:Math.max(0,Math.min(1,(now-p.spinAt)/(p.revealAt-p.spinAt))),reduceMotion:p.reduce,avatars:photos.current});}
      frame=requestAnimationFrame(paint);
    }
    frame=requestAnimationFrame(paint);return()=>{cancelAnimationFrame(frame);observer.disconnect();};
  },[anchor]);
  return <canvas ref={canvas} className={styles.reelCanvas} role="img" aria-label={winner?`Cuenta seleccionada: @${winner.username}`:'Carrusel de participantes reales. Selección en curso.'}/>;
}
