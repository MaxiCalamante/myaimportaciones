"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { requestPasswordResetAction, updatePasswordAction } from "@/app/login/actions";

export function PasswordForm({ reset, allowed = true }: { reset: boolean; allowed?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return <main className="content-page max-w-md px-5 py-12">
    <h1 className="text-3xl font-bold">{reset ? "Elegí una nueva contraseña" : "Recuperar contraseña"}</h1>
    <p className="mt-3 text-sm text-zinc-600">{reset ? "Usá al menos 8 caracteres y evitá reutilizar contraseñas." : "Ingresá el email de tu cuenta para recibir un enlace de recuperación."}</p>
    {!allowed ? <p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Necesitás un enlace de recuperación válido. <Link className="font-semibold underline" href="/recuperar-clave">Solicitar otro enlace</Link></p> : <form className="mt-6 space-y-4" onSubmit={event => {
      event.preventDefault(); const form = new FormData(event.currentTarget); setError(""); setMessage("");
      if (reset && form.get("password") !== form.get("confirm_password")) { setError("Las contraseñas no coinciden."); return; }
      startTransition(async () => {
        try {
          const result = reset ? await updatePasswordAction(form) : await requestPasswordResetAction(form);
          if ("error" in result && result.error) setError(result.error);
          else if ("message" in result) setMessage(result.message ?? "");
        } catch { setError("No pudimos completar la solicitud. Intentá nuevamente."); }
      });
    }}>
      {reset ? <><label className="block text-sm font-semibold">Nueva contraseña<input className="mt-2 h-12 w-full rounded-xl border border-zinc-300 px-3" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label><label className="block text-sm font-semibold">Repetir contraseña<input className="mt-2 h-12 w-full rounded-xl border border-zinc-300 px-3" name="confirm_password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label></> : <label className="block text-sm font-semibold">Email<input className="mt-2 h-12 w-full rounded-xl border border-zinc-300 px-3" name="email" type="email" autoComplete="email" maxLength={254} required /></label>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <button className="min-h-12 w-full rounded-xl bg-sky-700 px-4 py-3 font-semibold text-white disabled:opacity-50" disabled={pending || Boolean(message)}>{pending ? "Procesando…" : reset ? "Guardar contraseña" : "Enviar enlace"}</button>
    </form>}
    <Link className="mt-6 inline-block text-sm font-semibold text-sky-800 underline" href="/login">Volver a ingresar</Link>
  </main>;
}
