import type { Metadata } from "next";
import { OrderTrackerClient } from "./order-tracker-client";

export const metadata: Metadata = {
  title: "Seguimiento de Pedidos | MYA Importaciones",
  description: "Consultá el estado en tiempo real de tu pedido minorista o mayorista con tu código ORD-.",
};

export default async function SeguimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const initialCode = params.code || "";

  return (
    <div className="min-h-[70vh] bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
            Seguimiento Oficial
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
            Rastreá tu Pedido
          </h1>
          <p className="mt-2 text-sm text-zinc-600 max-w-md mx-auto">
            Ingresá tu código de pedido (ej: <strong className="font-mono text-zinc-900">ORD-12345</strong>) para ver el estado de preparación y despacho en tiempo real.
          </p>
        </div>

        <OrderTrackerClient initialCode={initialCode} />
      </div>
    </div>
  );
}
