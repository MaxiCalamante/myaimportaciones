import { timingSafeEqual } from "node:crypto";
import { createCommerceService } from "@/lib/supabase/service";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || actual.length !== expected.length || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { data, error } = await createCommerceService().rpc("expire_retail_reservations_v2");
    return error ? Response.json({ error: "Reservation cleanup failed" }, { status: 503 }) : Response.json({ released: data });
  } catch { return Response.json({ error: "Unavailable" }, { status: 503 }); }
}
