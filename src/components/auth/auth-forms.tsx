"use client";

import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, ShoppingBag, UserRound } from "lucide-react";
import { useState, useTransition } from "react";
import { signInAction, signOutAction, signUpAction } from "@/app/login/actions";

type AuthMode = "signin" | "signup";

export function AuthForms({ next, supabaseReady, signedIn, confirmationError = false, mode }: {
  next: string;
  supabaseReady: boolean;
  signedIn: boolean;
  confirmationError?: boolean;
  mode: AuthMode;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(confirmationError ? "El enlace de confirmación no es válido o venció. Revisá tu email o intentá ingresar." : null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isRegister = mode === "signup";
  const nextQuery = next === "/cuenta" ? "" : `?next=${encodeURIComponent(next)}`;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    if (isRegister && form.get("password") !== form.get("confirm_password")) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    startTransition(async () => {
      try {
        const result = isRegister ? await signUpAction(form) : await signInAction(form);
        if (result.error) setError(result.error);
        else if (result.redirectTo) window.location.assign(result.redirectTo);
      } catch {
        setError("No pudimos completar la solicitud. Intentá nuevamente.");
      }
    });
  };

  return <main className="min-h-[calc(100dvh-8rem)] bg-gradient-to-b from-sky-50/80 via-white to-white px-4 py-8 sm:px-6 sm:py-14">
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg lg:grid-cols-[0.9fr_1.1fr]">
      <div className="hidden bg-sky-950 p-9 text-white lg:flex lg:flex-col lg:justify-between">
        <div><span className="inline-flex rounded-full border border-sky-300/30 bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-sky-100">MYA Importaciones</span><p className="mt-10 text-4xl font-bold leading-tight">Tu cuenta, tus compras, todo en un lugar.</p><p className="mt-4 text-sky-100/80">Guardá favoritos, consultá el estado de tus pedidos y retomá tu carrito cuando quieras.</p></div>
        <div className="grid gap-3 text-sm text-sky-100"><p className="flex items-center gap-3"><ShoppingBag className="h-5 w-5 text-amber-300" /> Seguí tus pedidos desde tu cuenta</p><p className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-amber-300" /> Tus datos se usan para gestionar tus compras</p></div>
      </div>
      <section className="p-5 sm:p-10 lg:p-12">
        <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Cuenta MYA</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">{signedIn ? "Ya ingresaste" : isRegister ? "Crear cuenta" : "Ingresar"}</h1>
        <p className="mt-2 text-sm text-zinc-600">{signedIn ? "Podés continuar con tu cuenta o cerrar sesión." : isRegister ? "Creá tu cuenta para seguir tus compras y guardar favoritos." : "Ingresá para ver tus pedidos y favoritos."}</p>
        <nav aria-label="Acceso a la cuenta" className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 text-sm font-semibold">
          <Link href={`/login${nextQuery}`} aria-current={!isRegister ? "page" : undefined} className={`rounded-lg px-3 py-3 text-center ${!isRegister ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-600 hover:text-zinc-950"}`}>Ingresar</Link>
          <Link href={`/register${nextQuery}`} aria-current={isRegister ? "page" : undefined} className={`rounded-lg px-3 py-3 text-center ${isRegister ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-600 hover:text-zinc-950"}`}>Crear cuenta</Link>
        </nav>

        {signedIn ? <div className="mt-7 space-y-4"><Link href={next} className="block rounded-xl bg-sky-700 px-4 py-3 text-center font-bold text-white hover:bg-sky-800">Continuar</Link><form action={signOutAction}><button type="submit" className="w-full rounded-xl border border-zinc-300 px-4 py-3 font-semibold text-zinc-700">Cerrar sesión</button></form></div> : <form onSubmit={submit} className="mt-7 space-y-4">
          <input name="next" type="hidden" value={next} />
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {isRegister && <label className="block text-sm font-semibold text-zinc-700">Nombre y apellido<input name="full_name" autoComplete="name" minLength={2} maxLength={120} required className="mt-1.5 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 font-normal outline-none focus:border-sky-600" /></label>}
          <label className="block text-sm font-semibold text-zinc-700">Email<input name="email" type="email" autoComplete="email" maxLength={254} required className="mt-1.5 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 font-normal outline-none focus:border-sky-600" /></label>
          <label className="block text-sm font-semibold text-zinc-700">Contraseña<span className="relative mt-1.5 block"><input name="password" type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 8 : undefined} required className="h-12 w-full rounded-xl border border-zinc-300 bg-white pl-3 pr-12 font-normal outline-none focus:border-sky-600" /><button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-zinc-500">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></span></label>
          {isRegister && <><label className="block text-sm font-semibold text-zinc-700">Repetir contraseña<span className="relative mt-1.5 block"><input name="confirm_password" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required className="h-12 w-full rounded-xl border border-zinc-300 bg-white pl-3 pr-12 font-normal outline-none focus:border-sky-600" /><button type="button" aria-label={showConfirmPassword ? "Ocultar contraseña repetida" : "Mostrar contraseña repetida"} onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-zinc-500">{showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></span></label><p className="text-xs text-zinc-500">Usá al menos 8 caracteres. Al crear la cuenta vas a ingresar directamente.</p></>}
          <button disabled={!supabaseReady || pending} type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Un momento…" : isRegister ? <><UserRound className="h-4 w-4" /> Crear cuenta</> : <><LockKeyhole className="h-4 w-4" /> Ingresar</>}</button>
          {!supabaseReady && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">El acceso a cuentas no está disponible en este entorno.</p>}
        </form>}
        <p className="mt-6 text-center text-xs text-zinc-500">¿Solo querés explorar? <Link href="/catalogo" className="font-semibold text-sky-700 underline underline-offset-2">Ver catálogo</Link></p>
      </section>
    </div>
  </main>;
}
