import type { ProductVariant } from "@/lib/types";
import { variantPreview } from "@/lib/variant-preview";

export function ProductVariantPreview({ variants }: { slug: string; variants?: ProductVariant[] }) {
  const preview = variantPreview(variants);
  if (!preview.total) return null;
  return <p data-variant-preview className="truncate text-[10px] leading-4 text-zinc-500 sm:text-[11px]">
    {preview.total} {preview.total === 1 ? "opción disponible" : "opciones disponibles"}
  </p>;
}
