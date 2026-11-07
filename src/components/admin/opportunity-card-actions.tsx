'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { quickPublishOpportunity } from '@/app/admin/oportunidades/catalog-actions';

interface OpportunityCardActionsProps {
  item: {
    id: string;
    title: string;
    url: string;
    active: boolean;
    slug: string | null;
    product_id?: string | null;
  };
}

export function OpportunityCardActions({ item }: OpportunityCardActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [published, setPublished] = useState<{
    id: string;
    slug: string;
    active: boolean;
  } | null>(null);

  const effectivePublished =
    published ||
    (item.active && item.slug
      ? {
          id: item.product_id || '',
          slug: item.slug,
          active: true,
        }
      : null);

  const handleQuickPublish = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await quickPublishOpportunity(item.id);
      if (res.success) {
        setPublished({
          id: res.data.id,
          slug: res.data.slug,
          active: res.data.active,
        });
      } else {
        setMessage(res.error || 'No se pudo publicar la oportunidad');
      }
    });
  };

  if (effectivePublished) {
    return (
      <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <svg className="size-3 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
            Publicado en la tienda
          </span>
          {effectivePublished.id ? (
            <Link
              href={`/admin?editProduct=${effectivePublished.id}`}
              className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-200 transition-colors"
            >
              Editar
            </Link>
          ) : (
            <Link
              href={`/admin/oportunidades/${item.id}`}
              className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-200 transition-colors"
            >
              Editar
            </Link>
          )}
          <Link
            href={`/producto/${effectivePublished.slug}`}
            target="_blank"
            className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors"
          >
            Ver en tienda ↗
          </Link>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-xs text-zinc-500 hover:text-zinc-800 underline"
          >
            Ficha original
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={handleQuickPublish}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? (
            <>
              <span className="inline-block size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Publicando…
            </>
          ) : (
            <>
              <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Publicar en la tienda
            </>
          )}
        </button>
        <Link
          href={`/admin/oportunidades/${item.id}`}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Editar
        </Link>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-xs text-zinc-500 hover:text-zinc-800 underline"
        >
          Ficha original
        </a>
      </div>
      {message && (
        <p className="rounded-md bg-amber-50 p-2 text-xs font-medium text-amber-950 border border-amber-200" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
