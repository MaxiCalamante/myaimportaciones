'use client';
import { useState } from 'react';
import { Check,Link2 } from 'lucide-react';
import styles from './experience.module.css';

export function ShareButton({result=false}:{result?:boolean}){
  const [copied,setCopied]=useState(false),[manual,setManual]=useState('');
  async function share(){
    const url=`${location.origin}/sorteo${result?'#resultado':''}`,title=result?'El resultado del sorteo de MYA':'Un regalo especial para mamá · MYA';
    if(navigator.share){try{await navigator.share({title,url});return;}catch(e){if(e instanceof Error&&e.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(url);setCopied(true);setManual('');}catch{setManual(url);}
  }
  return <div className={styles.shareWrap}><button className={styles.secondaryButton} onClick={()=>void share()}>{copied?<Check size={16}/>:<Link2 size={16}/>}<span>{copied?'Enlace copiado':result?'Compartir resultado':'Compartir sorteo'}</span></button>{copied&&<span className="sr-only" role="status">Enlace copiado al portapapeles.</span>}{manual&&<label className={styles.copyFallback}>Copiá este enlace<input aria-label="Enlace para compartir" readOnly value={manual} onFocus={e=>e.target.select()}/></label>}</div>;
}
