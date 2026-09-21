import { demoAdminData } from "@/lib/demo-data";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStorefrontData } from "@/lib/storefront";
import type {
  AdminDashboardData,
  CustomerSummary,
  CustomerTier,
  OrderStatus,
  PaymentMethod,
  ProductChannel,
} from "@/lib/types";

interface DbProfileSummary {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "admin" | "customer" | null;
  customer_tier: CustomerTier | null;
  created_at: string;
  business_name: string | null;
  cuit: string | null;
  is_approved_wholesale: boolean | null;
}

interface DbOrderSummary {
  id: string;
  tracking_code: string | null;
  carrier_tracking_code?: string | null;
  status: OrderStatus | null;
  total_amount: number | null;
  customer_tier: ProductChannel | null;
  payment_method: PaymentMethod | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  customer_email: string | null;
  order_notes: string | null;
  created_at: string;
  profiles:
    | { full_name: string | null; email: string | null }
    | Array<{ full_name: string | null; email: string | null }>
    | null;
  order_items:
    | Array<{ product_title: string; quantity: number; unit_price: number }>
    | { product_title: string; quantity: number; unit_price: number }
    | null;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  if (!hasSupabaseConfig()) {
    return demoAdminData;
  }

  const supabase = await createServerSupabaseClient();
  const storefront = await getStorefrontData({ admin: true });

  const [
    { count: customersCount },
    { count: ordersCount },
    { data: customersData },
    { data: ordersData },
    { data: stockLogsData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, customer_tier, created_at, business_name, cuit, is_approved_wholesale")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("orders")
      .select(
        "*, profiles(full_name, email), order_items(product_title, quantity, unit_price)"
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("stock_logs")
      .select("id, product_id, change_amount, previous_stock, new_stock, reason, created_at, products(title)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const customers = ((customersData ?? []) as DbProfileSummary[]).map(
    (customer): CustomerSummary => ({
      id: customer.id,
      fullName: customer.full_name ?? "Cliente",
      email: customer.email ?? "",
      role: customer.role ?? "customer",
      customerTier: customer.customer_tier ?? "retail",
      createdAt: customer.created_at,
      ordersCount: 0,
      totalSpent: 0,
      businessName: customer.business_name ?? undefined,
      cuit: customer.cuit ?? undefined,
      isApprovedWholesale: customer.is_approved_wholesale ?? true,
    }),
  );

  const orders = ((ordersData ?? []) as unknown as DbOrderSummary[]).map(
    (order) => {
      const profile = Array.isArray(order.profiles)
        ? order.profiles[0]
        : order.profiles;

      const orderItemsRaw = Array.isArray(order.order_items)
        ? order.order_items
        : order.order_items
        ? [order.order_items]
        : [];

      return {
        id: order.id,
        trackingCode: order.tracking_code ?? undefined,
        carrierTrackingCode: order.carrier_tracking_code ?? undefined,
        customerName: order.shipping_name || profile?.full_name || "Cliente",
        customerEmail: order.customer_email || profile?.email || "",
        shippingPhone: order.shipping_phone ?? undefined,
        shippingAddress: order.shipping_address ?? undefined,
        orderNotes: order.order_notes ?? undefined,
        channel: order.customer_tier ?? "retail",
        status: order.status ?? "pending",
        total: Number(order.total_amount ?? 0),
        paymentMethod: order.payment_method ?? "transferencia",
        createdAt: order.created_at,
        items: orderItemsRaw.map((item) => ({
          productTitle: item.product_title,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
        })),
      };
    },
  );

  const revenue = orders.filter(order => ["paid", "preparing", "shipped", "delivered"].includes(order.status)).reduce((sum, order) => sum + order.total, 0);

  const stockLogs = (stockLogsData ?? []).map((log) => {
    const product = Array.isArray(log.products) ? log.products[0] : log.products;
    return {
      id: log.id,
      productId: log.product_id,
      productTitle: product?.title ?? "Producto eliminado",
      changeAmount: Number(log.change_amount),
      previousStock: Number(log.previous_stock),
      newStock: Number(log.new_stock),
      reason: log.reason,
      createdAt: log.created_at,
    };
  });

  return {
    source: "supabase",
    stats: {
      revenue,
      orders: ordersCount ?? orders.length,
      customers: customersCount ?? customers.length,
      products: storefront.products.length,
    },
    customers,
    orders,
    products: storefront.products,
    categories: storefront.categories,
    stockLogs,
  };
}
