'use client';
import{useState,type ReactNode}from'react';import type{AdminActionResult}from'@/lib/admin-action-result';
export function MoneyActionForm({action,children,className}:{action:(form:FormData)=>Promise<AdminActionResult<void>>;children:ReactNode;className?:string}){
 const[pending,setPending]=useState(false),[message,setMessage]=useState('');
 return <form className={className} action={async form=>{setPending(true);setMessage('');try{const r=await action(form);setMessage(r.success?'Guardado.':r.error);}catch{setMessage('No se pudo guardar. Revisá tu conexión y acceso.');}finally{setPending(false);}}}><fieldset disabled={pending} className="contents">{children}</fieldset><p role="status" aria-live="polite" className="text-sm sm:col-span-3">{pending?'Guardando…':message}</p></form>;
}
