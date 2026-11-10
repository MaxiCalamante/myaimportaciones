"use client";

import Link from "next/link";
import { useId, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Droplets,
  Gem,
  LayoutGrid,
  Smartphone,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { Category } from "@/lib/types";
import { buildStoreRubros } from "@/lib/category-groups";

function CategoryIcon({ slug }: { slug: string }) {
  const Icon = slug.startsWith("electronica")
    ? Smartphone
    : slug.includes("herramienta")
      ? Wrench
      : slug.includes("perfume")
        ? Gem
        : slug.includes("cosmetica") || slug.includes("coreana")
          ? Sparkles
          : slug.includes("capilar") || slug.includes("cabello")
            ? Droplets
            : LayoutGrid;
  return <Icon aria-hidden="true" className="size-5" />;
}

export function CategoryNavigation({
  categories,
  catalogPath,
  onNavigate,
  mobile = false,
  rubroId,
}: {
  categories: Category[];
  catalogPath: string;
  onNavigate: () => void;
  mobile?: boolean;
  rubroId?: string;
}) {
  const panelId = useId();
  const roots = categories.filter((c) => !c.parentId);
  const [activeId, setActiveId] = useState(roots[0]?.id);
  const active = roots.find((c) => c.id === activeId) ?? roots[0];
  const children = (id: string) => categories.filter((c) => c.parentId === id);
  const url = (slug: string) => `${catalogPath}?category=${encodeURIComponent(slug)}`;

  // If a specific rubroId is targeted (e.g. mega-menu popup on desktop)
  if (rubroId && !mobile) {
    const storeRubros = buildStoreRubros(categories);
    const selectedRubro = storeRubros.find((r) => r.id === rubroId || r.slug === rubroId);

    if (selectedRubro) {
      return (
        <div className="bg-white p-6 text-zinc-950 max-h-[min(32rem,75vh)] overflow-y-auto">
          <div className="mb-5 border-b border-zinc-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
                  Rubro principal
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-zinc-950">
                  {selectedRubro.name}
                </h3>
              </div>
              <Link
                href={url(selectedRubro.slug)}
                onClick={onNavigate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-800 transition"
              >
                <span>Ver todo en {selectedRubro.name}</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{selectedRubro.description}</p>
          </div>

          <div
            className={`grid gap-6 ${
              selectedRubro.subgroups.length >= 4
                ? "grid-cols-2 lg:grid-cols-4"
                : selectedRubro.subgroups.length === 3
                  ? "grid-cols-3"
                  : selectedRubro.subgroups.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-1"
            }`}
          >
            {selectedRubro.subgroups.map((sub) => (
              <div key={sub.name} className="flex flex-col">
                <Link
                  href={url(sub.parentSlug)}
                  onClick={onNavigate}
                  className="group mb-2 flex items-center justify-between border-b border-zinc-100 pb-2 text-sm font-bold text-zinc-900 hover:text-sky-700"
                >
                  <span className="flex items-center gap-2">
                    <CategoryIcon slug={sub.parentSlug} />
                    {sub.name}
                  </span>
                  <ChevronRight className="size-3.5 text-zinc-400 group-hover:text-sky-700" />
                </Link>
                {sub.description && (
                  <p className="mb-3 text-[11px] leading-4 text-zinc-500">{sub.description}</p>
                )}
                <div className="flex flex-col gap-1">
                  {sub.categories
                    .filter((cat) => cat.slug !== sub.parentSlug)
                    .map((cat) => (
                      <Link
                        key={cat.id}
                        href={url(cat.slug)}
                        onClick={onNavigate}
                        className="group flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-sky-50 hover:text-sky-900"
                      >
                        <span className="line-clamp-1">{cat.name}</span>
                        <ChevronRight className="size-3 shrink-0 text-zinc-300 group-hover:text-sky-600" />
                      </Link>
                    ))}
                  <Link
                    href={url(sub.parentSlug)}
                    onClick={onNavigate}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 hover:underline"
                  >
                    Ver todas las subcategorías <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  const subcategoryLinks = (cat: Category, compact: boolean) => (
    <>
      <Link
        href={url(cat.slug)}
        onClick={onNavigate}
        className="mb-3 flex min-h-11 items-center justify-between gap-3 rounded-xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-800"
      >
        <span>Ver todo en {cat.name}</span>
        <ArrowRight className="size-4 shrink-0" />
      </Link>
      <div className={`grid gap-2 ${compact ? "sm:grid-cols-2" : "grid-cols-2"}`}>
        {children(cat.id).map((sub) => (
          <Link
            key={sub.id}
            href={url(sub.slug)}
            onClick={onNavigate}
            className="group flex min-h-12 items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-medium leading-5 text-zinc-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            <span className="min-w-0 text-pretty">{sub.name}</span>
            <ChevronRight className="size-4 shrink-0 text-zinc-400 group-hover:text-sky-700" />
          </Link>
        ))}
      </div>
    </>
  );

  // ── Mobile layout: supports both generic hierarchies and tested parent-child contracts ──
  if (mobile) {
    return (
      <nav aria-label="Categorías y subcategorías" className="py-4">
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          Categorías
        </h2>
        <div className="divide-y divide-zinc-100">
          {roots.map((cat) => {
            const hasChildren = children(cat.id).length > 0;
            const row = (
              <>
                <span className="grid size-8 shrink-0 place-items-center text-sky-700">
                  <CategoryIcon slug={cat.slug} />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium leading-5 text-zinc-900">
                  {cat.name}
                </span>
              </>
            );

            return hasChildren ? (
              <details
                key={cat.id}
                name={`store-categories-${panelId}`}
                className="group"
              >
                <summary className="flex min-h-13 cursor-pointer list-none items-center gap-2 rounded-lg px-1 py-2 focus-visible:outline-2 focus-visible:outline-sky-600 [&::-webkit-details-marker]:hidden">
                  {row}
                  <ChevronDown
                    aria-hidden="true"
                    className="mr-1 size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180 group-open:text-sky-700"
                  />
                </summary>
                <div className="rounded-xl bg-zinc-50 p-3 pb-4">
                  {subcategoryLinks(cat, true)}
                </div>
              </details>
            ) : (
              <Link
                key={cat.id}
                href={url(cat.slug)}
                onClick={onNavigate}
                className="flex min-h-13 items-center gap-2 rounded-lg px-1 py-2 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-sky-600"
              >
                {row}
                <ChevronRight aria-hidden="true" className="mr-1 size-4 shrink-0 text-zinc-400" />
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // ── Desktop full mega menu layout ──
  return (
    <nav
      aria-label="Categorías y subcategorías"
      className="grid grid-cols-[250px_1fr] bg-white text-zinc-950"
    >
      <div className="border-r border-zinc-200 bg-zinc-50 p-3">
        <p className="px-3 pb-3 pt-2 text-xs font-semibold text-zinc-500">
          Explorá por categoría
        </p>
        <div className="space-y-1">
          {roots.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onMouseEnter={() => setActiveId(cat.id)}
              onFocus={() => setActiveId(cat.id)}
              onClick={() => setActiveId(cat.id)}
              aria-expanded={active?.id === cat.id}
              aria-controls={panelId}
              className={`flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-semibold leading-5 ${
                active?.id === cat.id
                  ? "border-sky-200 bg-white text-sky-900 shadow-xs"
                  : "border-transparent text-zinc-600 hover:bg-white"
              }`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                  active?.id === cat.id
                    ? "bg-sky-100 text-sky-700"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                <CategoryIcon slug={cat.slug} />
              </span>
              <span className="min-w-0 flex-1">{cat.name}</span>
              <ChevronRight className="size-4 shrink-0" />
            </button>
          ))}
        </div>
        <Link
          href={catalogPath}
          onClick={onNavigate}
          className="mt-4 flex min-h-11 items-center gap-2 border-t border-zinc-200 px-3 pt-3 text-xs font-semibold text-sky-800 hover:text-sky-950"
        >
          <LayoutGrid className="size-4" />
          Catálogo completo
        </Link>
      </div>

      <div
        id={panelId}
        className="max-h-[min(34rem,75dvh)] min-h-96 overflow-y-auto overscroll-contain p-5"
      >
        {active && (
          <>
            <div className="mb-4">
              <p className="mb-1 text-xs font-medium text-zinc-500">
                {children(active.id).length
                  ? `${children(active.id).length} subcategorías para explorar`
                  : "Explorá sus productos"}
              </p>
              <h2 className="text-balance text-xl font-bold text-zinc-950">
                {active.name}
              </h2>
            </div>
            {subcategoryLinks(active, false)}
          </>
        )}
      </div>
    </nav>
  );
}
