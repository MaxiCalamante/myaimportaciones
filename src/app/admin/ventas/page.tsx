import Link from 'next/link';
import { getSales,type AdminSearch } from '@/lib/admin-commerce';
import { formatCurrency,formatPaymentMethod } from '@/lib/format';
import { AdminMetric,AdminPagination,SaleBadge,adminInput,adminCard } from '@/components/admin/commerce-ui';
import { CommerceRefresh } from '@/components/admin/commerce-refresh';
export const metadata={title:'Ventas',robots:{index:false,follow:false}};
export default async function SalesPage({searchParams}:{searchParams:Promise<AdminSearch>}) {
 const {data,page,q,status,customer,from,to}=await getSales(await searchParams);
 return <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
  <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Administración comercial</p><h1 className="mt-1 text-3xl font-bold">Ventas</h1><p className="mt-2 max-w-2xl text-sm text-zinc-600">Compras registradas, datos de entrega y seguimiento. Se actualiza cada 30 segundos mientras el panel está abierto.</p></div><CommerceRefresh/></header>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><AdminMetric label="Pedidos encontrados" value={data.total}/><AdminMetric label="Cobrado en estos pedidos" value={formatCurrency(Number(data.revenue))}/><AdminMetric label="Pendientes de pago" value={data.pending}/><AdminMetric label="Pagos a revisar" value={data.review}/></div>
  <form className={`${adminCard} grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]`}>
   {customer&&<input type="hidden" name="cliente" value={customer}/>}
   <label className="min-w-0 text-xs font-semibold text-zinc-600">Buscar pedido, cliente o producto<input type="search" name="buscar" maxLength={100} defaultValue={q} placeholder="Código, nombre, email, producto o SKU" className={adminInput}/></label>
   <label className="min-w-0 text-xs font-semibold text-zinc-600">Estado<select name="estado" defaultValue={status} className={adminInput}><option value="">Todos</option><option value="pending">Pendientes de pago</option><option value="paid">Pago confirmado</option><option value="preparing">En preparación</option><option value="shipped">En camino</option><option value="delivered">Entregados</option><option value="cancelled">Cancelados</option><option value="review">Pago a revisar</option></select></label>
   <label className="min-w-0 text-xs font-semibold text-zinc-600">Desde<input type="date" name="desde" defaultValue={from??''} className={adminInput}/></label>
   <label className="min-w-0 text-xs font-semibold text-zinc-600">Hasta<input type="date" name="hasta" defaultValue={to??''} className={adminInput}/></label>
   <div className="flex items-end gap-3"><button className="min-h-11 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white">Filtrar</button><Link href="/admin/ventas" className="inline-flex min-h-11 items-center text-sm font-semibold text-sky-800">Limpiar</Link></div>
  </form>
  {customer&&<p className="text-sm text-zinc-600">Mostrando pedidos de una cuenta. <Link href={`/admin/clientes/${customer}`} className="font-semibold text-sky-800 underline">Ver cliente</Link></p>}
  {data.rows.length?<section aria-label="Pedidos" className="space-y-3">{data.rows.map(order=><article key={order.id} className={adminCard}>
   <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 flex-wrap items-center gap-3"><Link href={`/admin/ventas/${order.id}`} className="break-all font-bold text-sky-900 underline decoration-sky-200 underline-offset-4">{order.tracking_code||order.id.slice(0,8)}</Link><SaleBadge status={order.status} review={order.payment_review}/></div><time className="text-xs text-zinc-500">{new Date(order.created_at).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'short'})}</time></div>
   <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-[1fr_1.5fr_auto]"><div className="min-w-0"><p className="font-semibold">{order.shipping_name||'Sin nombre'}</p><p className="mt-1 break-all text-sm text-zinc-600">{order.customer_email}</p><p className="mt-2 text-xs text-zinc-500">{order.profile_id?`Cuenta: ${order.account_name||order.account_email||'registrada'}`:'Compra sin cuenta'}</p></div><div className="min-w-0"><p className="line-clamp-3 break-words text-sm text-zinc-800">{order.items.map(i=>`${i.quantity} × ${i.product_title}`).join(' · ')||'Sin líneas registradas'}</p><p className="mt-2 line-clamp-2 break-words text-xs text-zinc-500">Entrega: {order.shipping_address||'Sin informar'}</p></div><div><p className="whitespace-nowrap text-xl font-bold tabular-nums">{formatCurrency(Number(order.total_amount))}</p><p className="mt-1 text-xs text-zinc-500">{formatPaymentMethod(order.payment_method)}</p><Link href={`/admin/ventas/${order.id}`} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-sky-800">Ver compra →</Link></div></div>
  </article>)}</section>:<div className={`${adminCard} py-12 text-center`}><h2 className="text-lg font-bold">No hay ventas con estos filtros</h2><p className="mt-2 text-sm text-zinc-500">Las nuevas compras aparecerán acá cuando se registre el pedido.</p></div>}
  <AdminPagination page={page} total={data.total} path="/admin/ventas" query={{buscar:q,estado:status,cliente:customer,desde:from??'',hasta:to??''}}/>
 </div>;
}
