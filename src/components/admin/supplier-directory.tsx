"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Mail, MessageCircle, Pencil, Plus } from "lucide-react";
import { saveSupplierAction } from "@/app/admin/proveedores/actions";
import type { Supplier } from "@/lib/suppliers";

export function SupplierDirectory({ suppliers, ready }: { suppliers: Supplier[]; ready: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const field = "mt-1 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base";
  const filtered = suppliers.filter(s => `${s.name} ${s.contact_name ?? ""} ${s.notes ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFeedback(null);
    startTransition(async () => {
      try { await saveSupplierAction(form); setFeedback({ error: false, text: "Proveedor guardado. Disponible en todos tus dispositivos." }); setEditing(null); formRef.current?.reset(); router.refresh(); }
      catch (error) { setFeedback({ error: true, text: error instanceof Error ? error.message : "No se pudo guardar." }); }
    });
  }
  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8"><header><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Agenda privada</p><h1 className="mt-1 text-3xl font-bold">Proveedores y contactos</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">Guardá los contactos, condiciones y enlaces de tus proveedores. La agenda se comparte entre tus dispositivos. Contactar abre el canal elegido; vos revisás y enviás el mensaje.</p></header>
    {!ready && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">La agenda necesita la migración local de proveedores antes de guardar. Está preparada en el proyecto y pendiente de aplicación autorizada en la base.</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
      <section className="space-y-4"><label className="block text-sm font-semibold">Buscar proveedor<input type="search" value={search} onChange={e => setSearch(e.target.value)} className={field} placeholder="Nombre, contacto o condición" /></label><p className="text-xs text-zinc-600">{filtered.length} de {suppliers.length} proveedores{ suppliers.length === 500 ? " · Mostrando los primeros 500" : ""}</p>
        {filtered.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">{filtered.map(s => <article key={s.id} className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-2"><h2 className="break-words text-lg font-bold">{s.name}</h2><span className={`shrink-0 rounded-full px-2 py-1 text-xs ${s.is_active ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-600"}`}>{s.is_active ? "Activo" : "Archivado"}</span></div>{s.contact_name && <p className="mt-2 text-sm text-zinc-600">Contacto: {s.contact_name}</p>}{s.notes && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700">{s.notes}</p>}
          <div className="mt-4 flex flex-wrap gap-2">{s.phone && <a href={`https://wa.me/${s.phone}`} target="_blank" rel="noopener noreferrer" aria-label={`Contactar a ${s.name} por WhatsApp`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold text-emerald-800"><MessageCircle className="size-4" />WhatsApp</a>}{s.email && <a href={`mailto:${s.email}`} aria-label={`Enviar email a ${s.name}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold"><Mail className="size-4" />Email</a>}{s.website && <a href={s.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold"><ExternalLink className="size-4" />Sitio</a>}<button disabled={pending} onClick={() => { setEditing(s); setFeedback(null); formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-50 px-3 text-sm font-semibold text-sky-900"><Pencil className="size-4" />Editar</button></div>
        </article>)}</div> : <div className="rounded-2xl border bg-white p-8 text-center"><h2 className="font-bold">{search ? "No encontramos ese proveedor" : "Tu agenda está lista para empezar"}</h2><p className="mt-2 text-sm text-zinc-600">{search ? "Probá otro nombre o quitá la búsqueda." : "Agregá los contactos reales con los que vas a operar."}</p></div>}
      </section>
      <form key={editing?.id ?? "new"} ref={formRef} onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-bold"><Plus className="size-5" />{editing ? "Editar proveedor" : "Agregar proveedor"}</h2><fieldset disabled={pending || !ready} className="space-y-4">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <label className="block text-sm font-semibold">Nombre *<input name="name" required minLength={2} maxLength={200} defaultValue={editing?.name} className={field} /></label>
        <label className="block text-sm font-semibold">Persona de contacto<input name="contact_name" maxLength={200} defaultValue={editing?.contact_name ?? ""} className={field} /></label>
        <label className="block text-sm font-semibold">WhatsApp con código de país<input name="phone" type="tel" maxLength={40} defaultValue={editing?.phone ?? ""} placeholder="549…" className={field} /></label>
        <label className="block text-sm font-semibold">Email<input name="email" type="email" maxLength={254} defaultValue={editing?.email ?? ""} className={field} /></label>
        <label className="block text-sm font-semibold">Sitio / catálogo<input name="website" type="url" maxLength={2000} defaultValue={editing?.website ?? ""} placeholder="https://..." className={field} /></label>
        <label className="block text-sm font-semibold">Condiciones y notas privadas<textarea name="notes" maxLength={5000} rows={4} defaultValue={editing?.notes ?? ""} placeholder="Moneda, mínimos, días de despacho, cómo confirmar disponibilidad." className={field} /></label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="is_active" className="size-5" defaultChecked={editing?.is_active ?? true} />Proveedor activo (desmarcar archiva).</label>
        <button type="submit" className="min-h-11 w-full rounded-xl bg-sky-700 px-4 font-bold text-white disabled:opacity-40" disabled={pending || !ready}>{pending ? "Guardando…" : "Guardar proveedor"}</button>
      </fieldset>{editing && <button type="button" disabled={pending} onClick={() => { setEditing(null); setFeedback(null); }} className="min-h-11 w-full rounded-xl border px-4 text-sm font-semibold">Cancelar edición</button>}{feedback && <p role={feedback.error ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${feedback.error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{feedback.text}</p>}</form>
    </div>
  </div>;
}
