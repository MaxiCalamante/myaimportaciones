'use client';
import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ProfileAvatar } from './profile-avatar';
import { DEFAULT_SELECTION, selectionPool, type SelectionSettings } from '@/lib/giveaway/selection';
import type { Audit, Comment } from '@/lib/giveaway/types';
import { canonical } from '@/lib/giveaway/canonical';
import styles from './giveaway.module.css';

export function SelectionPanel({comments,valid,audit,revision,saved,disabled,onSave,onDirty}:{
  comments:Comment[];valid:Comment[];audit?:Audit;revision:number;saved:SelectionSettings;disabled:boolean;
  onSave:(selection:SelectionSettings)=>void;onDirty:(dirty:boolean)=>void;
}) {
  const [settings,setSettings]=useState(saved),[query,setQuery]=useState('');
  const accounts=useMemo(()=>[...new Map(comments.map(c=>[c.username,c])).values()],[comments]);
  const pool=selectionPool(valid,audit?.draws||[],audit?.events||[],settings);
  const available=new Set(pool.map(c=>c.username));
  const selected=accounts.find(c=>c.username===settings.designatedUsername);
  const search=query.trim().toLocaleLowerCase('es-AR');
  const matches=accounts.filter(c=>`${c.username} ${c.displayName||''}`.toLocaleLowerCase('es-AR').includes(search));
  const dirty=canonical(settings)!==canonical(saved);
  function change(next:SelectionSettings){setSettings(next);onDirty(canonical(next)!==canonical(saved));}
  const invalid=Boolean(settings.designatedUsername&&(!available.has(settings.designatedUsername)||!settings.requirementsReviewed));
  return <fieldset className={styles.selectionPanel} disabled={disabled}>
    <legend>Selección privada del ganador</legend>
    <p>Sin una cuenta designada, el servidor elige al azar. La designación y la revisión manual quedan registradas en el acta privada.</p>
    <label className={styles.check}><input type="checkbox" checked={settings.excludePreviousWinners} onChange={e=>change({...settings,excludePreviousWinners:e.target.checked})}/><span>Excluir ganadores anteriores</span></label>
    <p className={styles.hint}>Las cuentas descalificadas siempre quedan fuera. {pool.length} cuentas elegibles para la próxima ejecución.</p>
    <label className={styles.participantSearch}><Search size={17}/><span className="sr-only">Buscar ganador designado</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar nombre o usuario de Instagram"/></label>
    <div className={styles.selectionResults} aria-label="Selector privado de participantes">
      {matches.slice(0,30).map(c=><div key={c.username} className={styles.selectionRow}>
        <ProfileAvatar username={c.username} displayName={c.displayName} src={c.avatar?`/api/admin/sorteo/foto?usuario=${encodeURIComponent(c.username)}&rev=${revision}`:undefined}/>
        <div><strong>@{c.username}</strong>{c.displayName&&<small>{c.displayName}</small>}<small>{available.has(c.username)?'Elegible':settings.excludedUsernames.includes(c.username)?'Exclusión de esta ejecución':'No elegible con las reglas actuales'}</small></div>
        <button className={styles.smallButton} disabled={!available.has(c.username)} aria-pressed={settings.designatedUsername===c.username} onClick={()=>change({...settings,designatedUsername:c.username,requirementsReviewed:false})}>Designar @{c.username}</button>
        <label className={styles.check}><input type="checkbox" aria-label={`Excluir @${c.username} de la próxima ejecución`} checked={settings.excludedUsernames.includes(c.username)} onChange={e=>change({...settings,excludedUsernames:e.target.checked?[...settings.excludedUsernames,c.username].sort():settings.excludedUsernames.filter(u=>u!==c.username)})}/><span>Excluir</span></label>
      </div>)}
      {!matches.length&&<p>No encontramos participantes con ese nombre o usuario.</p>}
    </div>
    {matches.length>30&&<p className={styles.hint}>Mostrando 30 de {matches.length}. Refiná la búsqueda para encontrar cualquier cuenta cargada.</p>}
    {selected?<div className={styles.notice}><p>Ganador designado: <strong>@{selected.username}</strong>{selected.displayName?` · ${selected.displayName}`:''}</p><label className={styles.check}><input type="checkbox" checked={settings.requirementsReviewed} onChange={e=>change({...settings,requirementsReviewed:e.target.checked})}/><span>Revisé manualmente que esta cuenta cumplió las cuatro condiciones del sorteo.</span></label><button className={styles.smallButton} onClick={()=>change({...settings,designatedUsername:null,requirementsReviewed:false})}><X size={14}/>Limpiar selección</button></div>:<p className={styles.hint}>Modo aleatorio · No hay ganador designado.</p>}
    {invalid&&<p role="status" className={styles.hint}>Para guardar, elegí una cuenta elegible y confirmá sus requisitos, o limpiá la selección.</p>}
    <button className={styles.outlineButton} disabled={!dirty||invalid} onClick={()=>onSave(settings)}>Guardar selección privada</button>
    {dirty&&<p className={styles.hint}>Guardá la selección antes de iniciar o volver a sortear.</p>}
    {settings.excludedUsernames.length>0&&<button className={styles.smallButton} onClick={()=>change({...settings,excludedUsernames:DEFAULT_SELECTION.excludedUsernames})}>Limpiar exclusiones de esta ejecución</button>}
  </fieldset>;
}
