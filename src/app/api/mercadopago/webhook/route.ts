import { NextRequest, NextResponse } from "next/server";
import { getMercadoPagoPaymentDetails } from "@/lib/mercadopago";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const id = url.searchParams.get("id") || url.searchParams.get("data.id");

    const body = await req.json().catch(() => ({}));
    const paymentId = id || body?.data?.id || body?.id;

    if (!paymentId || (topic && topic !== "payment")) {
      return NextResponse.json({ received: true });
    }

    const payment = await getMercadoPagoPaymentDetails(String(paymentId));
    if (!payment) {
      return NextResponse.json({ received: true, note: "No payment found" });
    }

    const trackingCode = payment.external_reference;
    const status = payment.status; // 'approved', 'pending', 'rejected'

    if (trackingCode && status === "approved") {
      const supabase = await createServerSupabaseClient();
      await supabase
        .from("orders")
        .update({
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("tracking_code", trackingCode);
    }

    return NextResponse.json({ received: true, status });
  } catch (error: any) {
    console.error("Mercado Pago Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Mercado Pago Webhook Active" });
}
