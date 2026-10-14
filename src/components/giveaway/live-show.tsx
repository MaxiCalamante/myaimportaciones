'use client';
import Link from 'next/link';
import { useEffect,useRef,useState } from 'react';
import { ArrowRight,Gift,Link2,ShieldCheck } from 'lucide-react';
import { Stage } from './stage';
import { timeline,type PublicGiveaway } from '@/lib/giveaway/live';
import type { Comment } from '@/lib/giveaway/types';
import styles from './giveaway.module.css';
type Props={initial:PublicGiveaway};
export function LiveShow({initial}:Props){
  const [state,setState]=useState(initial),[now,setNow]=useState(Date.parse(initial.serverNow)),[error,setError]=useState(''),[reduce,setReduce]=useState(false),[portrait,setPortrait]=useState(false),[presentation,setPresentation]=useState(false),[copied,setCopied]=useState(false);
  const anchor=useRef({serverMs:Date.parse(initial.serverNow),performanceMs:0});
  const [clockAnchor,setClockAnchor]=useState({serverMs:Date.parse(initial.serverNow),performanceMs:0});
  useEffect(()=>{
    anchor.current={serverMs:Date.parse(initial.serverNow),performanceMs:performance.now()};
    const motion=matchMedia('(prefers-reduced-motion: reduce)'),viewport=matchMedia('(max-width: 780px)');const update=()=>setReduce(motion.matches),resize=()=>setPortrait(viewport.matches);motion.addEventListener('change',update);viewport.addEventListener('change',resize);
    const initialFrame=requestAnimationFrame(()=>{update();resize();setClockAnchor(anchor.current);setPresentation(new URLSearchParams(location.search).get('presentacion')==='1');});
    let disposed=false,timer:ReturnType<typeof setTimeout>|undefined,active:AbortController|null=null,sequence=0;
    const sync=async()=>{
      if(disposed)return;
      active?.abort();active=new AbortController();const controller=active,requestId=++sequence,started=performance.now();
      try{const r=await fetch('/api/sorteo',{cache:'no-store',signal:controller.signal});const next=await r.json();if(!r.ok||next.error)throw new Error(next.error||'No se pudo sincronizar.');
        if(!disposed&&requestId===sequence){anchor.current={serverMs:Date.parse(next.serverNow)+(performance.now()-started)/2,performanceMs:performance.now()};setClockAnchor(anchor.current);setState(next);setNow(anchor.current.serverMs);setError('');}
      }catch(e){if(!disposed&&!controller.signal.aborted&&requestId===sequence)setError((e as Error).message);}
      finally{if(!disposed&&requestId===sequence)timer=setTimeout(sync,document.hidden?7000:1000);}
    };
    void sync();const interval=setInterval(()=>setNow(anchor.current.serverMs+performance.now()-anchor.current.performanceMs),150);
    const visible=()=>{if(!document.hidden){if(timer)clearTimeout(timer);if(!active||active.signal.aborted)void sync();else void sync();}};
    document.addEventListener('visibilitychange',visible);const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setPresentation(false);};window.addEventListener('keydown',key);
    return()=>{disposed=true;if(timer)clearTimeout(timer);active?.abort();clearInterval(interval);cancelAnimationFrame(initialFrame);motion.removeEventListener('change',update);viewport.removeEventListener('change',resize);document.removeEventListener('visibilitychange',visible);window.removeEventListener('keydown',key);};
  },[initial.serverNow]);
  const current=timeline(state,now),status=current.phase;
  const pool:Comment[]=state.reel.map((c,i)=>({id:`public-reel:${i}`,username:c.username,displayName:c.displayName||undefined,text:'',timestamp:null}));
  const schedule=state.config.scheduledFor?Date.parse(state.config.scheduledFor):null,remaining=schedule?Math.max(0,schedule-now):0;
  const clock=state.round&&clockAnchor.performanceMs?{...clockAnchor,spinAt:Date.parse(state.round.spinAt),revealAt:Date.parse(state.round.revealAt),countdownAt:Date.parse(state.round.countdownAt)}:undefined;
  const waitingText=state.round?'MYA está preparando el inicio':schedule&&remaining>0?'Nos encontramos en el vivo':'Esperando que MYA inicie el sorteo';
  async function share(){try{await navigator.clipboard.writeText(`${location.origin}/sorteo`);setCopied(true);setTimeout(()=>setCopied(false),2500);}catch{setError(`Compartí este enlace: ${location.origin}/sorteo`);}}
  return <section className={`${styles.publicRoot} ${presentation?styles.presentation:''}`} aria-label="Sorteo en vivo de MYA">
    <div className={styles.intro}><div><p className={styles.eyebrow}>UN REGALO PARA MAMÁ · 18 OCTUBRE 2026</p><h1>La ilusión se comparte.</h1><p>Un regalo especial, una comunidad increíble. Viví el sorteo con MYA.</p></div><button className={styles.share} onClick={share}><Link2 size={16}/>{copied?'Enlace copiado':'Compartir sorteo'}</button></div>
    {error&&<div role="status" className={styles.connectionNote}>{error} <span>La página conserva el último estado recibido. No selecciona ganadores por su cuenta.</span></div>}
    <div className={styles.publicGrid}>
      <div className={styles.scenario}>
        <div className={styles.liveBar}><span><span className={styles.liveDot}/>{status==='waiting'?'PRÓXIMAMENTE':status==='winner'?'RESULTADO DEL SORTEO':'EN VIVO'}</span><span>{state.participantCount} participantes</span></div>
        <Stage audit={null} pool={pool} phase={status==='winner'?'winner':status==='countdown'?'countdown':status==='spinning'||status==='revealing'?'spinning':'idle'} countdown={current.countdown} progress={current.progress} participantCount={state.participantCount} winner={state.winner||undefined} winnerStatus={state.winnerStatus||undefined} winnerAvatar={state.winnerAvatar||undefined} source={state.source||undefined} title={state.config.title} prize={state.config.prize} liveClock={clock} portrait={portrait} reduceMotion={reduce} onRecorded={()=>{}} onRecordingError={()=>{}}/>
        <div className={styles.scenarioFooter}><ShieldCheck size={16}/><span>Una cuenta, una oportunidad. Resultado compartido para todos.</span></div>
      </div>
      <aside className={styles.audienceInfo}>
        <p className={styles.eyebrow}>EL MOMENTO MÁS ESPERADO</p>
        <h2>{status==='winner'?'¡Tenemos ganador!':status==='spinning'?'La suerte está girando…':status==='countdown'?'Estamos por comenzar':status==='revealing'?'Revelando el resultado…':waitingText}</h2>
        {status==='winner'&&state.winner?<><div className={styles.winnerHandle}>@{state.winner.username}</div><p>{state.winnerStatus==='confirmed'?'MYA registró la revisión manual de las condiciones.':state.winnerStatus==='disqualified'?state.disqualificationReason:'MYA revisará las condiciones de participación antes de confirmar el premio.'}</p></>:status==='countdown'?<div className={styles.countdownNumber} aria-live="polite">{current.countdown}</div>:status==='waiting'&&remaining>0?<div className={styles.longCountdown} aria-label="Tiempo hasta el horario previsto">{[{label:'días',n:Math.floor(remaining/86400000)},{label:'horas',n:Math.floor(remaining/3600000)%24},{label:'min',n:Math.floor(remaining/60000)%60},{label:'seg',n:Math.floor(remaining/1000)%60}].map(item=><div key={item.label}><strong>{String(item.n).padStart(2,'0')}</strong><span>{item.label}</span></div>)}</div>:<p>{status==='waiting'?'Cuando MYA inicie el vivo, la cuenta regresiva y la ruleta aparecerán acá.':'Todos vemos la misma selección. Si recién llegaste, te sumás al momento actual del vivo.'}</p>}
        <div className={styles.prize}><Gift size={23}/><div><span>EL PREMIO</span><strong>{state.config.prize}</strong></div></div>
        <p className={styles.manualDisclaimer}>{state.available?'Los comentarios fueron preparados por MYA.':'MYA está preparando la lista de participantes.'} Seguir la cuenta, el like y la historia se revisan manualmente.</p>
        <a className={styles.outlineButton} href={state.config.permalink} target="_blank" rel="noreferrer">Ver publicación original<ArrowRight size={17}/></a>
        <div className={styles.shopInvitation}><span>MIENTRAS COMPARTIMOS ESTE MOMENTO</span><h3>Encontrá tu próximo favorito.</h3><p>Skincare, cuidado capilar, electrónica y mucho más, desde Tandil para vos.</p><Link className={styles.roseButton} href="/catalogo">Descubrir MYA Importaciones<ArrowRight size={18}/></Link></div>
        {state.snapshotHash&&<details className={styles.publicEvidence}><summary>Transparencia del sorteo</summary><p>Lista bloqueada antes de la selección. SHA-256:</p><code>{state.snapshotHash}</code><p>Selección {state.round?.attempt}. Las repeticiones requieren descalificación registrada.</p></details>}
      </aside>
    </div>
    {presentation&&<button className={styles.exitPresentation} onClick={()=>setPresentation(false)}>Salir · Escape</button>}
  </section>;
}
