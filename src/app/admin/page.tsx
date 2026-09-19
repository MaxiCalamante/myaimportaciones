import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getAdminDashboardData } from "@/lib/admin-data";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/env";

export const metadata = {
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

  return <AdminDashboard data={data} supabaseReady={hasSupabaseConfig()} />;
}
