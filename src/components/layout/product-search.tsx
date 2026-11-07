"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {ProductPrice} from '@/components/commerce/currency-provider';
import type { Product } from "@/lib/types";

const popular = ["Medicube", "SKIN1004", "Lattafa", "Kérastase", "iPhone", "Total", "Wadfow"];

export function ProductSearch({ mobile = false, catalogPath, onNavigate }: {
  mobile?: boolean;
  catalogPath: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [retry, setRetry] = useState(0);
  const [response, setResponse] = useState<{ query: string; results: Product[]; error: boolean } | null>(null);
  const q = query.trim();
  const pending = q.length >= 2 && response?.query !== q;
  const showPanel = mobile || focused;
  const href = `${catalogPath}?q=${encodeURIComponent(q)}`;

  useEffect(() => {
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!result.ok) throw new Error("Search unavailable");
        const json = await result.json();
        if (!controller.signal.aborted) setResponse({ query: q, results: json.results ?? [], error: false });
      } catch {
        if (!controller.signal.aborted) setResponse({ query: q, results: [], error: true });
      }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q, retry]);

  const navigate = () => { setFocused(false); onNavigate?.(); };
  const results = response?.query === q ? response.results : [];
  const error = response?.query === q && response.error;
  const panelClass = mobile
    ? "mt-3 rounded-2xl border border-zinc-200 bg-white"
    : "absolute right-0 top-full z-50 mt-2 w-[min(30rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl";

  return (
    <div className="relative" onFocus={() => setFocused(true)} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }} onKeyDown={event => {
      if (event.key === "Escape" && !mobile) { setFocused(false); event.stopPropagation(); }
    }}>
      <form role="search" aria-label={mobile ? "Búsqueda de productos móvil" : "Búsqueda de productos"}
        action={catalogPath} onSubmit={event => {
          event.preventDefault();
          if (!q) return;
          router.push(href);
          navigate();
        }} className="flex h-11 items-center rounded-xl border border-zinc-200 bg-zinc-50 pl-3 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-100">
        <Search aria-hidden="true" className="mr-2 size-4 shrink-0 text-zinc-500" />
        <input ref={inputRef} id={mobile ? "mobile-search-input" : "desktop-search-input"} name="q"
          aria-label="Buscar productos" aria-describedby={showPanel && q.length >= 2 ? `${mobile ? "mobile" : "desktop"}-search-status` : undefined}
          autoComplete="off" enterKeyHint="search" maxLength={100} type="search" value={query}
          onChange={event => { setQuery(event.target.value); setFocused(true); }}
          placeholder="Producto, marca o modelo"
          className="h-full min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-500 md:text-sm [&::-webkit-search-cancel-button]:hidden" />
        {query && <button type="button" aria-label="Borrar búsqueda" onClick={() => { setQuery(""); inputRef.current?.focus(); }}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-zinc-500 hover:bg-zinc-100"><X className="size-4" /></button>}
        <button type="submit" aria-label="Ver resultados de búsqueda" className="m-1 grid size-9 shrink-0 place-items-center rounded-lg bg-sky-700 text-white hover:bg-sky-800 max-md:m-0 max-md:size-11 max-md:rounded-l-none"><ArrowRight className="size-4" /></button>
      </form>
      {showPanel && !q && <div className={mobile ? "mt-3" : panelClass}>
        <div className={mobile ? "" : "p-4"}>
          <p className="mb-2 text-xs font-semibold text-zinc-500">Buscá por nombre, marca o modelo</p>
          <div className="flex flex-wrap gap-2">{popular.map(brand => <Link key={brand}
            href={`${catalogPath}?q=${encodeURIComponent(brand)}`} onClick={navigate}
            className="inline-flex min-h-11 items-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:border-sky-300 hover:bg-sky-50">{brand}</Link>)}</div>
        </div>
      </div>}
      {showPanel && q.length >= 2 && <div className={panelClass}>
        <p id={`${mobile ? "mobile" : "desktop"}-search-status`} role="status" className="px-4 py-3 text-xs font-medium text-zinc-500">
          {pending ? "Buscando productos…" : error ? "No pudimos cargar la búsqueda." : results.length ? "Productos sugeridos" : "No encontramos coincidencias."}
        </p>
        {!pending && error ? <div className="px-4 pb-4"><button type="button" onClick={() => { setResponse(null); setRetry(value => value + 1); }}
          className="min-h-11 rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-sky-800">Reintentar</button></div>
          : !pending && <>
            <div className={`${mobile ? "max-h-[40dvh]" : "max-h-[min(26rem,60dvh)]"} overflow-y-auto overscroll-contain px-2`}>
              {results.map(product => <Link key={product.id} href={`/producto/${product.slug}`} onClick={navigate}
                className="flex min-h-20 items-center gap-3 rounded-xl p-2 text-zinc-900 hover:bg-sky-50 focus-visible:bg-sky-50">
                <Image width={48} height={48} src={product.imageUrl || "/placeholder-product.svg"} alt=""
                  className="size-12 shrink-0 rounded-lg border border-zinc-100 bg-white object-contain p-1" />
                <span className="min-w-0 flex-1"><span className="line-clamp-2 block text-sm font-medium leading-5">{product.title}</span>
                  <span className="mt-1 block text-xs font-semibold tabular-nums">{<ProductPrice product={product} ars={product.retailPrice}/>}</span></span>
                <ArrowRight className="size-4 shrink-0 text-zinc-400" />
              </Link>)}
            </div>
            {!results.length && <p className="px-4 pb-3 text-sm text-zinc-600">Probá con menos palabras o revisá el modelo.</p>}
            <Link href={href} onClick={navigate} className="flex min-h-12 items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 text-sm font-semibold text-sky-800 hover:bg-sky-50">
              Ver todos los resultados <ArrowRight className="size-4 shrink-0" />
            </Link>
          </>}
      </div>}
    </div>
  );
}
