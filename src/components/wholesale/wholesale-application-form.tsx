"use client";

import { useActionState, useState } from "react";
import { applyForWholesaleAction, type WholesaleActionResult } from "@/app/actions/wholesale";
import { Building2, CheckCircle2, FileText, Phone, Send, Sparkles, Store, AlertCircle } from "lucide-react";

interface Props {
  userEmail: string;
  userFullName: string;
  initialPhone?: string;
  initialBusinessName?: string;
  initialCuit?: string;
}

export function WholesaleApplicationForm({
  userEmail,
  userFullName,
  initialPhone = "",
  initialBusinessName = "",
  initialCuit = "",
}: Props) {
  const [state, formAction, isPending] = useActionState(applyForWholesaleAction, null);

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-8 text-center text-white">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-zinc-950 shadow-lg">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="mt-4 text-2xl font-black text-white">¡Postulación Enviada con Éxito!</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-300">
          Recibimos tus datos comerciales. Nuestro equipo de administración revisará tu cuenta para habilitarte el catálogo mayorista a la brevedad.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs text-zinc-400">
          <span>Usuario:</span>
          <strong className="text-white">{userEmail}</strong>
          <span className="text-amber-400">· Estado: En revisión</span>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-amber-400">
        <Sparkles className="h-4 w-4" />
        <span>Postulación a Cuenta Mayorista</span>
      </div>

      <h3 className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">
        Accedé a Precios por Bulto Cerrado
      </h3>

      <p className="mt-2 text-sm text-zinc-300">
        Completá los datos de tu comercio o actividad. Te activaremos el acceso oficial para ver precios mayoristas en vivo.
      </p>

      {state?.error && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="businessName" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <Store className="h-3.5 w-3.5 text-amber-400" />
            <span>Nombre Comercial / Negocio *</span>
          </label>
          <input
            id="businessName"
            name="businessName"
            type="text"
            required
            defaultValue={initialBusinessName}
            placeholder="Ej: Estética Bella / Ferretería Central"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 transition focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cuit" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span>CUIT / CUIL o DNI *</span>
          </label>
          <input
            id="cuit"
            name="cuit"
            type="text"
            required
            defaultValue={initialCuit}
            placeholder="Ej: 20-12345678-9"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 transition focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <Phone className="h-3.5 w-3.5 text-amber-400" />
            <span>Teléfono / WhatsApp *</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            defaultValue={initialPhone}
            placeholder="Ej: 2494123456"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 transition focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="notes" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <Building2 className="h-3.5 w-3.5 text-amber-400" />
            <span>Rubro o Tipo de Venta</span>
          </label>
          <input
            id="notes"
            name="notes"
            type="text"
            placeholder="Ej: Cosmética, Peluquería, Revendedor, etc."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 transition focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-zinc-800 pt-5">
        <p className="text-xs text-zinc-400">
          Sesión activa: <strong className="text-zinc-200">{userEmail}</strong> ({userFullName})
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 font-bold px-6 py-3 text-sm transition shadow-md cursor-pointer"
        >
          {isPending ? (
            <span>Enviando postulación...</span>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Enviar Postulación Mayorista</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
