/** Owner-confirmed terms, 23/10/2026. The two minimums are alternatives. */
export const WHOLESALE_MIN_AMOUNT = 100_000;
export const WHOLESALE_MIN_UNITS = 5;
export const WHOLESALE_MINIMUM_LABEL = "$100.000 en productos o 5 unidades en total";
export const WHOLESALE_MINIMUM_DETAILS = "Alcanzá $100.000 en productos o sumá al menos 5 unidades, del mismo producto o combinando varios. Basta con cumplir una de las dos condiciones. El envío se cotiza por separado.";

export function wholesaleProductInquiry(product: { title: string; slug: string }, quantity: number, variantTitle?: string | null) {
  return `Hola MYA Importaciones. Quisiera una cotización MAYORISTA.\nProducto: ${product.title}${variantTitle ? ` (${variantTitle})` : ""}.\nEnlace: https://myaimportaciones.com/producto/${encodeURIComponent(product.slug)}\nCantidad de este producto a consultar: ${quantity}.\nMínimo mayorista: ${WHOLESALE_MINIMUM_LABEL}, combinables entre productos.\nPor favor, confirmen precio mayorista, disponibilidad, pago y entrega. Si la selección no alcanza el mínimo, quisiera consultar cómo completar el pedido.`;
}
