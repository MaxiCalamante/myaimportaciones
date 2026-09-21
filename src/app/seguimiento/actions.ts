"use server";

import { limitCommerceRequest } from "@/lib/request-limit";
import { createCommerceService, hasCommerceService } from "@/lib/supabase/service";

export interface TrackingItem {
  id: string;
  product_title: string;
  quantity: number;
  unit_price: number;
  product_id: string;
}

export interface TrackingOrder {
  id: string;
  status: "pending" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";
  customer_tier: "retail" | "wholesale";
  payment_method: string;
  subtotal_amount: number;
  shipping_amount: number;
  total_amount: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  tracking_code: string;
  carrier_tracking_code?: string | null;
  created_at: string;
  items: TrackingItem[];
}

export async function lookupOrderAction(code: string, email: string): Promise<TrackingOrder | null> {
  if (!hasCommerceService() || !code || code.length > 80 || !email || email.length > 254) return null;
  try { await limitCommerceRequest("tracking"); } catch { return null; }
  const db = createCommerceService();
  const { data, error } = await db.from("orders").select("id,status,customer_tier,payment_method,subtotal_amount,shipping_amount,total_amount,shipping_name,shipping_phone,shipping_address,tracking_code,carrier_tracking_code,created_at,items:order_items(id,product_title,quantity,unit_price,product_id)").eq("tracking_code", code.trim().toUpperCase()).eq("customer_email", email.trim().toLowerCase()).maybeSingle();
  return error || !data ? null : data as unknown as TrackingOrder;
}
