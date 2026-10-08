import type { Product } from "./types";

// Derive the displayed USD equivalent from the actual ARS selling price.
// A second independent price would drift when the owner edits an ARS price.
export function electronicsDollarPrice(product: Pick<Product, "retailPrice" | "specifications">): number | null {
  const exchange = Number(product.specifications?.["Cotización USD/ARS"]);
  if (!Number.isFinite(exchange) || exchange <= 0 || product.retailPrice <= 0) return null;
  return Math.round(product.retailPrice / exchange * 100) / 100;
}

export function formatDollarPrice(value: number): string {
  return `USD ${value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
