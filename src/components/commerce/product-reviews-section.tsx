"use client";

import { MessageCircle } from "lucide-react";
import type { ProductReview, ProductRatingSummary } from "@/lib/product-reviews";
import { useCommerce } from "./commerce-provider";

export function ProductReviewsSection({ productTitle }: { reviews: ProductReview[]; summary: ProductRatingSummary; productTitle: string }) {
  const { openWhatsApp } = useCommerce();
  return (
    <section id="opiniones" className="mt-10 scroll-mt-20 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
      <h2 className="text-xl font-bold text-zinc-950">Opiniones del producto</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">Todavía no hay opiniones verificadas publicadas para este producto.</p>
      <button type="button" onClick={() => openWhatsApp(`Hola MYA Importaciones! Quisiera compartir mi experiencia de compra de "${productTitle}".`)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100">
        <MessageCircle className="size-4" /> Compartir mi experiencia
      </button>
    </section>
  );
}
