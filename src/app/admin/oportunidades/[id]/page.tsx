import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { getAdminClient } from '@/lib/admin-auth';
import { cleanWholesaleTitle, detectStoreCategory } from '@/lib/supplier-opportunities';
import type { FoundProduct } from '@/lib/supplier-tracker/adapters';
import { matchSupplierProduct, validGtin } from '@/lib/supplier-matching';
import { readAllPages } from '@/lib/read-all-pages';
import { CatalogSyncButton } from '@/components/admin/catalog-sync-button';
import { OpportunityPublication, type PublicationInput } from '@/components/admin/opportunity-publication';
import { displayCatalogAmount, displayCatalogDate } from '@/components/admin/supplier-opportunity-catalog';

export const metadata = { title:'Revisar oportunidad | MYA', robots:{ index:false, follow:false } };

function isFresh(checkedAt: string|null, freshnessHours: number) {
  return !!checkedAt && Date.now()-Date.parse(checkedAt)<freshnessHours*3_600_000;
}

function titleForMya(value: string, supplierKey?: string) {
  const title=cleanWholesaleTitle(value);
  if (supplierKey!=='atacado-connect' && supplierKey!=='total') return title;
  return title.replace(/\bgeraç(?:ão|ao)\b/gi,'generación')
    .replace(/\btela\b/gi,'pantalla')
    .replace(/\bchave de fenda\b/gi,'destornillador')
    .replace(/\bparafusadeira\b/gi,'atornillador')
    .replace(/\bfuradeira\b/gi,'taladro')
    .replace(/\s-\sPrata$/i,' - Plata')
    .replace(/\s-\sPreto$/i,' - Negro')
    .replace(/\s-\sBranco$/i,' - Blanco');
}

