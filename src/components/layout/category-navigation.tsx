"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight, Droplets, Gem, LayoutGrid, Smartphone, Sparkles, Wrench } from "lucide-react";
import type { Category } from "@/lib/types";

function CategoryIcon({ slug }: { slug: string }) {
  const Icon = slug.startsWith("electronica") ? Smartphone : slug.includes("herramienta") ? Wrench
    : slug.includes("perfume") ? Gem : slug.includes("cosmetica") ? Sparkles : slug.includes("capilar") ? Droplets : LayoutGrid;
  return <Icon aria-hidden="true" className="size-5" />;
}

export function CategoryNavigation({ categories, catalogPath, onNavigate, mobile = false }: {
  categories: Category[];
  catalogPath: string;
  onNavigate: () => void;
  mobile?: boolean;
}) {
  const panelId = useId();
  const roots = categories.filter(c => !c.parentId);
  const [activeId, setActiveId] = useState(roots[0]?.id);
  const active = roots.find(c => c.id === activeId) ?? roots[0];
  const children = (id: string) => categories.filter(c => c.parentId === id);
  const url = (slug: string) => `${catalogPath}?category=${encodeURIComponent(slug)}`;
  const subcategoryLinks = (category: Category, compact: boolean) => <>
    <Link href={url(category.slug)} onClick={onNavigate}
      className="mb-3 flex min-h-11 items-center justify-between gap-3 rounded-xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-800">
      <span>Ver todo en {category.name}</span><ArrowRight className="size-4 shrink-0" />
    </Link>
    <div className={`grid gap-2 ${compact ? "sm:grid-cols-2" : "grid-cols-2"}`}>
      {children(category.id).map(sub => <Link key={sub.id} href={url(sub.slug)} onClick={onNavigate}
        className="group flex min-h-12 items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-medium leading-5 text-zinc-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
        <span className="min-w-0 text-pretty">{sub.name}</span><ChevronRight className="size-4 shrink-0 text-zinc-400 group-hover:text-sky-700" />
      </Link>)}
    </div>
  </>;

  if (mobile) return <nav aria-label="Categorías y subcategorías" className="my-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-2">
    <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-3 pt-2">
      <h2 className="text-base font-bold text-zinc-950">Explorá por categoría</h2>
      <Link href={catalogPath} onClick={onNavigate} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-sky-800">Ver catálogo <ArrowRight className="size-3" /></Link>
    </div>
    <div className="space-y-2">{roots.map(category => <details key={category.id} name="store-categories" className="group rounded-xl border border-zinc-200 bg-white open:border-sky-300">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-3 focus-visible:outline-2 focus-visible:outline-sky-600 [&::-webkit-details-marker]:hidden">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700"><CategoryIcon slug={category.slug} /></span>
        <span className="min-w-0 flex-1 text-sm font-semibold leading-5 text-zinc-900">{category.name}</span>
        <ChevronDown className="size-4 shrink-0 text-zinc-400 group-open:rotate-180 group-open:text-sky-700" />
      </summary>
      <div className="border-t border-zinc-100 p-3">{subcategoryLinks(category, true)}</div>
    </details>)}</div>
  </nav>;

  return <nav aria-label="Categorías y subcategorías" className="grid grid-cols-[250px_1fr] bg-white text-zinc-950">
    <div className="border-r border-zinc-200 bg-zinc-50 p-3">
      <p className="px-3 pb-3 pt-2 text-xs font-semibold text-zinc-500">Explorá por categoría</p>
      <div className="space-y-1">{roots.map(category => <button key={category.id} type="button"
        onMouseEnter={() => setActiveId(category.id)} onFocus={() => setActiveId(category.id)} onClick={() => setActiveId(category.id)}
        aria-expanded={active?.id === category.id} aria-controls={panelId}
        className={`flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-semibold leading-5 ${active?.id === category.id ? "border-sky-200 bg-white text-sky-900 shadow-xs" : "border-transparent text-zinc-600 hover:bg-white"}`}>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${active?.id === category.id ? "bg-sky-100 text-sky-700" : "bg-zinc-100 text-zinc-500"}`}><CategoryIcon slug={category.slug} /></span>
        <span className="min-w-0 flex-1">{category.name}</span><ChevronRight className="size-4 shrink-0" />
      </button>)}</div>
      <Link href={catalogPath} onClick={onNavigate} className="mt-4 flex min-h-11 items-center gap-2 border-t border-zinc-200 px-3 pt-3 text-xs font-semibold text-sky-800 hover:text-sky-950"><LayoutGrid className="size-4" />Catálogo completo</Link>
    </div>
    <div id={panelId} className="max-h-[min(34rem,75dvh)] min-h-96 overflow-y-auto overscroll-contain p-5">
      {active && <>
        <div className="mb-4">
          <p className="mb-1 text-xs font-medium text-zinc-500">{children(active.id).length ? `${children(active.id).length} subcategorías para explorar` : "Explorá sus productos"}</p>
          <h2 className="text-balance text-xl font-bold text-zinc-950">{active.name}</h2>
        </div>
        {subcategoryLinks(active, false)}
      </>}
    </div>
  </nav>;
}
