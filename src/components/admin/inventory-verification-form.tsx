"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { verifyInventoryAction } from "@/app/admin/operaciones/actions";
import type { Product } from "@/lib/types";

const fields = ["modelo", "contenido", "ingredientes", "uso", "precauciones", "incluye", "compatibilidad", "responsable_local", "lote", "vencimiento"] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="min-h-11 rounded-xl bg-zinc-950 px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Guardando…" : "Guardar verificación"}</button>;
}

export function InventoryVerificationForm({ products }: { products: Product[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const product = products.find(item => item.id === selectedId);
  return <form action={verifyInventoryAction} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-6">
    <div><h2 className="text-xl font-bold text-zinc-950">Verificar inventario y ficha</h2><p className="mt-1 text-sm text-zinc-600">Contá las unidades físicas disponibles, descontando las ya vendidas. Los pedidos con reservas pendientes impiden guardar el recuento.</p></div>
    <label className="block text-sm font-semibold text-zinc-700">Producto<select required name="product_id" value={selectedId} onChange={event => { setSelectedId(event.target.value); setConfirmed(false); }} className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-3"><option value="">Elegí el producto</option>{products.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    {product && <div key={product.id} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-zinc-700">Unidades disponibles<input required name="stock" type="number" min="0" max="100000" step="1" defaultValue={product.stockVerifiedAt ? product.stock : undefined} className="mt-1 w-full rounded-xl border border-zinc-300 p-3" /></label><label className="block text-sm font-semibold text-zinc-700">Peso por unidad (kg)<input required name="weight" type="number" min="0" step="0.001" defaultValue={product.specifications?.peso_kg ?? ""} className="mt-1 w-full rounded-xl border border-zinc-300 p-3" /></label></div>
      <p className="text-xs text-zinc-500">Revisá los datos existentes antes de guardar. Los campos vacíos se guardarán vacíos.</p>
      <div className="grid gap-4 sm:grid-cols-2">{fields.map(field => <label key={field} className="block text-sm font-semibold capitalize text-zinc-700">{field.replaceAll("_", " ")}<textarea name={field} maxLength={3000} defaultValue={product.specifications?.[field] ?? ""} className="mt-1 min-h-20 w-full rounded-xl border border-zinc-300 p-3 font-normal normal-case" /></label>)}</div>
      <label className="block text-sm font-semibold text-zinc-700">Condiciones documentadas de garantía<textarea name="warranty" maxLength={3000} defaultValue={product.warrantyTerms ?? ""} className="mt-1 min-h-20 w-full rounded-xl border border-zinc-300 p-3 font-normal" /></label>
      <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><input required name="confirmed" type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1" />Verifiqué el stock físico y la información de esta ficha.</label>
      <SubmitButton />
    </div>}
  </form>;
}
