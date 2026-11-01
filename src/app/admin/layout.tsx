import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { AdminSectionNav } from "@/components/admin/admin-section-nav";

// Administrative data requires the current session and must never be prerendered.
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin");
  if (profile.role !== "admin") redirect("/cuenta");
  return <div className="min-h-screen bg-zinc-50/70"><AdminSectionNav />{children}</div>;
}
