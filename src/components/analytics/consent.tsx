"use client";
import { useSyncExternalStore } from "react";
const subscribe = (fn: () => void) => { window.addEventListener("mya_consent", fn); return () => window.removeEventListener("mya_consent", fn); };
const snapshot = () => { try { return localStorage.getItem("mya_analytics_consent") ?? ""; } catch { return "denied"; } };
export function AnalyticsConsent() {
  const consent = useSyncExternalStore(subscribe, snapshot, () => "unknown");
  function save(value: string) { try { localStorage.setItem("mya_analytics_consent", value); window.dispatchEvent(new Event("mya_consent")); } catch {} }
  return consent ? <button className="p-3 text-xs underline" onClick={() => save("")}>Preferencias de privacidad</button> : <section aria-label="Privacidad" className="fixed bottom-20 left-3 right-3 z-[80] mx-auto max-w-lg rounded-2xl border bg-white p-4 shadow-lg"><p className="text-sm">¿Permitís medición publicitaria para mejorar la tienda? El carrito funciona sin aceptarla.</p><div className="mt-3 flex gap-4"><button onClick={() => save("granted")} className="rounded-lg bg-zinc-950 p-2 text-white">Aceptar</button><button onClick={() => save("denied")} className="rounded-lg border p-2">Rechazar</button><a href="/privacidad" className="p-2 underline">Detalles</a></div></section>;
}
