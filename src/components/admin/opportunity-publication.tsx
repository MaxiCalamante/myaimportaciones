'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { previewOpportunity, publishOpportunity } from '@/app/admin/oportunidades/catalog-actions';

export type PublicationInput = {
  title:string; description:string; categoryId:string; evidence:string; conditionEvidence:string; sourceConflictEvidence?:string;
  identityConfirmed:boolean; mediaAuthorized:boolean; complianceConfirmed:boolean; basis:unknown;
};
type Preview = Extract<Awaited<ReturnType<typeof previewOpportunity>>, { success:true }>['data'];
const field = 'min-h-10 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm';
const button = 'min-h-11 rounded-lg bg-sky-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const number = new Intl.NumberFormat('es-AR',{maximumFractionDigits:2});

export function OpportunityPublication({ itemId, initial, categories, listingConflict }: {
  itemId:string; initial:PublicationInput; categories:{id:string;name:string;parent_id:string|null}[]; listingConflict?:string;
}) {
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<Preview|null>(null);
  const [title, setTitle] = useState(initial.title);
  const [message, setMessage] = useState('');
  const [published, setPublished] = useState<{id:string;slug:string;active:boolean;existing:boolean}|null>(null);
  if (published) return <section className="space-y-3 rounded-xl border border-green-300 bg-green-50 p-5" aria-live="polite">
    <h2 className="font-semibold">{published.existing ? 'Ya existe un producto vinculado' : 'Publicación creada y vinculada'}</h2>
    <div className="flex flex-wrap gap-4 text-sm font-semibold text-sky-800">
      <Link href={'/admin?editProduct='+published.id}>Abrir en el editor</Link>
      {published.active && <Link href={'/producto/'+published.slug}>Ver en tienda</Link>}
    </div>
  </section>;
  return <section className="space-y-5 rounded-xl border p-4 sm:p-6">
    <div><h2 className="text-lg font-semibold">Preparar publicación</h2>
      <p className="text-sm text-zinc-600">Revisá la presentación, los permisos y los costos. La vista previa queda guardada en esta oportunidad.</p>
    </div>
    <form className="space-y-4" onChange={() => { setPreview(null); setMessage(''); }} onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      start(async () => {
        setMessage('');
        const result = await previewOpportunity(itemId,form);
        if (result.success) setPreview(result.data); else setMessage(result.error);
      });
    }}>
      <label className="block text-sm font-medium">Título para la tienda<input className={field} name="title" required value={title} onChange={e=>setTitle(e.target.value)} maxLength={200} /></label>
      <label className="block text-sm font-medium">Categoría MYA<select className={field} name="categoryId" required defaultValue={initial.categoryId}>
        <option value="">Elegí categoría</option>
        {categories.map(c => <option key={c.id} value={c.id}>{c.parent_id ? (categories.find(p=>p.id===c.parent_id)?.name ?? 'Subcategoría') + ' › ' : ''}{c.name}</option>)}
      </select></label>
      <label className="block text-sm font-medium">Descripción comprobada en español<textarea className={field} name="description" rows={5} maxLength={15000} defaultValue={initial.description} /></label>
      <label className="block text-sm font-medium">Respaldo de identidad, permiso de imagen y requisitos comerciales
        <textarea className={field} name="evidence" rows={3} maxLength={10000} defaultValue={initial.evidence} />
      </label>
      <label className="block text-sm font-medium">Evidencia de condición, si corresponde<input className={field} name="conditionEvidence" maxLength={1000} defaultValue={initial.conditionEvidence} /></label>
      {listingConflict && <label className="block space-y-1 text-sm font-medium">
        <span>La tarjeta de origen muestra «{listingConflict}».</span>
        <span className="block text-zinc-600">Documentá cuál es la presentación correcta según el proveedor.</span>
        <input className={field} name="sourceConflictEvidence" maxLength={1000} defaultValue={initial.sourceConflictEvidence} />
      </label>}
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        {([
          ['identity','Presentación exacta confirmada',initial.identityConfirmed],
          ['media','Uso de las imágenes autorizado',initial.mediaAuthorized],
          ['compliance','Requisitos comerciales verificados',initial.complianceConfirmed],
        ] as const).map(([name,label,checked]) => <label key={name} className="flex min-h-10 items-start gap-2 rounded-lg bg-zinc-50 p-2">
          <input className="mt-1 size-4 shrink-0" type="checkbox" name={name} defaultChecked={checked} />{label}
        </label>)}
      </div>
      <details className="rounded-lg border p-3" open>
        <summary className="cursor-pointer text-sm font-semibold">Base documentada de costos</summary>
        <p className="my-2 text-xs text-zinc-600">Usá el desglose de Moneda. Registrá la cotización de adquisición, la forma de liquidación, el pasador y los gastos por unidad o su reparto documentado. Los datos de cobro se leen de la política vigente.</p>
        <textarea aria-label="Base de costos en JSON" className={field+' font-mono'} name="basis" rows={10} defaultValue={initial.basis ? JSON.stringify(initial.basis,null,2) : ''} spellCheck={false} />
        <Link href="/admin/moneda" className="text-xs font-semibold text-sky-800 underline">Abrir política de Moneda y rentabilidad</Link>
      </details>
      <button type="submit" className={button} disabled={pending}>{pending ? 'Validando…' : 'Guardar y ver vista previa'}</button>
    </form>
    {message && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{message}</p>}
    {preview && <div aria-live="polite" className="space-y-3 rounded-xl bg-zinc-50 p-4">
      <h3 className="font-semibold">Vista previa · {title}</h3>
      {!!preview.reasons.length && <ul className="list-disc space-y-1 pl-5 text-sm text-amber-950">{preview.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}
      {preview.prices && <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p>Adquisición documentada USD {number.format(preview.prices.acquisitionUsd)}</p>
        <p>Costo directo y gastos imputables USD {number.format(preview.prices.totalCostUsd)}</p>
        <p>Minorista USD {number.format(preview.prices.retailUsd)} · ARS {number.format(preview.prices.retailArs)}</p>
        <p>Mayorista USD {number.format(preview.prices.wholesaleUsd)} · ARS {number.format(preview.prices.wholesaleArs)}</p>
        {Object.entries(preview.prices.results).map(([channel,result]) => <p key={channel}>
          {channel.startsWith('retail:') ? 'Minorista' : 'Mayorista'} · {channel.endsWith('mercado_pago') ? 'Mercado Pago' : 'Transferencia'}<br/>
          Margen {number.format(Number(result.effectiveMargin))}% · Contribución USD {number.format(Number(result.contributionUsd))}
        </p>)}
      </div>}
      {preview.prices && !preview.reasons.length && <button type="button" disabled={pending} className={button} onClick={() => start(async () => {
        setMessage('');
        const result = await publishOpportunity(itemId,preview.revision,title);
        if (result.success) setPublished(result.data); else setMessage(result.error);
      })}>{pending ? 'Comprobando y publicando…' : 'Publicar en MYA'}</button>}
    </div>}
  </section>;
}
