"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityStepper({ quantity, min = 1, max, onChange, label = "Cantidad" }: { quantity: number; min?: number; max: number; onChange: (value: number) => void; label?: string }) {
  return <div role="group" aria-label={label} className="inline-grid h-12 shrink-0 grid-cols-[2.75rem_2rem_2.75rem] items-center rounded-xl border border-zinc-200 bg-white">
    <button type="button" aria-label={`Reducir ${label.toLowerCase()}`} disabled={quantity <= min} onClick={() => onChange(Math.max(min, quantity - 1))} className="grid size-11 place-items-center rounded-l-xl text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-default disabled:opacity-30"><Minus className="size-4"/></button>
    <output aria-live="polite" aria-atomic="true" className="text-center text-sm font-semibold tabular-nums text-zinc-950">{quantity}</output>
    <button type="button" aria-label={`Aumentar ${label.toLowerCase()}`} disabled={quantity >= max} onClick={() => onChange(Math.min(max, quantity + 1))} className="grid size-11 place-items-center rounded-r-xl text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-default disabled:opacity-30"><Plus className="size-4"/></button>
  </div>;
}
