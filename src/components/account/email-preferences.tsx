"use client";
import { useActionState, useEffect } from "react";
import { saveEmailPreferences } from "@/app/cuenta/email-actions";
export function EmailPreferences({ promotions, cartReminders, available, notice }: { promotions: boolean; cartReminders: boolean; available: boolean; notice?: string }) {
  const [, action, pending] = useActionState(async (_: null, form: FormData) => { await saveEmailPreferences(form); return null; }, null);
  useEffect(() => { if (notice === "saved") window.dispatchEvent(new Event("mya-email-preferences")); }, [notice]);
  return <section id="emails" className="mx-auto my-8 max-w-3xl scroll-mt-24 rounded-2xl border bg-white p-5 sm:p-7">
    <h2 className="text-balance text-2xl font-bold">Tus emails, a tu manera</h2>
    <p className="mt-2 text-pretty text-sm text-zinc-600">Elegí qué querés recibir. Los avisos sobre tus pedidos, pagos y seguridad de la cuenta se envían para mantenerte al tanto de tus operaciones.</p>
    {!available ? <p role="alert" className="mt-4 text-sm text-amber-800">No pudimos cargar tus preferencias. Actualizá la página para volver a intentar.</p> : <form action={action} className="mt-5 space-y-4">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4"><input type="checkbox" name="promotions" defaultChecked={promotions} className="mt-1 size-5 shrink-0 accent-sky-700" /><span><strong className="block">Ofertas y novedades</strong><span className="text-sm text-zinc-600">Quiero recibir promociones y nuevos productos de MYA por email.</span></span></label>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4"><input type="checkbox" name="cart_reminders" defaultChecked={cartReminders} className="mt-1 size-5 shrink-0 accent-sky-700" /><span><strong className="block">Recordarme mi carrito</strong><span className="text-sm text-zinc-600">Autorizo guardar mi selección en mi cuenta y recibir un recordatorio después de 24 horas, como máximo uno por semana.</span></span></label>
      <button disabled={pending} className="min-h-11 rounded-xl bg-sky-800 px-5 py-2 font-semibold text-white disabled:opacity-50">{pending ? "Guardando…" : "Guardar preferencias"}</button>
      {notice === "saved" && <p role="status" className="text-sm text-emerald-800">Tus preferencias se guardaron.</p>}
      {notice === "error" && <p role="alert" className="text-sm text-amber-800">No se guardaron los cambios. Volvé a intentar con tu cuenta confirmada.</p>}
      <p className="text-pretty text-xs text-zinc-500">Podés cambiar estas opciones cuando quieras o darte de baja desde cada correo promocional.</p>
    </form>}
  </section>;
}
