"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/env";

export function createBrowserSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient(url, anonKey);
}
