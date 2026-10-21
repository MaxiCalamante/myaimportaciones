import { getAdminClient } from "@/lib/admin-auth";
import { SupplierDirectory } from "@/components/admin/supplier-directory";
import type { Supplier } from "@/lib/suppliers";
import Link from "next/link";

export const metadata = { title: "Proveedores y contactos", robots: { index: false, follow: false } };
export default async function SuppliersPage() {
  const db = await getAdminClient();
  const { data, error } = await db.from("suppliers").select("id,name,contact_name,phone,email,website,notes,is_active,updated_at").order("name").limit(500);
  const missing = error?.code === "42P01" || error?.code === "PGRST205";
  if (error && !missing) throw new Error("No se pudo leer la agenda de proveedores.");
  return <><div className="mx-auto max-w-7xl px-4 pt-6"><Link className="inline-flex min-h-11 items-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white" href="/admin/proveedores/inteligencia">Comparador, compras y tarifas del pasador →</Link></div><SupplierDirectory suppliers={(data ?? []) as Supplier[]} ready={!missing} /></>;
}
