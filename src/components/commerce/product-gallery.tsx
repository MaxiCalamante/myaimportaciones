"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ZoomIn, X } from "lucide-react";

export function ProductGallery({ title, image, images = [] }: { title: string; image: string; images?: string[] }) {
  const choices = [...new Set([image, ...images].filter(Boolean))];
  const [userSelected, setUserSelected] = useState<string | null>(null);
  const [prevImage, setPrevImage] = useState(image);

  if (prevImage !== image) {
    setPrevImage(image);
    setUserSelected(null);
  }

  const selected = userSelected ?? image ?? choices[0] ?? "/placeholder-product.svg";
  const [failed, setFailed] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const [enlarged, setEnlarged] = useState(false);

  useEffect(() => {
    if (!enlarged) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [enlarged]);

  const src = failed.includes(selected) ? "/placeholder-product.svg" : selected;

  return (
    <div className="space-y-3">
      {/* Main Image Stage */}
      <button
        type="button"
        onClick={() => { dialog.current?.showModal(); setEnlarged(true); }}
        aria-label={`Ampliar foto de ${title}`}
        className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-sky-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-sky-600"
      >
        <Image
          src={src}
          alt={title}
          fill
          preload
          sizes="(min-width: 1024px) 560px, 100vw"
          quality={90}
          className="object-contain p-6 transition-transform duration-300 ease-out group-hover:scale-105"
          onError={() => setFailed((a) => [...a, selected])}
        />
        <span className="absolute bottom-3.5 right-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs border border-zinc-200/80 transition-all duration-150 group-hover:bg-white group-hover:text-zinc-950 group-hover:shadow-sm">
          <ZoomIn className="size-3.5 text-zinc-500 group-hover:text-sky-700" />
          <span>Ampliar foto</span>
        </span>
      </button>

      {/* Thumbnails Navigation */}
      {choices.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto p-1 scrollbar-none" aria-label="Fotos del producto">
          {choices.map((url, i) => {
            const isCurrent = selected === url;
            return (
              <button
                key={url}
                type="button"
                aria-label={`Ver foto ${i + 1}`}
                aria-pressed={isCurrent}
                onClick={() => setUserSelected(url)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-white p-1 transition-all duration-150 cursor-pointer ${
                  isCurrent
                    ? "border-sky-700 ring-2 ring-sky-600/30 shadow-xs"
                    : "border-zinc-200 hover:border-zinc-300 hover:shadow-2xs opacity-80 hover:opacity-100"
                }`}
              >
                <Image
                  src={failed.includes(url) ? "/placeholder-product.svg" : url}
                  alt={`${title}, foto ${i + 1}`}
                  fill
                  sizes="80px"
                  className="object-contain p-1"
                  onError={() => setFailed((a) => [...a, url])}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Enlarged Dialog */}
      <dialog
        ref={dialog}
        onClose={() => setEnlarged(false)}
        aria-label={`Foto ampliada de ${title}`}
        className="fixed inset-0 m-auto h-[90dvh] w-[95vw] max-w-5xl rounded-3xl bg-white p-4 shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-xs"
        onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}
      >
        <button
          type="button"
          autoFocus
          onClick={() => dialog.current?.close()}
          className="absolute right-4 top-4 z-10 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-4 py-2 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-100 transition cursor-pointer"
        >
          <X className="size-4" />
          <span>Cerrar</span>
        </button>
        {enlarged && (
          <div className="relative h-full w-full">
            <Image
              src={src}
              alt={title}
              fill
              sizes="(min-width: 1024px) 1000px, 95vw"
              quality={95}
              className="object-contain p-6 sm:p-10"
            />
          </div>
        )}
      </dialog>
    </div>
  );
}
