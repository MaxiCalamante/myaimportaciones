import { createCommerceService, hasCommerceService } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { runBatchSupplierStockSync } from "@/lib/supplier-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Up to 60 seconds on hobby/pro Vercel

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !hasCommerceService()) return NextResponse.json({ error: "Sincronización no configurada" }, { status: 503 });
  if (authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = Number(req.nextUrl.searchParams.get("limit") || 30);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return NextResponse.json({ error: "Límite inválido" }, { status: 400 });

  try {
    const report = await runBatchSupplierStockSync({ limit, client: createCommerceService() });
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      report,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "No se pudo completar la sincronización.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
