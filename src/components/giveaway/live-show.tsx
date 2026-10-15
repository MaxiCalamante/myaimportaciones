'use client';
import Image from 'next/image';
import { useEffect,useRef,useState } from 'react';
import { ArrowRight,Gift,Link2,ShieldCheck,Trophy,Maximize2,CalendarDays,Clock3,Sparkles,Users,CheckCircle2 } from 'lucide-react';
import { ProfileAvatar } from './profile-avatar';
import { Stage } from './stage';
import { timeline,DEFAULT_CAMPAIGN,type PublicGiveaway } from '@/lib/giveaway/live';
import type { Comment } from '@/lib/giveaway/types';
import { eventDate,eventTime,eventCalendar } from '@/lib/giveaway/schedule';
import { download } from '@/lib/giveaway/exports';
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
    let disposed=false,timer:ReturnType<typeof setTimeout>|undefined,active:AbortController|null=null,sequence=0,failures=0;
    let liveRound=Boolean(initial.round);
    const sync=async()=>{
      if(disposed)return;
      active?.abort();active=new AbortController();const controller=active,requestId=++sequence,started=performance.now();
      try{const r=await fetch('/api/sorteo',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});const next=await r.json();if(!r.ok||next.error)throw new Error(next.error||'No se pudo sincronizar.');
        if(!disposed&&requestId===sequence){failures=0;liveRound=Boolean(next.round);anchor.current={serverMs:Date.parse(next.serverNow)+(performance.now()-started)/2,performanceMs:performance.now()};setClockAnchor(anchor.current);setState(previous=>next.revision>=previous.revision?next:previous);setNow(anchor.current.serverMs);setError('');}
      }catch{if(!disposed&&!controller.signal.aborted&&requestId===sequence){failures++;setError('No pudimos actualizar el vivo.');}}
      finally{if(!disposed&&requestId===sequence)timer=setTimeout(sync,failures?Math.min(15000,1500*2**Math.min(failures,4)):document.hidden?10000:liveRound?1000:2500);}
    };
    void sync();const interval=setInterval(()=>setNow(anchor.current.serverMs+performance.now()-anchor.current.performanceMs),150);
    const visible=()=>{if(!document.hidden){if(timer)clearTimeout(timer);void sync();}};
    document.addEventListener('visibilitychange',visible);const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setPresentation(false);};window.addEventListener('keydown',key);
    return()=>{disposed=true;if(timer)clearTimeout(timer);active?.abort();clearInterval(interval);cancelAnimationFrame(initialFrame);motion.removeEventListener('change',update);viewport.removeEventListener('change',resize);document.removeEventListener('visibilitychange',visible);window.removeEventListener('keydown',key);};
  },[initial.serverNow,initial.round]);
  const current=timeline(state,now),status=current.phase;
  const pool:Comment[]=state.reel.map((c,i)=>({id:`public-reel:${i}`,username:c.username,displayName:c.displayName||undefined,avatar:c.avatar,text:'',timestamp:null}));
  const schedule=state.config.scheduledFor?Date.parse(state.config.scheduledFor):null,remaining=schedule?Math.max(0,schedule-now):0;
  const clock=state.round&&clockAnchor.performanceMs?{...clockAnchor,spinAt:Date.parse(state.round.spinAt),revealAt:Date.parse(state.round.revealAt),countdownAt:Date.parse(state.round.countdownAt)}:undefined;
  const waitingText=state.round?'MYA está preparando el inicio':schedule&&remaining>0?'Nos encontramos en el vivo':'Esperando que MYA inicie el sorteo';
  async function share(){try{await navigator.clipboard.writeText(`${location.origin}/sorteo`);setCopied(true);setTimeout(()=>setCopied(false),2500);}catch{setError(`Compartí este enlace: ${location.origin}/sorteo`);}}
  const activeStep=status==='waiting'?0:status==='countdown'?1:status==='spinning'?2:3;
  const originalArtwork=state.config.prize===DEFAULT_CAMPAIGN.prize&&state.config.permalink.replace(/\/$/,'')===DEFAULT_CAMPAIGN.permalink.replace(/\/$/,'');
  return <section className={`${styles.publicRoot} ${presentation?styles.presentation:''}`} aria-label="Sorteo en vivo de MYA">
    <div className={styles.ambientGlowOne} aria-hidden="true" />
    <div className={styles.ambientGlowTwo} aria-hidden="true" />
    <header className={styles.intro}>
      <div className={styles.introContent}>
        <div className={styles.eyebrowChip}>
          <Sparkles size={12} className={styles.sparkleIcon}/>
          <p className={styles.eyebrow}>MYA IMPORTACIONES · UN REGALO PARA MAMÁ</p>
        </div>
        <h1>{originalArtwork?<>Un regalo especial.<br/><em>Un momento para mamá.</em></>:state.config.title}</h1>
        <p className={styles.heroSubtitle}>Celebremos juntas. Un kit de cuidado, nuestra comunidad y la emoción de compartir el resultado en vivo.</p>
        <div className={styles.headerMetaRow}>
          <div className={styles.eventDate}>
            <div className={styles.calendarIconWrapper}><CalendarDays size={16}/></div>
            <strong>{eventDate(state.config.scheduledFor)}</strong>
            <span className={styles.dateDot}>·</span>
            <span>{eventTime(state.config.scheduledFor)}</span>
          </div>
          <div className={styles.introActions}>
            <button className={`${styles.share} ${copied?styles.shareCopied:''}`} onClick={share}>
              {copied?<CheckCircle2 size={16}/>:<Link2 size={16}/>}
              <span>{copied?'Enlace copiado':'Compartir sorteo'}</span>
            </button>
            <button className={`${styles.share} ${styles.presentationBtn}`} onClick={()=>setPresentation(true)} aria-label="Ampliar el escenario" title="Pantalla completa">
              <Maximize2 size={16}/>
            </button>
          </div>
        </div>
        {schedule && status === 'waiting' && (
          <div className={styles.heroCountdownSection} aria-label="Cuenta regresiva hacia el sorteo en vivo">
            {remaining > 0 ? (
              <div className={styles.heroCountdownBox}>
                <div className={styles.heroCountdownBadge}>
                  <span className={styles.countdownPulseDot} aria-hidden="true" />
                  <span>NOS ENCONTRAMOS EN</span>
                </div>
                <div className={styles.heroCountdownDigitsRow}>
                  <div className={styles.heroCountdownItem}>
                    <strong>{String(Math.floor(remaining / 86400000)).padStart(2, '0')}</strong>
                    <small>DÍAS</small>
                  </div>
                  <span className={styles.heroCountdownColon} aria-hidden="true">:</span>
                  <div className={styles.heroCountdownItem}>
                    <strong>{String(Math.floor(remaining / 3600000) % 24).padStart(2, '0')}</strong>
                    <small>HORAS</small>
                  </div>
                  <span className={styles.heroCountdownColon} aria-hidden="true">:</span>
                  <div className={styles.heroCountdownItem}>
                    <strong>{String(Math.floor(remaining / 60000) % 60).padStart(2, '0')}</strong>
                    <small>MIN</small>
                  </div>
                  <span className={styles.heroCountdownColon} aria-hidden="true">:</span>
                  <div className={styles.heroCountdownItem}>
                    <strong>{String(Math.floor(remaining / 1000) % 60).padStart(2, '0')}</strong>
                    <small>SEG</small>
                  </div>
                </div>
                <p className={styles.ticketTime}>{eventTime(state.config.scheduledFor)}</p>
                <button className={styles.calendarButton} onClick={()=>download(new Blob([eventCalendar(state.config,`${location.origin}/sorteo`)],{type:'text/calendar;charset=utf-8'}),'mya-sorteo.ics')}><CalendarDays size={15}/>Agendar el sorteo</button>
              </div>
            ) : (
              <div className={styles.heroImminentNotice}>
                <span className={styles.countdownPulseDot} aria-hidden="true" />
                <div>
                  <strong>¡Llegó la hora prevista!</strong>
                  <span>Aguardando a que MYA inicie la transmisión en vivo…</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
    {error&&<div role="status" className={styles.connectionNote}>{error} <span>Estamos recuperando la conexión. El resultado del sorteo se conserva.</span></div>}
    <div className={styles.publicGrid}>
      <div className={styles.stageColumn}>
        <div className={styles.scenario}>
          <div className={styles.liveBar} data-live={status==='countdown'||status==='spinning'}>
            <span className={styles.liveBadgeGroup}>
              <span className={styles.liveDot}/>
              <span className={styles.liveStatusText}>{status==='waiting'?'EN ESPERA':status==='winner'?'RESULTADO DEL SORTEO':'MYA · EN VIVO'}</span>
            </span>
            <span className={styles.participantBadge}>
              <Users size={12}/>
              <span>{state.participantCount.toLocaleString('es-AR')} participantes</span>
            </span>
          </div>
          <Stage audit={null} pool={pool} phase={status==='winner'?'winner':status==='countdown'?'countdown':status==='spinning'||status==='revealing'?'spinning':'idle'} countdown={current.countdown} progress={current.progress} participantCount={state.participantCount} winner={state.winner||undefined} winnerStatus={state.winnerStatus||undefined} winnerAvatar={state.winnerAvatar||undefined} winnerRoundId={state.round?.id} source={state.source||undefined} title={state.config.title} prize={state.config.prize} liveClock={clock} scheduledFor={state.config.scheduledFor} portrait={portrait} reduceMotion={reduce} onRecorded={()=>{}} onRecordingError={()=>{}}/>
          <div className={styles.scenarioFooter}>
            <ShieldCheck size={16}/>
            <span>Una oportunidad por cuenta · Selección registrada en el servidor</span>
          </div>
        </div>
        <div className={styles.stageTimelineBox}>
          {pool.length>0&&status!=='winner'&&<div className={styles.liveParticipants}>
            <div className={styles.avatarCluster}>{pool.slice(0,5).map(c=><ProfileAvatar key={c.username} username={c.username} displayName={c.displayName} src={c.avatar} size={32} eager/>)}</div>
            <span className={styles.liveParticipantsText}>{state.participantCount} cuentas en el sorteo</span>
          </div>}
          <div className={styles.stageRail} aria-label="Momento del sorteo">
            {['La previa','Cuenta regresiva','Selección','El resultado'].map((label,i)=>(
              <span key={label} data-active={i===activeStep}>
                <i>{String(i+1).padStart(2,'0')}</i>
                <span>{label}</span>
              </span>
            ))}
          </div>
        </div>
        <div className={styles.howItWorks}>
          <p className={styles.eyebrow}>CÓMO SER PARTE</p>
          <ol><li><span>01</span><div><strong>Participá en Instagram</strong><p>Leé las condiciones y comentá en la publicación original.</p></div></li><li><span>02</span><div><strong>Volvé para el vivo</strong><p>Seguí la selección desde esta página, sin registrarte.</p></div></li><li><span>03</span><div><strong>Compartimos el resultado</strong><p>MYA revisa las condiciones de la cuenta seleccionada.</p></div></li></ol>
          <a className={styles.outlineButton} href={state.config.permalink} target="_blank" rel="noreferrer">Ir al post del sorteo<ArrowRight size={16}/></a>
        </div>
      </div>
      <aside className={styles.audienceInfo}>
        <div className={styles.sidebarHeader}>
          <p className={styles.eyebrow}>{status==='winner'?'UN MOMENTO PARA CELEBRAR':'EL REGALO · '+eventDate(state.config.scheduledFor)}</p>
          {status==='winner'&&<div className={styles.winnerMark}><Trophy size={22} strokeWidth={1.75}/></div>}
          <h2>{status==='winner'?'¡Tenemos ganador!':status==='spinning'?'La suerte está girando…':status==='countdown'?'Estamos por comenzar':status==='revealing'?'Revelando el resultado…':waitingText}</h2>
        </div>
        {status==='winner'&&state.winner?<><div className={styles.winnerIdentity}><ProfileAvatar username={state.winner.username} displayName={state.winner.displayName} src={state.winnerAvatar||`/api/sorteo/foto?round=${encodeURIComponent(state.round!.id)}`} size={112} eager/>{state.winner.displayName&&<strong className={styles.winnerName}>{state.winner.displayName}</strong>}<a className={styles.winnerHandle} href={`https://www.instagram.com/${encodeURIComponent(state.winner.username)}/`} target="_blank" rel="noreferrer">@{state.winner.username}</a><span className={styles.winnerStatus} data-confirmed={state.winnerStatus==='confirmed'}>{state.winnerStatus==='confirmed'?'Premio confirmado':state.winnerStatus==='disqualified'?'Descalificación registrada':'Pendiente de revisión'}</span></div><p>{state.winnerStatus==='confirmed'?'MYA registró la revisión manual de las condiciones.':state.winnerStatus==='disqualified'?state.disqualificationReason:'MYA revisará las condiciones de participación antes de confirmar el premio.'}</p></>:status==='countdown'?<div className={styles.countdownNumber} aria-live="polite">{current.countdown}</div>:status==='waiting'&&remaining>0?<p className={styles.scheduleNote}><Clock3 size={16}/>{eventTime(state.config.scheduledFor)}</p>:status==='waiting'&&schedule&&remaining===0?<p className={styles.imminentText}>¡Llegó la hora prevista! En instantes comienza la transmisión en vivo cuando MYA inicie el sorteo.</p>:<p>{status==='waiting'?'El sorteo será el Día de la Madre. Volvé a esta página: la cuenta regresiva se activa cuando MYA inicia el vivo.':'Si recién llegaste, ya sos parte de este momento. Todos estamos viendo la misma selección.'}</p>}
        {status==='waiting'&&!schedule&&<p className={styles.scheduleNote}><Clock3 size={16}/>Horario a confirmar · Argentina</p>}
        <div className={styles.prizeSection}>
          <div className={`${styles.prizeVisual} ${originalArtwork?styles.originalArtwork:''}`}>{originalArtwork?<Image src="/sorteo/dia-de-la-madre-instagram.jpg" alt="Publicación original de MYA en Instagram: Sorteo para mamá, Travel Kit SKIN1004 Centella de cinco productos" width={1080} height={1350} sizes="(max-width: 900px) 80vw, 360px" priority/>:<Gift size={44} strokeWidth={1}/>} {!originalArtwork&&<span className={styles.prizeStamp}>EL REGALO DE MYA</span>}</div>
          <div className={styles.prize}><div className={styles.prizeIconWrapper}><Gift size={22} strokeWidth={1.5}/></div><div><span>PARA REGALAR UN MOMENTO DE CUIDADO</span><strong>{state.config.prize}</strong></div></div>
          <p className={styles.manualDisclaimer}>{state.available?'Participan todos los comentarios válidos de nuestro posteo oficial en Instagram.':'Estamos preparando la lista de participantes.'} Al salir la cuenta ganadora, revisamos en vivo que siga a @_myaimportaciones y haya cumplido las condiciones.</p>
          <a className={styles.outlineButton} href={state.config.permalink} target="_blank" rel="noreferrer">Ver publicación original<ArrowRight size={16}/></a>
        </div>
        {state.snapshotHash&&<details className={styles.publicEvidence}><summary>Transparencia del sorteo</summary><p>Lista bloqueada antes de la selección. SHA-256:</p><code>{state.snapshotHash}</code><p>Selección {state.round?.attempt}. Las repeticiones requieren descalificación registrada.</p></details>}
      </aside>
    </div>
    {presentation&&<button className={styles.exitPresentation} onClick={()=>setPresentation(false)}>Salir · Escape</button>}
  </section>;
}
