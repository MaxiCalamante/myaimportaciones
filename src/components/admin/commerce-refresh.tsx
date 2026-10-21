'use client';
import { useEffect,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
export function CommerceRefresh() {
 const router=useRouter();const [pending,start]=useTransition();
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')router.refresh();};const timer=window.setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[router]);
 return <button type="button" disabled={pending} onClick={()=>start(()=>router.refresh())} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold disabled:opacity-50"><RefreshCw className={`size-4 ${pending?'animate-spin':''}`}/>{pending?'Actualizando…':'Actualizar'}</button>;
}
