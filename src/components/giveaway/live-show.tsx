"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { CalendarDays,Clock3,Maximize2,ShieldCheck,Users,ArrowRight,CheckCircle2,RefreshCw } from 'lucide-react';
import { type PublicGiveaway,timeline } from '@/lib/giveaway/live';
import { experienceState,countdownParts } from '@/lib/giveaway/experience';
import { eventDate,eventTime,eventCalendar } from '@/lib/giveaway/schedule';
import { download } from '@/lib/giveaway/exports';
import { useLiveGiveaway } from './use-live-giveaway';
import { GiveawayHero,PrizeCard,Participation,INSTAGRAM } from './experience-sections';
import { ParticipantReel } from './participant-reel';
import { ProfileAvatar } from './profile-avatar';
import { ShareButton } from './share-button';
import styles from './experience.module.css';
import { Instagram } from './instagram-icon';

type Props={initial:PublicGiveaway};
function Botanicals(){return <svg className={styles.botanical} viewBox="0 0 150 460" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1"><path d="M65 445C125 300 16 190 86 12"/><path d="M67 368C15 365 0 332 9 303C47 311 64 335 67 368ZM73 313C122 296 139 267 129 242C96 252 77 275 73 313ZM61 263C12 245 2 218 11 194C47 207 58 230 61 263ZM58 209C105 192 124 162 113 137C79 148 61 175 58 209ZM63 149C25 131 22 103 34 81C59 97 66 122 63 149ZM73 89C112 70 124 44 110 20C85 38 75 58 73 89Z"/></g></svg>;}
function Countdown({remaining}:{remaining:number}){return <div className={styles.countdown} role="timer" aria-label="Cuenta regresiva hacia el sorteo en vivo">{countdownParts(remaining).map((value,i)=><div key={i}><strong key={value}>{String(value).padStart(2,'0')}</strong><span>{['DÍAS','HORAS','MIN','SEG'][i]}</span></div>)}</div>;}
export function LiveShow({initial}:Props){
  const {state,now,error,reduce,anchor,reconnect}=useLiveGiveaway(initial);
  const [presentation,setPresentation]=useState(false);
  useEffect(()=>{const frame=requestAnimationFrame(()=>setPresentation(new URLSearchParams(location.search).get('presentacion')==='1'));const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setPresentation(false);};window.addEventListener('keydown',key);return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',key);};},[]);
  const view=experienceState(state,now),current=timeline(state,now),round=state.round;
  const drawing=['preparing','countdown','drawing','revealing'].includes(view);
  const settling=Boolean(round&&state.winner&&now<Date.parse(round.revealAt)+1100&&!reduce);
  const result=Boolean(state.winner&&!settling&&!drawing);
  const activeStep=view==='countdown'?1:drawing?(view==='preparing'?1:2):result?3:0;
  const remaining=state.config.scheduledFor?Math.max(0,Date.parse(state.config.scheduledFor)-now):0;
  const pool=state.reel.map((c,i)=>({id:`public-reel:${i}`,username:c.username,displayName:c.displayName||undefined,avatar:c.avatar,text:'',timestamp:null}));
  const winner=state.winner,confirmed=state.winnerStatus==='confirmed',disqualified=state.winnerStatus==='disqualified';
  const celebrate=Boolean(!reduce&&round&&(initial.round?.id!==round.id||Date.parse(initial.serverNow)<Date.parse(round.revealAt)));
  const statusText=error?'CONEXIÓN INTERRUMPIDA':drawing?'EN VIVO · SORTEO DÍA DE LA MADRE':settling?'REVELANDO EL RESULTADO':result?'RESULTADO DEL SORTEO':view==='ready'?'ESTAMOS POR COMENZAR':'EN ESPERA DEL SORTEO EN VIVO';
  return <section className={`${styles.page} ${presentation?styles.presentation:''}`} aria-label="Sorteo en vivo de MYA" data-event-state={view}>
    <div className={styles.content}>
      <GiveawayHero state={state} view={view}/>
      {error&&<div className={styles.connectionNote} role="status"><span>{error}</span><button onClick={reconnect}><RefreshCw size={15}/>Reintentar conexión</button></div>}
      <div className={styles.mainGrid}>
        <section className={styles.stagePanel} id="sorteo-en-vivo" aria-label="Escenario del sorteo" data-live={drawing}>
          <div className={styles.liveBar}><span><i data-live={drawing} aria-hidden="true"/>{statusText}</span><span className={styles.participantBadge}><Users size={14}/>{state.participantCount.toLocaleString('es-AR')} participantes</span><button className={styles.expandButton} onClick={()=>setPresentation(true)} aria-label="Ampliar el escenario"><Maximize2 size={16}/></button></div>
          <div className={styles.stageInner}>
            <Botanicals/><div className={styles.brand}><Image src="/logo.png" alt="MYA Importaciones" width={76} height={55}/><span>MYA IMPORTACIONES</span></div>
            <h2 className={styles.eventTitle}>Sorteo Día de la Madre</h2>
            {result&&winner?<div className={styles.winnerResult} key={round?.id} id="resultado" data-celebrate={celebrate}>
              {celebrate&&<div className={styles.confetti} aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{'--i':i} as React.CSSProperties}/>)}</div>}
              <p className={styles.resultEyebrow}>{confirmed?'UN MOMENTO PARA CELEBRAR':disqualified?'REVISIÓN REGISTRADA':'CUENTA SELECCIONADA'}</p>
              <h3>{confirmed?'¡Tenemos ganadora!':disqualified?'El resultado fue descalificado':'Revisamos la cuenta seleccionada'}</h3>
              <div className={styles.winnerPhoto}><ProfileAvatar username={winner.username} displayName={winner.displayName} src={state.winnerAvatar||`/api/sorteo/foto?round=${encodeURIComponent(round!.id)}`} size={118} eager/></div>
              {winner.displayName&&<strong className={styles.winnerName}>{winner.displayName}</strong>}
              <a className={styles.winnerHandle} href={`https://www.instagram.com/${encodeURIComponent(winner.username)}/`} target="_blank" rel="noreferrer">@{winner.username}</a>
              <span className={styles.reviewBadge}>{confirmed?<><CheckCircle2 size={15}/>Premio confirmado</>:disqualified?'Descalificación registrada':'Pendiente de revisión manual'}</span>
              <p>{confirmed?`¡Felicitaciones! Ganaste el ${state.config.prize}.`:disqualified?state.disqualificationReason:'MYA está revisando las condiciones de participación antes de confirmar el premio.'}</p>
              {confirmed&&<p>MYA registró la revisión manual de las condiciones.</p>}
              {confirmed&&<p className={styles.resultThanks}>Gracias a todas por participar y formar parte de nuestra comunidad.</p>}
              <div className={styles.resultPrize}><GiftLabel prize={state.config.prize}/><span>{eventDate(round?.revealAt||state.config.scheduledFor)}</span></div>
              <div className={styles.resultActions}><ShareButton result/><a className={styles.secondaryButton} href={INSTAGRAM} target="_blank" rel="noreferrer"><Instagram size={16}/>Ver Instagram</a><Link className={styles.textLink} href="/catalogo">Descubrir productos<ArrowRight size={16}/></Link></div>
              <span className="sr-only" role="status">{confirmed?'Premio confirmado para':disqualified?'Descalificación registrada para':'Cuenta seleccionada, pendiente de revisión:'} @{winner.username}.</span>
            </div>:drawing||settling?<div className={styles.drawingContent} key={round?.id}>
              <h3>{view==='preparing'?'¡Llegó el momento de conocer a la ganadora!':view==='countdown'?'Estamos por comenzar':view==='revealing'||settling?'Revelando el resultado…':'Estamos seleccionando una cuenta'}</h3>
              <Countdown remaining={0}/>
              {view==='countdown'?<div className={styles.startCount} aria-label={`El sorteo comienza en ${current.countdown}`}><strong key={current.countdown}>{current.countdown}</strong><span>PREPARATE PARA ESTE MOMENTO</span></div>:view==='preparing'?<p className={styles.preparingNote}>Preparamos la selección para compartirla con todos.</p>:<ParticipantReel pool={pool} winner={winner?{...winner,avatar:state.winnerAvatar||`/api/sorteo/foto?round=${encodeURIComponent(round!.id)}`}:undefined} spinAt={Date.parse(round!.spinAt)} revealAt={Date.parse(round!.revealAt)} anchor={anchor} reduce={reduce}/>}
            </div>:<div className={styles.waitingContent} key={view==='ready'?'ready':'preview'}>
              <h3>{view==='ready'?'Estamos por comenzar':view==='unavailable'?'Estamos preparando este momento':'Nos encontramos en el vivo'}</h3>
              {state.config.scheduledFor?<Countdown remaining={remaining}/>:<p className={styles.scheduleNote}>Horario a confirmar · Argentina</p>}
              <p className={styles.stageDate}><CalendarDays size={19}/>{eventDate(state.config.scheduledFor)}<span>· {eventTime(state.config.scheduledFor)}</span></p>
              {view==='ready'?<p className={styles.readyNote}>¡Llegó la hora prevista! El sorteo comenzará cuando MYA lo inicie. La selección todavía no empezó.</p>:state.config.scheduledFor?<button className={styles.calendarButton} onClick={()=>download(new Blob([eventCalendar(state.config,`${location.origin}/sorteo`)],{type:'text/calendar;charset=utf-8'}),'mya-sorteo.ics')}><CalendarDays size={14}/>Agendar el sorteo</button>:<p className={styles.readyNote}><Clock3 size={15}/>Pronto compartiremos el horario.</p>}
            </div>}
            <ol className={styles.stageRail} aria-label="Momento del sorteo">{['La previa','Cuenta regresiva','Selección','El resultado'].map((label,i)=><li key={label} data-active={i===activeStep} data-done={i<activeStep} aria-current={i===activeStep?'step':undefined}><i>{String(i+1).padStart(2,'0')}</i><span>{label}</span></li>)}</ol>
          </div>
          <div className={styles.stageFooter}><ShieldCheck size={18}/><span>Una participación por cuenta · Selección registrada en el servidor</span></div>
        </section>
        <PrizeCard state={state} drawing={drawing}/>
      </div>
      {state.snapshotHash&&<details className={styles.evidence}><summary>Transparencia del sorteo</summary><p>Selección {round?.attempt}. La lista se bloquea al iniciar. Las repeticiones oficiales conservan el resultado anterior y su motivo en el historial.</p><p>Huella de la lista registrada:</p><code>{state.snapshotHash}</code><p>La confirmación de las condiciones es manual. El resultado que ves se recibe del servidor.</p></details>}
      <Participation permalink={state.config.permalink} active={drawing}/>
    </div>
    {presentation&&<button className={styles.exitPresentation} onClick={()=>setPresentation(false)}>Salir · Escape</button>}
  </section>;
}
function GiftLabel({prize}:{prize:string}){return <strong>{prize}</strong>;}
