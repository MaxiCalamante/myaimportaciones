import { NextResponse } from 'next/server';
import { getPublicWholesalePolicy, getPublicWholesaleOffers } from '@/lib/wholesale-v2-read';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const policy = await getPublicWholesalePolicy();
    const offers = await getPublicWholesaleOffers(items);
    return NextResponse.json({ ok: true, policy, offers });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'No se pudieron verificar los precios mayoristas. El pedido requiere confirmación.' },
      { status: 500 }
    );
  }
}
