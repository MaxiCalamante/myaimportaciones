"use client";
import { useSyncExternalStore } from "react";
const subscribe = (fn: () => void) => { window.addEventListener("mya_consent", fn); return () => window.removeEventListener("mya_consent", fn); };
const snapshot = () => { try { return localStorage.getItem("mya_analytics_consent") ?? ""; } catch { return "denied"; } };
export function AnalyticsConsent() {
  const consent = useSyncExternalStore(subscribe, snapshot, () => "unknown");
  function save(value: string) { try { localStorage.setItem("mya_analytics_consent", value); window.dispatchEvent(new Event("mya_consent")); } catch {} }
  return consent ? <button type="button" className="min-h-11 p-3 text-xs text-zinc-600 underline underline-offset-4" onClick={() => save("")}>Preferencias de privacidad</button> : <section aria-label="Privacidad" className="privacy-banner fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[45] mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl md:bottom-6"><p className="text-sm leading-6 text-zinc-700">¿Permitís medición publicitaria para mejorar la tienda? El carrito funciona sin aceptarla.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => save("granted")} className="min-h-11 flex-1 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800">Aceptar</button><button type="button" onClick={() => save("denied")} className="min-h-11 flex-1 rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Rechazar</button><a href="/privacidad" className="inline-flex min-h-11 items-center px-3 text-sm text-sky-700 underline underline-offset-4">Detalles</a></div></section>;
}
