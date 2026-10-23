import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptLookup } from "./receipt-lookup";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Comprobante de pedido | MYA Importaciones",
  description: "Consultá tu comprobante con el email de la compra.",
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="min-h-[70vh] bg-zinc-50 px-4 py-10 sm:px-6">
      <div className="mx-auto mb-5 max-w-3xl">
        <Link href="/seguimiento" className="text-sm font-semibold text-sky-800 underline">Seguimiento de pedidos</Link>
      </div>
      <ReceiptLookup identifier={id} />
    </div>
  );
}
