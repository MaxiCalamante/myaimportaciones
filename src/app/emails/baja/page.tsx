import Link from "next/link";
import { unsubscribeEmail } from "./actions";
export const metadata = { title: "Preferencias de email | MYA", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function EmailUnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string; result?: string }> }) {
  const { token, result } = await searchParams;
  const valid = /^[a-f0-9]{64}$/.test(token || "");
  return <main className="mx-auto max-w-xl px-4 py-16"><section className="rounded-2xl border bg-white p-6 sm:p-8"><h1 className="text-balance text-3xl font-bold">Elegí qué recibir</h1>
    {result === "done" ? <p role="status" className="mt-5 text-pretty">Tu baja quedó registrada. Dejaremos de enviarte ofertas y recordatorios de carrito. Seguirás recibiendo los avisos necesarios sobre tus pedidos y tu cuenta.</p> : <>
      <p className="mt-4 text-pretty text-zinc-600">Podés dejar de recibir ofertas y recordatorios con este botón. Los avisos de tus compras y seguridad de la cuenta siguen activos.</p>
      {valid && <form action={unsubscribeEmail} className="mt-6"><input type="hidden" name="token" value={token} /><button className="min-h-11 rounded-xl bg-zinc-950 px-5 py-3 font-semibold text-white">Confirmar mi baja</button></form>}
      {(!valid || result) && <p role="alert" className="mt-5 text-sm text-amber-800">{result === "error" ? "No se pudo guardar la baja. Volvé a intentarlo desde el enlace del correo." : "Abrí el enlace de baja de tu correo o cambiá tus preferencias desde tu cuenta."}</p>}
    </>}
    <Link href="/cuenta#emails" className="mt-6 inline-flex min-h-11 items-center font-semibold text-sky-800">Ir a mis preferencias →</Link></section></main>;
}
