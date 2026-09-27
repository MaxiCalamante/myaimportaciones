import { redirect } from "next/navigation";
import { AccountPanel } from "@/components/account/account-panel";
import { getAccountOrders } from "@/lib/account-data";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/env";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Mi Cuenta | MYA Importaciones",
};

export default async function AccountPage() {
  const auth = await getCurrentProfile();

  if (hasSupabaseConfig() && !auth.profile) {
    redirect("/login?next=/cuenta");
  }

  const { orders, error } = await getAccountOrders(auth.profile?.id ?? null);

  return (
    <AccountPanel
      email={auth.profile?.email ?? ""}
      fullName={auth.profile?.fullName ?? "Invitado"}
      isAdmin={auth.profile?.role === "admin"}
      canSignOut={Boolean(auth.user)}
      orders={orders}
      ordersError={error}
    />
  );
}
