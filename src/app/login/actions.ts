"use server";
import { siteConfig } from "@/lib/site";

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
    return { error: error.code === "email_not_confirmed" ? "Confirmá tu cuenta desde el enlace que enviamos a tu email. Revisá también la carpeta de spam." : "No pudimos completar la solicitud. Revisá tus datos e intentá nuevamente." };
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
      emailRedirectTo: `${siteConfig.appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      data: {
        full_name: fullName,
        customer_tier: customerTier,
      },
    },
  });

  if (error) {
    return { error: "No pudimos crear la cuenta. Revisá tus datos e intentá nuevamente." };
  }

  return data.session ? { redirectTo: next } : { message: "Revisá tu email para confirmar la cuenta. Si no llega, revisá la carpeta de spam antes de reintentar." };
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Ingresá un email válido." };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteConfig.appUrl}/auth/callback?next=/restablecer-clave` });
  if (error) return { error: "No pudimos enviar el enlace. Esperá unos minutos e intentá nuevamente." };
  return { message: "Si el email corresponde a una cuenta, vas a recibir un enlace de recuperación. Revisá también la carpeta de spam." };
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8 || password.length > 128 || password !== formData.get("confirm_password")) return { error: "Usá entre 8 y 128 caracteres y repetí la misma contraseña." };
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "El enlace venció. Solicitá otro enlace de recuperación." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "No pudimos guardar la contraseña. Solicitá otro enlace o elegí una contraseña más segura." };
  return { message: "Contraseña actualizada. Ya podés ingresar con la nueva contraseña." };
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
