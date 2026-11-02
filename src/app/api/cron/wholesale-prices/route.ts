import { createCommerceService, hasCommerceService } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { runWholesalePriceRefresh } from "@/lib/wholesale-v2-worker";
import { invalidateAdminStorefrontCache } from "@/lib/storefront";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !hasCommerceService()) {
    return NextResponse.json({ error: "Sincronización no configurada" }, { status: 503 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 100;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return NextResponse.json({ error: "Límite inválido" }, { status: 400 });
  }

  try {
    const serviceClient = createCommerceService();
    const wholesalePrices = await runWholesalePriceRefresh(serviceClient, limit);
    invalidateAdminStorefrontCache();
    revalidatePath("/mayorista", "page");
    revalidatePath("/", "layout");

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      wholesalePrices,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo actualizar los precios mayoristas.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
