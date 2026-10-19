"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function saveEmailPreferences(form: FormData) {
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login?next=/cuenta");
  const { error } = await db.rpc("set_email_preferences_v1", { promotions_input: form.get("promotions") === "on", cart_input: form.get("cart_reminders") === "on" });
  revalidatePath("/cuenta");
  redirect(`/cuenta?emails=${error ? "error" : "saved"}#emails`);
}
