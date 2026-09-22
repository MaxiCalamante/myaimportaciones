"use client";

import Link from "next/link";
import { Heart, PackageCheck, ShoppingBag, Truck, UserRound } from "lucide-react";
import { formatCurrency, formatDate, formatOrderStatus } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";
import { FavoritesList } from "@/components/commerce/favorites-list";


export function AccountPanel({
  fullName,
  email,
  orders,
}: {
  fullName: string;
  email: string;
  orders: OrderSummary[];
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <UserRound className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-zinc-950">
                {fullName}
              </h1>
              <p className="truncate text-sm text-zinc-500">{email}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 text-sm">
            <Link
              className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 font-medium text-zinc-800"
              href="#pedidos"
            >
              <Truck className="h-4 w-4" />
              Pedidos
            </Link>
            <Link
              className="flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-zinc-600 hover:bg-zinc-100"
              href="#favoritos"
            >
              <Heart className="h-4 w-4" />
              Favoritos
            </Link>
            <Link
              className="flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-zinc-600 hover:bg-zinc-100"
              href="/checkout"
            >
              <ShoppingBag className="h-4 w-4" />
              Checkout
            </Link>
          </div>
        </aside>

        <div className="space-y-8">
          <section className="rounded-lg border border-zinc-200 bg-white p-5" id="pedidos">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase text-emerald-700">
                  Seguimiento
                </p>
                <h2 className="mt-1 text-2xl font-bold text-zinc-950">
                  Mis compras
                </h2>
              </div>
              <PackageCheck className="h-7 w-7 text-zinc-400" />
            </div>

            <div className="mt-6 grid gap-4">
              {orders.map((order) => (
                <article
                  className="rounded-lg border border-zinc-200 p-4"
                  key={order.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">
                        Pedido {order.id}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {formatDate(order.createdAt)} ·{" "}
                        {order.channel === "wholesale" ? "Mayorista" : "Minorista"}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-emerald-700">
                        {formatOrderStatus(order.status)}
                      </p>
                      <p className="mt-1 text-sm font-bold text-zinc-950">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {order.items.slice(0, 3).map((item) => (
                      <div
                        className="flex items-center justify-between gap-3 text-sm text-zinc-600"
                        key={`${order.id}-${item.productTitle}`}
                      >
                        <span className="line-clamp-1">
                          {item.quantity} x {item.productTitle}
                        </span>
                        <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="favoritos">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase text-emerald-700">
                  Guardados
                </p>
                <h2 className="mt-1 text-2xl font-bold text-zinc-950">
                  Favoritos y ver despues
                </h2>
              </div>
            </div>
            <FavoritesList />
          </section>
        </div>
      </div>
    </div>
  );
}
