import { AuthForms } from "@/components/auth/auth-forms";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/env";

export const metadata = {
  title: "Cuenta | Mayorista Minorista",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const auth = await getCurrentProfile();
  const next = params.next?.startsWith("/") ? params.next : "/cuenta";

  return (
    <AuthForms
      next={next}
      signedIn={Boolean(auth.profile)}
      supabaseReady={hasSupabaseConfig()}
    />
  );
}
