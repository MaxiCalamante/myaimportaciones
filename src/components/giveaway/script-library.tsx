'use client';
import { memo, useRef, useState } from 'react';
import { Check, ChevronDown, Code2, Copy, Download, ExternalLink, Terminal } from 'lucide-react';
import { download } from '@/lib/giveaway/exports';
import styles from './giveaway.module.css';

export const ScriptLibrary=memo(function ScriptLibrary({script,permalink}:{script:string;permalink:string}) {
  const [open,setOpen]=useState(false),[copied,setCopied]=useState(false),[message,setMessage]=useState('');
  const code=useRef<HTMLTextAreaElement>(null);
  async function copy(){
    try{await navigator.clipboard.writeText(script);setCopied(true);setMessage('Script copiado. Ya podés pegarlo en la consola de Chrome.');}
    catch{setOpen(true);setMessage('El navegador no permitió copiar. Seleccioná el código y usá Ctrl+C.');requestAnimationFrame(()=>{code.current?.focus();code.current?.select();});}
  }
  return <section className={styles.scriptLibrary} aria-labelledby="script-library-title">
    <div className={styles.scriptLibraryHeader}>
      <span className={styles.scriptIcon}><Terminal size={23} strokeWidth={1.5}/></span>
      <div><p className={styles.eyebrow}>TU HERRAMIENTA, SIEMPRE A MANO</p><h2 id="script-library-title">Script de comentarios de Instagram</h2><p>Copialo desde acá cada vez que prepares un sorteo.</p></div>
      <button className={styles.roseButton} onClick={()=>void copy()}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?'Copiar de nuevo':'Copiar script para Chrome'}</button>
    </div>
    <ol className={styles.scriptSteps}><li><span>01</span><p>Iniciá sesión en Instagram, abrí el post en Chrome y su consola con <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>J</kbd>.</p></li><li><span>02</span><p>Pegá el script, cargá los comentarios y copiá el JSON desde el panel de MYA. Incluye las fotos de perfil disponibles.</p></li><li><span>03</span><p>Volvé acá, pegá el JSON y revisá tu lista antes de guardarla.</p></li></ol>
    <div className={styles.scriptActions}><button className={styles.smallButton} aria-expanded={open} aria-controls="instagram-script-code" onClick={()=>setOpen(v=>!v)}><Code2 size={16}/>{open?'Ocultar código':'Ver el script completo'}<ChevronDown size={14} className={open?styles.chevronOpen:undefined}/></button><button className={styles.smallButton} onClick={()=>download(new Blob([script],{type:'text/javascript'}),'mya-exportar-instagram.js')}><Download size={15}/>Descargar .js</button><a className={styles.smallButton} href={permalink} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Abrir publicación</a></div>
    <div hidden={!open} id="instagram-script-code" className={styles.codePanel}><div><label htmlFor="instagram-script-text">Código completo · listo para copiar</label><button onClick={()=>{code.current?.focus();code.current?.select();}}>Seleccionar todo</button></div><textarea id="instagram-script-text" ref={code} value={script} readOnly spellCheck={false} rows={9}/><p>La captura reúne lo que Instagram carga en la página. Revisá comentarios y respuestas antes de cerrar la lista.</p></div>
    {message&&<p className={styles.scriptFeedback} role="status"><Check size={15}/>{message}</p>}
  </section>;
});
