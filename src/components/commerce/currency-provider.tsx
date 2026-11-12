'use client';
import {createContext,useContext,useEffect,useRef,type ReactNode} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {exchangeRateLabel,exchangeSourceLabel,type ExchangeSnapshot} from '@/lib/exchange-rate';
import {formatCurrency} from '@/lib/format';
import {formatUsd,arsToUsd,usdToArs,multiplyUsd} from '@/lib/money';
import type {Product,ProductVariant,ProductChannel,CartLine} from '@/lib/types';
const CurrencyContext=createContext<ExchangeSnapshot|null>(null);
export function CurrencyProvider({snapshot,children}:{snapshot:ExchangeSnapshot|null;children:ReactNode}){
 const router=useRouter(),pathname=usePathname(),previousPath=useRef(pathname),previousRate=useRef(snapshot?.id);
 useEffect(()=>{if(previousPath.current!==pathname){previousPath.current=pathname;router.refresh();}},[pathname,router]);
 useEffect(()=>{
  if(!snapshot)return;
  const refresh=()=>{if(document.visibilityState==='visible')router.refresh();};
  const timer=setInterval(refresh,Math.max(300000,(snapshot.refreshSeconds??900)*1000));window.addEventListener('focus',refresh);
  return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[snapshot,router]);
 useEffect(()=>{if(previousRate.current!==snapshot?.id){previousRate.current=snapshot?.id;window.dispatchEvent(new Event('focus'));}},[snapshot?.id]);
 return <CurrencyContext.Provider value={snapshot}>{children}</CurrencyContext.Provider>;
}
export function ExchangeTicker({compact=false}:{compact?:boolean}){
 const rate=useContext(CurrencyContext);
 const dollarKind=rate?exchangeRateLabel(rate.kind):'Cotización';
 const formattedRate=rate?.rate?formatCurrency(Number(rate.rate)):'a confirmar';
 const formattedTime=rate?.sourceAt
  ?new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(rate.sourceAt))
  :null;
 const fullUpdate=rate?.sourceAt?new Date(rate.sourceAt).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'}):'sin datos';
 const tooltip=`Cotización informativa: ${dollarKind} · 1 USD = ${formattedRate} ARS · Fuente: ${rate?exchangeSourceLabel(rate.source):'sin datos'} (${fullUpdate})${rate&&Number(rate.adjustment)!==0?` · Ajuste ${rate.adjustment}%`:''} · ${rate?.status==='valid'?'vigente':'requiere actualización'}`;
 return <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums text-[10px] sm:text-[11px]" title={tooltip} aria-label={`${dollarKind}: 1 USD = ${formattedRate} ARS. Actualizado ${formattedTime||fullUpdate}`}>
  <span className="font-bold text-emerald-400">USD 1</span>
  <span className="text-zinc-500">=</span>
  <span className="font-extrabold text-white">{formattedRate} ARS</span>
  {!compact&&<span className="hidden text-zinc-400 sm:inline text-[10px]">({dollarKind})</span>}
  {formattedTime&&<span className="text-zinc-500 text-[9px] sm:text-[10px]">· {formattedTime}</span>}
  {rate?.status==='stale'&&<span className="rounded bg-amber-400/20 px-1 text-[9px] font-semibold text-amber-300">a revalidar</span>}
 </span>;
}
export function DualPrice({ars,usd,context=false}:{ars:number|null;usd?:string|null;context?:boolean}){
 const rate=useContext(CurrencyContext);
 if(!usd)return <span>{ars===null||ars<=0?'Precio por confirmar':formatCurrency(ars)}</span>;
 return <span className="inline-flex max-w-full flex-col tabular-nums"><span>{formatUsd(usd)}</span><span className="text-xs font-medium tracking-normal text-zinc-600">{ars===null||ars<=0?'ARS a confirmar':`Aprox. ${formatCurrency(ars)} ARS`}{rate?.status==='stale'?' · cotización vencida':''}</span>{context&&<span className="mt-1 text-[11px] font-normal tracking-normal text-zinc-500">{rate?`${exchangeRateLabel(rate.kind)}${Number(rate.adjustment)!==0?` · ajuste ${rate.adjustment}%`:''}`:'Cotización a confirmar'}</span>}</span>;
}
export function ProductPrice({product,channel='retail',ars,variant,context=false,quantity=1}:{quantity?:number;product:Product;channel?:ProductChannel;ars:number|null;variant?:ProductVariant|null;context?:boolean}){
 const rate=useContext(CurrencyContext);
 const target=variant??(product.hasVariants?product.variants?.filter(v=>v.isActive&&v.retailPrice>0).sort((a,b)=>a.retailPrice-b.retailPrice)[0]:product);
 const base=channel==='wholesale'?target?.wholesaleUsd:target?.retailUsd;
 const adjusted=channel==='wholesale'&&base&&ars!==null&&ars>0&&rate?.rate&&usdToArs(base,rate.rate,rate.roundArs)!==ars;
 return <span className="inline-flex flex-col"><DualPrice ars={ars===null?null:ars*quantity} usd={base?multiplyUsd(adjusted?arsToUsd(ars!,rate!.rate!):base,quantity):null} context={context}/>{adjusted&&<span className="text-[10px] font-normal tracking-normal text-zinc-500">Base {formatUsd(base!)} · regla comercial aplicada</span>}</span>;
}
export function CartUsd({line}:{line:CartLine}){
 const target=line.variantId?line.product.variants?.find(v=>v.id===line.variantId):line.product;
 const usd=line.channel==='wholesale'?target?.wholesaleUsd:target?.retailUsd;
 return usd?<span className="block text-xs font-medium text-zinc-600">Base por unidad: {formatUsd(usd)}</span>:null;
}

export function CurrencyTotal({ars,allUsd}:{ars:number;allUsd:boolean}){const rate=useContext(CurrencyContext);return <DualPrice ars={ars} usd={allUsd&&rate?.rate?arsToUsd(ars,rate.rate):null}/>;}
