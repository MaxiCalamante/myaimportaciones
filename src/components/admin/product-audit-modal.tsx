"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  History,
  X,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  ShieldCheck,
  RotateCcw,
  Download,
  Check,
  Calendar,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  getProductAuditLogsAction,
  rollbackProductPriceAction,
  exportProductAuditLogsCsvAction,
  type ProductAuditLogEntry,
} from "@/app/admin/actions";

export interface ProductAuditModalProps {
  isOpen: boolean;
  product: {
    id: string;
    title: string;
    sku?: string | null;
    retailPrice: number;
    wholesalePrice: number;
    stock: number;
  } | null;
  onClose: () => void;
  onPriceRolledBack?: (newRetail: number, newWholesale?: number) => void;
}

export function ProductAuditModal({
  isOpen,
  product,
  onClose,
  onPriceRolledBack,
}: ProductAuditModalProps) {
  const [logs, setLogs] = useState<ProductAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  // Filters state
  const [dateFilter, setDateFilter] = useState<"all" | "24h" | "7d" | "30d">("all");
  const [actionFilter, setActionFilter] = useState<"all" | "price" | "stock" | "rollback" | "bulk">("all");

  // Live updated prices if rolled back
  const [currentRetail, setCurrentRetail] = useState<number>(product?.retailPrice ?? 0);
  const [currentWholesale, setCurrentWholesale] = useState<number>(product?.wholesalePrice ?? 0);

  useEffect(() => {
    if (product) {
      setCurrentRetail(product.retailPrice);
      setCurrentWholesale(product.wholesalePrice);
    }
  }, [product]);

  const loadLogs = (productId: string) => {
    setLoading(true);
    setError(null);
    getProductAuditLogsAction(productId)
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error al cargar el historial de cambios.");
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!isOpen || !product) {
      setLogs([]);
      setError(null);
      setSuccessMsg(null);
      setDateFilter("all");
      setActionFilter("all");
      return;
    }
    loadLogs(product.id);
  }, [isOpen, product]);

  const handleRollback = (targetRetail: number, targetWholesale?: number, sourceDate?: string) => {
    if (!product) return;
    const confirmMsg = targetWholesale
      ? `¿Restaurar el precio a ${formatCurrency(targetRetail)} minorista y ${formatCurrency(targetWholesale)} mayorista?`
      : `¿Restaurar el precio minorista a ${formatCurrency(targetRetail)}?`;

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      try {
        setError(null);
        await rollbackProductPriceAction(product.id, targetRetail, targetWholesale, sourceDate);
        setCurrentRetail(targetRetail);
        if (targetWholesale !== undefined) setCurrentWholesale(targetWholesale);
        setSuccessMsg(`Precio restaurado exitosamente a ${formatCurrency(targetRetail)}.`);
        onPriceRolledBack?.(targetRetail, targetWholesale);
        // Refresh audit logs to show the rollback event
        loadLogs(product.id);
        setTimeout(() => setSuccessMsg(null), 4000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al restaurar el precio.");
      }
    });
  };

  // Filtered logs computation
  const filteredLogs = logs.filter((log) => {
    // 1. Date filter
    if (dateFilter !== "all") {
      const logTime = new Date(log.createdAt).getTime();
      const now = Date.now();
      const hoursDiff = (now - logTime) / 3600000;
      if (dateFilter === "24h" && hoursDiff > 24) return false;
      if (dateFilter === "7d" && hoursDiff > 24 * 7) return false;
      if (dateFilter === "30d" && hoursDiff > 24 * 30) return false;
    }
    // 2. Action filter
    if (
      actionFilter === "price" &&
      !["quick_price_update", "price_update", "price_and_stock_update"].includes(log.action)
    ) {
      return false;
    }
    if (
      actionFilter === "stock" &&
      !["stock_update", "price_and_stock_update"].includes(log.action)
    ) {
      return false;
    }
    if (actionFilter === "rollback" && log.action !== "price_rollback") {
      return false;
    }
    if (actionFilter === "bulk" && log.action !== "bulk_price_adjustment") {
      return false;
    }
    return true;
  });

  const handleDownloadCsv = async () => {
    if (!product || downloadingCsv) return;
    setDownloadingCsv(true);
    try {
      const res = await exportProductAuditLogsCsvAction(product.id);
      const blob = new Blob(["\uFEFF" + res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = res.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al exportar CSV.");
    } finally {
      setDownloadingCsv(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-white border border-zinc-200 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <History className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-zinc-950">Historial y Auditoría de Ficha</h3>
                {product.sku && (
                  <span className="font-mono text-[10px] font-bold bg-zinc-200 px-2 py-0.5 rounded text-zinc-700">
                    SKU: {product.sku}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-medium line-clamp-1">{product.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={downloadingCsv || logs.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 font-bold text-xs transition cursor-pointer disabled:opacity-40 shadow-2xs"
              title="Descargar historial de esta ficha en formato CSV / Excel"
            >
              <Download className="size-3.5 text-zinc-500" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Current State Strip */}
        <div className="px-5 py-3 bg-purple-50/50 border-b border-purple-100/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">Minorista Actual</span>
              <strong className="text-sm font-black text-zinc-950">{formatCurrency(currentRetail)}</strong>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">Mayorista Actual</span>
              <strong className="text-sm font-black text-zinc-950">{formatCurrency(currentWholesale)}</strong>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">Stock Físico Tandil</span>
              <strong className="text-sm font-black text-zinc-950">{product.stock} u.</strong>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-purple-800 bg-purple-100 px-2.5 py-1 rounded-full">
            Registro Oficial de Modificaciones
          </span>
        </div>

        {/* Filters Toolbar */}
        {logs.length > 0 && (
          <div className="px-5 py-2.5 bg-zinc-50 border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-zinc-500 font-semibold">
                <Calendar className="size-3.5 text-zinc-400" />
                <span>Período:</span>
              </div>
              <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-0.5">
                {(
                  [
                    { id: "all", label: "Todo" },
                    { id: "24h", label: "24h" },
                    { id: "7d", label: "7d" },
                    { id: "30d", label: "30d" },
                  ] as const
                ).map((df) => (
                  <button
                    key={df.id}
                    type="button"
                    onClick={() => setDateFilter(df.id)}
                    className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition cursor-pointer ${
                      dateFilter === df.id
                        ? "bg-purple-600 text-white shadow-2xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {df.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 text-zinc-500 font-semibold ml-1">
                <Filter className="size-3.5 text-zinc-400" />
                <span>Acción:</span>
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as any)}
                className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-700 outline-none cursor-pointer"
              >
                <option value="all">Todas las acciones</option>
                <option value="price">💲 Precios</option>
                <option value="stock">📦 Stock</option>
                <option value="rollback">🔄 Rollbacks</option>
                <option value="bulk">📊 Ajustes Masivos</option>
              </select>
            </div>

            <span className="text-[11px] font-semibold text-zinc-500">
              {filteredLogs.length} de {logs.length} eventos
            </span>
          </div>
        )}

        {/* Success or Error alert message */}
        {successMsg && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="size-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="size-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-zinc-500">Consultando registros de auditoría...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <ShieldCheck className="size-6" />
              </div>
              <h4 className="font-bold text-sm text-zinc-800">Ficha sin modificaciones registradas</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Los cambios de precios minoristas, mayoristas o ajustes masivos que realicen los administradores quedarán registrados automáticamente aquí.
              </p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="size-10 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                <Filter className="size-5" />
              </div>
              <h4 className="font-bold text-sm text-zinc-700">Sin eventos para los filtros seleccionados</h4>
              <button
                type="button"
                onClick={() => {
                  setDateFilter("all");
                  setActionFilter("all");
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200">
              {filteredLogs.map((entry) => {
                const oldRetail = Number(entry.oldData.retail_price ?? 0);
                const newRetail = Number(entry.newData.retail_price ?? 0);
                const oldWholesale = Number(entry.oldData.wholesale_price ?? 0);
                const newWholesale = Number(entry.newData.wholesale_price ?? 0);
                const oldStock = entry.oldData.stock !== undefined ? Number(entry.oldData.stock) : null;
                const newStock = entry.newData.stock !== undefined ? Number(entry.newData.stock) : null;

                const hasRetailChange = oldRetail > 0 && newRetail > 0 && oldRetail !== newRetail;
                const hasWholesaleChange = oldWholesale > 0 && newWholesale > 0 && oldWholesale !== newWholesale;
                const hasStockChange = oldStock !== null && newStock !== null && oldStock !== newStock;

                const dateFormatted = new Date(entry.createdAt).toLocaleString("es-AR", {
                  timeZone: "America/Argentina/Buenos_Aires",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                // Target price for rollback: if oldRetail is different from currentRetail, we can restore it!
                const canRollbackToOld = oldRetail > 0 && oldRetail !== currentRetail;

                return (
                  <div key={entry.id} className="relative group">
                    {/* Bullet icon */}
                    <div className="absolute -left-6 top-1 size-5 rounded-full bg-white border-2 border-purple-500 flex items-center justify-center shadow-xs">
                      <div className="size-2 rounded-full bg-purple-600" />
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs hover:border-zinc-300 transition space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-zinc-900">
                            {entry.action === "quick_price_update"
                              ? "⚡ Cambio rápido de precio"
                              : entry.action === "bulk_price_adjustment"
                              ? "📊 Ajuste masivo de precio"
                              : entry.action === "price_rollback"
                              ? "🔄 Rollback de precio"
                              : entry.action === "price_and_stock_update"
                              ? "📝 Edición de precio y stock"
                              : entry.action === "price_update"
                              ? "💲 Actualización de precio"
                              : entry.action === "stock_update"
                              ? "📦 Ajuste de stock"
                              : "✏️ Modificación de ficha"}
                          </span>
                          {entry.notes && (
                            <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                              {entry.notes}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                          <Clock className="size-3 text-zinc-400" />
                          <span>{dateFormatted}</span>
                        </div>
                      </div>

                      {/* Diff Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {hasRetailChange && (
                          <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase block">Precio Minorista</span>
                            <div className="flex items-center gap-2 font-mono font-bold">
                              <span className="text-zinc-400 line-through">{formatCurrency(oldRetail)}</span>
                              <span className="text-zinc-400">➔</span>
                              <span className="text-emerald-700 text-sm">{formatCurrency(newRetail)}</span>
                              {oldRetail > 0 && (
                                <span className="text-[10px] font-sans font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  {newRetail > oldRetail ? "+" : ""}
                                  {Math.round(((newRetail - oldRetail) / oldRetail) * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {hasWholesaleChange && (
                          <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase block">Precio Mayorista</span>
                            <div className="flex items-center gap-2 font-mono font-bold">
                              <span className="text-zinc-400 line-through">{formatCurrency(oldWholesale)}</span>
                              <span className="text-zinc-400">➔</span>
                              <span className="text-purple-700 text-sm">{formatCurrency(newWholesale)}</span>
                            </div>
                          </div>
                        )}

                        {hasStockChange && (
                          <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase block">Stock Propio Tandil</span>
                            <div className="flex items-center gap-2 font-mono font-bold">
                              <span className="text-zinc-400 line-through">{oldStock} u.</span>
                              <span className="text-zinc-400">➔</span>
                              <span className="text-sky-700 text-sm">{newStock} u.</span>
                              <span className="text-[10px] font-sans font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                                {newStock > oldStock ? `+${newStock - oldStock}` : `${newStock - oldStock}`} u.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Auditor Footer & Rollback action */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 pt-1.5 border-t border-zinc-100">
                        <div className="flex items-center gap-1.5">
                          <User className="size-3 text-zinc-400" />
                          <span>Modificado por:</span>
                          <strong className="text-zinc-800 font-semibold">{entry.changedBy}</strong>
                        </div>

                        {canRollbackToOld && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handleRollback(
                                oldRetail,
                                oldWholesale > 0 ? oldWholesale : undefined,
                                entry.createdAt
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs transition cursor-pointer disabled:opacity-50 active:scale-98 shadow-2xs"
                            title={`Restaurar el precio a ${formatCurrency(oldRetail)}`}
                          >
                            <RotateCcw className="size-3 text-purple-600" />
                            <span>Restaurar a {formatCurrency(oldRetail)}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <p className="text-[11px] text-zinc-500">
            Los rollbacks de precio se registran automáticamente en la bitácora de auditoría.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
