"use client";
import Image from "next/image";
import { useRef, useState } from "react";

export function ProductGallery({ title, image, images = [] }: { title: string; image: string; images?: string[] }) {
  const choices = [...new Set([image, ...images].filter(Boolean))];
  const [selected, setSelected] = useState(choices[0] || "/placeholder-product.svg");
  const [failed, setFailed] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const src = failed.includes(selected) ? "/placeholder-product.svg" : selected;
  return <div className="space-y-3">
    <button type="button" onClick={() => dialog.current?.showModal()} aria-label={`Ampliar foto de ${title}`} className="relative block aspect-square w-full rounded-3xl border border-zinc-200 bg-white p-6 focus-visible:outline-2 focus-visible:outline-sky-600">
      <Image src={src} alt={title} fill preload sizes="(min-width: 1024px) 560px, 100vw" quality={90} className="object-contain p-6" onError={() => setFailed(a => [...a, selected])} />
      <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 text-xs text-zinc-600">Ampliar foto</span>
    </button>
    {choices.length > 1 && <div className="flex gap-2 overflow-x-auto" aria-label="Fotos del producto">{choices.map((url, i) => <button key={url} type="button" aria-label={`Ver foto ${i + 1}`} aria-pressed={selected === url} onClick={() => setSelected(url)} className={`relative h-20 w-20 shrink-0 rounded-xl border bg-white ${selected === url ? "border-sky-600 ring-1 ring-sky-600" : "border-zinc-200"}`}><Image src={failed.includes(url) ? "/placeholder-product.svg" : url} alt={`${title}, foto ${i + 1}`} fill sizes="80px" className="object-contain p-1" onError={() => setFailed(a => [...a, url])} /></button>)}</div>}
    <dialog ref={dialog} aria-label={`Foto ampliada de ${title}`} className="fixed inset-0 m-auto h-[90dvh] w-[95vw] max-w-5xl rounded-2xl bg-white p-4 backdrop:bg-black/70" onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <button type="button" autoFocus onClick={() => dialog.current?.close()} className="absolute right-3 top-3 z-10 rounded-full border bg-white px-4 py-2">Cerrar</button>
      <div className="relative h-full w-full"><Image src={src} alt={title} fill sizes="(min-width: 1024px) 1000px, 95vw" quality={90} className="object-contain p-8" /></div>
    </dialog>
  </div>;
}
