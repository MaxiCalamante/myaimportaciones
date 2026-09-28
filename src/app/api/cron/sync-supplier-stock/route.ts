import { NextRequest, NextResponse } from "next/server";
import { runBatchSupplierStockSync } from "@/lib/supplier-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Up to 60 seconds on hobby/pro Vercel

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const isBearerValid = authHeader === `Bearer ${cronSecret}`;
    const isVercelCron = req.headers.get("x-vercel-cron") === "1";
    const keyParam = req.nextUrl.searchParams.get("key");
    const isKeyValid = keyParam === cronSecret;

    if (!isBearerValid && !isVercelCron && !isKeyValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 30), 100);

  try {
    const report = await runBatchSupplierStockSync({ limit });
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      report,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error executing cron sync",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
