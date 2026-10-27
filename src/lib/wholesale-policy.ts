/** Owner-confirmed terms, 23/10/2026. The two minimums are alternatives. */
export const WHOLESALE_MIN_AMOUNT = 100_000;
export const WHOLESALE_MIN_UNITS = 5;
export const WHOLESALE_MINIMUM_LABEL = "$100.000 en productos o 5 unidades en total";
export const WHOLESALE_MINIMUM_DETAILS = "Alcanzá $100.000 en productos o sumá al menos 5 unidades, del mismo producto o combinando varios. Basta con cumplir una de las dos condiciones. El envío se cotiza por separado.";

export interface VolumeTier {
  minQty: number;
  discountPct: number;
  label: string;
}

export const WHOLESALE_VOLUME_TIERS: VolumeTier[] = [
  { minQty: 24, discountPct: 10, label: "Master Box (24+ un.): -10% extra" },
  { minQty: 12, discountPct: 5, label: "Caja Cerrada (12+ un.): -5% extra" },
];

export function getVolumeDiscount(quantity: number): { discountPct: number; tierLabel: string | null } {
  for (const tier of WHOLESALE_VOLUME_TIERS) {
    if (quantity >= tier.minQty) {
      return { discountPct: tier.discountPct, tierLabel: tier.label };
    }
  }
  return { discountPct: 0, tierLabel: null };
}

export function calculateTieredWholesalePrice(baseWholesalePrice: number, quantity: number): {
  unitPrice: number;
  discountPct: number;
  tierLabel: string | null;
  total: number;
} {
  const { discountPct, tierLabel } = getVolumeDiscount(quantity);
  const unitPrice = discountPct > 0
    ? Math.round(baseWholesalePrice * (1 - discountPct / 100))
    : baseWholesalePrice;
  return {
    unitPrice,
    discountPct,
    tierLabel,
    total: unitPrice * quantity,
  };
}

export interface WholesaleValidationResult {
  hasWholesale: boolean;
  totalAmount: number;
  totalUnits: number;
  meetsMinimum: boolean;
  missingAmount: number;
  missingUnits: number;
  errorMessage?: string;
}

export function validateWholesaleOrder(
  lines: { channel?: string; price: number; quantity: number }[]
): WholesaleValidationResult {
  const wholesaleLines = lines.filter((l) => l.channel === "wholesale");
  if (!wholesaleLines.length) {
    return {
      hasWholesale: false,
      totalAmount: 0,
      totalUnits: 0,
      meetsMinimum: true,
      missingAmount: 0,
      missingUnits: 0,
    };
  }

  const totalAmount = wholesaleLines.reduce((sum, l) => {
    const tiered = calculateTieredWholesalePrice(l.price, l.quantity);
    return sum + tiered.total;
  }, 0);
  const totalUnits = wholesaleLines.reduce((sum, l) => sum + l.quantity, 0);
  const meetsMinimum = totalAmount >= WHOLESALE_MIN_AMOUNT || totalUnits >= WHOLESALE_MIN_UNITS;
  const missingAmount = Math.max(0, WHOLESALE_MIN_AMOUNT - totalAmount);
  const missingUnits = Math.max(0, WHOLESALE_MIN_UNITS - totalUnits);

  return {
    hasWholesale: true,
    totalAmount,
    totalUnits,
    meetsMinimum,
    missingAmount,
    missingUnits,
    errorMessage: meetsMinimum
      ? undefined
      : `El pedido mayorista requiere alcanzar $100.000 o sumar al menos 5 unidades combinadas. Te faltan $${missingAmount.toLocaleString("es-AR")} o ${missingUnits} ${missingUnits === 1 ? "unidad" : "unidades"} para continuar.`,
  };
}

export function wholesaleProductInquiry(product: { title: string; slug: string }, quantity: number, variantTitle?: string | null) {
  return `Hola MYA Importaciones. Quisiera una cotización MAYORISTA.\nProducto: ${product.title}${variantTitle ? ` (${variantTitle})` : ""}.\nEnlace: https://myaimportaciones.com/producto/${encodeURIComponent(product.slug)}\nCantidad de este producto a consultar: ${quantity}.\nMínimo mayorista: ${WHOLESALE_MINIMUM_LABEL}, combinables entre productos.\nPor favor, confirmen precio mayorista, disponibilidad, pago y entrega. Si la selección no alcanza el mínimo, quisiera consultar cómo completar el pedido.`;
}
