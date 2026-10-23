"use client";

import { useState, useTransition } from "react";
import { lookupReceiptAction } from "./actions";
import { OrderDetailView, type PublicOrder } from "./order-detail-view";

export function ReceiptLookup({ identifier }: { identifier: string }) {
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (order) return <OrderDetailView order={order} />;

  return (
    <section className="mx-auto max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs sm:p-8">
      <h1 className="text-2xl font-bold text-zinc-950">Consultar comprobante</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-600">Para proteger tus datos, ingresá el email que usaste al comprar. El enlace por sí solo no muestra información del pedido.</p>
      <form className="mt-5 space-y-4" onSubmit={event => {
        event.preventDefault();
        setError("");
        startTransition(async () => {
          try {
            const result = await lookupReceiptAction(identifier, email);
            if (result) setOrder(result);
            else setError("No pudimos verificar el pedido. Revisá el enlace y el email o intentá nuevamente en unos minutos.");
          } catch {
            setError("No pudimos consultar el pedido. Revisá tu conexión e intentá nuevamente.");
          }
        });
      }}>
        <label className="block text-sm font-semibold text-zinc-800">Email de la compra
          <input required type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-zinc-300 p-3 text-base font-normal" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
        <button disabled={pending} type="submit" className="min-h-12 w-full rounded-xl bg-sky-700 p-3 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-60">{pending ? "Verificando…" : "Ver mi comprobante"}</button>
      </form>
    </section>
  );
}
