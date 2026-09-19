"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { demoProducts } from "@/lib/demo-data";
import { createMercadoPagoPreference } from "@/lib/mercadopago";

interface OrderLineInput {
  productId: string;
  quantity: number;
  channel: "retail" | "wholesale";
}

export interface CreateOrderResult {
  trackingCode: string;
  orderId: string;
  isMercadoPago: boolean;
  preferenceId?: string;
  initPoint?: string;
  isDemo?: boolean;
}

export async function createOrderAction(
  profileId: string | null,
  paymentMethod: string,
  shippingName: string,
  shippingPhone: string,
  shippingAddress: string,
  cartTotal: number,
  shippingAmount: number,
  totalAmount: number,
  lines: OrderLineInput[],
  customerEmail?: string | null,
  orderNotes?: string | null
): Promise<CreateOrderResult> {
  const supabase = await createServerSupabaseClient();
  const orderId = crypto.randomUUID();
  const trackingCode = `ORD-${Math.floor(10000 + Math.random() * 89999)}`;

  // 1. Gather product details & check stock for all items
  const resolvedItems: Array<{
    productId: string;
    title: string;
    unitPrice: number;
    quantity: number;
    channel: "retail" | "wholesale";
  }> = [];

  for (const line of lines) {
    let productTitle = "";
    let unitPrice = 0;
    let availableStock = 999;

    // Try DB first
    const { data: dbProduct } = await supabase
      .from("products")
      .select("title, stock, retail_price, wholesale_price")
      .eq("id", line.productId)
      .maybeSingle();

    if (dbProduct) {
      productTitle = dbProduct.title;
      availableStock = Number(dbProduct.stock ?? 0);
      unitPrice = line.channel === "wholesale"
        ? Number(dbProduct.wholesale_price)
        : Number(dbProduct.retail_price);
    } else {
      // Fallback to local demo/curated catalog
      const fallback = demoProducts.find((p) => p.id === line.productId);
      if (!fallback) {
        throw new Error(`Producto con ID ${line.productId} no encontrado.`);
      }
      productTitle = fallback.title;
      availableStock = fallback.stock;
      unitPrice = line.channel === "wholesale" ? fallback.wholesalePrice : fallback.retailPrice;
    }

    if (availableStock < line.quantity) {
      throw new Error(
        `Stock insuficiente para "${productTitle}". Disponibles: ${availableStock}, solicitados: ${line.quantity}`
      );
    }

    resolvedItems.push({
      productId: line.productId,
      title: productTitle,
      unitPrice,
      quantity: line.quantity,
      channel: line.channel,
    });
  }

  // 2. Insert order (compatible with both guest and authenticated users without .select() block)
  const isWholesale = lines.some((l) => l.channel === "wholesale");
  const { error: orderError } = await supabase
    .from("orders")
    .insert({
      id: orderId,
      profile_id: profileId || null,
      status: "pending",
      customer_tier: isWholesale ? "wholesale" : "retail",
      payment_method: paymentMethod,
      subtotal_amount: cartTotal,
      shipping_amount: shippingAmount,
      total_amount: totalAmount,
      shipping_name: shippingName,
      shipping_phone: shippingPhone,
      shipping_address: shippingAddress,
      customer_email: customerEmail || null,
      order_notes: orderNotes || null,
      tracking_code: trackingCode,
    });

  if (orderError) {
    console.error("Error creating order:", orderError);
    throw new Error(`Error al registrar el pedido: ${orderError.message}`);
  }

  // 3. Insert order items & reduce stock atomically
  for (const item of resolvedItems) {
    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: orderId,
      product_id: item.productId,
      product_title: item.title,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    });

    if (itemError) {
      console.warn("Item insert warning:", itemError.message);
    }

    // Try atomic decrement in DB
    try {
      await supabase.rpc("decrement_product_stock", {
        product_id: item.productId,
        qty: item.quantity,
      });
    } catch {
      // Ignored if product is not in DB or RPC fails
    }
  }

  // 4. If Card or Mercado Pago payment, create MP Preference
  let isMercadoPago = false;
  let preferenceId: string | undefined = undefined;
  let initPoint: string | undefined = undefined;
  let isDemo: boolean | undefined = undefined;

  if (paymentMethod === "tarjeta" || paymentMethod === "mercado_pago") {
    isMercadoPago = true;
    const mpRes = await createMercadoPagoPreference({
      trackingCode,
      items: resolvedItems.map((it) => ({
        id: it.productId,
        title: it.title,
        quantity: it.quantity,
        unit_price: it.unitPrice,
      })),
      payerName: shippingName,
      payerEmail: customerEmail || undefined,
      payerPhone: shippingPhone,
      shippingAddress,
      shippingAmount,
    });

    if (mpRes.success) {
      preferenceId = mpRes.preferenceId;
      initPoint = mpRes.initPoint;
      isDemo = mpRes.isDemo;
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/mayorista");
  revalidatePath("/cuenta");
  revalidatePath(`/seguimiento`);

  return {
    trackingCode,
    orderId,
    isMercadoPago,
    preferenceId,
    initPoint,
    isDemo,
  };
}
