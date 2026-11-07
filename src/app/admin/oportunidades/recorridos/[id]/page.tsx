import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { getAdminClient } from '@/lib/admin-auth';
import { displayCatalogDate } from '@/components/admin/supplier-opportunity-catalog';

export const metadata = { title:'Cobertura de proveedores | MYA', robots:{ index:false, follow:false } };

export default async function CatalogRunPage({ params }: { params:Promise<{ id:string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { profile } = await getCurrentProfile();
  if (!profile) redirect('/login?next=/admin/oportunidades');
  if (profile.role !== 'admin') redirect('/cuenta');
  const db = await getAdminClient();
  const [run, details] = await Promise.all([
    db.from('supplier_tracker_runs').select('id,state,pages,started_at,finished_at,error').eq('id',id).maybeSingle(),
    db.rpc('tracker_catalog_run_categories_v1',{ run_input:id }),
  ]);
  if (!run.data) notFound();
  const categories = (details.data ?? []) as { id:string; label:string; pages:number; expected:number|null; items:number; excluded:number; errors:number; pending:number; previous_items:number|null; last_error:string|null }[];
  return <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
    <Link href="/admin/oportunidades" className="text-sm font-semibold text-sky-800">← Volver a oportunidades</Link>
    <h1 className="text-xl font-bold">Cobertura por categoría</h1>
    <p className="text-sm">Iniciado {displayCatalogDate(run.data.started_at)} · {run.data.pages} páginas procesadas</p>
    {run.data.error && <p className="text-sm text-red-800">{run.data.error}</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      {categories.map(c => <article key={c.id} className="min-w-0 rounded-xl border p-4 text-sm">
        <h2 className="break-words font-semibold">{c.label}</h2>
        <p>{c.pages} páginas · {c.items} elegibles · {c.excluded} excluidas</p>
        <p>{c.pending} páginas pendientes · {c.errors} incidencias</p>
        {c.expected != null && <p>Total informado por la fuente {c.expected}</p>}
        {c.previous_items != null && <p>Referencias en recorrido previo {c.previous_items}</p>}
        {c.last_error && <p className="mt-1 break-words text-red-800">{c.last_error}</p>}
        <Link href={'/admin/oportunidades?sourceId='+c.id} className="mt-2 inline-block text-sky-800 underline">Abrir categoría</Link>
      </article>)}
    </div>
    {!categories.length && <p className="text-sm">Todavía no hay categorías procesadas en este recorrido.</p>}
  </main>;
}
