import { safeAuthNext } from "@/lib/auth-navigation";
import { AuthForms } from "@/components/auth/auth-forms";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/env";

export const metadata = {
  title: "Iniciar Sesión o Registrarse | MYA Importaciones",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const auth = await getCurrentProfile();
  const next = safeAuthNext(params.next);

  return (
    <AuthForms
      confirmationError={params.error === "confirmation"}
      next={next}
      signedIn={Boolean(auth.profile)}
      supabaseReady={hasSupabaseConfig()}
    />
  );
}
