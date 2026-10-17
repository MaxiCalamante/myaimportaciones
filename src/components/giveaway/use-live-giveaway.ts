'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import type { PublicGiveaway } from '@/lib/giveaway/live';

export function useLiveGiveaway(initial:PublicGiveaway){
  const [state,setState]=useState(initial),[now,setNow]=useState(Date.parse(initial.serverNow)),[error,setError]=useState(''),[reduce,setReduce]=useState(false);
  const anchor=useRef({serverMs:Date.parse(initial.serverNow),performanceMs:0});
  const retry=useRef<()=>void>(()=>{});
  const reconnect=useCallback(()=>retry.current(),[]);
  useEffect(()=>{
    anchor.current={serverMs:Date.parse(initial.serverNow),performanceMs:performance.now()};
    const motion=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduce(motion.matches);
    const frame=requestAnimationFrame(update);motion.addEventListener('change',update);
    let disposed=false,timer:ReturnType<typeof setTimeout>|undefined,active:AbortController|null=null,sequence=0,failures=0,revision=initial.revision;
    let running=Boolean(initial.round&&Date.parse(initial.serverNow)<Date.parse(initial.round.revealAt));
    const sync=async()=>{
      if(disposed)return;
      if(timer)clearTimeout(timer);
      active?.abort();active=new AbortController();const controller=active,id=++sequence,started=performance.now();
      try{
        const r=await fetch('/api/sorteo',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});
        const next:PublicGiveaway&{error?:string}=await r.json();
        if(!r.ok||next.error||!Number.isFinite(Date.parse(next.serverNow)))throw new Error('No se pudo sincronizar.');
        if(!disposed&&id===sequence&&next.revision>=revision){
          revision=next.revision;failures=0;
          running=Boolean(next.round&&Date.parse(next.serverNow)<Date.parse(next.round.revealAt)+2000);
          anchor.current={serverMs:Date.parse(next.serverNow)+(performance.now()-started)/2,performanceMs:performance.now()};
          setState(next);setNow(anchor.current.serverMs);setError('');
        }
      }catch{if(!disposed&&!controller.signal.aborted&&id===sequence){failures++;setError('La conexión se interrumpió. Conservamos el último estado recibido y estamos reconectando.');}}
      finally{if(!disposed&&id===sequence)timer=setTimeout(sync,failures?Math.min(15000,1500*2**Math.min(failures,4)):document.hidden?10000:running?750:2500);}
    };
    retry.current=()=>{void sync();};void sync();
    const interval=setInterval(()=>setNow(anchor.current.serverMs+performance.now()-anchor.current.performanceMs),200);
    const visible=()=>{if(!document.hidden)void sync();};
    document.addEventListener('visibilitychange',visible);window.addEventListener('online',visible);
    return()=>{disposed=true;retry.current=()=>{};if(timer)clearTimeout(timer);active?.abort();clearInterval(interval);cancelAnimationFrame(frame);motion.removeEventListener('change',update);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',visible);};
  },[initial]);
  return {state,now,error,reduce,anchor,reconnect};
}
