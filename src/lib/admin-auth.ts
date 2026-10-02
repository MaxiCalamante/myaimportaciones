import { AdminFormError } from "./admin-action-result";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAdminClient() {
  const db = await createServerSupabaseClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new AdminFormError("Iniciá sesión para administrar la tienda.");
  const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "admin") throw new AdminFormError("No tenés permisos de administrador.");
  return db;
}
