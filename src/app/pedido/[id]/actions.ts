"use server";

import { findOrderReceipt } from "@/lib/order-receipt";
import { limitCommerceRequest } from "@/lib/request-limit";
import { createCommerceService, hasCommerceService } from "@/lib/supabase/service";
import type { PublicOrder } from "./order-detail-view";

export async function lookupReceiptAction(identifier: string, email: string): Promise<PublicOrder | null> {
  if (!hasCommerceService()) return null;
  const data = await findOrderReceipt(createCommerceService(), identifier, email, () => limitCommerceRequest("tracking"));
  if (!data) return null;
  return {
    ...data,
    subtotal_amount: Number(data.subtotal_amount),
    discount_amount: Number(data.discount_amount),
    shipping_amount: Number(data.shipping_amount),
    total_amount: Number(data.total_amount),
    order_items: data.order_items.map(item => ({ ...item, quantity: Number(item.quantity), unit_price: Number(item.unit_price) })),
  };
}
