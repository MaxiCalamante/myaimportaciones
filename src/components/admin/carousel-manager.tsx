"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Camera, ImagePlus, Plus, Trash2 } from "lucide-react";
import { StoreHero } from "@/components/commerce/storefront-sections";
import { MAX_CAROUSEL_SLIDES, moveCarouselSlide, type CarouselSlide } from "@/lib/carousel";
import { optimizeProductPhoto } from "@/lib/image-upload";
import { saveCarouselAction, uploadCarouselImageAction } from "@/app/admin/carrusel/actions";

export function CarouselManager({ initialSlides, initialRevision, ready }: { initialSlides: CarouselSlide[]; initialRevision: number; ready: boolean }) {
  const [slides, setSlides] = useState(initialSlides);
  const [revision, setRevision] = useState(initialRevision);
  const [selectedId, setSelectedId] = useState(initialSlides[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const selected = slides.find(s => s.id === selectedId);
  const busy = pending || uploading;
  const field = "mt-1 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base";
  function update(patch: Partial<CarouselSlide>) {
    setSlides(current => current.map(s => s.id === selectedId ? { ...s, ...patch } : s));
    setDirty(true); setFeedback(null);
  }
  function add() {
    const slide: CarouselSlide = { id: crypto.randomUUID(), image: "", eyebrow: "", title: "Nueva diapositiva", description: "", btnText: "", btnLink: "", active: false };
    setSlides(current => [...current, slide]); setSelectedId(slide.id); setDirty(true); setFeedback(null);
  }
  function remove(slide: CarouselSlide) {
    if (!window.confirm(`¿Quitar «${slide.title || "Diapositiva"}» del carrusel? Se aplicará al guardar.`)) return;
    const next = slides.filter(s => s.id !== slide.id);
    setSlides(next); if (selectedId === slide.id) setSelectedId(next[0]?.id ?? ""); setDirty(true); setFeedback(null);
  }
  async function photo(file?: File) {
    if (!file || !selected || !ready || busy) return;
    const id = selected.id;
    setUploading(true); setFeedback(null);
    try {
      const optimized = await optimizeProductPhoto(file);
      const form = new FormData(); form.set("image", optimized);
      const image = await uploadCarouselImageAction(form);
      setSlides(current => current.map(s => s.id === id ? { ...s, image } : s));
      setDirty(true);
      setFeedback({ error: false, text: "Imagen preparada. Guardá el carrusel para mostrarla en el inicio." });
    } catch (error) { setFeedback({ error: true, text: error instanceof Error ? error.message : "No se pudo subir la imagen." }); }
    finally { setUploading(false); }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!ready || busy) return;
    const form = new FormData(); form.set("slides", JSON.stringify(slides)); form.set("revision", String(revision));
    setFeedback(null);
    startTransition(async () => {
      try { const result = await saveCarouselAction(form); setRevision(result.revision); setDirty(false); setFeedback({ error: false, text: "Carrusel guardado. El inicio mostrará las diapositivas activas en este orden." }); }
      catch (error) { setFeedback({ error: true, text: error instanceof Error ? error.message : "No se pudo guardar el carrusel." }); }
    });
  }
  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Página de inicio</p><h1 className="mt-1 text-3xl font-bold">Carrusel de imágenes</h1><p className="mt-2 text-sm leading-6 text-zinc-600">Editá fotos, textos y botones. Ordená con las flechas, pausá lo que no quieras mostrar y guardá todos los cambios juntos.</p></header>
    {!ready && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Falta aplicar la migración del carrusel. Podés editar y previsualizar aquí, pero subir imágenes y guardar estará disponible cuando se active en la base.</p>}
    <form onSubmit={save} className="space-y-6">
      <div className="grid items-start gap-5 lg:grid-cols-[20rem_1fr]">
        <section className="space-y-3 rounded-2xl border bg-white p-4"><h2 className="font-bold">Diapositivas ({slides.length}/{MAX_CAROUSEL_SLIDES})</h2>
          {slides.map((slide, index) => <div key={slide.id} className={`rounded-xl border p-3 ${selectedId === slide.id ? "border-sky-400 bg-sky-50" : "border-zinc-200"}`}><button type="button" disabled={busy} aria-pressed={selectedId === slide.id} onClick={() => setSelectedId(slide.id)} className="min-h-11 w-full break-words text-left text-sm font-semibold">{index + 1}. {slide.title || "Sin título"}<span className="ml-2 text-xs font-normal text-zinc-600">{slide.active ? "Activa" : "Pausada"}</span></button><div className="flex gap-2">
            <button type="button" disabled={busy || index === 0} aria-label={`Subir diapositiva ${index + 1}`} onClick={() => { setSlides(moveCarouselSlide(slides, slide.id, -1)); setDirty(true); }} className="grid size-11 place-items-center rounded-xl border bg-white disabled:opacity-30"><ArrowUp className="size-4" /></button>
            <button type="button" disabled={busy || index === slides.length - 1} aria-label={`Bajar diapositiva ${index + 1}`} onClick={() => { setSlides(moveCarouselSlide(slides, slide.id, 1)); setDirty(true); }} className="grid size-11 place-items-center rounded-xl border bg-white disabled:opacity-30"><ArrowDown className="size-4" /></button>
            <button type="button" disabled={busy} aria-label={`Eliminar diapositiva ${index + 1}`} onClick={() => remove(slide)} className="ml-auto grid size-11 place-items-center rounded-xl border border-red-200 bg-white text-red-700"><Trash2 className="size-4" /></button>
          </div></div>)}
          {!slides.length && <p className="text-sm text-zinc-600">El carrusel se ocultará si guardás sin diapositivas activas.</p>}
          <button type="button" disabled={busy || slides.length >= MAX_CAROUSEL_SLIDES} onClick={add} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-900 disabled:opacity-40"><Plus className="size-4" />Agregar diapositiva</button>
        </section>
        {selected && <fieldset disabled={busy} className="space-y-4 rounded-2xl border bg-white p-4 sm:p-6"><legend className="px-2 text-base font-bold">Editar diapositiva</legend>
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={selected.active} onChange={e => update({ active: e.target.checked })} className="size-5" />Mostrar en el inicio</label>
          <label className="block text-sm font-semibold">Encabezado breve<input maxLength={100} value={selected.eyebrow} onChange={e => update({ eyebrow: e.target.value })} className={field} /></label>
          <label className="block text-sm font-semibold">Título<input maxLength={160} value={selected.title} onChange={e => update({ title: e.target.value })} className={field} /></label>
          <label className="block text-sm font-semibold">Descripción<textarea rows={3} maxLength={600} value={selected.description} onChange={e => update({ description: e.target.value })} className={field} /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Texto del botón<input maxLength={60} value={selected.btnText} onChange={e => update({ btnText: e.target.value })} className={field} /></label><label className="block text-sm font-semibold">Enlace del botón<input maxLength={2000} value={selected.btnLink} onChange={e => update({ btnLink: e.target.value })} placeholder="/catalogo o https://..." className={field} /></label></div>
          <p className="text-xs text-zinc-600">Para ocultar el botón dejá sus dos campos vacíos. Confirmá los textos comerciales antes de activar.</p>
          <label className="block text-sm font-semibold">Imagen por URL<input maxLength={2000} value={selected.image} onChange={e => update({ image: e.target.value })} placeholder="https://.../foto.jpg" className={field} /></label>
          <div className="flex flex-wrap gap-3"><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-semibold"><ImagePlus className="size-5" />Subir / reemplazar imagen<input type="file" aria-label="Subir imagen de carrusel" accept="image/jpeg,image/png,image/webp" disabled={busy || !ready} className="sr-only" onChange={e => { void photo(e.target.files?.[0]); e.target.value = ""; }} /></label><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-semibold"><Camera className="size-5" />Cámara<input type="file" aria-label="Foto de carrusel con cámara" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy || !ready} className="sr-only" onChange={e => { void photo(e.target.files?.[0]); e.target.value = ""; }} /></label></div>
          <p className="text-xs leading-5 text-zinc-600">Recomendamos una foto horizontal con espacio para el texto. Se optimiza antes de subir. JPG, PNG o WebP; para HEIC exportá JPG. Al quitar una diapositiva conservamos el archivo para no borrar imágenes reutilizadas.</p>
        </fieldset>}
      </div>
      {selected && <section className="min-w-0 space-y-3"><h2 className="text-lg font-bold">Vista previa de la diapositiva seleccionada</h2><p className="text-xs text-zinc-600">Incluye cambios sin guardar. El recorte se adapta al ancho de tu pantalla.</p><div className="overflow-hidden rounded-2xl border"><StoreHero key={selected.id} slides={[selected]} preview /></div></section>}
      <div className="sticky bottom-16 z-30 rounded-2xl border bg-white p-4 shadow-md md:bottom-4">{feedback && <p role={feedback.error ? "alert" : "status"} className={`mb-3 rounded-xl p-3 text-sm ${feedback.error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{feedback.text}</p>}<div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm text-zinc-600">{uploading ? "Preparando imagen…" : dirty ? "Hay cambios sin guardar" : "Sin cambios pendientes"}</p><button type="submit" disabled={busy || !ready || !dirty} className="min-h-11 rounded-xl bg-sky-700 px-5 text-sm font-bold text-white disabled:opacity-40">{pending ? "Guardando…" : "Guardar carrusel"}</button></div></div>
    </form>
  </div>;
}
