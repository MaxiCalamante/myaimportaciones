import { NextResponse } from "next/server";
import { createCommerceService } from "@/lib/supabase/service";
// RFC 8058: only POST changes consent. Link previews and crawlers cannot unsubscribe users.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  const { data, error } = await createCommerceService().rpc("unsubscribe_email_v1", { token_input: token });
  return NextResponse.json({ success: !error && data === true }, { status: error ? 503 : data ? 200 : 404 });
}
