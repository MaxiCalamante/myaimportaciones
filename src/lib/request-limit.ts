import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createCommerceService } from "@/lib/supabase/service";
export async function limitCommerceRequest(scope: "quote" | "order" | "tracking" | "withdrawal") {
  const values = await headers();
  // The deployment proxy must overwrite x-forwarded-for, rather than trust client values.
  const address = values.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "local").update(`${scope}:${address}`).digest("hex");
  const limit = { quote: 60, order: 10, tracking: 30, withdrawal: 10 }[scope];
  const { data, error } = await createCommerceService().rpc("consume_commerce_request_v2", { key_input: key, limit_input: limit });
  if (error || !data) throw new Error("No podemos procesar más intentos en este momento. Esperá unos minutos o contactanos.");
}
