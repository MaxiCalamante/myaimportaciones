"use client";

import Link from "next/link";
import { ArrowRight, Heart, LogOut, PackageCheck, Search, ShoppingBag, UserRound } from "lucide-react";
import { signOutAction } from "@/app/login/actions";
import { FavoritesList } from "@/components/commerce/favorites-list";
import { formatCurrency, formatDate, formatOrderStatus } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";

export function AccountPanel({ fullName, email, orders, ordersError, isAdmin, canSignOut }: {
  fullName: string;
  email: string;
  orders: OrderSummary[];
  ordersError: boolean;
  isAdmin: boolean;
  canSignOut: boolean;
}) {
  return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
    <nav aria-label="Ubicación" className="mb-5 flex gap-2 text-xs text-zinc-500"><Link href="/" className="hover:text-sky-700">Inicio</Link><span>/</span><span>Mi cuenta</span></nav>
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-800 via-sky-700 to-cyan-600 p-6 text-white shadow-sm sm:p-9">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15"><UserRound className="size-7" /></span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest text-sky-100">Mi cuenta</p><h1 className="mt-1 break-words text-2xl font-bold sm:text-3xl">Hola, {fullName}</h1>{email && <p className="mt-1 break-all text-sm text-sky-100">{email}</p>}</div></div>
        {canSignOut && <form action={signOutAction}><button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/40 px-4 text-sm font-semibold hover:bg-white/10"><LogOut className="size-4" /> Cerrar sesión</button></form>}
      </div>
      <p className="mt-6 max-w-2xl text-sm leading-6 text-sky-50">Revisá tus pedidos y volvé a los productos que guardaste. Si compraste como invitado, podés buscar el pedido con su código y tu email.</p>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <a href="#pedidos" className="flex min-h-20 items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-900 shadow-sm hover:border-sky-300"><PackageCheck className="size-5 text-sky-700" /><span>Mis pedidos</span><ArrowRight className="ml-auto size-4 text-zinc-400" /></a>
      <a href="#favoritos" className="flex min-h-20 items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-900 shadow-sm hover:border-sky-300"><Heart className="size-5 text-sky-700" /><span>Mis favoritos</span><ArrowRight className="ml-auto size-4 text-zinc-400" /></a>
      <Link href={isAdmin ? "/admin" : "/catalogo"} className="flex min-h-20 items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-900 shadow-sm hover:border-sky-300"><ShoppingBag className="size-5 text-sky-700" /><span>{isAdmin ? "Panel de administración" : "Explorar productos"}</span><ArrowRight className="ml-auto size-4 text-zinc-400" /></Link>
    </div>
    <section id="pedidos" className="mt-8 scroll-mt-24 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Seguimiento</p><h2 className="mt-1 text-2xl font-bold text-zinc-950">Mis pedidos</h2></div>{!ordersError && <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800">{orders.length} {orders.length === 1 ? "pedido" : "pedidos"}</span>}</div>
      {ordersError ? <div role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">No pudimos cargar tus pedidos. Actualizá la página para intentar de nuevo.</div> : orders.length ? <div className="mt-6 space-y-3">{orders.map(order => <article className="rounded-xl border border-zinc-200 p-4 sm:p-5" key={order.id}>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-bold text-zinc-950">Pedido {order.trackingCode ?? order.id.slice(0, 8).toUpperCase()}</p><p className="mt-1 text-xs text-zinc-500">{formatDate(order.createdAt)} · {order.channel === "wholesale" ? "Mayorista" : "Minorista"}</p></div><div className="text-left sm:text-right"><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">{formatOrderStatus(order.status)}</span><p className="mt-2 font-bold tabular-nums text-zinc-950">{formatCurrency(order.total)}</p></div></div>
        <div className="mt-4 border-t border-zinc-100 pt-3 text-sm text-zinc-600">{order.items.slice(0, 3).map((item, index) => <p className="flex justify-between gap-4 py-1" key={`${order.id}-${index}`}><span className="min-w-0 truncate">{item.quantity} × {item.productTitle}</span><span className="shrink-0 tabular-nums">{formatCurrency(item.unitPrice * item.quantity)}</span></p>)}{order.items.length > 3 && <p className="mt-1 text-xs">Y {order.items.length - 3} productos más</p>}</div>
        {order.trackingCode && <Link href={`/seguimiento?code=${encodeURIComponent(order.trackingCode)}`} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-sky-700 hover:underline">Ver seguimiento <ArrowRight className="size-4" /></Link>}
      </article>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 p-6 text-center sm:p-9"><PackageCheck className="mx-auto size-9 text-sky-700" /><h3 className="mt-3 text-lg font-bold text-zinc-950">Todavía no hay pedidos en tu cuenta</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-600">Los pedidos realizados con esta cuenta aparecerán acá. Para consultar una compra como invitado, usá el código que recibiste al comprar.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/catalogo" className="inline-flex min-h-11 items-center rounded-xl bg-sky-700 px-5 text-sm font-bold text-white hover:bg-sky-800">Explorar catálogo</Link><Link href="/seguimiento" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-200 bg-white px-5 text-sm font-bold text-sky-700"><Search className="size-4" /> Buscar un pedido</Link></div></div>}
    </section>
    <section id="favoritos" className="mt-8 scroll-mt-24"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Guardados</p><h2 className="mt-1 text-2xl font-bold text-zinc-950">Mis favoritos</h2></div><Link href="/favoritos" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-sky-700 hover:underline">Ver página de favoritos <ArrowRight className="size-4" /></Link></div><FavoritesList /></section>
  </div>;
}
