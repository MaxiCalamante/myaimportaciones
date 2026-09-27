import { AdminSectionNav } from "@/components/admin/admin-section-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-zinc-50/70"><AdminSectionNav />{children}</div>;
}
