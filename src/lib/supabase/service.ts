import "server-only";
import { createClient } from "@supabase/supabase-js";

export function hasCommerceService() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createCommerceService() {
  if (!hasCommerceService()) throw new Error("La compra online está en preparación. Podés consultar disponibilidad por WhatsApp.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}
