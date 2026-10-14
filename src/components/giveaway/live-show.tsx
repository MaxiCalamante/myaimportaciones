'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect,useRef,useState } from 'react';
import { ArrowRight,Gift,Link2,ShieldCheck,Trophy,Maximize2,CalendarDays,Clock3 } from 'lucide-react';
import { ProfileAvatar } from './profile-avatar';
import { Stage } from './stage';
import { timeline,DEFAULT_CAMPAIGN,type PublicGiveaway } from '@/lib/giveaway/live';
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
  const pool:Comment[]=state.reel.map((c,i)=>({id:`public-reel:${i}`,username:c.username,displayName:c.displayName||undefined,avatar:c.avatar,text:'',timestamp:null}));
  const schedule=state.config.scheduledFor?Date.parse(state.config.scheduledFor):null,remaining=schedule?Math.max(0,schedule-now):0;
  const clock=state.round&&clockAnchor.performanceMs?{...clockAnchor,spinAt:Date.parse(state.round.spinAt),revealAt:Date.parse(state.round.revealAt),countdownAt:Date.parse(state.round.countdownAt)}:undefined;
  const waitingText=state.round?'MYA está preparando el inicio':schedule&&remaining>0?'Nos encontramos en el vivo':'Esperando que MYA inicie el sorteo';
  async function share(){try{await navigator.clipboard.writeText(`${location.origin}/sorteo`);setCopied(true);setTimeout(()=>setCopied(false),2500);}catch{setError(`Compartí este enlace: ${location.origin}/sorteo`);}}
  const activeStep=status==='waiting'?0:status==='countdown'?1:status==='spinning'?2:3;
  const originalArtwork=state.config.prize===DEFAULT_CAMPAIGN.prize&&state.config.permalink.replace(/\/$/,'')===DEFAULT_CAMPAIGN.permalink.replace(/\/$/,'');
  return <section className={`${styles.publicRoot} ${presentation?styles.presentation:''}`} aria-label="Sorteo en vivo de MYA">
    <div className={styles.intro}><div><p className={styles.eyebrow}>MYA IMPORTACIONES · UN REGALO PARA MAMÁ</p><h1>Sorteo <em>en vivo.</em></h1><p>Un regalo para mamá. Un encuentro con toda la comunidad.</p><div className={styles.eventDate}><CalendarDays size={18}/><strong>Domingo 18 de octubre</strong><span>·</span><span>{schedule?new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit'}).format(new Date(schedule))+' h · Argentina':'Horario a confirmar'}</span></div></div><div className={styles.introActions}><button className={styles.share} onClick={share}><Link2 size={16}/>{copied?'Enlace copiado':'Compartir sorteo'}</button><button className={styles.share} onClick={()=>setPresentation(true)} aria-label="Ampliar el escenario"><Maximize2 size={16}/></button></div></div>
    {error&&<div role="status" className={styles.connectionNote}>{error} <span>Estamos recuperando la conexión. El resultado del sorteo se conserva.</span></div>}
    <div className={styles.publicGrid}>
      <div>
        <div className={styles.scenario}>
          <div className={styles.liveBar} data-live={status==='countdown'||status==='spinning'}><span><span className={styles.liveDot}/>{status==='waiting'?'EN ESPERA':status==='winner'?'RESULTADO DEL SORTEO':'MYA · EN VIVO'}</span><span>{state.participantCount.toLocaleString('es-AR')} participantes</span></div>
          <Stage audit={null} pool={pool} phase={status==='winner'?'winner':status==='countdown'?'countdown':status==='spinning'||status==='revealing'?'spinning':'idle'} countdown={current.countdown} progress={current.progress} participantCount={state.participantCount} winner={state.winner||undefined} winnerStatus={state.winnerStatus||undefined} winnerAvatar={state.winnerAvatar||undefined} winnerRoundId={state.round?.id} source={state.source||undefined} title={state.config.title} prize={state.config.prize} liveClock={clock} scheduledFor={state.config.scheduledFor} portrait={portrait} reduceMotion={reduce} onRecorded={()=>{}} onRecordingError={()=>{}}/>
          <div className={styles.scenarioFooter}><ShieldCheck size={15}/><span>Una oportunidad por cuenta · El mismo resultado para todos.</span></div>
        </div>
        {pool.length>0&&status!=='winner'&&<div className={styles.liveParticipants}><div>{pool.slice(0,5).map(c=><ProfileAvatar key={c.username} username={c.username} displayName={c.displayName} src={c.avatar} size={34} eager/>)}</div><span>{state.participantCount} cuentas en el sorteo</span></div>}
        <div className={styles.stageRail} aria-label="Momento del sorteo">{['La previa','Cuenta regresiva','Selección','El resultado'].map((label,i)=><span key={label} data-active={i===activeStep}><i>{String(i+1).padStart(2,'0')}</i>{label}</span>)}</div>
        <div className={styles.shopInvitation}><div><span>MYA IMPORTACIONES</span><h3>Conocé nuestra tienda.</h3><p>Skincare, cuidado capilar, electrónica y mucho más. Desde Tandil, con envíos a todo el país.</p></div><Link className={styles.roseButton} href="/catalogo">Descubrir MYA Importaciones<ArrowRight size={17}/></Link></div>
      </div>
      <aside className={styles.audienceInfo}>
        <p className={styles.eyebrow}>{status==='winner'?'UN MOMENTO PARA CELEBRAR':'DOMINGO 18 DE OCTUBRE · DÍA DE LA MADRE'}</p>
        {status==='winner'&&<div className={styles.winnerMark}><Trophy size={21} strokeWidth={1.5}/></div>}
        <h2>{status==='winner'?'¡Tenemos ganador!':status==='spinning'?'La suerte está girando…':status==='countdown'?'Estamos por comenzar':status==='revealing'?'Revelando el resultado…':waitingText}</h2>
        {status==='winner'&&state.winner?<><div className={styles.winnerIdentity}><ProfileAvatar username={state.winner.username} displayName={state.winner.displayName} src={state.winnerAvatar||`/api/sorteo/foto?round=${encodeURIComponent(state.round!.id)}`} size={112} eager/>{state.winner.displayName&&<strong className={styles.winnerName}>{state.winner.displayName}</strong>}<a className={styles.winnerHandle} href={`https://www.instagram.com/${encodeURIComponent(state.winner.username)}/`} target="_blank" rel="noreferrer">@{state.winner.username}</a><span className={styles.winnerStatus} data-confirmed={state.winnerStatus==='confirmed'}>{state.winnerStatus==='confirmed'?'Premio confirmado':state.winnerStatus==='disqualified'?'Descalificación registrada':'Pendiente de revisión'}</span></div><p>{state.winnerStatus==='confirmed'?'MYA registró la revisión manual de las condiciones.':state.winnerStatus==='disqualified'?state.disqualificationReason:'MYA revisará las condiciones de participación antes de confirmar el premio.'}</p></>:status==='countdown'?<div className={styles.countdownNumber} aria-live="polite">{current.countdown}</div>:status==='waiting'&&remaining>0?<div className={styles.longCountdown} aria-label="Tiempo hasta el horario previsto">{[{label:'días',n:Math.floor(remaining/86400000)},{label:'horas',n:Math.floor(remaining/3600000)%24},{label:'min',n:Math.floor(remaining/60000)%60},{label:'seg',n:Math.floor(remaining/1000)%60}].map(item=><div key={item.label}><strong>{String(item.n).padStart(2,'0')}</strong><span>{item.label}</span></div>)}</div>:<p>{status==='waiting'?'El sorteo será el Día de la Madre. Volvé a esta página: la cuenta regresiva se activa cuando MYA inicia el vivo.':'Si recién llegaste, ya sos parte de este momento. Todos estamos viendo la misma selección.'}</p>}
        {status==='waiting'&&!schedule&&<p className={styles.scheduleNote}><Clock3 size={16}/>Horario a confirmar · Argentina</p>}
        <div className={`${styles.prizeVisual} ${originalArtwork?styles.originalArtwork:''}`}>{originalArtwork?<Image src="/sorteo/dia-de-la-madre-instagram.jpg" alt="Publicación original de MYA en Instagram: Sorteo para mamá, Travel Kit SKIN1004 Centella de cinco productos" width={1080} height={1350} sizes="(max-width: 900px) 80vw, 360px"/>:<Gift size={44} strokeWidth={1}/>} {!originalArtwork&&<span className={styles.prizeStamp}>EL REGALO DE MYA</span>}</div>
        <div className={styles.prize}><Gift size={22} strokeWidth={1.5}/><div><span>PARA REGALAR UN MOMENTO DE CUIDADO</span><strong>{state.config.prize}</strong></div></div>
        <p className={styles.manualDisclaimer}>{state.available?'Participan las cuentas con comentarios válidos de la publicación.':'Estamos preparando la lista de participantes.'} Seguir la cuenta, el like y la historia se revisan manualmente.</p>
        <a className={styles.outlineButton} href={state.config.permalink} target="_blank" rel="noreferrer">Ver publicación original<ArrowRight size={16}/></a>
        {state.snapshotHash&&<details className={styles.publicEvidence}><summary>Transparencia del sorteo</summary><p>Lista bloqueada antes de la selección. SHA-256:</p><code>{state.snapshotHash}</code><p>Selección {state.round?.attempt}. Las repeticiones requieren descalificación registrada.</p></details>}
      </aside>
    </div>
    {presentation&&<button className={styles.exitPresentation} onClick={()=>setPresentation(false)}>Salir · Escape</button>}
  </section>;
}
