"use client";

import React, { useEffect, useState, useTransition } from "react";
import { History, X, DollarSign, Package, TrendingUp, TrendingDown, Clock, User, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { getProductAuditLogsAction, type ProductAuditLogEntry } from "@/app/admin/actions";

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
}

export function ProductAuditModal({ isOpen, product, onClose }: ProductAuditModalProps) {
  const [logs, setLogs] = useState<ProductAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !product) {
      setLogs([]);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getProductAuditLogsAction(product.id)
      .then((data) => {
        if (isMounted) {
          setLogs(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error al cargar el historial de cambios.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, product]);

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
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Current State Strip */}
        <div className="px-5 py-3 bg-purple-50/50 border-b border-purple-100/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">Minorista Actual</span>
              <strong className="text-sm font-black text-zinc-950">{formatCurrency(product.retailPrice)}</strong>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">Mayorista Actual</span>
              <strong className="text-sm font-black text-zinc-950">{formatCurrency(product.wholesalePrice)}</strong>
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

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="size-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-zinc-500">Consultando registros de auditoría...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {error}
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
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200">
              {logs.map((entry) => {
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

                      {/* Auditor Footer */}
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 pt-1 border-t border-zinc-100">
                        <User className="size-3 text-zinc-400" />
                        <span>Modificado por:</span>
                        <strong className="text-zinc-800 font-semibold">{entry.changedBy}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex justify-end">
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
