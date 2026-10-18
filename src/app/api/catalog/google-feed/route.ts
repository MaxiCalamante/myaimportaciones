import { NextResponse } from "next/server";
import { getStorefrontData } from "@/lib/storefront";
import { merchantFeed } from "@/lib/merchant-feed";
export const dynamic = "force-dynamic";
export async function GET() {
  const { products, error } = await getStorefrontData({ all: true });
  if (error) return new NextResponse("Catálogo temporalmente no disponible", { status: 503, headers: { "Cache-Control": "no-store" } });
  return new NextResponse(merchantFeed(products, process.env.COMMERCE_CHECKOUT_ENABLED === "true"), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
