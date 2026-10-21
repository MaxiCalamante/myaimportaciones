import Link from "next/link";
import { readSupplierWorkspace } from "@/lib/supplier-workspace";
import { SupplierWorkspace } from "@/components/admin/supplier-workspace";

export const metadata = { title: "Compras y proveedores | MYA", robots: { index: false, follow: false } };
export default async function SupplierIntelligencePage() {
  const data = await readSupplierWorkspace();
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <Link href="/admin/proveedores" className="text-sm font-semibold text-sky-800">← Agenda y contactos</Link>
    <h1 className="mt-4 text-2xl font-bold text-zinc-950">Compras y proveedores</h1>
    <p className="mt-2 mb-6 max-w-3xl text-sm text-zinc-600">Costos privados, disponibilidad documentada y simulaciones de compra. Las simulaciones y propuestas no modifican el inventario ni los precios de la tienda.</p>
    {data ? <SupplierWorkspace data={data} /> : <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-5">Falta instalar la migración de proveedores y costos. El catálogo sigue funcionando. Revisá docs/suppliers/README.md antes de habilitar esta herramienta.</div>}
  </main>;
}
