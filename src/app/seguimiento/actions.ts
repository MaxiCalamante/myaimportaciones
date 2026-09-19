"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface TrackingItem {
  id: string;
  product_title: string;
  quantity: number;
  unit_price: number;
  product_id: string;
}

export interface TrackingOrder {
  id: string;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
  customer_tier: "retail" | "wholesale";
  payment_method: string;
  subtotal_amount: number;
  shipping_amount: number;
  total_amount: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  tracking_code: string;
  created_at: string;
  items: TrackingItem[];
}

export async function lookupOrderAction(code: string): Promise<TrackingOrder | null> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_order_by_tracking", {
    tracking_code_input: cleanCode,
  });

  if (error || !data) {
    return null;
  }

  return data as unknown as TrackingOrder;
}
