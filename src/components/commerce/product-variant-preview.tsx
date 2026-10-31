import Image from "next/image";
import Link from "next/link";
import { Layers } from "lucide-react";
import type { ProductVariant } from "@/lib/types";
import { productVariantHref, variantPreview } from "@/lib/variant-preview";

export function ProductVariantPreview({ slug, variants }: { slug: string; variants?: ProductVariant[] }) {
  const preview = variantPreview(variants);
  if (!preview.total) return null;
  return <div data-variant-preview className="mt-4 min-w-0 border-t border-zinc-100 pt-3">
    <p className="text-[11px] font-medium text-zinc-500">{preview.total} {preview.total === 1 ? "versión" : "versiones"}</p>
    <div className="mt-2 flex min-w-0 flex-wrap items-stretch gap-1.5">
      {preview.items.map(variant => <Link key={variant.id} href={productVariantHref(slug, variant.id)} prefetch={false} title={variant.title}
        aria-label={`Ver versión ${variant.title}`} className="flex min-h-11 min-w-0 basis-full sm:basis-0 flex-1 items-center gap-1.5 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 px-1.5 py-1 text-[11px] font-medium text-zinc-700 transition-colors hover:border-sky-400 hover:bg-sky-50">
        {variant.imageUrl ? <Image src={variant.imageUrl} alt="" width={24} height={24} className="size-6 shrink-0 rounded object-contain" /> : <Layers className="size-4 shrink-0 text-zinc-500" />}
        <span className="min-w-0 truncate">{Object.values(variant.options).filter(Boolean).join(" · ") || variant.title}</span>
      </Link>)}
      {preview.remaining > 0 && <Link href={productVariantHref(slug)} prefetch={false} aria-label={`Ver las ${preview.total} versiones`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-1 text-[11px] font-semibold tabular-nums text-sky-800">+{preview.remaining}</Link>}
    </div>
  </div>;
}
