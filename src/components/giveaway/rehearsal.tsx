'use client';
import { memo, useEffect, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Stage } from './stage';
import type { Comment } from '@/lib/giveaway/types';
import type { Phase } from '@/lib/giveaway/visual';
import styles from './giveaway.module.css';
const pool:Comment[]=['lucia','rocio','candela','julieta','pilar','alma','maia','flor'].map((name,i)=>({id:`demo:${i}`,username:`demo.${name}`,displayName:`${name[0].toUpperCase()+name.slice(1)} · ejemplo`,text:'Un regalo para compartir con @demo.amiga',timestamp:null}));
export const Rehearsal=memo(function Rehearsal({title,prize,reduceMotion}:{title:string;prize:string;reduceMotion:boolean}){
  const [phase,setPhase]=useState<Phase>('idle'),[running,setRunning]=useState(false),[elapsed,setElapsed]=useState(0),[portrait,setPortrait]=useState(false);
  useEffect(()=>{if(!running)return;const start=performance.now();const timer=setInterval(()=>{const t=performance.now()-start;setElapsed(t);setPhase(t<5000?'countdown':t<15500?'spinning':'winner');if(t>=15500)setRunning(false);},100);return()=>clearInterval(timer);},[running]);
  function choose(next:Phase){setRunning(false);setPhase(next);setElapsed(next==='spinning'?8000:0);}
  return <div className={styles.rehearsal}>
    <div className={styles.demoNotice}><span>ENSAYO PRIVADO</span><p>Cuentas de ejemplo. Esta vista no guarda participantes ni elige un ganador real.</p></div>
    <div className={styles.scenario}><Stage pool={pool} audit={null} phase={phase} countdown={running?Math.max(1,Math.ceil((5000-elapsed)/1000)):5} progress={running?Math.max(0,Math.min(1,(elapsed-5000)/10500)):.62} portrait={portrait} reduceMotion={reduceMotion} title={title} prize={prize} source="demo" winner={phase==='winner'?pool[4]:undefined} onRecorded={()=>{}} onRecordingError={()=>{}}/></div>
    <div className={styles.previewPhases} aria-label="Estados del ensayo">{([{phase:'idle',label:'La previa'},{phase:'countdown',label:'Contador'},{phase:'spinning',label:'Ruleta'},{phase:'winner',label:'Ganador'}] as const).map(item=><button key={item.phase} aria-pressed={phase===item.phase} onClick={()=>choose(item.phase)}>{item.label}</button>)}</div>
    <div className={styles.previewActions}><button className={styles.roseButton} disabled={running} onClick={()=>{setElapsed(0);setPhase('countdown');setRunning(true);}}><Play size={15}/>{running?'Ensayo en curso':'Ensayar animación completa'}</button><button className={styles.smallButton} onClick={()=>setPortrait(v=>!v)}><RotateCcw size={15}/>{portrait?'Ver horizontal':'Ver vertical'}</button></div>
    <p className={styles.hint}>Solo vos ves este ensayo. La página pública conserva el estado real del sorteo.</p>
  </div>;
});
