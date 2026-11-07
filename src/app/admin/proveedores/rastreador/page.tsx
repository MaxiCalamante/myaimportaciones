import Link from "next/link";
import { redirect } from "next/navigation";
import { SupplierTrackerPanel } from "@/components/admin/supplier-tracker-panel";
import { getCurrentProfile } from "@/lib/auth";
import { createCommerceService } from "@/lib/supabase/service";
import { readTracker } from "./actions";

export const metadata = {
  title: "Proveedores y rastreador | MYA",
  robots: { index: false, follow: false },
};

const trackerPath = "/admin/proveedores/rastreador";
const pageSize = 25;
const archiveDate = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

async function CatalogArchive({ archive, page }: { archive: "productos" | "variantes"; page: number }) {
  const db = createCommerceService();
  const from = (page - 1) * pageSize;
  const listing = archive === "productos"
    ? await db.from("products")
        .select("id,title,supplier_archive_reason,supplier_archived_at", { count: "exact" })
        .not("supplier_archived_at", "is", null)
        .order("supplier_archived_at", { ascending: false }).order("id")
        .range(from, from + pageSize - 1)
    : await db.from("product_variants")
        .select("id,title,sku,product:products(title),supplier_archived_at", { count: "exact" })
        .not("supplier_archived_at", "is", null)
        .order("supplier_archived_at", { ascending: false }).order("id")
        .range(from, from + pageSize - 1)
        .returns<Array<{ id: string; title: string; sku: string | null; product: { title: string } | null; supplier_archived_at: string }>>();
  const pages = Math.max(1, Math.ceil((listing.count ?? 0) / pageSize));
  const archivePage = (number: number) => `${trackerPath}?archivo=${archive}&pagina=${number}`;

  return <section aria-labelledby="archive-title" className="rounded-2xl border border-zinc-200 p-4 sm:p-6">
    <h2 id="archive-title" className="text-xl font-semibold">Catálogo archivado</h2>
    <p className="mt-2 text-sm text-zinc-600">Productos y variantes retirados del catálogo comercial. Se conservan para consultar su historial.</p>
    <nav aria-label="Tipo de archivo" className="my-4 flex flex-wrap gap-4 text-sm font-semibold text-sky-800">
      <Link aria-current={archive === "productos" ? "page" : undefined} href={`${trackerPath}?archivo=productos`}>Productos archivados</Link>
      <Link aria-current={archive === "variantes" ? "page" : undefined} href={`${trackerPath}?archivo=variantes`}>Variantes archivadas</Link>
    </nav>
    {listing.error ? <p role="alert" className="text-sm text-red-800">No se pudo consultar el archivo. Volvé a intentarlo en unos minutos.</p> : <>
      <p className="text-sm text-zinc-600">{listing.count ?? 0} registros · Página {page} de {pages}</p>
      {listing.data?.length ? <ul className="mt-4 divide-y divide-zinc-200">
        {listing.data.map(row => <li key={row.id} className="py-3 text-sm">
          <p className="break-words font-semibold">{"product" in row && row.product ? `${row.product.title} · ` : ""}{row.title}</p>
          <p className="mt-1 break-words text-zinc-600">
            {archiveDate.format(new Date(row.supplier_archived_at))}
            {"supplier_archive_reason" in row && row.supplier_archive_reason ? ` · ${row.supplier_archive_reason}` : ""}
            {"sku" in row && row.sku ? ` · SKU ${row.sku}` : ""}
          </p>
        </li>)}
      </ul> : <p className="mt-4 text-sm text-zinc-600">Esta página está vacía.</p>}
      <nav aria-label="Páginas del archivo" className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-sky-800">
        {page > 1 && <Link href={archivePage(page > pages ? pages : page - 1)}>Anterior</Link>}
        {page < pages && <Link href={archivePage(page + 1)}>Siguiente</Link>}
      </nav>
    </>}
  </section>;
}

export default async function TrackerPage({ searchParams }: {
  searchParams: Promise<{ archivo?: string; pagina?: string }>;
}) {
  const { profile } = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin/proveedores/rastreador");
  if (profile.role !== "admin") redirect("/cuenta");

  const params = await searchParams;
  const archive = params.archivo === "productos" || params.archivo === "variantes" ? params.archivo : null;
  const page = params.pagina && /^\d{1,5}$/.test(params.pagina) ? Math.max(1, Number(params.pagina)) : 1;

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <Link href={archive ? trackerPath : "/admin"} className="text-sm font-semibold text-sky-800">
      {archive ? "← Rastreador" : "← Administración"}
    </Link>
    <h1 className="mt-4 text-3xl font-bold tracking-tight">Proveedores y rastreador</h1>
    {archive ? <div className="mt-6"><CatalogArchive archive={archive} page={page} /></div> : <>
      <p className="mb-4 mt-2 max-w-3xl text-sm text-zinc-600">Explorá categorías completas, revisá candidatos privados y supervisá las fichas seleccionadas. La importación crea borradores y la publicación conserva los controles de costos y disponibilidad.</p>
      <Link href={`${trackerPath}?archivo=productos`} className="mb-7 inline-flex min-h-11 items-center font-semibold text-sky-800">
        Ver catálogo archivado
      </Link>
      <SupplierTrackerPanel initial={await readTracker()} />
    </>}
  </main>;
}
