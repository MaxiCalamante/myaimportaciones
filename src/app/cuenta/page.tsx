import { redirect } from "next/navigation";
import { AccountPanel } from "@/components/account/account-panel";
import { getAccountOrders } from "@/lib/account-data";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getStorefrontData } from "@/lib/storefront";

export const metadata = {
  title: "Mi cuenta | Mayorista Minorista",
};

export default async function AccountPage() {
  const [{ products }, auth] = await Promise.all([
    getStorefrontData(),
    getCurrentProfile(),
  ]);

  if (hasSupabaseConfig() && !auth.profile) {
    redirect("/login?next=/cuenta");
  }

  // Si el usuario es administrador, lo redirigimos directamente a su panel de gestión
  if (auth.profile?.role === "admin") {
    redirect("/admin");
  }

  const orders = await getAccountOrders(auth.profile?.id ?? null);

  return (
    <AccountPanel
      email={auth.profile?.email ?? "cliente@example.com"}
      fullName={auth.profile?.fullName ?? "Cliente demo"}
      orders={orders}
      products={products}
    />
  );
}
