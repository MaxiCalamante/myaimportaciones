"use server";

import { safeAuthNext } from "@/lib/auth-navigation";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNext(formData: FormData) {
  const next = getString(formData, "next");
  return safeAuthNext(next);
}

export async function signInAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const email = getString(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = getNext(formData);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message === "Invalid login credentials") {
      return { error: "El email o la contraseña son incorrectos." };
    }
    return { error: error.code === "email_not_confirmed" ? "Confirmá tu email antes de ingresar." : "No pudimos completar la solicitud. Revisá tus datos e intentá nuevamente." };
  }

  return { redirectTo: next };
}

export async function signUpAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const email = getString(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = getString(formData, "full_name");
  // Public registration always creates a retail customer.
  const customerTier = "retail";
  const next = getNext(formData);

  if (fullName.length < 2 || password.length < 8 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Completá nombre, email válido y una contraseña de al menos 8 caracteres." };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=${encodeURIComponent(next)}`,
      data: {
        full_name: fullName,
        customer_tier: customerTier,
      },
    },
  });

  if (error) {
    return { error: error.code === "email_not_confirmed" ? "Confirmá tu email antes de ingresar." : "No pudimos completar la solicitud. Revisá tus datos e intentá nuevamente." };
  }

  return data.session ? { redirectTo: next } : { confirmation: true };
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
