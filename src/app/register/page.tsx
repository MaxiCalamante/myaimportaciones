import { safeAuthNext } from "@/lib/auth-navigation";
import { AuthForms } from "@/components/auth/auth-forms";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/env";

export const metadata = {
  title: "Crear cuenta", robots: { index: false, follow: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const auth = await getCurrentProfile();
  return <AuthForms next={safeAuthNext(params.next)} signedIn={Boolean(auth.profile)} supabaseReady={hasSupabaseConfig()} mode="signup" />;
}
