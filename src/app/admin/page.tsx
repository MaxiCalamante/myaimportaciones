import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getAdminDashboardData } from "@/lib/admin-data";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/env";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Panel de Control | MYA Importaciones",
};

export default async function AdminPage() {
  const auth = await getCurrentProfile();

  if (hasSupabaseConfig() && !auth.profile) {
    redirect("/login?next=/admin");
  }

  if (hasSupabaseConfig() && auth.profile?.role !== "admin") {
    redirect("/cuenta");
  }

  const data = await getAdminDashboardData();

  return <><nav className="flex flex-wrap gap-5 px-5 pt-5"><a href="/admin/estado" className="underline">Estado de la tienda</a><a href="/admin/costos" className="underline">Costos reales</a><a href="/admin/operaciones" className="underline">Inventario, fichas y reclamos</a></nav><AdminDashboard data={data} supabaseReady={hasSupabaseConfig()} /></>;
}
