import { redirect } from "next/navigation";
import { CheckoutPanel } from "@/components/checkout/checkout-panel";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/env";

export const metadata = {
  title: "Checkout | Mayorista Minorista",
};

export default async function CheckoutPage() {
  const auth = await getCurrentProfile();

  if (hasSupabaseConfig() && !auth.profile) {
    redirect("/login?next=/checkout");
  }

  return <CheckoutPanel profile={auth.profile} />;
}
