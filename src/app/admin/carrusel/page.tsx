import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getAdminClient } from "@/lib/admin-auth";
import { defaultCarouselSlides, parseCarouselSlides } from "@/lib/carousel";
import { CarouselManager } from "@/components/admin/carousel-manager";

export const metadata = { title: "Carrusel del inicio", robots: { index: false, follow: false } };
export default async function CarouselPage() {
  const { profile } = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin/carrusel");
  if (profile.role !== "admin") redirect("/cuenta");
  const db = await getAdminClient();
  const { data, error } = await db.from("storefront_carousel").select("slides,revision").eq("id", 1).maybeSingle();
  const missing = error?.code === "42P01" || error?.code === "PGRST205";
  if (error && !missing) throw new Error("No se pudo leer la configuración del carrusel.");
  return <CarouselManager initialSlides={data ? parseCarouselSlides(data.slides) : defaultCarouselSlides} initialRevision={data?.revision ?? 0} ready={Boolean(data) && !missing} />;
}
