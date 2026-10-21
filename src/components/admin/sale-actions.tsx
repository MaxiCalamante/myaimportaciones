'use client';
import { useState,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderStatusAction } from '@/app/admin/actions';
import { allowedOrderStatuses,type SaleStatus } from '@/lib/admin-commerce-types';
import { formatOrderStatus } from '@/lib/format';
import { adminInput } from './commerce-ui';
export function SaleActions({id,status,method,tracking}:{id:string;status:SaleStatus;method:string;tracking:string}) {
 const router=useRouter();const [next,setNext]=useState(status),[guide,setGuide]=useState(tracking),[verified,setVerified]=useState(false),[message,setMessage]=useState(''),[pending,start]=useTransition();
 const options=allowedOrderStatuses(status,method);
 const save=(kind:'status'|'guide')=>start(async()=>{setMessage('');try {await updateOrderStatusAction(id,kind==='status'?next:status,kind==='guide'?guide:undefined);setMessage('Cambio guardado. Los avisos correspondientes se procesan automáticamente.');setVerified(false);router.refresh();}catch{setMessage('No se pudo guardar. Actualizá el pedido y revisá el estado y los datos antes de reintentar.');}});
 return <div className="space-y-5">
  <form onSubmit={e=>{e.preventDefault();save('status');}} className="space-y-3"><label className="block text-xs font-semibold text-zinc-600">Estado del pedido<select className={adminInput} value={next} onChange={e=>{setNext(e.target.value as SaleStatus);setVerified(false);}}>{options.map(s=><option value={s} key={s}>{formatOrderStatus(s)}</option>)}</select></label>
   {next==='paid'&&status==='pending'&&<label className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)} className="mt-1 size-5 shrink-0"/>Verifiqué que los fondos estén acreditados. Un comprobante por sí solo no confirma el pago.</label>}
   {method==='mercado_pago'&&status==='pending'&&<p className="text-xs text-zinc-500">Mercado Pago confirma la acreditación automáticamente mediante su integración.</p>}
   <button disabled={pending||next===status||(next==='paid'&&!verified)} className="min-h-11 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white disabled:opacity-40">{pending?'Guardando…':'Guardar estado'}</button>
  </form>
  {['preparing','shipped','delivered'].includes(status)&&<form onSubmit={e=>{e.preventDefault();save('guide');}} className="space-y-3 border-t border-zinc-200 pt-5"><label className="block text-xs font-semibold text-zinc-600">Guía del transportista<input value={guide} onChange={e=>setGuide(e.target.value)} maxLength={100} className={adminInput}/></label><button disabled={pending||guide===tracking} className="min-h-11 rounded-xl border border-zinc-300 px-5 text-sm font-semibold disabled:opacity-40">Guardar guía</button></form>}
  {message&&<p role="status" className="rounded-xl bg-sky-50 p-3 text-sm text-sky-950">{message}</p>}
 </div>;
}
