'use client';
import{useState}from'react';
import type{ProfitabilityWorkspace}from'@/lib/profitability';
import{saveProfitabilityPolicy}from'@/app/admin/moneda/actions';
export function ProfitabilityPolicyEditor({workspace}:{workspace:ProfitabilityWorkspace|null}){
 const[message,setMessage]=useState(''),[pending,setPending]=useState(false);
 if(!workspace)return <section className="rounded-2xl border p-5"><h2 className="text-xl font-semibold">Rentabilidad pendiente de instalación</h2><p>Los objetivos propuestos son 30% minorista, 18% mayorista y piso 10%. No hay precios ni bloqueos activados por esta propuesta.</p></section>;
 const s=workspace.policy;
 return <section className="rounded-2xl border p-5"><h2 className="text-xl font-semibold">Margen de contribución</h2><p className="my-3 text-sm">Modo: {s.enforcement==='preview'?'simulación de impacto':'protección de checkout'}. El margen se calcula sobre ingreso, después de costos y cobro. Las comisiones pendientes impiden validar nuevas propuestas.</p>
 <form className="grid gap-4 sm:grid-cols-3" action={async f=>{setPending(true);try{const r=await saveProfitabilityPolicy(f);setMessage(r.ok?'Propuesta guardada.':r.error??'No se guardó.');}catch{setMessage('No se pudo guardar. Revisá tu acceso.');}finally{setPending(false);}}}>
 {([['retailTarget','Objetivo minorista (%)',s.retail_target],['wholesaleTarget','Objetivo mayorista (%)',s.wholesale_target],['minimumMargin','Piso mínimo (%)',s.minimum_margin]]as const).map(([name,label,value])=><label className="grid gap-1 text-sm" key={name}>{label}<input required name={name} type="number" min="10" max="99" step=".01" defaultValue={value} className="rounded-lg border p-2"/></label>)}
 <label className="grid gap-1 text-sm">Paso de precio USD<select name="usdStep" defaultValue={s.usd_step} className="rounded-lg border p-2"><option value="0.01">USD 0,01</option><option value="0.5">USD 0,50</option><option value="1">USD 1</option></select></label>
 <label className="grid gap-1 text-sm">Vigencia del costo (segundos)<input required name="costMaxAgeSeconds" type="number" min="60" max="2592000" defaultValue={s.cost_max_age_seconds} className="rounded-lg border p-2"/></label>
 <details className="sm:col-span-3"><summary>Tarifas documentadas por medio de pago · configuración avanzada</summary><p className="my-2 text-xs">Declarar cada tramo, cargo fijo, porcentaje, documento y vencimiento. Un 0% requiere confirmación expresa. La base puede ser importe bruto o ingreso sin IVA, según la tarifa.</p><textarea required name="methods" aria-label="Tarifas por medio de pago" defaultValue={JSON.stringify(s.methods,null,2)} className="min-h-52 w-full rounded-lg border p-2 font-mono text-xs"/></details>
 <label className="grid gap-1 text-sm sm:col-span-3">Motivo documentado<input required name="note" minLength={10} className="rounded-lg border p-2"/></label><button disabled={pending} className="rounded-lg bg-sky-800 p-3 text-white">Guardar propuesta</button><p role="status" className="sm:col-span-3">{message}</p></form></section>;
}
