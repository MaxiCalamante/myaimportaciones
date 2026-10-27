import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AccountRole, CustomerTier, DataSource } from "@/lib/types";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: AccountRole;
  customerTier: CustomerTier;
  businessName?: string;
  cuit?: string;
  isApprovedWholesale?: boolean;
  isWholesalePending?: boolean;
  wholesaleRequestedAt?: string;
  wholesaleNotes?: string;
}

interface DbProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: AccountRole | null;
  customer_tier: CustomerTier | null;
  business_name: string | null;
  cuit: string | null;
  is_approved_wholesale: boolean | null;
  wholesale_requested_at: string | null;
  wholesale_notes: string | null;
}

export const getCurrentProfile = cache(async function getCurrentProfile(): Promise<{
  user: User | null;
  profile: Profile | null;
  source: DataSource;
}> {
  if (!hasSupabaseConfig()) {
    return { user: null, profile: null, source: "demo" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null, source: "supabase" };
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, customer_tier, business_name, cuit, is_approved_wholesale, wholesale_requested_at, wholesale_notes")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as DbProfile | null;

  const role: AccountRole = profile?.role ?? "customer";
  const customerTier: CustomerTier = profile?.customer_tier ?? "retail";
  const isApprovedWholesale = Boolean(
      profile?.is_approved_wholesale ||
      profile?.customer_tier === "wholesale" ||
      profile?.role === "admin"
  );
  const isWholesalePending = Boolean(!isApprovedWholesale && profile?.wholesale_requested_at);

  return {
    user,
    source: "supabase",
    profile: {
      id: user.id,
      fullName:
        profile?.full_name ??
        user.user_metadata?.full_name ??
        (user.email ?? "Cliente"),
      email: profile?.email ?? user.email ?? "",
      phone: profile?.phone ?? undefined,
      role,
      customerTier,
      businessName: profile?.business_name ?? undefined,
      cuit: profile?.cuit ?? undefined,
      isApprovedWholesale,
      isWholesalePending,
      wholesaleRequestedAt: profile?.wholesale_requested_at ?? undefined,
      wholesaleNotes: profile?.wholesale_notes ?? undefined,
    },
  };
});
