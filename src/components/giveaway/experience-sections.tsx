import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight,CalendarDays,Check,Gift,Heart,MessageCircle,Radio,ShieldCheck,Sparkles,Truck,CreditCard,HeartHandshake } from 'lucide-react';
import type { PublicGiveaway } from '@/lib/giveaway/live';
import type { ExperienceState } from '@/lib/giveaway/experience';
import { eventDate,eventTime } from '@/lib/giveaway/schedule';
import { ShareButton } from './share-button';
import styles from './experience.module.css';
import { Instagram } from './instagram-icon';

export const INSTAGRAM='https://www.instagram.com/_myaimportaciones/';
export function postLink(permalink:string){const url=new URL(permalink);url.searchParams.set('img_index','1');return url.toString();}
export function GiveawayHero({state,view}:{state:PublicGiveaway;view:ExperienceState}){
  const drawing=['preparing','countdown','drawing','revealing'].includes(view),finished=['verifying','completed','disqualified'].includes(view);
  return <header className={styles.hero}>
    <div className={styles.heroArtwork}><Image src="/sorteo/campana-mama.webp" alt="Los cinco productos del Travel Kit SKIN1004 Madagascar Centella, el premio de MYA para mamá" fill sizes="(max-width: 720px) 100vw, 65vw" preload quality={90}/></div>
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}><Sparkles size={12}/> MYA IMPORTACIONES · {drawing?'SORTEO EN VIVO':finished?'NUESTRA COMUNIDAD':'UN REGALO PARA MAMÁ'}</p>
      <div key={drawing?'drawing':finished?'result':view==='ready'?'ready':'preview'} className={styles.heroWords}>
        <h1>{drawing?<>¡Llegó el momento!<em>Estamos sorteando en vivo.</em></>:finished?<>Un regalo especial.<em>Una comunidad que cuida.</em></>:view==='ready'?<>¡Llegó el momento!<em>Estamos por comenzar.</em></>:<>Un regalo especial.<em>Un momento para mamá.</em></>}</h1>
        <p>{drawing?'Gracias por ser parte de esta comunidad. Llegó el momento de conocer quién se lleva el Travel Kit SKIN1004 Centella.':finished?'Gracias a todas por participar y formar parte de este momento. El resultado y su revisión se comparten acá.':view==='ready'?'Ya llegó la hora prevista. El escenario está listo: esperamos el inicio de MYA.':'Celebremos juntas. Un kit de cuidado, nuestra comunidad y la emoción de compartir el resultado en vivo.'}</p>
      </div>
      <div className={styles.eventMeta}><div><CalendarDays size={23}/><p><strong>{eventDate(state.config.scheduledFor)}</strong><span>{eventTime(state.config.scheduledFor)}</span></p></div><div><Instagram size={23}/><p><strong>Participá en Instagram</strong><a href={INSTAGRAM} target="_blank" rel="noreferrer">@_myaimportaciones</a></p></div></div>
      <div className={styles.heroActions}>{drawing||finished||view==='ready'?<a className={styles.primaryButton} href="#sorteo-en-vivo">{drawing&&<Radio size={18}/>} {finished?'Ver el resultado':'Seguir el sorteo'}<ArrowRight size={18}/></a>:<a className={styles.primaryButton} href={postLink(state.config.permalink)} target="_blank" rel="noreferrer">Participar del sorteo<ArrowRight size={18}/></a>}<ShareButton/></div>
      <ul className={styles.heroBenefits}><li><Gift/><span>Un kit de skincare<br/>coreano para mamá</span></li><li><Heart/><span>Una comunidad<br/>que cuida</span></li><li><Sparkles/><span>Un momento especial<br/>para compartir</span></li></ul>
    </div>
  </header>;
}

