"use server";
import { redirect } from "next/navigation";
import { createCommerceService } from "@/lib/supabase/service";
export async function unsubscribeEmail(form: FormData) {
  const token = String(form.get("token") || "");
  if (!/^[a-f0-9]{64}$/.test(token)) redirect("/emails/baja?result=invalid");
  const { data, error } = await createCommerceService().rpc("unsubscribe_email_v1", { token_input: token });
  redirect(`/emails/baja?result=${error ? "error" : data ? "done" : "invalid"}`);
}
