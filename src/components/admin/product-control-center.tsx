"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Search,
  Package,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Truck,
  Layers,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Percent,
  Eye,
  EyeOff,
  Globe,
  Boxes,
  Plus,
  Link as LinkIcon,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Category, Product, StockLog } from "@/lib/types";
import {
  toggleProductActiveAction,
  toggleProductSupplierAvailabilityAction,
  checkSingleProductSupplierStockAction,
  triggerBatchSupplierSyncAction,
  quickUpdateProductPriceAction,
  bulkUpdateProductStatusAction,
  bulkAdjustPricesAction,
  updateProductAction,
  deleteProductAction,
  quickUpdateSupplierLinkAction,
} from "@/app/admin/actions";

interface ProductControlCenterProps {
  products: Product[];
  categories: Category[];
  stockLogs: StockLog[];
  onOpenCreateProduct?: () => void;
}

export function ProductControlCenter({
  products,
  categories,
  stockLogs,
  onOpenCreateProduct,
}: ProductControlCenterProps) {
  const [isPending, startTransition] = useTransition();

  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<
    "all" | "in_stock" | "out_of_stock" | "supplier_available" | "supplier_paused" | "own_stock"
  >("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<"all" | "supplier" | "own_stock">("all");
  const [supplierLinkFilter, setSupplierLinkFilter] = useState<"all" | "with_link" | "without_link">("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price_asc" | "price_desc" | "status" | "recent">("recent");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);
  const [quickSupplierProduct, setQuickSupplierProduct] = useState<Product | null>(null);
  const [copiedSupplierLink, setCopiedSupplierLink] = useState<string | null>(null);
  const [quickRetailPrice, setQuickRetailPrice] = useState<number>(0);
  const [quickWholesalePrice, setQuickWholesalePrice] = useState<number>(0);
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [bulkPriceType, setBulkPriceType] = useState<"percentage" | "fixed_markup">("percentage");
  const [bulkPriceAmount, setBulkPriceAmount] = useState<number>(10);
  const [showStockAudit, setShowStockAudit] = useState(false);

  // Live supplier verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<Record<string, { message: string; ok: boolean }>>({});
  const [isBatchSyncRunning, setIsBatchSyncRunning] = useState(false);
  const [batchSyncReport, setBatchSyncReport] = useState<{
    total: number;
    checked: number;
    inStock: number;
    outOfStock: number;
    errors: number;
    timestamp: string;
  } | null>(null);

  // UI feedback notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Distinct Brands
  const distinctBrands = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.brand) set.add(p.brand.trim());
    }
    return Array.from(set).sort();
  }, [products]);

  // Main Categories
  const mainCategories = useMemo(() => {
    return categories.filter((c) => !c.parentId);
  }, [categories]);

  // KPI Metrics (computed in a single O(N) pass without extra array allocations)
  const stats = useMemo(() => {
    let active = 0;
    let supplier = 0;
    let supplierAvailable = 0;
    let withSupplierLink = 0;
    const total = products.length;

    for (let i = 0; i < total; i++) {
      const p = products[i];
      if (p.active !== false) active++;
      if (p.fulfillmentMode === "supplier") {
        supplier++;
        if (p.supplierAvailable) supplierAvailable++;
      }
      if (p.sourceUrl) withSupplierLink++;
    }
    const paused = total - active;
    const ownStock = total - supplier;
    const supplierPaused = supplier - supplierAvailable;
    const withoutSupplierLink = total - withSupplierLink;

    return {
      total,
      active,
      paused,
      supplier,
      ownStock,
      supplierAvailable,
      supplierPaused,
      withSupplierLink,
      withoutSupplierLink,
      activeRate: total > 0 ? Math.round((active / total) * 100) : 0,
    };
  }, [products]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products
      .filter((p) => {
        // Search
        if (term) {
          const matchTitle = p.title.toLowerCase().includes(term);
          const matchSku = p.sku ? p.sku.toLowerCase().includes(term) : false;
          const matchBrand = p.brand ? p.brand.toLowerCase().includes(term) : false;
          const matchModel = p.model ? p.model.toLowerCase().includes(term) : false;
          const matchTags = p.tags ? p.tags.some((t) => t.toLowerCase().includes(term)) : false;
          if (!matchTitle && !matchSku && !matchBrand && !matchModel && !matchTags) return false;
        }

        // Shop Status (Active / Paused)
        if (statusFilter === "active" && p.active === false) return false;
        if (statusFilter === "paused" && p.active !== false) return false;

        // Supplier Link Filter
        if (supplierLinkFilter === "with_link" && !p.sourceUrl) return false;
        if (supplierLinkFilter === "without_link" && p.sourceUrl) return false;

        // Availability Filter
        if (availabilityFilter === "supplier_available" && !(p.fulfillmentMode === "supplier" && p.supplierAvailable)) return false;
        if (availabilityFilter === "supplier_paused" && !(p.fulfillmentMode === "supplier" && !p.supplierAvailable)) return false;
        if (availabilityFilter === "own_stock" && p.fulfillmentMode === "supplier") return false;
        if (availabilityFilter === "in_stock") {
          const isIn = p.fulfillmentMode === "supplier" ? p.supplierAvailable : (Number(p.stock) > 0 && p.stockVerifiedAt);
          if (!isIn) return false;
        }
        if (availabilityFilter === "out_of_stock") {
          const isOut = p.fulfillmentMode === "supplier" ? !p.supplierAvailable : (!p.stockVerifiedAt || Number(p.stock) <= 0);
          if (!isOut) return false;
        }

        // Fulfillment mode
        if (fulfillmentFilter === "supplier" && p.fulfillmentMode !== "supplier") return false;
        if (fulfillmentFilter === "own_stock" && p.fulfillmentMode === "supplier") return false;

        // Category Filter
        if (categoryFilter) {
          if (p.categoryId !== categoryFilter) {
            const cat = categories.find((c) => c.id === p.categoryId);
            if (!cat || cat.parentId !== categoryFilter) return false;
          }
        }

        // Brand Filter
        if (brandFilter && p.brand !== brandFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.title.localeCompare(b.title);
        if (sortBy === "price_asc") return a.retailPrice - b.retailPrice;
        if (sortBy === "price_desc") return b.retailPrice - a.retailPrice;
        if (sortBy === "status") {
          const aVal = (a.active !== false ? 2 : 0) + (a.supplierAvailable ? 1 : 0);
          const bVal = (b.active !== false ? 2 : 0) + (b.supplierAvailable ? 1 : 0);
          return bVal - aVal;
        }
        return 0; // default recent/original
      });
  }, [products, search, statusFilter, availabilityFilter, fulfillmentFilter, categoryFilter, brandFilter, sortBy, categories]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Selection handlers
  const isAllPageSelected = paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedIds.includes(p.id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(paginatedProducts.map((p) => p.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    } else {
      const newSet = new Set([...selectedIds, ...paginatedProducts.map((p) => p.id)]);
      setSelectedIds(Array.from(newSet));
    }
  };

  const toggleSelectProduct = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Quick Action: Toggle Active (Pause / Publish in shop)
  const handleToggleActive = (product: Product) => {
    const nextState = product.active === false ? true : false;
    startTransition(async () => {
      try {
        await toggleProductActiveAction(product.id, nextState);
        product.active = nextState;
        showToast(nextState ? `"${product.title}" ahora está activo en la tienda.` : `"${product.title}" fue pausado (oculto del catálogo).`, "info");
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Error al actualizar estado.", "error");
      }
    });
  };

  // Quick Action: Toggle Supplier Availability
  const handleToggleSupplierAvailability = (product: Product) => {
    const nextState = !product.supplierAvailable;
    startTransition(async () => {
      try {
        await toggleProductSupplierAvailabilityAction(product.id, nextState);
        product.supplierAvailable = nextState;
        showToast(nextState ? `Mayorista habilitado: disponible para clientes.` : `Disponibilidad de mayorista pausada (sin stock temporal).`, "info");
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Error al cambiar disponibilidad.", "error");
      }
    });
  };

  // Quick Action: Live Single Product Supplier Stock Verification
  const handleVerifySupplierStock = (product: Product) => {
    setVerifyingId(product.id);
    startTransition(async () => {
      try {
        const result = await checkSingleProductSupplierStockAction(product.id);
        product.supplierAvailable = result.available;
        product.supplierLastCheckedAt = new Date().toISOString();
        product.supplierStockStatus = result.status;
        if (result.livePrice) product.supplierLivePrice = result.livePrice;

        setVerificationFeedback((prev) => ({
          ...prev,
          [product.id]: { message: result.message, ok: result.available },
        }));
        showToast(result.message, result.available ? "success" : "info");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al conectar al mayorista";
        setVerificationFeedback((prev) => ({
          ...prev,
          [product.id]: { message: msg, ok: false },
        }));
        showToast(msg, "error");
      } finally {
        setVerifyingId(null);
      }
    });
  };

  // Batch Supplier Sync Trigger
  const handleTriggerBatchSync = () => {
    setIsBatchSyncRunning(true);
    startTransition(async () => {
      try {
        const report = await triggerBatchSupplierSyncAction(35);
        setBatchSyncReport({
          total: report.total,
          checked: report.checked,
          inStock: report.inStock,
          outOfStock: report.outOfStock,
          errors: report.errors,
          timestamp: new Date().toLocaleTimeString(),
        });
        showToast(
          `Sincronización completada: ${report.inStock} disponibles, ${report.outOfStock} sin stock pausados automáticamente.`,
          "success"
        );
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Error en sincronización por lote.", "error");
      } finally {
        setIsBatchSyncRunning(false);
      }
    });
  };

  // Bulk Status Actions
  const handleBulkAction = (action: "activate" | "pause" | "supplier_available" | "supplier_pause") => {
    if (selectedIds.length === 0) return;
    startTransition(async () => {
      try {
        await bulkUpdateProductStatusAction(selectedIds, action);
        showToast(`Operación masiva aplicada a ${selectedIds.length} productos.`, "success");
        setSelectedIds([]);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Error en acción masiva.", "error");
      }
    });
  };

  // Bulk Price Adjustment Execution
  const handleExecuteBulkPrice = () => {
    if (selectedIds.length === 0) return;
    startTransition(async () => {
      try {
        await bulkAdjustPricesAction(selectedIds, bulkPriceType, bulkPriceAmount);
        showToast(`Precios actualizados para ${selectedIds.length} productos.`, "success");
        setIsBulkPriceModalOpen(false);
        setSelectedIds([]);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Error al ajustar precios.", "error");
      }
    });
  };

  // Quick Price Save
  const handleSaveQuickPrice = () => {
    if (!quickPriceProduct) return;
    startTransition(async () => {
      try {
        await quickUpdateProductPriceAction(quickPriceProduct.id, quickRetailPrice, quickWholesalePrice);
        quickPriceProduct.retailPrice = quickRetailPrice;
        if (quickWholesalePrice > 0) quickPriceProduct.wholesalePrice = quickWholesalePrice;
        showToast(`Precio actualizado para "${quickPriceProduct.title}".`, "success");
        setQuickPriceProduct(null);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Error al guardar precio.", "error");
      }
    });
  };

  // Copy SKU to clipboard helper
  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  // Copy supplier link helper
  const handleCopySupplierLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedSupplierLink(url);
    showToast("✓ Enlace de proveedor copiado al portapapeles", "info");
    setTimeout(() => setCopiedSupplierLink(null), 2500);
  };

  // Delete product helper
  const handleDeleteProduct = (productId: string, title: string) => {
    if (confirm(`¿Estás seguro de eliminar permanentemente "${title}"?`)) {
      startTransition(async () => {
        try {
          await deleteProductAction(productId);
          showToast(`Producto "${title}" eliminado.`, "info");
        } catch (err: unknown) {
          showToast(err instanceof Error ? err.message : "Error al eliminar producto.", "error");
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl border transition-all animate-in fade-in slide-in-from-bottom-5 text-sm font-semibold ${
            toastMessage.type === "success"
              ? "bg-emerald-950 text-emerald-100 border-emerald-800"
              : toastMessage.type === "error"
              ? "bg-red-950 text-red-100 border-red-800"
              : "bg-zinc-900 text-zinc-100 border-zinc-700"
          }`}
        >
          {toastMessage.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
          {toastMessage.type === "error" && <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />}
          {toastMessage.type === "info" && <RefreshCw className="h-5 w-5 text-sky-400 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top KPI Cards Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-semibold">Total Catálogo</span>
            <Boxes className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-black text-zinc-900">{stats.total.toLocaleString("es-AR")}</p>
          <span className="text-[11px] text-zinc-400 font-medium">Publicaciones cargadas</span>
        </div>

        <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-semibold">En Línea (Activos)</span>
            <Eye className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900">{stats.active.toLocaleString("es-AR")}</p>
          <span className="text-[11px] text-emerald-700 font-semibold">{stats.activeRate}% del catálogo</span>
        </div>

        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-xs font-semibold">Pausados / Ocultos</span>
            <EyeOff className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900">{stats.paused.toLocaleString("es-AR")}</p>
          <span className="text-[11px] text-amber-700 font-medium">Fuera de la tienda</span>
        </div>

        <div className="rounded-2xl border border-sky-200/60 bg-sky-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-sky-800 mb-1">
            <span className="text-xs font-semibold">Modo Proveedor</span>
            <Truck className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-sky-900">{stats.supplier.toLocaleString("es-AR")}</p>
          <span className="text-[11px] text-sky-700 font-medium">Despacho Misiones</span>
        </div>

        <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-indigo-800 mb-1">
            <span className="text-xs font-semibold">En Stock Mayorista</span>
            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-900">{stats.supplierAvailable.toLocaleString("es-AR")}</p>
          <span className="text-[11px] text-indigo-700 font-semibold">Listos para vender</span>
        </div>

        <div className="rounded-2xl border border-red-200/60 bg-red-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-red-800 mb-1">
            <span className="text-xs font-semibold">Pausados Mayorista</span>
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-900">{stats.supplierPaused.toLocaleString("es-AR")}</p>
          <span className="text-[11px] text-red-700 font-medium">Sin stock en proveedor</span>
        </div>
      </div>

      {/* Supplier Batch Sync Banner / Automation Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-4 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs">
            <RefreshCw className={`h-5 w-5 ${isBatchSyncRunning ? "animate-spin" : ""}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900">Control & Sincronización Automática con Mayorista</h3>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Cron Activo cada 4h
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">
              Verifica en vivo stock en la web del proveedor (Total Tools / Wadfow / Atacado USA). Si el proveedor agota un
              producto, se pausa automáticamente para prevenir ventas sin stock.
            </p>
            {batchSyncReport && (
              <p className="text-xs text-sky-800 font-semibold mt-1">
                Último reporte ({batchSyncReport.timestamp}): {batchSyncReport.checked} revisados · {batchSyncReport.inStock} con
                stock · {batchSyncReport.outOfStock} sin stock pausados · {batchSyncReport.errors} sin respuesta.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isBatchSyncRunning || isPending}
            onClick={handleTriggerBatchSync}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-sky-700 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isBatchSyncRunning ? "animate-spin" : ""}`} />
            {isBatchSyncRunning ? "Verificando en vivo..." : "Sincronizar Lote Ahora"}
          </button>

          <button
            type="button"
            onClick={() => setShowStockAudit(!showStockAudit)}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
              showStockAudit ? "bg-zinc-200 border-zinc-300 text-zinc-900" : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <TrendingUp className="h-4 w-4 text-zinc-500" />
            {showStockAudit ? "Ocultar Auditoría" : "Auditoría de Stock"}
          </button>

          {onOpenCreateProduct && (
            <button
              type="button"
              onClick={onOpenCreateProduct}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
            >
              + Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {/* Stock Audit Table (Expandable) */}
      {showStockAudit && (
        <div className="border border-zinc-200 rounded-2xl bg-white shadow-xs p-5 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Registro de Movimientos y Auditoría de Stock
            </h3>
            <span className="text-xs text-zinc-500 font-medium">Últimos {stockLogs.length} eventos registrados</span>
          </div>
          <div className="overflow-x-auto max-h-[300px] rounded-xl border border-zinc-200 scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fecha / Hora</th>
                  <th className="px-4 py-3 font-semibold">Producto</th>
                  <th className="px-4 py-3 font-semibold text-center">Modificación</th>
                  <th className="px-4 py-3 font-semibold text-center">Transición</th>
                  <th className="px-4 py-3 font-semibold text-center">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {stockLogs.length > 0 ? (
                  stockLogs.map((log) => {
                    const isPositive = log.changeAmount > 0;
                    return (
                      <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-4 py-3 text-zinc-500 font-medium whitespace-nowrap">{formatDate(log.createdAt)}</td>
                        <td className="px-4 py-3 font-bold text-zinc-800">{log.productTitle}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap font-extrabold text-sm">
                          <span className={isPositive ? "text-emerald-600" : "text-red-600"}>
                            {isPositive ? `+${log.changeAmount}` : log.changeAmount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-zinc-500 font-medium whitespace-nowrap">
                          {log.previousStock} → {log.newStock}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border bg-zinc-100 text-zinc-700 border-zinc-200">
                            {log.reason}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-400 italic">
                      No hay registros de auditoría de stock registrados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter and Control Toolbar */}
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Live Search */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por SKU, título, marca, modelo o etiqueta..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-300 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white text-sm transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-3 text-xs text-zinc-400 hover:text-zinc-600"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Status in Shop Filter */}
            <div className="flex items-center rounded-xl border border-zinc-200 p-1 bg-zinc-50/70">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                  statusFilter === "all" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Todos ({products.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("active");
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                  statusFilter === "active" ? "bg-emerald-600 text-white shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Activos ({stats.active})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("paused");
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                  statusFilter === "paused" ? "bg-amber-600 text-white shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Pausados ({stats.paused})
              </button>
            </div>

            {/* Availability Filter Dropdown */}
            <select
              value={availabilityFilter}
              onChange={(e) => {
                setAvailabilityFilter(
                  e.target.value as "all" | "in_stock" | "out_of_stock" | "supplier_available" | "supplier_paused" | "own_stock"
                );
                setPage(1);
              }}
              className="h-10 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white font-medium cursor-pointer"
            >
              <option value="all">Stock: Todas las condiciones</option>
              <option value="supplier_available">🟢 Disponible en mayorista</option>
              <option value="supplier_paused">🔴 Pausado en mayorista</option>
              <option value="in_stock">✅ Con existencias</option>
              <option value="out_of_stock">⚠️ Sin existencias / Pausados</option>
              <option value="own_stock">📦 Stock propio</option>
            </select>

            {/* Supplier Link Filter Dropdown */}
            <select
              value={supplierLinkFilter}
              onChange={(e) => {
                setSupplierLinkFilter(e.target.value as "all" | "with_link" | "without_link");
                setPage(1);
              }}
              className="h-10 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white font-bold cursor-pointer"
            >
              <option value="all">🔗 Links: Todos ({products.length})</option>
              <option value="with_link">✓ Con link proveedor ({stats.withSupplierLink})</option>
              <option value="without_link">⚠️ Sin link proveedor ({stats.withoutSupplierLink})</option>
            </select>

            {/* Fulfillment Mode Dropdown */}
            <select
              value={fulfillmentFilter}
              onChange={(e) => {
                setFulfillmentFilter(e.target.value as "all" | "supplier" | "own_stock");
                setPage(1);
              }}
              className="h-10 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white font-medium cursor-pointer"
            >
              <option value="all">Modalidad: Todas</option>
              <option value="supplier">Envío Proveedor (Misiones)</option>
              <option value="own_stock">Stock Propio</option>
            </select>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white font-medium cursor-pointer max-w-44"
            >
              <option value="">Todas las categorías</option>
              {mainCategories.map((category) => (
                <optgroup key={category.id} label={category.name}>
                  <option value={category.id}>Todo {category.name}</option>
                  {categories
                    .filter((item) => item.parentId === category.id)
                    .map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>

            {/* Brand Dropdown */}
            {distinctBrands.length > 0 && (
              <select
                value={brandFilter}
                onChange={(e) => {
                  setBrandFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white font-medium cursor-pointer max-w-36"
              >
                <option value="">Todas las marcas</option>
                {distinctBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "name" | "price_asc" | "price_desc" | "status" | "recent")
              }
              className="h-10 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white font-medium cursor-pointer"
            >
              <option value="recent">Ordenar: Catálogo original</option>
              <option value="name">Nombre: A → Z</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
              <option value="status">Estado: Activos primero</option>
            </select>
          </div>
        </div>

        {/* Selected Items Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-900 px-4 py-3 text-white animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 font-black">
                {selectedIds.length}
              </span>
              <span>seleccionados</span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-zinc-400 hover:text-white underline ml-2 cursor-pointer"
              >
                Deseleccionar
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleBulkAction("activate")}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 transition-colors cursor-pointer"
              >
                Activar en tienda
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction("pause")}
                className="rounded-lg bg-amber-600 hover:bg-amber-500 px-3 py-1.5 transition-colors cursor-pointer"
              >
                Pausar en tienda
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction("supplier_available")}
                className="rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1.5 transition-colors cursor-pointer"
              >
                Habilitar mayorista
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction("supplier_pause")}
                className="rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 transition-colors cursor-pointer"
              >
                Pausar mayorista
              </button>
              <button
                type="button"
                onClick={() => setIsBulkPriceModalOpen(true)}
                className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Percent className="h-3.5 w-3.5 text-emerald-400" />
                Ajustar precios
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Products Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5">Producto & Identidad</th>
                <th className="px-4 py-3.5">Categoría</th>
                <th className="px-4 py-3.5">Precios & Margen</th>
                <th className="px-4 py-3.5">Abastecimiento & Mayorista</th>
                <th className="px-4 py-3.5 text-center">Estado Tienda</th>
                <th className="px-4 py-3.5 text-center w-28">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
                        <Package className="h-6 w-6" />
                      </div>
                      <p className="font-bold text-zinc-800 text-base">No se encontraron productos</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {search || categoryFilter || brandFilter || statusFilter !== "all" || availabilityFilter !== "all"
                          ? "Probá ajustando o limpiando los filtros de búsqueda aplicados."
                          : "Comenzá creando tu primer producto con el botón '+ Nuevo Producto'."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  const isLiveChecking = verifyingId === product.id;
                  const feedback = verificationFeedback[product.id];
                  const prodCategory = categories.find((c) => c.id === product.categoryId);
                  let categoryDisplay = product.categoryName;
                  if (prodCategory && prodCategory.parentId) {
                    const parent = categories.find((c) => c.id === prodCategory.parentId);
                    if (parent) categoryDisplay = `${parent.name} > ${prodCategory.name}`;
                  }

                  const isActive = product.active !== false;

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-zinc-50/60 transition-colors ${
                        isSelected ? "bg-emerald-50/30" : ""
                      } ${!isActive ? "opacity-75 bg-zinc-50/40" : ""}`}
                    >
                      {/* Select Checkbox */}
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(product.id)}
                          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Product identity */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.title}
                              className="h-12 w-12 shrink-0 rounded-xl object-cover border border-zinc-200 shadow-2xs"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-12 w-12 shrink-0 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 border border-dashed border-zinc-300">
                              <Package className="h-5 w-5" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => setEditingProduct(product)}
                              className="text-left font-bold text-zinc-900 hover:text-emerald-700 block line-clamp-1 text-sm cursor-pointer transition-colors"
                              title={product.title}
                            >
                              {product.title}
                            </button>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {product.sku && (
                                <button
                                  type="button"
                                  onClick={() => handleCopySku(product.sku!)}
                                  className="inline-flex items-center gap-1 rounded bg-zinc-100 hover:bg-zinc-200 px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-700 transition-colors cursor-pointer"
                                  title="Click para copiar SKU"
                                >
                                  {copiedSku === product.sku ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <Copy className="h-2.5 w-2.5 text-zinc-400" />}
                                  SKU: {product.sku}
                                </button>
                              )}

                              {product.brand && (
                                <span className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700">
                                  {product.brand}
                                </span>
                              )}

                              {product.sourceUrl && (
                                <a
                                  href={product.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded bg-sky-50 hover:bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200/50 transition-colors"
                                  title="Ver página oficial en la web del mayorista"
                                >
                                  <Globe className="h-2.5 w-2.5" /> Mayorista
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}

                              {product.featured && (
                                <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200/50">
                                  ★ Destacado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 text-zinc-600 text-xs">
                        <span className="inline-flex items-center gap-1 font-medium bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-lg border border-zinc-200/70 max-w-44 truncate">
                          <Layers className="h-3 w-3 text-zinc-400 shrink-0" />
                          <span className="truncate">{categoryDisplay}</span>
                        </span>
                      </td>

                      {/* Prices & Quick Edit */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-black text-zinc-950 text-sm">
                              {formatCurrency(product.retailPrice)}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-medium">
                              Mayorista: {formatCurrency(product.wholesalePrice)} (mín {product.wholesaleMinQuantity})
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setQuickPriceProduct(product);
                              setQuickRetailPrice(product.retailPrice);
                              setQuickWholesalePrice(product.wholesalePrice);
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Modificar precio rápido"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Fulfillment & Supplier Link / Availability */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-2">
                          {/* Supplier Direct Link & Actions */}
                          {product.sourceUrl ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <a
                                  href={product.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-300 px-2 py-0.5 text-xs font-bold transition-all shadow-2xs"
                                  title="Abrir página oficial del mayorista en nueva pestaña"
                                >
                                  <Globe className="h-3 w-3 text-sky-600" /> Abrir proveedor <ExternalLink className="h-3 w-3" />
                                </a>

                                <button
                                  type="button"
                                  onClick={() => handleCopySupplierLink(product.sourceUrl!)}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 bg-white shadow-2xs transition-colors cursor-pointer"
                                  title="Copiar enlace del mayorista"
                                >
                                  {copiedSupplierLink === product.sourceUrl ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setQuickSupplierProduct(product)}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:text-sky-700 bg-white shadow-2xs transition-colors cursor-pointer"
                                  title="Modificar enlace, costo o disponibilidad"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>
                              </div>

                              {/* Live Price & Gross Margin */}
                              {product.supplierLivePrice ? (
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className="font-semibold text-zinc-500">
                                    Costo: {formatCurrency(product.supplierLivePrice)}
                                  </span>
                                  {product.retailPrice > product.supplierLivePrice && (
                                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                      +{Math.round(((product.retailPrice - product.supplierLivePrice) / product.retailPrice) * 100)}% mrg
                                    </span>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => setQuickSupplierProduct(product)}
                                className="inline-flex items-center gap-1 rounded-xl border border-dashed border-sky-400 bg-sky-50/70 hover:bg-sky-100 text-sky-800 px-2.5 py-1 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                title="Vincular el enlace directo de la web del mayorista"
                              >
                                <Plus className="h-3.5 w-3.5" /> Vincular proveedor
                              </button>
                              <span className="text-[10px] text-amber-700 font-semibold block">
                                ⚠️ Falta enlace de mayorista
                              </span>
                            </div>
                          )}

                          {/* Mode Badge & Availability Switch */}
                          <div className="flex items-center gap-1.5 pt-0.5">
                            {product.fulfillmentMode === "supplier" ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSupplierAvailability(product)}
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border transition-all cursor-pointer ${
                                    product.supplierAvailable
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                      : "bg-red-50 text-red-800 border-red-300 hover:bg-red-100"
                                  }`}
                                  title="Click para alternar disponibilidad en el mayorista"
                                >
                                  {product.supplierAvailable ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      <span>Disponible</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-3 w-3 text-red-600" />
                                      <span>Pausado</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  disabled={isLiveChecking}
                                  onClick={() => handleVerifySupplierStock(product)}
                                  className="inline-flex h-5 items-center gap-1 rounded bg-zinc-100 hover:bg-zinc-200 px-1.5 text-[9px] font-bold text-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Verificar stock en vivo en la web del mayorista"
                                >
                                  <RefreshCw className={`h-2.5 w-2.5 ${isLiveChecking ? "animate-spin text-sky-600" : ""}`} />
                                  {isLiveChecking ? "..." : "Sync"}
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-200">
                                <Boxes className="h-3 w-3 text-indigo-600" />
                                Stock Propio ({product.stockVerifiedAt ? `${product.stock} un.` : "Sin verificar"})
                              </span>
                            )}
                          </div>

                          {feedback && (
                            <p className={`text-[10px] font-bold ${feedback.ok ? "text-emerald-700" : "text-amber-800"}`}>
                              {feedback.message}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status in Retail Shop (Active / Paused switch) */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(product)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border transition-all cursor-pointer ${
                            isActive
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                              : "bg-zinc-100 text-zinc-500 border-zinc-300 hover:bg-zinc-200"
                          }`}
                          title={isActive ? "Click para pausar publicación en la tienda" : "Click para activar en la tienda"}
                        >
                          <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                          {isActive ? "Activo" : "Pausado"}
                        </button>
                      </td>

                      {/* Row Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(product)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer bg-white shadow-2xs"
                            title="Editar ficha completa"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <a
                            href={`/catalogo/${product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer bg-white shadow-2xs"
                            title="Ver en la tienda pública"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product.id, product.title)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer bg-white shadow-2xs"
                            title="Eliminar producto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Counter Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 bg-white p-4 text-xs text-zinc-600 sm:px-6">
          <div className="flex items-center gap-3">
            <span>
              Mostrando <strong>{paginatedProducts.length}</strong> de <strong>{filteredProducts.length}</strong> productos
              (Página {currentPage} de {totalPages})
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-zinc-400">Por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-300 px-2 py-1 bg-white font-semibold cursor-pointer"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-300 px-3 font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-300 px-3 font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Price Modal */}
      {quickPriceProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-zinc-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Actualizar Precios
              </h3>
              <button
                type="button"
                onClick={() => setQuickPriceProduct(null)}
                className="text-zinc-400 hover:text-zinc-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-600 line-clamp-2">
              Producto: <strong>{quickPriceProduct.title}</strong>
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-zinc-700">
                Precio Minorista (ARS) *
                <input
                  type="number"
                  min="1"
                  step="100"
                  value={quickRetailPrice}
                  onChange={(e) => setQuickRetailPrice(Number(e.target.value))}
                  className="mt-1 w-full h-11 rounded-xl border border-zinc-300 px-3 font-extrabold text-zinc-900 text-base outline-none focus:border-emerald-600"
                  required
                />
              </label>

              <label className="block text-xs font-bold text-zinc-700">
                Precio Mayorista (ARS)
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={quickWholesalePrice}
                  onChange={(e) => setQuickWholesalePrice(Number(e.target.value))}
                  className="mt-1 w-full h-11 rounded-xl border border-zinc-300 px-3 font-bold text-zinc-900 text-sm outline-none focus:border-emerald-600"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setQuickPriceProduct(null)}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || quickRetailPrice <= 0}
                onClick={handleSaveQuickPrice}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Guardando..." : "Guardar Precio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Price Adjustment Modal */}
      {isBulkPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-zinc-900 flex items-center gap-2">
                <Percent className="h-5 w-5 text-emerald-600" />
                Ajuste Masivo de Precios
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkPriceModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-600">
              Modificará el precio minorista de <strong>{selectedIds.length}</strong> productos seleccionados.
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setBulkPriceType("percentage")}
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    bulkPriceType === "percentage"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  Porcentaje (+ / - %)
                </button>
                <button
                  type="button"
                  onClick={() => setBulkPriceType("fixed_markup")}
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    bulkPriceType === "fixed_markup"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  Importe Fijo ($)
                </button>
              </div>

              <label className="block text-xs font-bold text-zinc-700">
                {bulkPriceType === "percentage" ? "Porcentaje de ajuste (%)" : "Importe a sumar o restar ($)"}
                <input
                  type="number"
                  step={bulkPriceType === "percentage" ? "1" : "100"}
                  value={bulkPriceAmount}
                  onChange={(e) => setBulkPriceAmount(Number(e.target.value))}
                  placeholder={bulkPriceType === "percentage" ? "Ej: 10 para aumentar 10%" : "Ej: 5000"}
                  className="mt-1 w-full h-11 rounded-xl border border-zinc-300 px-3 font-bold text-zinc-900 text-sm outline-none focus:border-emerald-600"
                />
              </label>

              <p className="text-[11px] text-zinc-500 italic">
                {bulkPriceType === "percentage"
                  ? `Ejemplo: Un producto de $10.000 pasará a $${Math.round(10000 * (1 + bulkPriceAmount / 100)).toLocaleString("es-AR")}.`
                  : `Ejemplo: Un producto de $10.000 pasará a $${Math.max(0, 10000 + bulkPriceAmount).toLocaleString("es-AR")}.`}
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkPriceModalOpen(false)}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleExecuteBulkPrice}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Aplicando..." : "Aplicar a Seleccionados"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Product Edit Modal */}
      {editingProduct && (
        <ComprehensiveProductEditor
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            showToast("Producto actualizado exitosamente.", "success");
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Comprehensive Product Editor Sub-Component
// -------------------------------------------------------------
function ComprehensiveProductEditor({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const mainCategories = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

  // Determine initial category and subcategory
  const initialCategory = categories.find((c) => c.id === product.categoryId);
  const [parentId, setParentId] = useState(
    initialCategory?.parentId ? initialCategory.parentId : initialCategory?.id || ""
  );
  const [subcategoryId, setSubcategoryId] = useState(initialCategory?.parentId ? initialCategory.id : "");

  const subcategoriesForParent = useMemo(() => {
    if (!parentId) return [];
    return categories.filter((c) => c.parentId === parentId);
  }, [categories, parentId]);

  // Form State
  const [title, setTitle] = useState(product.title);
  const [brand, setBrand] = useState(product.brand || "");
  const [model, setModel] = useState(product.model || "");
  const [sku, setSku] = useState(product.sku || "");
  const [sourceUrl, setSourceUrl] = useState(product.sourceUrl || "");
  const [retailPrice, setRetailPrice] = useState(product.retailPrice);
  const [wholesalePrice, setWholesalePrice] = useState(product.wholesalePrice);
  const [wholesaleMinQty, setWholesaleMinQty] = useState(product.wholesaleMinQuantity || 1);
  const [fulfillmentMode, setFulfillmentMode] = useState<"own_stock" | "supplier">(
    product.fulfillmentMode || "supplier"
  );
  const [supplierAvailable, setSupplierAvailable] = useState(Boolean(product.supplierAvailable));
  const [isActive, setIsActive] = useState(product.active !== false);
  const [isFeatured, setIsFeatured] = useState(Boolean(product.featured));
  const [isWholesaleOnly, setIsWholesaleOnly] = useState(Boolean(product.wholesaleOnly));
  const [description, setDescription] = useState(product.description || "");
  const [tags, setTags] = useState(product.tags?.join(", ") || "");
  const [customImageUrl, setCustomImageUrl] = useState(product.imageUrl || "");
  const [supplierLivePrice, setSupplierLivePrice] = useState<number | "">(
    product.supplierLivePrice !== null && product.supplierLivePrice !== undefined
      ? Number(product.supplierLivePrice)
      : ""
  );
  const [stock, setStock] = useState<number>(Number(product.stock) || 0);
  const [warrantyTerms, setWarrantyTerms] = useState<string>(product.warrantyTerms || "");

  // Live checker inside editor
  const [isCheckingLive, setIsCheckingLive] = useState(false);
  const [liveCheckResult, setLiveCheckResult] = useState<string | null>(null);

  const handleLiveCheck = async () => {
    setIsCheckingLive(true);
    setLiveCheckResult(null);
    try {
      const res = await checkSingleProductSupplierStockAction(product.id);
      setSupplierAvailable(res.available);
      setLiveCheckResult(res.message);
    } catch (err: unknown) {
      setLiveCheckResult(err instanceof Error ? err.message : "Error al conectar con mayorista");
    } finally {
      setIsCheckingLive(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("id", product.id);
    formData.set("is_active_present", "true");
    formData.set("supplier_available_present", "true");

    if (isActive) formData.set("is_active", "on");
    if (supplierAvailable) formData.set("supplier_available", "on");
    if (isFeatured) formData.set("is_featured", "on");
    if (isWholesaleOnly) formData.set("is_wholesale_only", "on");
    formData.set("fulfillment_mode", fulfillmentMode);
    if (customImageUrl) formData.set("custom_image_url", customImageUrl);
    if (supplierLivePrice !== "") formData.set("supplier_live_price", String(supplierLivePrice));
    formData.set("stock", String(stock));
    if (warrantyTerms.trim()) formData.set("warranty_terms", warrantyTerms.trim());

    startTransition(async () => {
      try {
        setErrorMsg("");
        await updateProductAction(formData);
        onSaved();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error al guardar cambios.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-zinc-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 bg-zinc-50 shrink-0">
          <div>
            <h2 className="text-lg font-black text-zinc-900 flex items-center gap-2">
              <Edit className="h-5 w-5 text-emerald-600" />
              Editar Ficha de Producto
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">ID: {product.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-zinc-300 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          <input type="hidden" name="existing_image_url" value={product.imageUrl} />

          {errorMsg && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Section: Identidad y Categoría */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">1. Identidad del Producto</h3>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-zinc-700">
                Título del Producto *
                <input
                  type="text"
                  name="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full h-11 rounded-xl border border-zinc-300 px-3 font-bold text-zinc-900 text-sm outline-none focus:border-emerald-600"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block text-xs font-bold text-zinc-700">
                  SKU / Código Mayorista
                  <input
                    type="text"
                    name="sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Ej: TH308266"
                    className="mt-1 w-full h-10 rounded-xl border border-zinc-300 px-3 font-mono font-bold text-zinc-800 text-xs outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="block text-xs font-bold text-zinc-700">
                  Marca
                  <input
                    type="text"
                    name="brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ej: Total Tools, Wadfow, Medicube"
                    className="mt-1 w-full h-10 rounded-xl border border-zinc-300 px-3 font-semibold text-zinc-800 text-xs outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="block text-xs font-bold text-zinc-700">
                  Modelo
                  <input
                    type="text"
                    name="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Ej: 20V 285NM"
                    className="mt-1 w-full h-10 rounded-xl border border-zinc-300 px-3 font-semibold text-zinc-800 text-xs outline-none focus:border-emerald-600"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-zinc-700">
                  Categoría Principal *
                  <select
                    name="category_id"
                    required
                    value={parentId}
                    onChange={(e) => {
                      setParentId(e.target.value);
                      setSubcategoryId("");
                    }}
                    className="mt-1 w-full h-10 rounded-xl border border-zinc-300 px-3 text-xs font-semibold text-zinc-800 outline-none focus:border-emerald-600 bg-white cursor-pointer"
                  >
                    <option value="">Seleccionar categoría...</option>
                    {mainCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-bold text-zinc-700">
                  Subcategoría (Opcional)
                  <select
                    name="subcategory_id"
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                    disabled={!parentId || subcategoriesForParent.length === 0}
                    className="mt-1 w-full h-10 rounded-xl border border-zinc-300 px-3 text-xs font-semibold text-zinc-800 outline-none focus:border-emerald-600 bg-white cursor-pointer disabled:opacity-40"
                  >
                    <option value="">Ninguna</option>
                    {subcategoriesForParent.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          {/* Section: Precios */}
          <div className="space-y-4 pt-3 border-t border-zinc-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">2. Precios & Comercialización</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block text-xs font-bold text-zinc-700">
                Precio Minorista (ARS) *
                <input
                  type="number"
                  name="retail_price"
                  required
                  min="0"
                  step="100"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(Number(e.target.value))}
                  className="mt-1 w-full h-10 rounded-xl border border-zinc-300 px-3 font-black text-emerald-800 text-sm outline-none focus:border-emerald-600"
                />
              </label>

              <label className="block text-xs font-bold text-zinc-700">
                Precio Mayorista (ARS)
                <input
                  type="number"
                  name="wholesale_price"
                  min="0"
                  step="100"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(Number(e.target.value))}
                  className="mt-1 w-full h-10 rounded-xl border border-zinc-300 px-3 font-bold text-zinc-800 text-sm outline-none focus:border-emerald-600"
                />
              </label>

              <label className="block text-xs font-bold text-zinc-700">
                Mínimo Mayorista (Unidades)
                <input
                  type="number"
                  name="wholesale_min_qty"
                  min="1"
                  value={wholesaleMinQty}
                  onChange={(e) => setWholesaleMinQty(Number(e.target.value))}
                  className="mt-1 w-full h-10 rounded-xl border border-zinc-300 px-3 font-semibold text-zinc-800 text-sm outline-none focus:border-emerald-600"
                />
              </label>
            </div>

            {/* Costo en proveedor y margen calculado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="block text-xs font-bold text-zinc-700">
                Precio de Costo en Mayorista ($ ARS)
                <input
                  type="number"
                  min="0"
                  value={supplierLivePrice}
                  onChange={(e) =>
                    setSupplierLivePrice(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="Ej. 35000"
                  className="mt-1 w-full h-10 rounded-xl border border-zinc-300 px-3 font-bold text-zinc-900 text-xs outline-none focus:border-emerald-600"
                />
              </label>

              {supplierLivePrice !== "" && Number(supplierLivePrice) > 0 && retailPrice > 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 flex items-center justify-between text-xs mt-auto">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-semibold block">Margen bruto estimado:</span>
                    <strong className="text-xs font-extrabold text-emerald-950">
                      +{Math.round(((retailPrice - Number(supplierLivePrice)) / retailPrice) * 100)}% ({formatCurrency(retailPrice - Number(supplierLivePrice))} / unid.)
                    </strong>
                  </div>
                  <span className="rounded-md bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5">
                    Margen OK
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-zinc-400 flex items-center mt-auto pb-2">
                  Ingresá el costo en proveedor para calcular rentabilidad automática.
                </div>
              )}
            </div>
          </div>

          {/* Section: Abastecimiento y Mayorista */}
          <div className="space-y-4 pt-3 border-t border-zinc-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">3. Modalidad & Mayorista</h3>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-zinc-700">
                  Modalidad de Abastecimiento
                  <select
                    value={fulfillmentMode}
                    onChange={(e) => setFulfillmentMode(e.target.value as "own_stock" | "supplier")}
                    className="mt-1 w-full h-10 rounded-xl border border-zinc-300 px-3 text-xs font-bold text-zinc-800 outline-none focus:border-emerald-600 bg-white cursor-pointer"
                  >
                    <option value="supplier">Envío directo del Proveedor (Misiones)</option>
                    <option value="own_stock">Stock propio físico</option>
                  </select>
                </label>

                {fulfillmentMode === "supplier" ? (
                  <div className="flex items-center gap-3 pt-5">
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={supplierAvailable}
                        onChange={(e) => setSupplierAvailable(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>En stock en el mayorista</span>
                    </label>

                    <button
                      type="button"
                      disabled={isCheckingLive}
                      onClick={handleLiveCheck}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-sky-50 border border-sky-300 px-2.5 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${isCheckingLive ? "animate-spin" : ""}`} />
                      {isCheckingLive ? "Consultando..." : "Comprobar ahora"}
                    </button>
                  </div>
                ) : (
                  <div className="pt-5 text-xs text-zinc-500">
                    Control físico: {product.stockVerifiedAt ? `${product.stock} un. verificadas` : "Sin verificar"}
                  </div>
                )}
              </div>

              {liveCheckResult && (
                <div className="rounded-xl bg-sky-50 border border-sky-200 p-2.5 text-xs text-sky-900 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
                  {liveCheckResult}
                </div>
              )}

              <label className="block text-xs font-bold text-zinc-700">
                URL de la publicación en la web del mayorista
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="url"
                    name="source_url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://www.totalherramientasoficial.com.py/produto/..."
                    className="w-full h-10 rounded-xl border border-zinc-300 px-3 text-xs text-zinc-800 outline-none focus:border-emerald-600"
                  />
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 px-3 items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold shrink-0 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Section: Stock Físico y Garantía */}
          <div className="space-y-3 pt-3 border-t border-zinc-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">4. Inventario y Garantía</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-zinc-700">
                Stock Físico Propio (Unidades disponibles)
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(Math.max(0, Number(e.target.value)))}
                  className="mt-1 w-full h-10 rounded-xl border border-zinc-300 px-3 font-bold text-zinc-900 text-xs outline-none focus:border-emerald-600"
                />
              </label>
              <label className="block text-xs font-bold text-zinc-700">
                Términos de Garantía
                <input
                  type="text"
                  value={warrantyTerms}
                  onChange={(e) => setWarrantyTerms(e.target.value)}
                  placeholder="Ej. 12 meses oficial Total Tools"
                  className="mt-1 w-full h-10 rounded-xl border border-zinc-300 px-3 text-xs text-zinc-800 outline-none focus:border-emerald-600"
                />
              </label>
            </div>
          </div>

          {/* Section: Visibilidad y Estados */}
          <div className="space-y-4 pt-3 border-t border-zinc-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">5. Estado y Publicación</h3>

            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className={isActive ? "text-emerald-800 font-extrabold" : "text-zinc-500"}>
                  {isActive ? "Publicado y Activo en la tienda" : "Pausado (Oculto del catálogo)"}
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Destacado en portada</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWholesaleOnly}
                  onChange={(e) => setIsWholesaleOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span>Exclusivo canal mayorista</span>
              </label>
            </div>
          </div>

          {/* Section: Imágenes */}
          <div className="space-y-4 pt-3 border-t border-zinc-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">5. Imagen del Producto</h3>

            <div className="flex items-start gap-4">
              {customImageUrl ? (
                <img
                  src={customImageUrl}
                  alt="Vista previa"
                  className="h-16 w-16 rounded-xl object-cover border border-zinc-200 shadow-xs shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 border border-dashed border-zinc-300 shrink-0">
                  <Package className="h-6 w-6" />
                </div>
              )}

              <div className="flex-1 space-y-2">
                <label className="block text-xs font-bold text-zinc-700">
                  Subir nuevo archivo de imagen
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    className="mt-1 w-full text-xs text-zinc-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
                  />
                </label>

                <label className="block text-xs font-bold text-zinc-700">
                  O pegar URL directa de imagen
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="https://... o /products/..."
                    className="mt-1 w-full h-9 rounded-xl border border-zinc-300 px-3 text-xs text-zinc-800 outline-none focus:border-emerald-600"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section: Descripción & Tags */}
          <div className="space-y-4 pt-3 border-t border-zinc-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">6. Descripción & Etiquetas</h3>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-zinc-700">
                Descripción
                <textarea
                  name="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-3 text-xs text-zinc-800 outline-none focus:border-emerald-600 leading-relaxed"
                />
              </label>

              <label className="block text-xs font-bold text-zinc-700">
                Etiquetas (separadas por coma)
                <input
                  type="text"
                  name="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="oferta, nuevo, pack, garantia"
                  className="mt-1 w-full h-10 rounded-xl border border-zinc-300 px-3 text-xs text-zinc-800 outline-none focus:border-emerald-600"
                />
              </label>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-zinc-200 bg-zinc-50 -mx-6 -mb-6 p-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
            >
              {isPending ? "Guardando cambios..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// -------------------------------------------------------------
// Quick Supplier & Live Cost Modal
// -------------------------------------------------------------
function QuickSupplierModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (
    sourceUrl: string,
    livePrice?: number | null,
    fulfillmentMode?: "own_stock" | "supplier",
    supplierAvailable?: boolean,
    newRetailPrice?: number,
    newWholesalePrice?: number
  ) => void;
}) {
  const [sourceUrl, setSourceUrl] = useState(product.sourceUrl || "");
  const [livePrice, setLivePrice] = useState<number | "">(
    product.supplierLivePrice !== null && product.supplierLivePrice !== undefined
      ? Number(product.supplierLivePrice)
      : ""
  );
  const [fulfillmentMode, setFulfillmentMode] = useState<"own_stock" | "supplier">(
    product.fulfillmentMode || "supplier"
  );
  const [supplierAvailable, setSupplierAvailable] = useState<boolean>(
    Boolean(product.supplierAvailable)
  );
  const [retailPrice, setRetailPrice] = useState<number>(product.retailPrice);
  const [wholesalePrice, setWholesalePrice] = useState<number>(product.wholesalePrice);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const marginStats = useMemo(() => {
    const cost = Number(livePrice) || 0;
    const retail = Number(retailPrice) || 0;
    if (cost > 0 && retail > 0) {
      const profit = retail - cost;
      const margin = Math.round((profit / retail) * 100);
      return { cost, retail, profit, margin };
    }
    return null;
  }, [livePrice, retailPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    startTransition(async () => {
      try {
        await quickUpdateSupplierLinkAction(
          product.id,
          sourceUrl,
          livePrice === "" ? null : Number(livePrice),
          fulfillmentMode,
          supplierAvailable
        );

        if (retailPrice !== product.retailPrice || wholesalePrice !== product.wholesalePrice) {
          await quickUpdateProductPriceAction(product.id, retailPrice, wholesalePrice);
        }

        onSaved(
          sourceUrl,
          livePrice === "" ? null : Number(livePrice),
          fulfillmentMode,
          supplierAvailable,
          retailPrice,
          wholesalePrice
        );
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error al guardar el proveedor.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 bg-gradient-to-r from-sky-50 via-white to-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-zinc-950 text-base">
                Vincular / Modificar Proveedor
              </h3>
              <p className="text-[11px] text-zinc-500 line-clamp-1">{product.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="m-5 mb-0 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Supplier Link Input with Test Button */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-700">
              URL Directa en la Web del Mayorista
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://www.totalherramientasoficial.com.py/... o atacadousa.com.py/..."
                className="flex-1 h-10 rounded-xl border border-zinc-300 bg-white px-3 text-xs font-medium focus:border-sky-600 outline-none"
              />
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-1 rounded-xl bg-sky-600 px-3 text-xs font-bold text-white hover:bg-sky-700 transition-colors shadow-2xs"
                  title="Abrir enlace en una pestaña nueva para verificarlo"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Probar
                </a>
              )}
            </div>
            <p className="text-[10px] text-zinc-400">
              Pegá el link directo del producto para abrirlo en 1 clic y verificar precios siempre.
            </p>
          </div>

          {/* Supplier Cost & Selling Price */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-700">
                Costo en Proveedor ($ ARS)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">$</span>
                <input
                  type="number"
                  min="0"
                  value={livePrice}
                  onChange={(e) => setLivePrice(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Ej. 35000"
                  className="w-full h-10 rounded-xl border border-zinc-300 bg-white pl-7 pr-3 text-xs font-bold text-zinc-900 focus:border-sky-600 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-700">
                Precio Minorista Venta ($ ARS)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">$</span>
                <input
                  type="number"
                  min="1"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(Number(e.target.value))}
                  className="w-full h-10 rounded-xl border border-zinc-300 bg-white pl-7 pr-3 text-xs font-bold text-zinc-950 focus:border-emerald-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Live Margin Calculation */}
          {marginStats && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-[11px] text-zinc-500 font-semibold block">Margen de ganancia estimado:</span>
                <strong className="text-sm font-extrabold text-emerald-950">
                  +{marginStats.margin}% ({formatCurrency(marginStats.profit)} ganancia bruta)
                </strong>
              </div>
              <span className="rounded-lg bg-emerald-600 text-white text-[11px] font-bold px-2 py-1">
                Rentable
              </span>
            </div>
          )}

          {/* Fulfillment Mode & Availability */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-700">Modalidad de Entrega</label>
              <select
                value={fulfillmentMode}
                onChange={(e) => setFulfillmentMode(e.target.value as "own_stock" | "supplier")}
                className="w-full h-10 rounded-xl border border-zinc-300 bg-white px-2.5 text-xs font-bold text-zinc-800 focus:border-sky-600 outline-none cursor-pointer"
              >
                <option value="supplier">📦 Proveedor (Misiones)</option>
                <option value="own_stock">🏢 Stock Propio (Depósito)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-700">Estado en Mayorista</label>
              <button
                type="button"
                onClick={() => setSupplierAvailable(!supplierAvailable)}
                className={`w-full h-10 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  supplierAvailable
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-red-50 border-red-300 text-red-800"
                }`}
              >
                {supplierAvailable ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                {supplierAvailable ? "Disponible en mayorista" : "Agotado / Pausado"}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 px-5 py-2 text-xs font-extrabold text-white transition-all shadow-md shadow-sky-600/20 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" /> Guardar Proveedor
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
