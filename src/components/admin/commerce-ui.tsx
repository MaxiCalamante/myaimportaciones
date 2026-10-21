import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatOrderStatus } from '@/lib/format';
export const adminInput='mt-1 min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3 text-base sm:text-sm';
export const adminCard='min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-6';
export function AdminMetric({label,value}:{label:string;value:ReactNode}) {return <div className={adminCard}><p className="text-xs font-semibold text-zinc-500">{label}</p><p className="mt-2 break-words text-2xl font-bold tracking-tight text-zinc-950">{value}</p></div>;}
export function SaleBadge({status,review}:{status:string;review?:boolean}) {return <span className={`inline-flex max-w-full rounded-full px-3 py-1 text-xs font-semibold ${review?'bg-amber-100 text-amber-900':status==='pending'?'bg-amber-50 text-amber-800':status==='cancelled'?'bg-zinc-100 text-zinc-600':'bg-emerald-50 text-emerald-800'}`}>{review?'Pago a revisar':formatOrderStatus(status)}</span>;}
export function AdminField({label,children}:{label:string;children:ReactNode}) {return <div className="min-w-0"><dt className="text-xs font-semibold text-zinc-500">{label}</dt><dd className="mt-1 whitespace-pre-line break-words text-sm text-zinc-900 [overflow-wrap:anywhere]">{children||'Sin informar'}</dd></div>;}
export function AdminPagination({page,total,path,query}:{page:number;total:number;path:string;query:Record<string,string|undefined>}) {
 const pages=Math.max(1,Math.ceil(total/20));const href=(n:number)=>{const p=new URLSearchParams();Object.entries(query).forEach(([k,v])=>{if(v)p.set(k,v);});p.set('pagina',String(n));return `${path}?${p}`;};
 return <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-zinc-500">{total} registros · Página {page} de {pages}</span><div className="flex gap-2">{page>1&&<Link className="inline-flex min-h-11 items-center rounded-xl border bg-white px-4 font-semibold" href={href(page-1)}>Anterior</Link>}{page<pages&&<Link className="inline-flex min-h-11 items-center rounded-xl border bg-white px-4 font-semibold" href={href(page+1)}>Siguiente</Link>}</div></nav>;
}
