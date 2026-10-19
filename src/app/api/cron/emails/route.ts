import { NextResponse } from "next/server";
import { processEmailOutbox } from "@/lib/email-worker";
import { createCommerceService, hasCommerceService } from "@/lib/supabase/service";
import { getEmailConfig } from "@/lib/email-config";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getEmailConfig().enabled) return NextResponse.json({ enabled: false });
  if (!hasCommerceService()) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  try {
    const { error } = await createCommerceService().rpc("expire_retail_reservations_v2");
    if (error) throw new Error();
    const { error: automationError } = await createCommerceService().rpc("prepare_email_automations_v1");
    if (automationError) throw new Error();
    return NextResponse.json(await processEmailOutbox());
  } catch { return NextResponse.json({ error: "Processing failed" }, { status: 503 }); }
}
