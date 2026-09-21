import { NextRequest, NextResponse } from "next/server";
import { getMercadoPagoPaymentDetails } from "@/lib/mercadopago";
import { verifyPaymentSignature } from "@/lib/payment-signature";
import { createCommerceService } from "@/lib/supabase/service";
export async function POST(req: NextRequest) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const collector = process.env.MERCADOPAGO_COLLECTOR_ID;
  if (!secret || !collector) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const id = req.nextUrl.searchParams.get("data.id") ?? "";
  if (!verifyPaymentSignature(req.headers.get("x-signature"), req.headers.get("x-request-id"), id, secret)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  try {
    const body = await req.json();
    if (body.type !== "payment" || String(body.data?.id) !== id) return NextResponse.json({ received: true });
    const payment = await getMercadoPagoPaymentDetails(id);
    if (!payment) return NextResponse.json({ error: "Payment lookup failed" }, { status: 503 });
    if (String(payment.collector_id) !== collector || payment.currency_id !== "ARS" || (process.env.NODE_ENV === "production" && !payment.live_mode)) return NextResponse.json({ error: "Payment mismatch" }, { status: 400 });
    const db = createCommerceService();
    const { error } = await db.rpc("reconcile_retail_payment_v2", { order_id_input: payment.external_reference, payment_id_input: String(payment.id), amount_input: payment.transaction_amount, status_input: payment.status });
    if (error) return NextResponse.json({ error: "Reconciliation failed" }, { status: 503 });
    return NextResponse.json({ received: true });
  } catch { return NextResponse.json({ error: "Processing failed" }, { status: 503 }); }
}
