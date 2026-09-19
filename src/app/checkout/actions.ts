"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface OrderLineInput {
  productId: string;
  quantity: number;
  channel: "retail" | "wholesale";
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
) {
  const supabase = await createServerSupabaseClient();

  // 1. Check stock for all items first
  for (const line of lines) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("title, stock")
      .eq("id", line.productId)
      .single();

    if (productError || !product) {
      throw new Error(`Producto no encontrado.`);
    }

    if (product.stock < line.quantity) {
      throw new Error(
        `Stock insuficiente para "${product.title}". Disponibles: ${product.stock}, solicitados: ${line.quantity}`
      );
    }
  }

  // 2. Insert order (compatible with both guest and authenticated users)
  const trackingCode = `ORD-${Math.floor(10000 + Math.random() * 89999)}`;
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      profile_id: profileId || null,
      status: "pending",
      customer_tier: lines.some((l) => l.channel === "wholesale") ? "wholesale" : "retail",
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
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error(`Error al crear el pedido: ${orderError?.message || "Error desconocido"}`);
  }

  // 3. Insert order items & reduce stock atomically
  for (const line of lines) {
    // Get product info for historical item title & price
    const { data: product, error: productFetchError } = await supabase
      .from("products")
      .select("title, retail_price, wholesale_price")
      .eq("id", line.productId)
      .single();

    if (productFetchError || !product) {
      throw new Error(`Error al buscar detalles del producto.`);
    }

    const unitPrice =
      line.channel === "wholesale" ? product.wholesale_price : product.retail_price;

    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: line.productId,
      product_title: product.title,
      quantity: line.quantity,
      unit_price: unitPrice,
    });

    if (itemError) {
      throw new Error(`Error al agregar detalles del pedido: ${itemError.message}`);
    }

    // Atomic decrement of stock
    const { error: rpcError } = await supabase.rpc("decrement_product_stock", {
      product_id: line.productId,
      qty: line.quantity,
    });

    if (rpcError) {
      // Fallback: manual update if RPC fails
      const { data: currentProd } = await supabase
        .from("products")
        .select("stock")
        .eq("id", line.productId)
        .single();
      
      if (currentProd) {
        const newStock = Math.max(0, currentProd.stock - line.quantity);
        await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", line.productId);
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/mayorista");
  revalidatePath("/cuenta");

  return { trackingCode };
}
