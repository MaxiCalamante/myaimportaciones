import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig, getSupabaseConfig } from "@/lib/supabase/env";
import { canonicalRedirect } from "@/lib/site-redirect";

export async function proxy(request: NextRequest) {
  const canonical = canonicalRedirect(request.nextUrl, request.method);
  if (canonical) return NextResponse.redirect(canonical, 308);
  let response = NextResponse.next({ request });
  const preview = process.env.VERCEL_ENV === "preview";
  if (preview) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (!hasSupabaseConfig()) return response;
  const { url, anonKey } = getSupabaseConfig();
  const db = createServerClient(url, anonKey, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll(values) {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      if (preview) response.headers.set("X-Robots-Tag", "noindex, nofollow");
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  } });
  await db.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/mercadopago|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"] };
