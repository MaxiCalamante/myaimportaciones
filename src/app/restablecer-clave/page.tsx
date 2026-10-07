import { PasswordForm } from "@/components/auth/password-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export const metadata = { title: "Nueva contraseña", robots: { index: false, follow: false } };
export default async function ResetPassword() {
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  return <PasswordForm reset allowed={Boolean(user)} />;
}
