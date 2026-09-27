import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  OrderItemSummary,
  OrderStatus,
  OrderSummary,
  PaymentMethod,
  ProductChannel,
} from "@/lib/types";

interface DbOrderItem {
  product_title: string;
  quantity: number;
  unit_price: number;
}

interface DbAccountOrder {
  id: string;
  tracking_code: string | null;
  status: OrderStatus | null;
  total_amount: number | null;
  customer_tier: ProductChannel | null;
  payment_method: PaymentMethod | null;
  created_at: string;
  order_items: DbOrderItem[] | null;
}

export async function getAccountOrders(profileId: string | null): Promise<{ orders: OrderSummary[]; error: boolean }> {
  if (!hasSupabaseConfig() || !profileId) {
    return { orders: [], error: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, tracking_code, status, total_amount, customer_tier, payment_method, created_at, order_items(product_title, quantity, unit_price)",
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) return { orders: [], error: true };

  const orders = ((data ?? []) as DbAccountOrder[]).map(
    (order): OrderSummary => ({
      id: order.id,
      trackingCode: order.tracking_code ?? undefined,
      customerName: "",
      customerEmail: "",
      channel: order.customer_tier ?? "retail",
      status: order.status ?? "pending",
      total: Number(order.total_amount ?? 0),
      paymentMethod: order.payment_method ?? "transferencia",
      createdAt: order.created_at,
      items: ((order.order_items ?? []) as DbOrderItem[]).map(
        (item): OrderItemSummary => ({
          productTitle: item.product_title,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
        }),
      ),
    }),
  );

  return { orders, error: false };
}
