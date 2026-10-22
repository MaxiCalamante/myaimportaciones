"use client";

import { useState } from "react";
import { Star, ThumbsUp, ShieldCheck, CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import type { ProductReview, ProductRatingSummary } from "@/lib/product-reviews";
import { getWhatsAppUrl } from "@/lib/site";

export function ProductReviewsSection({
  reviews,
  summary,
  productTitle,
}: {
  reviews: ProductReview[];
  summary: ProductRatingSummary;
  productTitle: string;
}) {
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [voted, setVoted] = useState<Record<string, boolean>>({});

  const toggleLike = (reviewId: string, initialLikes: number) => {
    if (voted[reviewId]) return;
    setLikes((prev) => ({
      ...prev,
      [reviewId]: (prev[reviewId] ?? initialLikes) + 1,
    }));
    setVoted((prev) => ({ ...prev, [reviewId]: true }));
  };

  const whatsappReviewUrl = getWhatsAppUrl(
    `Hola MYA Importaciones! Quisiera dejar mi opinión sobre mi compra de "${productTitle}":`
  );

  return (
    <section id="opiniones" className="mt-10 scroll-mt-20 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800 uppercase tracking-wider">
            <CheckCircle2 className="size-3.5 text-sky-600" /> Experiencias Reales
          </span>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold text-zinc-950">
            Opiniones de Compradores Verificados
          </h2>
        </div>

        <a
          href={whatsappReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 px-4 py-2 text-xs font-bold text-zinc-800 transition shadow-2xs"
        >
          <MessageCircle className="size-4 text-emerald-600" />
          <span>Dejar una Opinión</span>
        </a>
      </div>

      {/* Summary Card */}
      <div className="grid gap-6 rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 sm:grid-cols-[1fr_1.5fr] shadow-xs items-center">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left border-b sm:border-b-0 sm:border-r border-zinc-100 pb-6 sm:pb-0 sm:pr-8">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-zinc-950">
              {summary.averageRating.toFixed(1)}
            </span>
            <span className="text-zinc-400 font-semibold text-lg">/ 5</span>
          </div>

          <div className="flex items-center gap-1 mt-2 text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="size-5 fill-amber-400 text-amber-400" />
            ))}
          </div>

          <p className="mt-2 text-xs sm:text-sm text-zinc-600">
            Basado en <strong>{summary.totalReviews} valoraciones</strong> verificadas
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200/80">
            <Sparkles className="size-3.5 text-emerald-600" />
            <span>{summary.recommendationPercentage}% recomienda este producto</span>
          </div>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="space-y-2.5">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = summary.ratingDistribution[stars as keyof typeof summary.ratingDistribution] || 0;
            const percentage = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;

            return (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 font-semibold text-zinc-700 w-12 shrink-0">
                  {stars} <Star className="size-3 fill-amber-400 text-amber-400" />
                </span>
                <div className="h-2 flex-1 rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="font-mono text-zinc-400 w-8 text-right shrink-0">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((rev) => {
          const currentLikes = likes[rev.id] ?? rev.likes;
          const isVoted = voted[rev.id];

          return (
            <article
              key={rev.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-2xs space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-900 text-xs">
                    {rev.author.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <strong className="text-sm font-semibold text-zinc-900 block leading-tight">
                      {rev.author}
                    </strong>
                    <span className="text-xs text-zinc-500 block">
                      {rev.location} · {rev.date}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200/60">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    <span>{rev.verifiedDestination || "Compra Verificada"}</span>
                  </span>
                </div>
              </div>

              {/* Stars & Title */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-3.5 ${
                        i < rev.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-zinc-200"
                      }`}
                    />
                  ))}
                </div>
                <h3 className="font-bold text-sm text-zinc-950 pt-0.5">
                  {rev.title}
                </h3>
              </div>

              {/* Comment text */}
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                {rev.comment}
              </p>

              {/* Helpful footer */}
              <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
                <span className="text-[11px]">¿Te resultó útil esta opinión?</span>
                <button
                  type="button"
                  onClick={() => toggleLike(rev.id, rev.likes)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                    isVoted
                      ? "bg-sky-50 text-sky-800 font-bold border border-sky-200"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  <ThumbsUp className={`size-3.5 ${isVoted ? "fill-sky-800" : ""}`} />
                  <span>Útil ({currentLikes})</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
