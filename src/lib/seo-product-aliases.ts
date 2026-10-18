import type { Product } from "./types";
// Existing duplicate variants verified against title, model, presentation and condition.
// Consolidate search signals only: the product records, prices and URLs remain accessible.
export const PRODUCT_CANONICAL_ALIASES: Record<string, string> = {
  "medicube-zero-pore-one-day-cream-50-ml-97": "medicube-zero-pore-one-day-cream-50-ml",
  "shiseido-tsubaki-kit-premium-cool-repair-shampoo-acondicionador-450-ml-1": "shiseido-tsubaki-kit-premium-cool-repair-shampoo-acondicionador-450-ml",
  "apple-iphone-16-128-gb-azul-ultramar-sim-fisica-esim-a3287-hn-a-12126-2": "apple-iphone-16-128-gb-azul-ultramar-sim-fisica-esim-a3287-hn-a-15873-2",
};

export function canonicalProductSlug(product: Product, target?: Product) {
  const normalize = (value?: string) => (value || "").toLocaleLowerCase("es-AR").replace(/\s/g, "");
  if (!target || target.active === false || target.wholesaleOnly || product.categoryId !== target.categoryId ||
    ["title", "brand", "model"].some(key => normalize(product[key as "title" | "brand" | "model"]) !== normalize(target[key as "title" | "brand" | "model"])) ||
    normalize(product.specifications?.["Condición"] || "Nuevo") !== normalize(target.specifications?.["Condición"] || "Nuevo")) return product.slug;
  return target.slug;
}
