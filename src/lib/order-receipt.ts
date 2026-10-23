import type { SupabaseClient } from "@supabase/supabase-js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Call only from the server. Possession of a public order code is not authorization.
export async function findOrderReceipt(
  db: SupabaseClient,
  identifier: unknown,
  email: unknown,
  consumeAttempt: () => Promise<void>,
) {
  if (typeof identifier !== "string" || !identifier.trim() || identifier.length > 80 ||
      typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return null;
  try {
    await consumeAttempt();
    const key = identifier.trim();
    const { data, error } = await db.from("orders")
      .select("id,tracking_code,status,created_at,payment_method,payment_url,subtotal_amount,discount_amount,shipping_amount,shipping_option,total_amount,shipping_name,shipping_phone,shipping_address,carrier_tracking_code,order_items(id,product_title,variant_title,quantity,unit_price)")
      .eq(uuid.test(key) ? "id" : "tracking_code", uuid.test(key) ? key : key.toUpperCase())
      .eq("customer_email", email.trim().toLowerCase())
      .maybeSingle();
    return error ? null : data;
  } catch {
    return null;
  }
}
