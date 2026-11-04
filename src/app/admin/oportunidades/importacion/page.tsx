import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { SupplierCatalogManager } from "@/components/admin/supplier-catalog-manager";
import { readCatalogImportAction, readCatalogReviewsAction } from "../import-actions";

export const metadata = {
  title: "Importación de catálogos | Administración MYA",
  robots: { index: false, follow: false },
};

export default async function CatalogImportPage({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  const { profile } = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin/oportunidades/importacion");
  if (profile.role !== "admin") redirect("/cuenta");

  const { producto } = await searchParams;
  const productId = typeof producto === "string" && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(producto) ? producto : undefined;
  const initialData = await readCatalogImportAction({ page: 1, pageSize: 30 });
  const initialReviews = initialData.installed ? await readCatalogReviewsAction(productId) : [];
  return <main className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><SupplierCatalogManager reviewProductId={productId} initialData={initialData} initialReviews={initialReviews} /></main>;
}
