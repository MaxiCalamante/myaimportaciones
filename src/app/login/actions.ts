"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNext(formData: FormData) {
  const next = getString(formData, "next");
  return next.startsWith("/") ? next : "/cuenta";
}

export async function signInAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const next = getNext(formData);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message === "Invalid login credentials") {
      throw new Error("El email o la contraseña son incorrectos.");
    }
    throw new Error(error.message);
  }

  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const fullName = getString(formData, "full_name");
  // Default customer tier to retail, user can purchase wholesale based on cart minimum
  const customerTier = "retail";
  const next = getNext(formData);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=${next}`,
      data: {
        full_name: fullName,
        customer_tier: customerTier,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(next);
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
