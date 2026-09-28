"use client";

import { useState, useMemo, useTransition } from "react";
import { calculateResale, type ResaleInput } from "@/lib/resale-pricing";
import { formatCurrency as money } from "@/lib/format";
import { saveProductCostAction } from "@/app/admin/costos/actions";
import type { Product } from "@/lib/types";
import type { ProductCost } from "@/lib/product-profit";
import {
  Calculator,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Percent,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface RealCostsProps {
  products: Product[];
  costs?: ProductCost[];
  onSaved?: () => void;
}

export function RealCosts({ products, costs = [], onSaved }: RealCostsProps) {
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [supplierUrl, setSupplierUrl] = useState("");
  const [mlUrl, setMlUrl] = useState("");
  const [applyRetailPrice, setApplyRetailPrice] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const [input, setInput] = useState<ResaleInput>({
    purchase: 25000,
    exchange: 1,
    freight: 4500,
    other: 0,
    variable: 1200,
    feePercent: 8,
    minimum: 5000,
    ml: 55000,
  });

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const costsMap = useMemo(() => new Map(costs.map((c) => [c.product_id, c])), [costs]);

  // Filter products for the searchable dropdown
  const displayedProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    const filtered = q
      ? products.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.brand && p.brand.toLowerCase().includes(q))
        )
      : products;
    const selected = selectedProductId ? products.find((p) => p.id === selectedProductId) : null;
    const top = filtered.slice(0, 60);
    if (selected && !top.some((p) => p.id === selectedProductId)) {
      return [selected, ...top];
    }
    return top;
  }, [products, productSearch, selectedProductId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  // When a product is picked, auto-populate inputs
  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    setMessage(null);
    if (!productId) return;

    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const recordedCost = costsMap.get(productId);

    if (recordedCost) {
      setInput({
        purchase: Number(recordedCost.origin_cost || prod.supplierLivePrice || prod.retailPrice / 2),
        exchange: Number(recordedCost.exchange_rate || 1),
        freight: Number(recordedCost.freight_per_unit || 0),
        other: Number(recordedCost.other_landed_cost || 0),
        variable: Number(recordedCost.variable_cost || 0),
        feePercent: Number(recordedCost.payment_fee_percent || 0),
        minimum: Number(recordedCost.minimum_contribution || 0),
        ml: Number(recordedCost.ml_price || 0),
      });
      setCurrency(recordedCost.currency || "ARS");
      setSupplierUrl(recordedCost.supplier_url || prod.sourceUrl || "");
      setMlUrl(recordedCost.ml_url || "");
    } else {
      setInput((prev) => ({
        ...prev,
        purchase: Number(prod.supplierLivePrice || Math.round(prod.retailPrice * 0.5)),
        exchange: 1,
      }));
      setSupplierUrl(prod.sourceUrl || "");
      setMlUrl("");
    }
  };

  // Safe calculate resale
  const result = useMemo(() => {
    try {
      if (input.purchase <= 0 || input.exchange <= 0) return null;
      return calculateResale(input);
    } catch {
      return null;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProductId) {
      setMessage({ text: "Seleccioná un producto para guardar.", type: "error" });
      return;
    }
    if (!confirmed) {
      setMessage({ text: "Tenés que confirmar que revisaste las fuentes.", type: "error" });
      return;
    }

    const formData = new FormData(e.currentTarget);
    if (applyRetailPrice && result?.suggested) {
      formData.set("apply_retail_price", String(result.suggested));
    }

    startTransition(async () => {
      try {
        const res = await saveProductCostAction(formData);
        setMessage({ text: res, type: "success" });
        if (onSaved) onSaved();
      } catch (err: unknown) {
        setMessage({
          text: err instanceof Error ? err.message : "Error al guardar costos.",
          type: "error",
        });
      }
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-zinc-100 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
            <Calculator className="h-3.5 w-3.5 text-amber-600" />
            Estrategia de Mercado Libre
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">
            Simulador de Referencia & Fijación de Precios
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Comprobá el piso de costos reales, compará contra Mercado Libre y calculá el precio sugerido de venta (5% a 10% de ahorro para el cliente).
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Product selector card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
            1. Seleccionar Producto del Catálogo
          </label>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filtrar por nombre, SKU o marca..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>
            <div>
              <select
                required
                name="product_id"
                value={selectedProductId}
                onChange={(e) => handleSelectProduct(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 px-3 text-sm font-medium text-zinc-800 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">-- Elegí un producto ({displayedProducts.length} listados) --</option>
                {displayedProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.sku ? `[${p.sku}]` : ""} — PVP Actual: ${p.retailPrice.toLocaleString("es-AR")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedProduct && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-900">{selectedProduct.title}</span>
              {selectedProduct.sku && <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono">SKU: {selectedProduct.sku}</span>}
              <span className="rounded bg-sky-50 px-2 py-0.5 text-sky-800 font-medium">PVP Actual: ${selectedProduct.retailPrice.toLocaleString("es-AR")}</span>
              {selectedProduct.supplierLivePrice && (
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800 font-medium">
                  Costo Proveedor: ${selectedProduct.supplierLivePrice.toLocaleString("es-AR")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Inputs & Parameters */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left: Input parameters (7 cols) */}
          <div className="space-y-4 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                2. Estructura de Costos y Referencia
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-medium">Moneda:</span>
                <select
                  name="currency"
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    if (e.target.value === "ARS") {
                      setInput((prev) => ({ ...prev, exchange: 1 }));
                    }
                  }}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700"
                >
                  <option value="ARS">ARS ($)</option>
                  <option value="USD">USD (U$D)</option>
                  <option value="PYG">PYG (₲)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Costo de compra unitario ({currency})
                </label>
                <input
                  name="purchase"
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  value={input.purchase || ""}
                  onChange={(e) => setInput({ ...input, purchase: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-semibold focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Tipo de cambio a ARS {currency === "ARS" && "(Fijo en 1)"}
                </label>
                <input
                  name="exchange"
                  required
                  type="number"
                  min="0.001"
                  step="0.01"
                  disabled={currency === "ARS"}
                  value={currency === "ARS" ? 1 : input.exchange || ""}
                  onChange={(e) => setInput({ ...input, exchange: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 p-2.5 text-sm font-semibold disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Flete / Transporte por unidad (ARS)
                </label>
                <input
                  name="freight"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={input.freight}
                  onChange={(e) => setInput({ ...input, freight: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Otros costos de internación (ARS)
                </label>
                <input
                  name="other"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={input.other}
                  onChange={(e) => setInput({ ...input, other: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Gastos de venta / embalaje (ARS)
                </label>
                <input
                  name="variable"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={input.variable}
                  onChange={(e) => setInput({ ...input, variable: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Comisión de pasarela / cobro (%)
                </label>
                <input
                  name="feePercent"
                  required
                  type="number"
                  min="0"
                  max="99"
                  step="0.1"
                  value={input.feePercent}
                  onChange={(e) => setInput({ ...input, feePercent: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Contribución mínima deseada (ARS)
                </label>
                <input
                  name="minimum"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={input.minimum}
                  onChange={(e) => setInput({ ...input, minimum: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-900">
                  Precio referencia en Mercado Libre (ARS)
                </label>
                <input
                  name="ml"
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={input.ml || ""}
                  onChange={(e) => setInput({ ...input, ml: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-amber-300 bg-amber-50/50 p-2.5 text-sm font-bold text-amber-950 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Links */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700">
                    URL de la publicación del Proveedor
                  </label>
                  {supplierUrl && (
                    <a
                      href={supplierUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
                    >
                      Probar enlace <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  name="supplier_url"
                  required
                  value={supplierUrl}
                  onChange={(e) => setSupplierUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-xs text-zinc-800 focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700">
                    URL de publicación en Mercado Libre (mismo modelo/presentación)
                  </label>
                  {mlUrl && (
                    <a
                      href={mlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-amber-600 hover:underline"
                    >
                      Ver en ML <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  name="ml_url"
                  value={mlUrl}
                  onChange={(e) => setMlUrl(e.target.value)}
                  placeholder="https://articulo.mercadolibre.com.ar/MLA-..."
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-xs text-zinc-800 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Right: Real-time simulation results (5 cols) */}
          <div className="space-y-4 lg:col-span-5">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              3. Resultado en Tiempo Real
            </h3>

            {result ? (
              <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-900 p-6 text-white shadow-lg">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span className="text-xs font-medium text-zinc-400">Costo Puesto (Landed)</span>
                  <span className="text-base font-bold text-zinc-100">{money(result.landed)}</span>
                </div>

                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span className="text-xs font-medium text-zinc-400">Piso mínimo rentable</span>
                  <span className="text-base font-bold text-amber-400">{money(result.floor)}</span>
                </div>

                {input.ml > 0 && (
                  <div className="rounded-xl bg-zinc-800/80 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Referencia Mercado Libre</span>
                      <span className="font-semibold text-zinc-200">{money(input.ml)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Rango sugerido (-5% a -10%)</span>
                      <span className="font-mono text-zinc-300">
                        {money(result.low)} – {money(result.high)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-emerald-950/80 border border-emerald-700/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Precio de Venta Sugerido
                    </span>
                    {result.suggested !== null ? (
                      <span className="text-xl font-extrabold text-emerald-300">
                        {money(result.suggested)}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-400">
                        No viable debajo de ML
                      </span>
                    )}
                  </div>
                  {result.suggested !== null ? (
                    <div className="mt-3 flex items-center justify-between border-t border-emerald-800/80 pt-2 text-xs">
                      <span className="text-emerald-200/80">Contribución neta estimada:</span>
                      <strong className="text-emerald-300">
                        {money(result.contribution ?? 0)} (
                        {((result.contribution! / result.suggested) * 100).toFixed(1)}% margen)
                      </strong>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-amber-300/80 leading-relaxed">
                      El costo piso ({money(result.floor)}) supera el techo del 95% de Mercado Libre ({money(result.high)}). Para vender este producto rentablemente se debe reducir flete, compra o no ofrecer descuento frente a ML.
                    </p>
                  )}
                </div>

                {result.suggested !== null && selectedProduct && (
                  <label className="flex items-start gap-2.5 rounded-xl border border-sky-800/50 bg-sky-950/40 p-3 text-xs text-sky-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyRetailPrice}
                      onChange={(e) => setApplyRetailPrice(e.target.checked)}
                      className="mt-0.5 rounded border-sky-700 text-sky-500 focus:ring-sky-400"
                    />
                    <span>
                      <strong>Aplicar este precio a la tienda pública:</strong> Actualizar el precio minorista del producto a <strong>{money(result.suggested)}</strong> al guardar.
                    </span>
                  </label>
                )}
              </div>
            ) : (
              <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
                <p className="font-semibold text-zinc-700">Completá los costos de compra</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Ingresá el costo unitario para calcular la viabilidad y precios recomendados.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom confirmation & submit */}
        <div className="border-t border-zinc-200 pt-5 space-y-4">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
            <input
              required
              type="checkbox"
              name="confirmed"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
            />
            Confirmé costos del proveedor y la referencia equivalente de Mercado Libre.
          </label>

          {message && (
            <div
              className={`rounded-xl p-3.5 text-xs font-semibold ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500 max-w-xl">
              Al guardar, se registrará la estructura analítica de costos y enlaces. Si marcaste la casilla superior, el precio de venta en la web se actualizará al valor sugerido.
            </p>
            <button
              type="submit"
              disabled={isPending || !selectedProductId || !confirmed || !result}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-6 text-sm font-bold text-white shadow-md hover:bg-zinc-800 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isPending ? (
                "Guardando costos…"
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Guardar Costos Verificados
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
