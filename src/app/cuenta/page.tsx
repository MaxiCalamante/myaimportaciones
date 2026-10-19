import { redirect } from "next/navigation";
import { AccountPanel } from "@/components/account/account-panel";
import { getAccountOrders } from "@/lib/account-data";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmailPreferences } from "@/components/account/email-preferences";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Mi Cuenta | MYA Importaciones",
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ emails?: string }> }) {
  const auth = await getCurrentProfile();

  if (hasSupabaseConfig() && !auth.profile) {
    redirect("/login?next=/cuenta");
  }

  const { orders, error } = await getAccountOrders(auth.profile?.id ?? null);
  const preferences = auth.profile ? await (await createServerSupabaseClient()).from("email_preferences").select("promotions,cart_reminders").eq("profile_id", auth.profile.id).maybeSingle() : null;
  const { emails } = await searchParams;

  return (
    <><AccountPanel
      email={auth.profile?.email ?? ""}
      fullName={auth.profile?.fullName ?? "Invitado"}
      isAdmin={auth.profile?.role === "admin"}
      canSignOut={Boolean(auth.user)}
      orders={orders}
      ordersError={error}
    />{auth.profile && <div className="px-4"><EmailPreferences promotions={Boolean(preferences?.data?.promotions)} cartReminders={Boolean(preferences?.data?.cart_reminders)} available={!preferences?.error} notice={emails} /></div>}</>
  );
}