export default async function OpportunityPage({ params }: { params:Promise<{ id:string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { profile } = await getCurrentProfile();
  if (!profile) redirect('/login?next=/admin/oportunidades');
  if (profile.role !== 'admin') redirect('/cuenta');
  const db = await getAdminClient();
  const [itemResult, review, categoriesResult] = await Promise.all([
    db.from('supplier_tracker_items').select('*').eq('id',id).maybeSingle(),
    db.from('supplier_catalog_publication_reviews').select('input').eq('item_id',id).maybeSingle(),
    db.from('categories').select('id,name,slug,parent_id').order('name'),
  ]);
  if (!itemResult.data) notFound();
  const item = itemResult.data;
  const detail = item.evidence?.lastResult as (FoundProduct & { listingConflict?:string }) | undefined;
  const [source, product] = await Promise.all([
    db.from('suppliers').select('name,official_key,freshness_hours').eq('id',item.supplier_id).maybeSingle(),
    item.product_id ? db.from('products').select('id,title,slug,is_active,deleted_at,supplier_archived_at').eq('id',item.product_id).maybeSingle() : null,
  ]);
  const categories = (categoriesResult.data ?? []).map(c => ({...c,parentId:c.parent_id,imageUrl:null}));
  const title = titleForMya(item.title,source.data?.official_key);
  const proposed = detectStoreCategory(title,categories,item.brand);
  const initial: PublicationInput = review.data?.input ?? {
    title, description:detail?.description ?? '', categoryId:proposed.categoryId,
    evidence:'', conditionEvidence:'', identityConfirmed:false, mediaAuthorized:false, complianceConfirmed:false,
    basis: detail?.cost && detail.currency ? {
      status:'COSTO_VERIFICADO', origin:String(detail.cost), currency:detail.currency, supplierUrl:detail.url,
      unitsPerUsd:detail.currency==='USD'?'1':'', fxSource:'', fxAt:'', document:'',
      settlementBasis:'',settlementDocument:'',costsComplete:false,accountingConfirmed:false,
      accountingBasis:'',identityVerified:false,
      carrier:{kind:'',confirmed:false,document:'',validUntil:''}, components:[],
      ...(source.data?.official_key==='total' && detail.taxBasis!=='included' ? { originTaxDocument:'' } : {}),
    } : null,
  };
  const isRecent = !item.last_error && isFresh(item.last_success_at,source.data?.freshness_hours ?? 24);
  const availability = isRecent && detail?.availability === 'in_stock' ? 'Stock confirmado en origen'
    : isRecent && detail?.availability === 'out_of_stock' ? 'Sin stock en origen' : 'Disponibilidad a confirmar';
  type Alternative = { id:string; title:string; brand:string; model:string; gtin:string|null; supplier_id:string; url:string;
    origin_cost:number|null; currency:string|null; last_success_at:string|null; last_error:string|null;
    evidence:{lastResult?:FoundProduct}; suppliers:{name:string;freshness_hours:number}[] };
  const verifiedGtin = detail?.gtin && validGtin(detail.gtin) ? detail.gtin : null;
  const alternatives = detail && (verifiedGtin || (detail.brand && detail.model)) ? await readAllPages<Alternative>((from,to) => {
    const query=db.from('supplier_tracker_items').select('id,title,brand,model,gtin,supplier_id,url,origin_cost,currency,last_success_at,last_error,evidence,suppliers!inner(name,freshness_hours)')
      .neq('supplier_id',item.supplier_id).eq('excluded',false).eq('suppliers.is_active',true)
      .eq('suppliers.automation_authorized',true).is('suppliers.archived_at',null);
    return (verifiedGtin ? query.eq('gtin',verifiedGtin) : query.eq('brand',detail.brand).eq('model',detail.model))
      .order('id').range(from,to);
  }).then(rows => rows.filter(row => {
    const other = row.evidence.lastResult;
    if (!other || row.last_error || other.variantKey==='source') return false;
    const specifications = { ...other.specifications, ...(other.gtin ? {GTIN:other.gtin} : {}) };
    const match=matchSupplierProduct({title:detail.title,brand:detail.brand,model:detail.model,gtin:detail.gtin},
      [{productId:row.id,variantId:null,title:other.title,brand:other.brand,model:other.model,sku:other.sku,specifications,sourceUrl:null}]);
    return match.status==='exact';
  })).catch(error => {
    console.error('[supplier-opportunities] Could not read alternatives',error);
    return [];
  }) : [];
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
    <Link href="/admin/oportunidades" className="text-sm font-semibold text-sky-800">← Volver a oportunidades</Link>
    <section className="rounded-xl border p-4 sm:p-6">
      <div className="flex items-start gap-4">
        {detail?.imageUrl && <Image unoptimized width={80} height={80} src={detail.imageUrl} alt="" className="size-20 shrink-0 rounded-lg object-contain" />}
        <div className="min-w-0"><p className="text-sm text-zinc-600">{source.data?.name} · Ref. {item.sku || item.external_id}</p>
          <h1 className="mt-1 break-words text-xl font-bold">{item.title}</h1>
          <p className="mt-1 text-sm">{availability}{isRecent && detail?.quantity != null ? ' · ' + detail.quantity + ' unidades en origen' : ''}</p>
          <p className="text-sm">Precio de origen {displayCatalogAmount(item.origin_cost,item.currency ?? '')}</p>
          <p className="text-xs text-zinc-600">Ficha verificada {displayCatalogDate(item.last_success_at)}</p>
        </div>
      </div>
      {item.last_error && <p className="my-3 break-words text-sm text-red-800">{item.last_error}</p>}
      {detail?.warnings?.length ? <ul className="my-3 list-disc pl-5 text-sm text-zinc-700">{detail.warnings.map(w => <li key={w}>{w}</li>)}</ul> : null}
      {detail?.description && <details className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm">
        <summary className="cursor-pointer font-medium">Descripción de origen</summary>
        <p className="mt-2 break-words">{detail.description}</p>
      </details>}
      {detail?.specifications && Object.keys(detail.specifications).length>0 && <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {Object.entries(detail.specifications).map(([name,value]) => <div key={name} className="min-w-0 break-words rounded-lg bg-zinc-50 p-2"><dt className="font-medium">{name}</dt><dd>{value}</dd></div>)}
      </dl>}
      <div className="mt-4 flex flex-wrap items-start gap-4">
        <a href={item.url} target="_blank" rel="noreferrer" className="py-2 text-sm font-semibold text-sky-800 underline">Abrir ficha original</a>
        {detail?.url && detail.url !== item.url && <a href={detail.url} target="_blank" rel="noreferrer" className="py-2 text-sm font-semibold text-sky-800 underline">Ficha nativa verificada</a>}
        <CatalogSyncButton label="Actualizar ficha" itemId={id} verifyOnOpen={!isRecent} />
      </div>
    </section>
    {!!alternatives.length && <section className="space-y-3 rounded-xl border p-4">
      <h2 className="font-semibold">Otras referencias con la misma identidad</h2>
      <p className="text-sm text-zinc-600">Verificá la presentación y sus costos antes de elegir una fuente.</p>
      {alternatives.map(other => {
        const supplier = Array.isArray(other.suppliers) ? other.suppliers[0] : other.suppliers;
        const stock = isFresh(other.last_success_at,supplier?.freshness_hours ?? 24) && other.evidence.lastResult?.availability==='in_stock';
        return <div key={other.id} className="min-w-0 break-words rounded-lg bg-zinc-50 p-3 text-sm">
          <p className="font-medium">{supplier?.name} · {other.title}</p>
          <p>{displayCatalogAmount(other.origin_cost,other.currency ?? '')} · {stock?'Stock confirmado':'Disponibilidad a confirmar'}</p>
          <p className="text-xs">Ficha verificada {displayCatalogDate(other.last_success_at)}</p>
          <Link href={'/admin/oportunidades/'+other.id} className="text-sky-800 underline">Revisar oferta</Link>
        </div>;
      })}
    </section>}
    {product?.data ? <section className="space-y-2 rounded-xl border p-4 text-sm">
      <h2 className="text-lg font-semibold">Producto MYA vinculado</h2>
      <p>{product.data.title}</p>
      <div className="flex flex-wrap gap-4 font-semibold text-sky-800">
        <Link href={'/admin?editProduct='+product.data.id}>Editar producto</Link>
        <Link href="/admin/moneda">Revisar costos y precios</Link>
        {product.data.is_active && !product.data.deleted_at && !product.data.supplier_archived_at && <Link href={'/producto/'+product.data.slug}>Ver en tienda</Link>}
        <Link href={'/admin/proveedores/rastreador?q='+encodeURIComponent(item.sku||item.title)}>Comparar proveedores e historial</Link>
      </div>
    </section> : <OpportunityPublication itemId={id} categories={categories} initial={initial} listingConflict={detail?.listingConflict} />}
  </main>;
}
