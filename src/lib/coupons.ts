export interface Coupon {
  code: string;
  type: "percent" | "fixed";
  value: number; // percentage (e.g. 10) or fixed amount in ARS
  description: string;
  minSubtotal?: number;
  maxDiscount?: number;
  applicableChannel?: "retail" | "wholesale" | "all";
}

export const ACTIVE_COUPONS: Coupon[] = [
  {
    code: "BIENVENIDO10",
    type: "percent",
    value: 10,
    description: "10% OFF en tu compra de bienvenida",
    minSubtotal: 15000,
    maxDiscount: 25000,
    applicableChannel: "all",
  },
  {
    code: "TANDIL",
    type: "fixed",
    value: 2500,
    description: "Descuento especial de envío para Tandil ($2.500 OFF)",
    minSubtotal: 10000,
    applicableChannel: "all",
  },
  {
    code: "MYA5",
    type: "percent",
    value: 5,
    description: "5% OFF directo en tu orden",
    minSubtotal: 0,
    applicableChannel: "all",
  },
  {
    code: "KBEAUTY8",
    type: "percent",
    value: 8,
    description: "8% OFF especial en K-Beauty y cosmética",
    minSubtotal: 25000,
    maxDiscount: 20000,
    applicableChannel: "retail",
  },
  {
    code: "COMERCIO15",
    type: "percent",
    value: 15,
    description: "15% OFF para compras mayoristas superiores a $150.000",
    minSubtotal: 150000,
    maxDiscount: 50000,
    applicableChannel: "all",
  },
];

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  discountAmount: number;
  coupon?: Coupon;
}

export function validateCoupon(
  inputCode: string,
  subtotal: number,
  channel: "retail" | "wholesale" = "retail"
): CouponValidationResult {
  const normalized = inputCode.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, message: "Ingresá un código de cupón.", discountAmount: 0 };
  }

  const found = ACTIVE_COUPONS.find((c) => c.code === normalized);
  if (!found) {
    return {
      valid: false,
      message: `El cupón "${normalized}" no es válido o expiró.`,
      discountAmount: 0,
    };
  }

  if (found.applicableChannel && found.applicableChannel !== "all" && found.applicableChannel !== channel) {
    return {
      valid: false,
      message: `Este cupón solo es válido para compras ${found.applicableChannel === "wholesale" ? "mayoristas" : "minoristas"}.`,
      discountAmount: 0,
    };
  }

  if (found.minSubtotal && subtotal < found.minSubtotal) {
    return {
      valid: false,
      message: `Este cupón requiere una compra mínima de $${found.minSubtotal.toLocaleString("es-AR")}.`,
      discountAmount: 0,
    };
  }

  let discount = 0;
  if (found.type === "percent") {
    discount = Math.round((subtotal * found.value) / 100);
    if (found.maxDiscount && discount > found.maxDiscount) {
      discount = found.maxDiscount;
    }
  } else {
    discount = Math.min(found.value, subtotal);
  }

  return {
    valid: true,
    message: `¡Cupón aplicado! ${found.description}`,
    discountAmount: discount,
    coupon: found,
  };
}