export function PrizeCard({state,drawing}:{state:PublicGiveaway;drawing:boolean}){
  return <aside className={styles.prizeColumn} aria-label="El premio del sorteo"><div className={styles.prizeCard}>
    <p className={styles.goldEyebrow}>EL PREMIO</p><h2>{state.config.prize}</h2>
    <div className={styles.prizeImage}><Image src="/sorteo/dia-de-la-madre-instagram.jpg" alt="Foto original del Travel Kit SKIN1004 Centella de cinco productos que se sortea" fill sizes="(max-width: 720px) 90vw, 330px" quality={90}/></div>
    <ul>{['Cinco productos de skincare en formato viaje','Kit de cuidado facial · Madagascar Centella','Un regalo especial por el Día de la Madre'].map(text=><li key={text}><Check size={17}/>{text}</li>)}</ul>
    {!drawing&&<div className={styles.prizeParticipate}><p className={styles.eyebrow}>CÓMO PARTICIPAR</p><div><Instagram size={29}/><p><strong>Participá en Instagram</strong><span>Leé las condiciones y comentá en la publicación original.</span></p></div><a className={styles.secondaryButton} href={postLink(state.config.permalink)} target="_blank" rel="noreferrer">Ver publicación original<ArrowRight size={16}/></a></div>}
  </div>{drawing&&<div className={styles.instagramCard}><span className={styles.liveTag}><Radio size={15}/> SORTEO EN CURSO</span><h3>Compartimos este momento con vos.</h3><p>Seguí la selección en esta página y encontranos en nuestra cuenta oficial.</p><a className={styles.secondaryButton} href={INSTAGRAM} target="_blank" rel="noreferrer"><Instagram size={17}/>Ver Instagram<ArrowRight size={16}/></a></div>}</aside>;
}

const steps=[{icon:Heart,title:'Dale like',text:'Dale me gusta a nuestra publicación original de Instagram.'},{icon:Instagram,title:'Seguinos y compartí',text:'Seguí a @_myaimportaciones y compartí el post en tus historias.'},{icon:MessageCircle,title:'Etiquetá a alguien',text:'Comentá la publicación etiquetando a otra persona.'},{icon:Gift,title:'Seguí el sorteo',text:'Volvé el domingo 18 de octubre a las 12:00 para conocer el resultado.'}];
export function Participation({permalink,active}:{permalink:string;active:boolean}){
  return <section className={styles.participation} aria-labelledby="participation-title"><p className={styles.eyebrow}>{active?'COMPARTIMOS CADA MOMENTO':'ES MUY SIMPLE'}</p><h2 id="participation-title">{active?'Así estamos realizando el sorteo':'Cómo participar'}</h2><p className={styles.sectionLead}>{active?'La cuenta se selecciona en el servidor. MYA registra la revisión manual de las condiciones antes de confirmar el premio.':'Seguí estos pasos y ya estás participando.'}</p><ol className={styles.steps}>{steps.map(({icon:Icon,title,text},i)=><li key={title}><span className={styles.stepNumber}>{String(i+1).padStart(2,'0')}</span><div className={styles.stepIcon}><Icon size={29} strokeWidth={1.4}/></div><h3>{title}</h3><p>{text}</p></li>)}</ol><div className={styles.participationFoot}><p>Participación exclusiva en Instagram. Seguidores, likes e historias se revisan manualmente.</p><a className={styles.textLink} href={postLink(permalink)} target="_blank" rel="noreferrer">Participar en Instagram<ArrowRight size={16}/></a></div></section>;
}

export function StoreCampaign(){
  return <><section className={styles.storeCampaign} aria-label="Productos del sorteo en la tienda"><Image src="/sorteo/cuidado-editorial.webp" alt="Un momento de cuidado facial y bienestar" fill sizes="(max-width: 720px) 100vw, 70vw" quality={75}/><div className={styles.storeCopy}><p className={styles.eyebrow}>DESCUBRÍ MÁS EN MYA</p><h2>Un momento de cuidado,<em>también para vos.</em></h2><p>Conocé nuestra selección de cosmética coreana y productos de skincare. Encontrá tu próxima rutina de cuidado con MYA Importaciones.</p><div className={styles.heroActions}><Link className={styles.primaryButton} href="/catalogo?q=SKIN1004">Descubrir SKIN1004<ArrowRight size={17}/></Link><Link className={styles.secondaryButton} href="/catalogo?category=cosmetica-coreana">Ver cosmética coreana</Link></div><span className={styles.personalAdvice}><HeartHandshake size={20}/>Asesoramiento personal con Agustina · Desde Tandil</span></div></section><div className={styles.trustStrip}>{[{icon:Truck,title:'Envíos a todo el país',text:'Desde Tandil, para vos'},{icon:CreditCard,title:'Medios de pago',text:'Opciones para tu compra'},{icon:ShieldCheck,title:'Compra protegida',text:'Tu seguridad es prioridad'},{icon:Heart,title:'Comunidad que inspira',text:'Un momento de cuidado'}].map(({icon:Icon,title,text})=><div key={title}><Icon size={27} strokeWidth={1.35}/><p><strong>{title}</strong><span>{text}</span></p></div>)}</div></>;
}
