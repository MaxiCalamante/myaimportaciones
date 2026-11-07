import {refreshExchangeRate} from '@/lib/exchange-rate';
import { createCommerceService, hasCommerceService } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { runCatalogImportJobs } from "@/lib/catalog-import-worker";
import { runSupplierAutomation } from "@/lib/supplier-automation";
import { runWholesalePriceRefresh } from "@/lib/wholesale-v2-worker";
import { invalidateAdminStorefrontCache } from "@/lib/storefront";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Up to 60 seconds on hobby/pro Vercel

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !hasCommerceService()) return NextResponse.json({ error: "Sincronización no configurada" }, { status: 503 });
  if (authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = Number(req.nextUrl.searchParams.get("limit") || 100);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return NextResponse.json({ error: "Límite inválido" }, { status: 400 });

  try {
    const serviceClient = createCommerceService();
    await refreshExchangeRate(serviceClient);
    const catalogImports = await runCatalogImportJobs(serviceClient, 8000);
    const report = await runSupplierAutomation(serviceClient, { worker: "vercel-daily", limit: Math.min(limit, 9), timeBudgetMs: 35000 });
    const wholesalePrices = await runWholesalePriceRefresh(serviceClient, Math.min(limit, 100));
    invalidateAdminStorefrontCache();
    revalidatePath("/", "layout");
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      report,
      catalogImports,
      wholesalePrices,
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
