import { demoOrders } from "@/lib/demo-data";
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
  status: OrderStatus | null;
  total_amount: number | null;
  customer_tier: ProductChannel | null;
  payment_method: PaymentMethod | null;
  created_at: string;
  order_items: DbOrderItem[] | null;
}

export async function getAccountOrders(profileId: string | null) {
  if (!hasSupabaseConfig() || !profileId) {
    return demoOrders.slice(0, 2);
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, status, total_amount, customer_tier, payment_method, created_at, order_items(product_title, quantity, unit_price)",
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  const orders = ((data ?? []) as DbAccountOrder[]).map(
    (order): OrderSummary => ({
      id: order.id,
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

  return orders.length > 0 ? orders : demoOrders.slice(0, 2);
}
