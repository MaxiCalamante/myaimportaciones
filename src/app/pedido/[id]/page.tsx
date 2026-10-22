import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createCommerceService, hasCommerceService } from "@/lib/supabase/service";
import { OrderDetailView, type PublicOrder } from "./order-detail-view";
import { ArrowLeft, Search, ShoppingBag } from "lucide-react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Detalle y Confirmación de Pedido | MYA Importaciones",
  description: "Visualizá el comprobante de tu pedido, estado de pago y guía de Correo Argentino.",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getOrder(idOrCode: string): Promise<PublicOrder | null> {
  if (!hasCommerceService()) return null;
  const db = createCommerceService();
  const trimmed = idOrCode.trim();

  let query = db
    .from("orders")
    .select(
      "id, tracking_code, status, created_at, payment_method, payment_url, subtotal_amount, discount_amount, shipping_amount, shipping_option, total_amount, shipping_name, shipping_phone, shipping_address, carrier_tracking_code, order_notes, order_items(id, product_title, variant_title, quantity, unit_price)"
    );

  if (UUID_REGEX.test(trimmed)) {
    query = query.eq("id", trimmed);
  } else {
    query = query.ilike("tracking_code", trimmed);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  return {
    id: data.id,
    tracking_code: data.tracking_code,
    status: data.status,
    created_at: data.created_at,
    payment_method: data.payment_method,
    payment_url: data.payment_url,
    subtotal_amount: Number(data.subtotal_amount || 0),
    discount_amount: Number(data.discount_amount || 0),
    shipping_amount: Number(data.shipping_amount || 0),
    shipping_option: data.shipping_option,
    total_amount: Number(data.total_amount || 0),
    shipping_name: data.shipping_name,
    shipping_phone: data.shipping_phone,
    shipping_address: data.shipping_address,
    carrier_tracking_code: data.carrier_tracking_code,
    order_notes: data.order_notes,
    order_items: (data.order_items || []).map((i: any) => ({
      id: i.id,
      product_title: i.product_title,
      variant_title: i.variant_title,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    })),
  };
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) {
    return (
      <div className="min-h-[70vh] bg-zinc-50 py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-xs space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-900">
            <Search className="size-6 text-amber-700" />
          </div>
          <h1 className="text-2xl font-black text-zinc-950">Pedido No Encontrado</h1>
          <p className="text-sm text-zinc-600 leading-relaxed">
            No encontramos ningún pedido registrado con el identificador <strong className="font-mono text-zinc-900">{id}</strong>. Podés buscarlo con tu código de seguimiento e email en nuestro rastreador.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href="/seguimiento"
              className="flex-1 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white p-3.5 text-xs font-bold transition shadow-xs"
            >
              Ir a Seguimiento de Pedidos
            </Link>
            <Link
              href="/"
              className="flex-1 rounded-2xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 p-3.5 text-xs font-bold transition shadow-2xs"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-zinc-50 py-10 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-200">
      <div className="mx-auto max-w-3xl mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition"
        >
          <ArrowLeft className="size-3.5" /> Volver a la Tienda
        </Link>
      </div>
      <OrderDetailView order={order} />
    </div>
  );
}
