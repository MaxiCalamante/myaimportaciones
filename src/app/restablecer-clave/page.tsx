import { hasSupabaseConfig } from "@/lib/supabase/env";
import { PasswordForm } from "@/components/auth/password-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva contraseña", robots: { index: false, follow: false } };
export default async function ResetPassword() {
  if (!hasSupabaseConfig()) return <main className="content-page max-w-md"><h1 className="text-2xl font-bold">Recuperación de cuenta en preparación</h1><p role="status" className="mt-3">Falta completar la configuración de acceso de la tienda. Intentá nuevamente más tarde.</p></main>;
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  return <PasswordForm reset allowed={Boolean(user)} />;
}
