"use client";
import Image from 'next/image';
import { useState } from 'react';
import styles from './giveaway.module.css';
type Props={username:string;displayName?:string;src?:string;size?:number;eager?:boolean};
function Avatar({username,displayName,src,size=44,eager=false}:Props){
  const [loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false);
  const initials=(displayName||username).replace(/[._]/g,' ').split(/\s+/).filter(Boolean).slice(0,2).map(p=>[...p][0]).join('').toUpperCase();
  return <span className={styles.profileAvatar} style={{width:size,height:size,fontSize:size*.3}} role="img" aria-label={`Perfil de @${username}`} data-loaded={loaded} data-loading={Boolean(src&&!loaded&&!failed)}>
    <span aria-hidden="true">{initials}</span>{src&&!failed&&<Image src={src} width={size} height={size} alt="" unoptimized loading={eager?'eager':'lazy'} onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)}/>}</span>;
}
export function ProfileAvatar(props:Props){return <Avatar key={props.src||props.username} {...props}/>;}
