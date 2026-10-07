"use client";

import Link from "next/link";
import { PackageSearch, MessageCircle } from "lucide-react";
import { useCommerce } from "@/components/commerce/commerce-provider";

export function EmptyCatalog({ error }: { error?: string }) {
  const { openWhatsApp } = useCommerce();

  return (
    <section className="mx-auto my-8 max-w-3xl rounded-3xl border border-sky-100 bg-white px-5 py-10 text-center shadow-sm sm:px-10" role={error ? "alert" : undefined}>
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-sky-50 text-sky-700">
        <PackageSearch className="size-8" />
      </span>
      <h2 className="mt-5 text-2xl font-bold text-zinc-950">
        {error ? "El catálogo no está disponible en este momento" : "Estamos preparando nuevos ingresos"}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600">
        {error || "Pronto vas a encontrar más productos acá. Mientras tanto, consultanos directamente a Máximo o Agustina y te ayudamos a encontrar lo que buscás."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => openWhatsApp("Hola MYA Importaciones! Estoy buscando un producto y quería consultarles disponibilidad.")}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-700 px-5 text-sm font-bold text-white hover:bg-sky-800 transition cursor-pointer"
        >
          <MessageCircle className="size-4" />
          Consultar por WhatsApp (Máximo o Agustina)
        </button>
        <Link href="/condiciones" className="inline-flex min-h-12 items-center rounded-xl border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition">
          Ver condiciones de compra
        </Link>
      </div>
    </section>
  );
}
