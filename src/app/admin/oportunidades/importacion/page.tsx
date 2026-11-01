import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { SupplierCatalogManager } from "@/components/admin/supplier-catalog-manager";
import { readCatalogImportAction, readCatalogReviewsAction } from "../import-actions";

export const metadata = {
  title: "Importación de catálogos | Administración MYA",
  robots: { index: false, follow: false },
};

export default async function CatalogImportPage() {
  const { profile } = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin/oportunidades/importacion");
  if (profile.role !== "admin") redirect("/cuenta");

  const initialData = await readCatalogImportAction({ page: 1, pageSize: 30 });
  const initialReviews = initialData.installed ? await readCatalogReviewsAction() : [];
  return <main className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><SupplierCatalogManager initialData={initialData} initialReviews={initialReviews} /></main>;
}
