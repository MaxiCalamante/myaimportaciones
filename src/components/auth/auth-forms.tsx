"use client";

import { LogIn, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { signInAction, signOutAction, signUpAction } from "@/app/login/actions";

export function AuthForms({
  next,
  supabaseReady,
  signedIn,
}: {
  next: string;
  supabaseReady: boolean;
  signedIn: boolean;
}) {
  const [isSignInPending, startSignInTransition] = useTransition();
  const [isSignUpPending, startSignUpTransition] = useTransition();
  
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSignInError(null);

    startSignInTransition(async () => {
      try {
        await signInAction(formData);
      } catch (err: unknown) {
        if ((err instanceof Error ? err.message : "Error inesperado") === "NEXT_REDIRECT" || (err instanceof Error && "digest" in err && typeof err.digest === "string" && err.digest.startsWith("NEXT_REDIRECT"))) {
          // Success (Next.js redirect)
          return;
        }
        setSignInError((err instanceof Error ? err.message : "Error inesperado") || "Error al iniciar sesión.");
      }
    });
  };

  const handleSignUp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSignUpError(null);
    setSignUpSuccess(false);

    startSignUpTransition(async () => {
      try {
        await signUpAction(formData);
        setSignUpSuccess(true);
      } catch (err: unknown) {
        if ((err instanceof Error ? err.message : "Error inesperado") === "NEXT_REDIRECT" || (err instanceof Error && "digest" in err && typeof err.digest === "string" && err.digest.startsWith("NEXT_REDIRECT"))) {
          // Success (Next.js redirect)
          return;
        }
        setSignUpError((err instanceof Error ? err.message : "Error inesperado") || "Error al registrar la cuenta.");
      }
    });
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
      {/* Sección Ingresar */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <LogIn className="h-5 w-5 text-emerald-700" />
          <h1 className="text-2xl font-bold text-zinc-950">Ingresar</h1>
        </div>
        
        <form onSubmit={handleSignIn} className="mt-6 grid gap-4">
          <input name="next" type="hidden" value={next} />
          
          {signInError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {signInError}
            </div>
          )}

          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Email
            <input
              className="h-11 rounded-lg border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Contraseña
            <input
              className="h-11 rounded-lg border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white"
              minLength={6}
              name="password"
              required
              type="password"
            />
          </label>
          
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer transition-colors"
            disabled={!supabaseReady || isSignInPending}
            type="submit"
          >
            {isSignInPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {isSignInPending ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {signedIn ? (
          <form action={signOutAction} className="mt-4">
            <button
              className="text-sm font-semibold text-zinc-650 hover:text-zinc-950 cursor-pointer"
              type="submit"
            >
              Cerrar sesión
            </button>
          </form>
        ) : null}
      </section>

      {/* Sección Crear Cuenta */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-emerald-700" />
          <h2 className="text-2xl font-bold text-zinc-950">Crear cuenta</h2>
        </div>
        
        <form onSubmit={handleSignUp} className="mt-6 grid gap-4">
          <input name="next" type="hidden" value={next} />

          {signUpError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {signUpError}
            </div>
          )}

          {signUpSuccess && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
              Cuenta registrada con éxito. Verifica tu correo si es necesario.
            </div>
          )}

          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Nombre
            <input
              className="h-11 rounded-lg border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white"
              name="full_name"
              required
            />
          </label>
          
          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Email
            <input
              className="h-11 rounded-lg border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Contraseña
            <input
              className="h-11 rounded-lg border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white"
              minLength={6}
              name="password"
              required
              type="password"
            />
          </label>
          
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 cursor-pointer transition-colors"
            disabled={!supabaseReady || isSignUpPending}
            type="submit"
          >
            {isSignUpPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {isSignUpPending ? "Registrando..." : "Registrarme"}
          </button>
        </form>
        
        {!supabaseReady ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Carga las variables de Supabase para activar login, registro y roles.
          </p>
        ) : null}
      </section>
    </div>
  );
}
