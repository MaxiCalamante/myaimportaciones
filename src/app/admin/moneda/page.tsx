import Link from 'next/link';
import{MoneyActionForm}from'@/components/admin/money-action-form';
import{ProfitabilityPolicyEditor}from'@/components/admin/profitability-policy-editor';
import type{ProfitabilityWorkspace}from'@/lib/profitability';
import {redirect} from 'next/navigation';
import {getCurrentProfile} from '@/lib/auth';
import {getAdminClient} from '@/lib/admin-auth';
import {getExchangeSnapshot} from '@/lib/monetary';
import {DOLLAR_TYPES} from '@/lib/exchange-rate';
import {readAllPages} from '@/lib/read-all-pages';
import {MoneyProductEditor} from '@/components/admin/money-product-editor';
import {saveMoneySettings,refreshMoneyRate,saveEmergencyRate} from './actions';
export default async function MoneyPage(){
 const {profile}=await getCurrentProfile();if(!profile)redirect('/login?next=/admin/moneda');if(profile.role!=='admin')redirect('/cuenta');
 const db=await getAdminClient();
 const [settings,exchange,products,prices,profitability]=await Promise.all([
  db.from('store_money_settings').select('*').eq('id',true).single(),getExchangeSnapshot(),
  readAllPages<{id:string;title:string;retail_price:number;wholesale_price:number;product_variants:Array<{id:string;title:string;retail_price:number;wholesale_price:number}>}>((from,to)=>db.from('products').select('id,title,retail_price,wholesale_price,product_variants(id,title,retail_price,wholesale_price)').is('deleted_at',null).order('id').range(from,to)),
  readAllPages<Record<string,unknown>>((from,to)=>db.from('product_usd_prices').select('*').order('id').range(from,to)),db.rpc('store_profitability_workspace_v2')]);
 if(settings.error||!settings.data)return <main className="mx-auto max-w-5xl p-6"><Link href="/admin">← Administración</Link><h1 className="mt-5 text-2xl font-bold">Configuración monetaria pendiente</h1><p>Aplicá la migración USD antes de usar esta sección. Los precios anteriores se conservan.</p></main>;
 const s=settings.data;
 const field=(label:string,name:string,value:string|number|null,min=0,max=1000000,step='1')=><label className="grid gap-1 text-sm" key={name}>{label}<input className="rounded-lg border p-2" type="number" name={name} defaultValue={value??''} min={min} max={max} step={step}/></label>;
 return <main className="mx-auto max-w-6xl space-y-8 px-4 py-8"><Link href="/admin" className="text-sky-800">← Administración</Link><h1 className="text-3xl font-bold">Monedas y precios USD</h1>
 <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-semibold">Cotización de venta</h2><p className="my-3 text-sm">{exchange?.rate?`Dólar ${DOLLAR_TYPES[exchange.kind]} venta: $${Number(exchange.rate).toLocaleString('es-AR')} ARS · ${exchange.status==='valid'?'vigente':'vencida'} · ${exchange.source}`:'Sin cotización válida'}</p><p className="text-xs text-zinc-600">Fuente: {exchange?.sourceAt??'sin datos'} · Consulta: {exchange?.fetchedAt??'sin datos'} · {s.last_error??'Sin errores registrados'}</p><MoneyActionForm action={refreshMoneyRate}><button className="my-3 rounded-lg bg-sky-800 px-4 py-2 text-white">Actualizar ahora desde DolarAPI</button></MoneyActionForm>
 <MoneyActionForm action={saveMoneySettings} className="grid gap-4 sm:grid-cols-3"><label className="grid gap-1 text-sm">Tipo de dólar<select name="kind" defaultValue={s.kind} className="rounded-lg border p-2">{Object.entries(DOLLAR_TYPES).map(([key,label])=><option key={key} value={key}>{label} · venta</option>)}</select></label>
 {field('Frecuencia (segundos)','refreshSeconds',s.refresh_seconds,300,86400)}{field('Vigencia de fuente (segundos)','maxAgeSeconds',s.max_age_seconds,900,604800)}{field('Cotización de compra (segundos)','quoteSeconds',s.quote_seconds,60,1800)}{field('Ajuste visible (%)','adjustment',s.adjustment,-20,50,'.0001')}{field('Redondeo ARS','roundArs',s.round_ars,.01,10000,'.01')}{field('Variación máxima sin revisión (%)','maxChange',s.max_change,1,100,'.01')}{(['retail','wholesale','minimum']as const).map(key=><input key={key} type="hidden" name={`${key}Margin`} value={s[`${key}_margin`]??''}/>)}<p className="text-xs text-zinc-600 sm:col-span-3">Los márgenes se configuran en Rentabilidad, con costos y comisiones propios de cada medio de pago.</p>
 <label className="grid gap-1 text-sm sm:col-span-3">Motivo del cambio<input required minLength={5} name="note" className="rounded-lg border p-2"/></label><button className="rounded-lg bg-zinc-950 px-4 py-3 text-white">Guardar configuración</button></MoneyActionForm></section>
 <section className="rounded-2xl border p-5"><h2 className="text-xl font-semibold">Cotización manual de emergencia</h2><p className="my-2 text-sm text-zinc-600">Se identifica como manual, conserva autor y motivo y vence automáticamente. «Actualizar ahora» permite volver a DolarAPI.</p><MoneyActionForm action={saveEmergencyRate} className="grid gap-4 sm:grid-cols-3">{field('ARS por USD · venta','rate',null,.01,9999999,'.000001')}{field('Vigencia (horas)','hours',4,1,72)}<label className="grid gap-1 text-sm">Motivo<input name="note" required minLength={10} className="rounded-lg border p-2"/></label><button className="rounded-lg border px-4 py-2">Aplicar emergencia</button></MoneyActionForm></section>
 <ProfitabilityPolicyEditor workspace={profitability.error?null:profitability.data as ProfitabilityWorkspace}/>
 <MoneyProductEditor roundArs={exchange?.roundArs??'1'} products={products} prices={prices} rate={exchange?.rate??null} profiles={(profitability.data as ProfitabilityWorkspace|null)?.profiles??[]} targets={profitability.data?{retail:String((profitability.data as ProfitabilityWorkspace).policy.retail_target),wholesale:String((profitability.data as ProfitabilityWorkspace).policy.wholesale_target)}:undefined}/>
 <p className="text-sm text-zinc-600">Adquisición, pasador y gastos se administran por separado en <Link className="underline" href="/admin/proveedores/inteligencia">Proveedores</Link> y <Link className="underline" href="/admin/costos">Costos</Link>. La conversión al público utiliza únicamente la cotización de venta.</p></main>;
}
