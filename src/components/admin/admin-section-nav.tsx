"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Boxes, ChartNoAxesCombined, LayoutDashboard, Menu, Images } from "lucide-react";
import { useRef } from "react";

const sections = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/carrusel", label: "Carrusel", icon: Images },
  { href: "/admin/proveedores", label: "Proveedores", icon: Boxes },
  { href: "/admin/operaciones", label: "Operaciones", icon: Boxes },
  { href: "/admin/costos", label: "Stock y costos", icon: ChartNoAxesCombined },
  { href: "/admin/estado", label: "Estado de la tienda", icon: Activity },
];

export function AdminSectionNav() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const activeSection = sections.find(section => section.href === pathname)?.label;
  return (
    <div className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 md:hidden">
          <span className="min-w-0 text-sm font-bold text-zinc-900">{activeSection ?? "Administración"}</span>
          <details key={pathname} ref={menu} className="group relative shrink-0" onKeyDown={event => { if (event.key === "Escape" && menu.current) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); } }}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-800 marker:hidden">
              <Menu className="h-4 w-4" /> Secciones
            </summary>
            <nav aria-label="Secciones de administración" className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
              {sections.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => { if (menu.current) menu.current.open = false; }} aria-current={pathname === href ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${pathname === href ? "bg-sky-50 text-sky-900" : "text-zinc-700 hover:bg-zinc-50"}`}>
                  <Icon className="h-4 w-4" />{label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
        <nav aria-label="Secciones de administración" className="hidden flex-wrap gap-2 md:flex">
          {sections.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors ${pathname === href ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"}`}>
              <Icon className="h-4 w-4" />{label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
