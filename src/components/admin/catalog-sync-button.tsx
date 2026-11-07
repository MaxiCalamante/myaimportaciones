'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { syncCatalog, syncOpportunity } from '@/app/admin/oportunidades/catalog-actions';

export function CatalogSyncButton({ label, supplierId, sourceId, itemId, verifyOnOpen }: {
  label: string; supplierId?: string; sourceId?: string; itemId?: string; verifyOnOpen?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState('');
  const attempted = useRef<string|null>(null);
  useEffect(() => {
    if (!verifyOnOpen || !itemId || attempted.current===itemId) return;
    attempted.current=itemId;
    start(async () => {
      const result = await syncOpportunity(itemId);
      setMessage(result.success ? result.data.message : result.error);
      router.refresh();
    });
  },[itemId,router,verifyOnOpen]);
  return <div className="min-w-0 space-y-1">
    <button type="button" disabled={pending} onClick={() => start(async () => {
      setMessage('');
      if (itemId) {
        const result = await syncOpportunity(itemId);
        setMessage(result.success ? result.data.message : result.error);
      } else {
        const result = await syncCatalog(supplierId,sourceId);
        setMessage(result.success ? (result.data.started ? 'Trabajo encolado. Consultá el avance.' : 'Trabajo encolado para el próximo ciclo.') : result.error);
      }
      router.refresh();
    })} className="min-h-10 rounded-lg border border-sky-800 px-3 py-2 text-sm font-semibold text-sky-900 disabled:opacity-60">
      {pending ? 'Consultando…' : label}
    </button>
    <p role="status" className="text-xs text-zinc-600">{message}</p>
  </div>;
}
