"use client";

import { useState, useTransition, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductEditor } from "./product-editor";
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
  RotateCcw,
  CopyPlus,
  Clock,
  ShieldAlert,
  History,
  Sparkles,
  Download,
  Bell,
  Zap,
} from "lucide-react";
import { buildMercadoLibreSearchUrl } from "@/lib/mercadolibre-url";
import { ProductAuditModal } from "./product-audit-modal";
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
  bulkRollbackPricesAction,
  deleteProductAction,
  restoreProductAction,
  permanentDeleteProductAction,
  emptyTrashAction,
  quickUpdateSupplierLinkAction,
  exportProductAuditLogsCsvAction,
  updatePriceAlertThresholdAction,
  syncCatalogChunkAction,
  autoHuntUnlinkedProductsAction,
  toggleAutoPauseWhenOutOfStockAction,
} from "@/app/admin/actions";
import {
  calculateLandedCostArs,
  calculateSuggestedRetailPrice,
  getCategoryMarginBenchmark,
  evaluateCommercialMargin,
} from "@/lib/supplier-commercial";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "trash">("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<
    "all" | "in_stock" | "out_of_stock" | "supplier_available" | "supplier_paused" | "own_stock"
  >("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<"all" | "supplier" | "own_stock">("all");
  const [supplierLinkFilter, setSupplierLinkFilter] = useState<"all" | "with_link" | "without_link">("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState<"all" | "variants" | "simple">("all");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "price_asc" | "price_desc" | "status" | "recent">("recent");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [cloningProduct, setCloningProduct] = useState<Product | null>(null);
  const [auditingProduct, setAuditingProduct] = useState<Product | null>(null);
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);
  const [quickSupplierProduct, setQuickSupplierProduct] = useState<Product | null>(null);
  const [copiedSupplierLink, setCopiedSupplierLink] = useState<string | null>(null);
  const [quickRetailPrice, setQuickRetailPrice] = useState<number>(0);
  const [quickWholesalePrice, setQuickWholesalePrice] = useState<number>(0);
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [bulkPriceType, setBulkPriceType] = useState<"percentage" | "fixed_markup">("percentage");
  const [bulkPriceAmount, setBulkPriceAmount] = useState<number>(10);
  const [showStockAudit, setShowStockAudit] = useState(false);
  const [isExportingGlobalAudit, setIsExportingGlobalAudit] = useState(false);
  const [priceAlertThreshold, setPriceAlertThreshold] = useState<number>(30);

  // Live supplier verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<Record<string, { message: string; ok: boolean }>>({});
  const [isBatchSyncRunning, setIsBatchSyncRunning] = useState(false);
  const [isFullSyncRunning, setIsFullSyncRunning] = useState(false);
  const [fullSyncProgress, setFullSyncProgress] = useState<{
    processed: number;
    total: number;
    inStock: number;
    outOfStock: number;
    pausedCount: number;
    reactivatedCount: number;
    errors: number;
  } | null>(null);
  const [isAutoHunting, setIsAutoHunting] = useState(false);
  const [autoHuntReport, setAutoHuntReport] = useState<{
    totalUnlinked: number;
    checked: number;
    matchedAndActivated: number;
    keptInPause: number;
  } | null>(null);
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
    let paused = 0;
    let deleted = 0;
    let supplier = 0;
    let supplierAvailable = 0;
    let withSupplierLink = 0;
    let withVariants = 0;
    const total = products.length;

    for (let i = 0; i < total; i++) {
      const p = products[i];
      if (p.deletedAt) {
        deleted++;
        continue;
      }
      if (p.hasVariants) withVariants++;
      if (p.active !== false) active++;
      else paused++;
      if (p.fulfillmentMode === "supplier") {
        supplier++;
        if (p.supplierAvailable) supplierAvailable++;
      }
      if (p.sourceUrl) withSupplierLink++;
    }
    const nonDeleted = total - deleted;
    const ownStock = nonDeleted - supplier;
    const supplierPaused = supplier - supplierAvailable;
    const withoutSupplierLink = nonDeleted - withSupplierLink;

    return {
      total: nonDeleted,
      totalWithTrash: total,
      active,
      paused,
      deleted,
      supplier,
      ownStock,
      supplierAvailable,
      supplierPaused,
      withSupplierLink,
      withoutSupplierLink,
      withVariants,
      activeRate: nonDeleted > 0 ? Math.round((active / nonDeleted) * 100) : 0,
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
          const matchVariant = p.variants ? p.variants.some((v) => v.title.toLowerCase().includes(term) || (v.sku ? v.sku.toLowerCase().includes(term) : false)) : false;
          if (!matchTitle && !matchSku && !matchBrand && !matchModel && !matchTags && !matchVariant) return false;
        }

        // Product Type Filter (Variants vs Simple)
        if (productTypeFilter === "variants" && !p.hasVariants) return false;
        if (productTypeFilter === "simple" && p.hasVariants) return false;

        // Soft delete / Trash Filter
        const isDeleted = Boolean(p.deletedAt);
        if (statusFilter === "trash") {
          if (!isDeleted) return false;
        } else {
          if (isDeleted) return false;
          // Shop Status (Active / Paused)
          if (statusFilter === "active" && p.active === false) return false;
          if (statusFilter === "paused" && p.active !== false) return false;
        }

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
  }, [products, search, statusFilter, availabilityFilter, fulfillmentFilter, productTypeFilter, categoryFilter, brandFilter, sortBy, categories]);

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
        router.refresh();
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
        router.refresh();
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
        router.refresh();

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
        router.refresh();
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

  const handleFullCatalogSync = async () => {
    setIsFullSyncRunning(true);
    let offset = 0;
    const limit = 15;
    let total = 0;
    let inStock = 0;
    let outOfStock = 0;
    let pausedCount = 0;
    let reactivatedCount = 0;
    let errors = 0;

    try {
      while (true) {
        const progress = await syncCatalogChunkAction(offset, limit);
        total = progress.total;
        inStock += progress.inStock;
        outOfStock += progress.outOfStock;
        pausedCount += progress.pausedCount;
        reactivatedCount += progress.reactivatedCount;
        errors += progress.errors;

        setFullSyncProgress({
          processed: progress.processed,
          total: progress.total,
          inStock,
          outOfStock,
          pausedCount,
          reactivatedCount,
          errors,
        });

        if (progress.done || !progress.nextOffset) {
          break;
        }
        offset = progress.nextOffset;
        await new Promise((r) => setTimeout(r, 200));
      }

      router.refresh();
      showToast(
        `Sincronización completa finalizada: ${inStock} disponibles, ${pausedCount} pausados sin stock, ${reactivatedCount} reactivados.`,
        "success"
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error durante la sincronización continua.", "error");
    } finally {
      setIsFullSyncRunning(false);
    }
  };

  const handleAutoHuntUnlinked = () => {
    setIsAutoHunting(true);
    startTransition(async () => {
      try {
        const report = await autoHuntUnlinkedProductsAction(30);
        setAutoHuntReport({
          totalUnlinked: report.totalUnlinked,
          checked: report.checked,
          matchedAndActivated: report.matchedAndActivated,
          keptInPause: report.keptInPause,
        });
        router.refresh();
        showToast(
          `Cazador de proveedores: ${report.matchedAndActivated} emparejados al menor costo y activados; ${report.keptInPause} quedaron en pausa.`,
          "success"
        );
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Error al rastrear proveedores.", "error");
      } finally {
        setIsAutoHunting(false);
      }
    });
  };

  // Bulk Status Actions
  const handleBulkAction = (action: "activate" | "pause" | "supplier_available" | "supplier_pause" | "soft_delete" | "restore" | "permanent_delete") => {
    if (selectedIds.length === 0) return;
    if (action === "permanent_delete" && !confirm(`⚠️ ¿Eliminar definitivamente los ${selectedIds.length} productos seleccionados?\n\nEsta acción NO se puede deshacer y borrará permanentemente sus datos.`)) {
      return;
    }
    if (action === "soft_delete" && !confirm(`¿Mover a la papelera los ${selectedIds.length} productos seleccionados?`)) {
      return;
    }
    startTransition(async () => {
      try {
        await bulkUpdateProductStatusAction(selectedIds, action);
        router.refresh();
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
        router.refresh();
        showToast(`Precios actualizados para ${selectedIds.length} productos.`, "success");
        setIsBulkPriceModalOpen(false);
        setSelectedIds([]);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Error al ajustar precios.", "error");
      }
    });
  };

  // Bulk Price Rollback Execution
  const handleBulkRollbackPrices = () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `¿Revertir el precio de los ${selectedIds.length} productos seleccionados a su valor anterior registrado en auditoría?`
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await bulkRollbackPricesAction(selectedIds);
        router.refresh();
        showToast(`Se restauró el precio anterior de ${res.count} producto(s).`, "success");
        setSelectedIds([]);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Error al revertir precios.", "error");
      }
    });
  };

  // Update Price Alert Threshold
  const handleUpdateThreshold = (newThreshold: number) => {
    setPriceAlertThreshold(newThreshold);
    startTransition(async () => {
      try {
        await updatePriceAlertThresholdAction(newThreshold);
        showToast(`Umbral de alerta de precio configurado en ±${newThreshold}%`, "success");
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Error al actualizar umbral.", "error");
      }
    });
  };

  // Quick Price Save
  const handleSaveQuickPrice = () => {
    if (!quickPriceProduct) return;
    startTransition(async () => {
      try {
        await quickUpdateProductPriceAction(quickPriceProduct.id, quickRetailPrice, quickWholesalePrice);
        router.refresh();
        showToast(`Precio actualizado para "${quickPriceProduct.title}".`, "success");
        setQuickPriceProduct(null);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Error al guardar precio.", "error");
      }
    });
  };

  // Export Global Audit Log to CSV
  const handleExportGlobalAuditCsv = async () => {
    try {
      setIsExportingGlobalAudit(true);
      const res = await exportProductAuditLogsCsvAction(undefined, 500);
      const blob = new Blob(["\uFEFF" + res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = res.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Reporte de auditoría descargado (${res.count} registros).`, "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error al exportar auditoría.", "error");
    } finally {
      setIsExportingGlobalAudit(false);
    }
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

  // Soft delete product helper (move to trash)
  const handleSoftDeleteProduct = (productId: string, title: string) => {
    if (confirm(`¿Mover "${title}" a la papelera de reciclaje?\n\nPodrás restaurarlo o eliminarlo definitivamente cuando quieras.`)) {
      startTransition(async () => {
        try {
          const result = await deleteProductAction(productId);
          if (result && !result.success) {
            showToast(result.error, "error");
            return;
          }
          router.refresh();
          showToast(`Producto "${title}" movido a la papelera.`, "info");
        } catch (err: unknown) {
          showToast(err instanceof Error ? err.message : "Error al enviar a papelera.", "error");
        }
      });
    }
  };

  // Restore product helper
  const handleRestoreProduct = (productId: string, title: string) => {
    startTransition(async () => {
      try {
        const result = await restoreProductAction(productId);
        if (result && !result.success) {
          showToast(result.error, "error");
          return;
        }
        router.refresh();
        showToast(`Producto "${title}" restaurado exitosamente (en estado pausado).`, "success");
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Error al restaurar producto.", "error");
      }
    });
  };

  // Permanent purge product helper
  const handlePermanentDeleteProduct = (productId: string, title: string) => {
    if (confirm(`⚠️ ¿ELIMINAR DEFINITIVAMENTE "${title}"?\n\nEsta acción NO se puede deshacer y borrará el producto de la base de datos.`)) {
      startTransition(async () => {
        try {
          const result = await permanentDeleteProductAction(productId);
          if (result && !result.success) {
            showToast(result.error, "error");
            return;
          }
          router.refresh();
          showToast(`Producto "${title}" eliminado definitivamente.`, "success");
        } catch (err: unknown) {
          showToast(err instanceof Error ? err.message : "Error al eliminar definitivamente.", "error");
        }
      });
    }
  };

  // Empty trash action (either older than 30 days or all)
  const handleEmptyTrash = (daysThreshold?: number) => {
    const isAll = !daysThreshold || daysThreshold <= 0;
    const confirmMsg = isAll
      ? `⚠️ ¿VACIAR TODA LA PAPELERA?\n\nEsta acción eliminará definitivamente las publicaciones en la papelera sin posibilidad de recuperación.`
      : `⚠️ ¿Eliminar definitivamente las publicaciones con más de ${daysThreshold} días en la papelera?`;

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      try {
        const result = await emptyTrashAction(daysThreshold);
        if (result && !result.success) {
          showToast(result.error, "error");
          return;
        }
        router.refresh();
        showToast(
          isAll
            ? "Papelera vaciada por completo."
            : `Se purgaron ${result.data?.count ?? 0} publicaciones vencidas de la papelera.`,
          "success"
        );
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Error al vaciar papelera.", "error");
      }
    });
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
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-semibold">Total Catálogo</span>
            <Boxes className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-black text-zinc-900">{stats.total.toLocaleString("es-AR")}</p>
          <span className="text-[11px] text-zinc-400 font-medium">Publicaciones cargadas</span>
        </div>

        <div className="min-w-0 rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-semibold">En Línea (Activos)</span>
            <Eye className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900">{stats.active.toLocaleString("es-AR")}</p>
          <span className="text-[11px] text-emerald-700 font-semibold">{stats.activeRate}% del catálogo</span>
        </div>

        <div className="min-w-0 rounded-2xl border border-amber-200/60 bg-amber-50/40 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-xs font-semibold">Pausados / Ocultos</span>
            <EyeOff className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900">{stats.paused.toLocaleString("es-AR")}</p>
          <span className="text-[11px] text-amber-700 font-medium">Fuera de la tienda</span>
        </div>

        <div className="min-w-0 rounded-2xl border border-sky-200/60 bg-sky-50/40 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-sky-800 mb-1">
            <span className="text-xs font-semibold">Modo Proveedor</span>
            <Truck className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-sky-900">{stats.supplier.toLocaleString("es-AR")}</p>
          <span className="text-[11px] text-sky-700 font-medium">Despacho Misiones</span>
        </div>

        <div className="min-w-0 rounded-2xl border border-indigo-200/60 bg-indigo-50/40 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-indigo-800 mb-1">
            <span className="text-xs font-semibold">En Stock Mayorista</span>
            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-900">{stats.supplierAvailable.toLocaleString("es-AR")}</p>
          <span className="text-[11px] text-indigo-700 font-semibold">Listos para vender</span>
        </div>

        <div className="min-w-0 rounded-2xl border border-red-200/60 bg-red-50/40 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-red-800 mb-1">
            <span className="text-xs font-semibold">Pausados Mayorista</span>
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-900">{stats.supplierPaused.toLocaleString("es-AR")}</p>
          <span className="text-[11px] text-red-700 font-medium">Sin stock en proveedor</span>
        </div>
      </div>

      {/* Supplier Command Center */}
      <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-b from-sky-50/50 via-white to-zinc-50/30 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Top Header Row: System Info on the left, Secondary Utilities on the right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-sky-100/80 pb-3.5">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-xs">
              <RefreshCw className={`h-4.5 w-4.5 ${isFullSyncRunning || isBatchSyncRunning ? "animate-spin" : ""}`} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-zinc-950 tracking-tight">
                  Sincronización Total & Abastecimiento Mayorista
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Nube 24/7 Activa
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                Evalúa ofertas en los 7 mayoristas, elige el menor costo puesto en mano ($1.600 + 20% pasero) y pausa publicaciones sin stock.
              </p>
            </div>
          </div>

          {/* Secondary Utilities: Stock Audit, CSV, and Price Alert */}
          <div className="flex flex-wrap items-center gap-2 pt-1 lg:pt-0 shrink-0">
            <button
              type="button"
              onClick={() => setShowStockAudit(!showStockAudit)}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                showStockAudit
                  ? "bg-zinc-200 border-zinc-300 text-zinc-900"
                  : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5 text-zinc-500" />
              <span>{showStockAudit ? "Ocultar Auditoría" : "Auditoría Stock"}</span>
            </button>

            <button
              type="button"
              disabled={isExportingGlobalAudit}
              onClick={handleExportGlobalAuditCsv}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3 text-xs font-semibold text-zinc-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Descargar reporte completo de precios y stock en CSV"
            >
              <Download className="h-3.5 w-3.5 text-purple-600" />
              <span>CSV</span>
            </button>

            <Link
              href="/admin/precios"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100/90 px-3 text-xs font-bold text-amber-900 shadow-2xs transition-all cursor-pointer"
              title="Comparar precios contra Mercado Libre y maximizar ganancias"
            >
              <Zap className="h-3.5 w-3.5 text-amber-600 fill-amber-600" />
              <span>Precios vs ML</span>
            </Link>

            <div
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 shadow-2xs"
              title="Variación de precio que dispara alerta"
            >
              <Bell className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span className="text-[11px] text-zinc-400">Alerta:</span>
              <select
                value={priceAlertThreshold}
                onChange={(e) => handleUpdateThreshold(Number(e.target.value))}
                disabled={isPending}
                className="bg-transparent text-xs font-bold text-zinc-800 outline-none cursor-pointer pr-1"
              >
                <option value="15">±15%</option>
                <option value="20">±20%</option>
                <option value="30">±30%</option>
                <option value="40">±40%</option>
                <option value="50">±50%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Hero Actions: 2 balanced, responsive command cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Card 1: Sincronizar Catálogo Completo */}
          <div className="flex flex-col justify-between rounded-xl border border-sky-200/80 bg-white p-3.5 shadow-2xs hover:border-sky-300 transition-all">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
                  Revisión Global Multi-Proveedor
                </span>
                <h4 className="text-sm font-extrabold text-zinc-900 mt-0.5">
                  Sincronización Total de Stock
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Evalúa todas las fuentes vinculadas, toma el precio más bajo con stock y pausa los agotados.
                </p>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <RefreshCw className={`h-4 w-4 ${isFullSyncRunning ? "animate-spin" : ""}`} />
              </div>
            </div>

            <button
              type="button"
              disabled={isFullSyncRunning || isAutoHunting || isPending}
              onClick={handleFullCatalogSync}
              className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-xs font-extrabold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFullSyncRunning ? "animate-spin" : ""}`} />
              <span>{isFullSyncRunning ? "Sincronizando Catálogo en Vivo..." : "Sincronizar Catálogo Completo"}</span>
            </button>
          </div>

          {/* Card 2: Cazador de Proveedores (Auto-Hunter) */}
          <div className="flex flex-col justify-between rounded-xl border border-emerald-200/80 bg-white p-3.5 shadow-2xs hover:border-emerald-300 transition-all">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    Auto-Hunter de Huérfanos
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.2 text-[10px] font-bold text-amber-800">
                    {stats.withoutSupplierLink} sin enlace
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-zinc-900 mt-0.5">
                  Cazador de Proveedores
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Rastrea coincidencias en los 7 mayoristas. Si hay stock vincula el más económico; si no, pausa.
                </p>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Sparkles className={`h-4 w-4 ${isAutoHunting ? "animate-spin" : ""}`} />
              </div>
            </div>

            <button
              type="button"
              disabled={isAutoHunting || isFullSyncRunning || isPending}
              onClick={handleAutoHuntUnlinked}
              className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-xs font-extrabold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`h-3.5 w-3.5 ${isAutoHunting ? "animate-spin" : ""}`} />
              <span>
                {isAutoHunting ? "Rastreando en los 7 mayoristas..." : `Cazador de Proveedores (${stats.withoutSupplierLink})`}
              </span>
            </button>
          </div>

          {/* Card 3: Radar de Oportunidades Mayoristas */}
          <div className="flex flex-col justify-between rounded-xl border border-indigo-200/80 bg-white p-3.5 shadow-2xs hover:border-indigo-300 transition-all">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                    Expansión de Catálogo
                  </span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.2 text-[10px] font-bold text-indigo-800">
                    +1.500 ofertas
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-zinc-900 mt-0.5">
                  Radar de Oportunidades
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Explorá productos mayoristas rentables con cálculo automático de costo y reventa.
                </p>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>

            <Link
              href="/admin/oportunidades"
              className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-xs font-extrabold text-white shadow-xs transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Explorar Oportunidades</span>
            </Link>
          </div>
        </div>

        {/* Full Sync Progress Bar and Live Stats */}
        {fullSyncProgress && (
          <div className="rounded-xl border border-sky-200 bg-white p-3.5 shadow-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold">
              <span className="text-sky-900">
                Sincronización en curso: {fullSyncProgress.processed} de {fullSyncProgress.total} productos ({Math.round((fullSyncProgress.processed / Math.max(1, fullSyncProgress.total)) * 100)}%)
              </span>
              <span className="text-zinc-500 font-semibold">
                {fullSyncProgress.inStock} disponibles · {fullSyncProgress.pausedCount} pausados · {fullSyncProgress.reactivatedCount} reactivados
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full bg-sky-600 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((fullSyncProgress.processed / Math.max(1, fullSyncProgress.total)) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Auto Hunt Report */}
        {autoHuntReport && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-emerald-950 font-semibold">
            <span>
              🎯 Auto-Hunter: {autoHuntReport.matchedAndActivated} productos emparejados con mayorista y activados en tienda.
            </span>
            <span className="text-zinc-600 font-medium">
              {autoHuntReport.keptInPause} quedaron en pausa por falta de stock.
            </span>
          </div>
        )}

        {/* Last Batch Sync Report note */}
        {batchSyncReport && !fullSyncProgress && (
          <div className="text-[11px] text-zinc-500 pt-1 border-t border-sky-100/50 flex flex-wrap items-center justify-between gap-2">
            <span>
              Último reporte ({batchSyncReport.timestamp}): <strong>{batchSyncReport.checked}</strong> revisados ·{" "}
              <strong className="text-emerald-700">{batchSyncReport.inStock}</strong> en stock ·{" "}
              <strong className="text-amber-700">{batchSyncReport.outOfStock}</strong> sin stock
            </span>
            {batchSyncReport.errors > 0 && (
              <span className="text-red-600 font-semibold">{batchSyncReport.errors} sin respuesta</span>
            )}
          </div>
        )}
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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

          {onOpenCreateProduct && (
            <button
              type="button"
              onClick={onOpenCreateProduct}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-4 sm:px-5 shadow-xs active:scale-98 transition-all cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Producto</span>
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Status in Shop Filter */}
            <div className="flex items-center rounded-xl border border-zinc-200 p-1 bg-zinc-50/70 overflow-x-auto max-w-full scrollbar-none shrink-0">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setPage(1);
                  setSelectedIds([]);
                }}
                className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                  statusFilter === "all" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Todos ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("active");
                  setPage(1);
                  setSelectedIds([]);
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
                  setSelectedIds([]);
                }}
                className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                  statusFilter === "paused" ? "bg-amber-600 text-white shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Pausados ({stats.paused})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("trash");
                  setPage(1);
                  setSelectedIds([]);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                  statusFilter === "trash" ? "bg-rose-600 text-white shadow-xs" : "text-zinc-500 hover:text-rose-700"
                }`}
                title="Publicaciones en papelera de reciclaje"
              >
                <Trash2 className="size-3.5" />
                <span>Papelera ({stats.deleted})</span>
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

            {/* Product Type (All / With Variants / Simple) */}
            <select
              value={productTypeFilter}
              onChange={(e) => {
                setProductTypeFilter(e.target.value as "all" | "variants" | "simple");
                setPage(1);
              }}
              className="h-10 rounded-xl border border-zinc-300 px-3 outline-none focus:border-purple-600 bg-white font-bold cursor-pointer"
            >
              <option value="all">Tipo: Todos ({products.length})</option>
              <option value="variants">✨ Con Variantes ({stats.withVariants})</option>
              <option value="simple">📦 Simples ({products.length - stats.withVariants})</option>
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
              {statusFilter === "trash" ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleBulkAction("restore")}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Restaurar seleccionados</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkAction("permanent_delete")}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Eliminar definitivamente</span>
                  </button>
                </>
              ) : (
                <>
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
                  <button
                    type="button"
                    onClick={handleBulkRollbackPrices}
                    className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-purple-950 border border-zinc-700 px-3 py-1.5 text-purple-300 transition-colors cursor-pointer"
                    title="Revertir el precio de los productos seleccionados a su valor anterior registrado en auditoría"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Revertir precios</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkAction("soft_delete")}
                    className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950 border border-zinc-700 px-3 py-1.5 text-rose-300 transition-colors cursor-pointer"
                    title="Mover seleccionados a la papelera"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Papelera</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Trash Management & Policy Banner */}
      {statusFilter === "trash" && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <ShieldAlert className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-rose-950">
                Papelera de reciclaje ({stats.deleted} {stats.deleted === 1 ? "publicación" : "publicaciones"})
              </p>
              <p className="text-xs text-rose-850 mt-0.5">
                Las publicaciones se resguardan para auditoría y recuperación. Podés restaurarlas o purgar elementos antiguos de forma segura.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              disabled={isPending || stats.deleted === 0}
              onClick={() => handleEmptyTrash(30)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 text-xs font-bold text-rose-800 hover:bg-rose-50 disabled:opacity-40 transition shadow-2xs cursor-pointer"
              title="Eliminar permanentemente publicaciones con más de 30 días en papelera"
            >
              <Clock className="size-3.5 text-rose-600" />
              <span>Vaciar vencidos (&gt; 30 días)</span>
            </button>
            <button
              type="button"
              disabled={isPending || stats.deleted === 0}
              onClick={() => handleEmptyTrash(0)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-40 transition shadow-2xs cursor-pointer"
              title="Vaciar toda la papelera definitivamente"
            >
              <Trash2 className="size-3.5" />
              <span>Vaciar papelera</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Products Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
        {/* Desktop Multi-column Table (>= lg) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="admin-card-table w-full min-w-[1000px] text-left text-sm">
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
                {statusFilter === "trash" ? (
                  <>
                    <th className="px-4 py-3.5">Auditoría de Eliminación</th>
                    <th className="px-4 py-3.5">Retención & Vencimiento</th>
                    <th className="px-4 py-3.5 text-center">Estado</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3.5">Precios & Margen</th>
                    <th className="px-4 py-3.5">Abastecimiento & Mayorista</th>
                    <th className="px-4 py-3.5 text-center">Estado Tienda</th>
                  </>
                )}
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
                      <p className="font-bold text-zinc-800 text-base">
                        {statusFilter === "trash" ? "La papelera está vacía" : "No se encontraron productos"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {statusFilter === "trash"
                          ? "Las publicaciones que envíes a la papelera aparecerán acá para que puedas restaurarlas o eliminarlas definitivamente."
                          : search || categoryFilter || brandFilter || statusFilter !== "all" || availabilityFilter !== "all"
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
                    <Fragment key={product.id}>
                      <tr
                        className={`hover:bg-zinc-50/60 transition-colors ${
                          isSelected ? "bg-emerald-50/30" : ""
                        } ${!isActive ? "opacity-75 bg-zinc-50/40" : ""}`}
                      >
                      {/* Select Checkbox */}
                      <td data-label="Seleccionar" className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(product.id)}
                          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Product identity */}
                      <td data-label="Producto" className="px-4 py-3.5">
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

                              {product.hasVariants && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)}
                                  className="inline-flex items-center gap-1 rounded bg-purple-50 hover:bg-purple-100 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-800 transition-colors cursor-pointer"
                                  title="Ver desglose de variantes en la tabla"
                                >
                                  <Layers className="h-2.5 w-2.5" />
                                  {product.variants?.length ? `${product.variants.length} variantes` : "Variantes"}
                                  <span className="text-[9px] text-purple-600 font-normal">
                                    {expandedProductId === product.id ? "▲" : "▼"}
                                  </span>
                                </button>
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
                      <td data-label="Categoría" className="px-4 py-3.5 text-zinc-600 text-xs">
                        <span className="inline-flex items-center gap-1 font-medium bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-lg border border-zinc-200/70 max-w-44 truncate">
                          <Layers className="h-3 w-3 text-zinc-400 shrink-0" />
                          <span className="truncate">{categoryDisplay}</span>
                        </span>
                      </td>

                      {statusFilter === "trash" ? (
                        <>
                          {/* Audit: When & Who deleted */}
                          <td data-label="Auditoría" className="px-4 py-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
                                <Trash2 className="size-3.5 text-rose-600 shrink-0" />
                                <span>
                                  {product.deletedAt
                                    ? new Date(product.deletedAt).toLocaleString("es-AR", {
                                        timeZone: "America/Argentina/Buenos_Aires",
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "—"}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-500 font-medium">
                                Por: <strong className="text-zinc-750">{product.deletedBy || "Administrador"}</strong>
                              </p>
                            </div>
                          </td>

                          {/* Retention & Expiry status */}
                          <td data-label="Retención" className="px-4 py-3.5">
                            {(() => {
                              const daysInTrash = product.deletedAt
                                ? Math.floor((Date.now() - new Date(product.deletedAt).getTime()) / 86400000)
                                : 0;
                              const isExpired = daysInTrash >= 30;
                              return (
                                <div className="space-y-1">
                                  {isExpired ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-200">
                                      ⚠️ Vencido (+{daysInTrash}d)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                                      <Clock className="size-3 text-amber-600" />
                                      <span>Retención ({30 - daysInTrash}d restantes)</span>
                                    </span>
                                  )}
                                  <p className="text-[10px] text-zinc-400 font-medium">
                                    {isExpired
                                      ? "Listo para purga definitiva"
                                      : `Lleva ${daysInTrash} ${daysInTrash === 1 ? "día" : "días"} en papelera`}
                                  </p>
                                </div>
                              );
                            })()}
                          </td>

                          {/* State badge */}
                          <td data-label="Estado" className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200 shadow-2xs">
                              <Trash2 className="size-3" />
                              <span>En papelera</span>
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Prices & Quick Edit */}
                          <td data-label="Precios" className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div>
                                {product.hasVariants && product.minPrice && product.maxPrice && product.minPrice < product.maxPrice ? (
                                  <>
                                    <div className="font-black text-zinc-950 text-sm">
                                      {formatCurrency(product.minPrice)} – {formatCurrency(product.maxPrice)}
                                    </div>
                                    <div className="text-[10px] font-bold text-purple-700">
                                      Rango variantes
                                    </div>
                                  </>
                                ) : (
                                  <div className="font-black text-zinc-950 text-sm">
                                    {formatCurrency(product.retailPrice)}
                                  </div>
                                )}
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
                          <td data-label="Abastecimiento" className="px-4 py-3.5">
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
                                    {product.hasVariants && product.variants?.length
                                      ? `Stock Total: ${product.stock} un. (${product.variants.length} var.)`
                                      : product.stockVerifiedAt
                                      ? `Stock Propio (${product.stock} un.)`
                                      : "Stock Propio (Sin verificar)"}
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
                          <td data-label="Estado en tienda" className="px-4 py-3.5 text-center">
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
                        </>
                      )}

                      {/* Row Actions */}
                      <td data-label="Acciones" className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {statusFilter === "trash" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRestoreProduct(product.id, product.title)}
                                className="inline-flex h-8 items-center gap-1 px-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer font-bold text-xs shadow-2xs"
                                title="Restaurar de la papelera"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Restaurar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePermanentDeleteProduct(product.id, product.title)}
                                className="inline-flex h-8 items-center gap-1 px-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer font-bold text-xs shadow-2xs"
                                title="Eliminar definitivamente de la base de datos"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Definitivo</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingProduct(product)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer bg-white shadow-2xs"
                                title="Editar ficha completa"
                              >
                                <Edit className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setCloningProduct(product)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer bg-white shadow-2xs"
                                title="Clonar / duplicar ficha"
                              >
                                <CopyPlus className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setAuditingProduct(product)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer bg-white shadow-2xs"
                                title="Historial y auditoría de cambios"
                              >
                                <History className="h-4 w-4" />
                              </button>

                              <a
                                href={`/producto/${product.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer bg-white shadow-2xs"
                                title="Ver en la tienda pública"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleSoftDeleteProduct(product.id, product.title)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer bg-white shadow-2xs"
                                title="Mover a la papelera"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Variants Sub-Table */}
                    {expandedProductId === product.id && product.hasVariants && product.variants && (
                      <tr className="bg-purple-50/40 border-b border-purple-200/70">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="rounded-xl border border-purple-200/80 bg-white p-4 shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex size-7 items-center justify-center rounded-lg bg-purple-100 text-purple-800">
                                  <Layers className="size-4" />
                                </span>
                                <div>
                                  <h4 className="text-sm font-bold text-zinc-950">
                                    Desglose de variantes: {product.title}
                                  </h4>
                                  <p className="text-xs text-zinc-500">
                                    {product.variants.length} variantes configuradas · Control individual de precio, SKU y stock
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingProduct(product)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 transition cursor-pointer"
                              >
                                <Edit className="size-3.5" /> Editar en Gestor Completo
                              </button>
                            </div>

                            <div className="mt-3 overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-zinc-200 text-zinc-500 font-semibold">
                                    <th className="pb-2">Variante</th>
                                    <th className="pb-2">Opciones</th>
                                    <th className="pb-2">SKU</th>
                                    <th className="pb-2 text-right">Precio Minorista</th>
                                    <th className="pb-2 text-center">Stock</th>
                                    <th className="pb-2 text-center">Estado</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                  {product.variants.map((v) => (
                                    <tr key={v.id} className="hover:bg-zinc-50/70">
                                      <td className="py-2.5 font-bold text-zinc-900 flex items-center gap-2">
                                        {v.imageUrl && (
                                          <div className="relative size-8 rounded border border-zinc-200 bg-white overflow-hidden shrink-0">
                                            <img src={v.imageUrl} alt={v.title} className="size-full object-contain p-0.5" />
                                          </div>
                                        )}
                                        <span>{v.title}</span>
                                      </td>
                                      <td className="py-2.5 text-zinc-600">
                                        <div className="flex flex-wrap gap-1">
                                          {Object.entries(v.options || {}).map(([dim, val]) => (
                                            <span key={dim} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 border border-zinc-200">
                                              <strong>{dim}:</strong> {val}
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="py-2.5 font-mono text-[11px] text-zinc-500">
                                        {v.sku ? (
                                          <span className="bg-zinc-100 px-1.5 py-0.5 rounded font-bold text-zinc-800">
                                            {v.sku}
                                          </span>
                                        ) : (
                                          "—"
                                        )}
                                      </td>
                                      <td className="py-2.5 text-right font-black text-zinc-950">
                                        {formatCurrency(v.retailPrice)}
                                      </td>
                                      <td className="py-2.5 text-center font-bold">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                          v.stock > 0 ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                                        }`}>
                                          {v.stock} un.
                                        </span>
                                      </td>
                                      <td className="py-2.5 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          v.isActive ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"
                                        }`}>
                                          {v.isActive ? "Activo" : "Inactivo"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile Product Cards View (< lg) */}
        <div className="block lg:hidden divide-y divide-zinc-200">
          {paginatedProducts.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <Package className="size-10 text-zinc-400 mx-auto mb-2" />
              <p className="font-bold text-zinc-800">
                {statusFilter === "trash" ? "Papelera vacía" : "No se encontraron productos"}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                {statusFilter === "trash"
                  ? "Las publicaciones que elimines aparecerán acá para que puedas recuperarlas."
                  : "Ajustá los filtros o creá un nuevo producto."}
              </p>
            </div>
          ) : (
            paginatedProducts.map((product) => {
              const isSelected = selectedIds.includes(product.id);
              const isActive = product.active !== false;
              const prodCategory = categories.find((c) => c.id === product.categoryId);
              let categoryDisplay = product.categoryName;
              if (prodCategory && prodCategory.parentId) {
                const parent = categories.find((c) => c.id === prodCategory.parentId);
                if (parent) categoryDisplay = `${parent.name} > ${prodCategory.name}`;
              }
              const isExpanded = expandedProductId === product.id;

              return (
                <div
                  key={`mobile-${product.id}`}
                  className={`p-4 space-y-3.5 transition-colors ${
                    isSelected ? "bg-emerald-50/40" : "bg-white"
                  } ${!isActive ? "opacity-80 bg-zinc-50/60" : ""}`}
                >
                  {/* Top info: Checkbox, Image, Title, Category */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectProduct(product.id)}
                      className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />

                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="size-16 rounded-xl object-contain border border-zinc-200 bg-white p-1 shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="size-16 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-400 shrink-0">
                        <Package className="size-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60 truncate max-w-[180px]">
                          {categoryDisplay}
                        </span>
                        {product.brand && (
                          <span className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {product.brand}
                          </span>
                        )}
                        {product.featured && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded">
                            ★ Destacado
                          </span>
                        )}
                      </div>

                      <h4 className="mt-1 text-sm font-bold text-zinc-950 leading-snug line-clamp-2">
                        {product.title}
                      </h4>

                      {product.sku && (
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopySku(product.sku!)}
                            className="inline-flex items-center gap-1 rounded bg-zinc-100 hover:bg-zinc-200 px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-700 transition cursor-pointer"
                          >
                            {copiedSku === product.sku ? <Check className="size-2.5 text-emerald-600" /> : <Copy className="size-2.5 text-zinc-400" />}
                            SKU: {product.sku}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle row: Price and Status Badges OR Trash Audit Information */}
                  {statusFilter === "trash" ? (
                    <div className="pt-2 border-t border-zinc-100 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {(() => {
                          const daysInTrash = product.deletedAt
                            ? Math.floor((Date.now() - new Date(product.deletedAt).getTime()) / 86400000)
                            : 0;
                          const isExpired = daysInTrash >= 30;
                          return (
                            <div className="flex items-center gap-2">
                              {isExpired ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-200">
                                  ⚠️ Vencido (+{daysInTrash}d)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                                  <Clock className="size-3 text-amber-600" />
                                  <span>Retención ({30 - daysInTrash}d restantes)</span>
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                          <Trash2 className="size-3" />
                          En papelera
                        </span>
                      </div>
                      <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-2.5 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-zinc-600">
                          <Clock className="size-3 text-zinc-400 shrink-0" />
                          <span>
                            Eliminado:{" "}
                            <strong className="text-zinc-800">
                              {product.deletedAt
                                ? new Date(product.deletedAt).toLocaleString("es-AR", {
                                    timeZone: "America/Argentina/Buenos_Aires",
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </strong>
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 pl-4.5">
                          Por: <strong className="text-zinc-700">{product.deletedBy || "Administrador"}</strong>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                      <div>
                        {product.hasVariants && product.minPrice && product.maxPrice && product.minPrice < product.maxPrice ? (
                          <div className="text-base font-black text-zinc-950">
                            {formatCurrency(product.minPrice)} – {formatCurrency(product.maxPrice)}
                            <span className="ml-1 text-[10px] font-bold text-purple-700 block">Rango variantes</span>
                          </div>
                        ) : (
                          <div className="text-base font-black text-zinc-950">
                            {formatCurrency(product.retailPrice)}
                          </div>
                        )}
                        <div className="text-[11px] text-zinc-500">
                          Mayorista: <strong className="text-zinc-800">{formatCurrency(product.wholesalePrice)}</strong> (mín {product.wholesaleMinQuantity})
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Active Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(product)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all shadow-2xs ${
                            isActive
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                          }`}
                        >
                          <span className={`size-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                          {isActive ? "Activo" : "Pausado"}
                        </button>

                        {/* Stock / Fulfillment Badge */}
                        {product.fulfillmentMode === "own_stock" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                            Stock Tandil ({product.stock})
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleSupplierAvailability(product)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold border transition ${
                              product.supplierAvailable
                                ? "bg-sky-50 text-sky-800 border-sky-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            <Truck className="size-3" />
                            {product.supplierAvailable ? "Prov. Disponible" : "Prov. Pausado"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Variants toggle if applicable */}
                  {product.hasVariants && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                        className="w-full py-1.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Layers className="size-3.5 text-purple-700" />
                          {product.variants?.length ? `${product.variants.length} variantes configuradas` : "Ver variantes"}
                        </span>
                        <span>{isExpanded ? "▲ Ocultar" : "▼ Desplegar"}</span>
                      </button>

                      {isExpanded && product.variants && (
                        <div className="mt-2 space-y-2 pl-2 border-l-2 border-purple-300">
                          {product.variants.map((v) => (
                            <div key={v.id} className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs flex justify-between items-center">
                              <div>
                                <span className="font-bold text-zinc-900">{v.title}</span>
                                {v.sku && <span className="block font-mono text-[10px] text-zinc-500">SKU: {v.sku}</span>}
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-zinc-900">{formatCurrency(v.retailPrice)}</span>
                                <span className={`block text-[10px] font-semibold ${v.isActive ? "text-emerald-700" : "text-zinc-400"}`}>
                                  {v.isActive ? "Activa" : "Pausada"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Touch Action Bar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                    {statusFilter === "trash" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRestoreProduct(product.id, product.title)}
                          className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition cursor-pointer"
                        >
                          <RotateCcw className="size-4" />
                          <span>Restaurar a pausados</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePermanentDeleteProduct(product.id, product.title)}
                          className="h-11 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition cursor-pointer"
                          title="Eliminar definitivamente de la base de datos"
                        >
                          <Trash2 className="size-4" />
                          <span>Eliminar definitivo</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingProduct(product)}
                          className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition cursor-pointer"
                        >
                          <Edit className="size-4" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCloningProduct(product)}
                          className="h-11 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs active:scale-98 transition cursor-pointer"
                          title="Clonar / duplicar ficha"
                        >
                          <CopyPlus className="size-4" />
                          <span className="hidden sm:inline">Clonar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setQuickPriceProduct(product);
                            setQuickRetailPrice(product.retailPrice);
                            setQuickWholesalePrice(product.wholesalePrice);
                          }}
                          className="h-11 px-3 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs active:scale-98 transition cursor-pointer"
                          title="Editar precio rápido"
                        >
                          <DollarSign className="size-4 text-emerald-700" />
                          <span className="hidden sm:inline">Precio</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAuditingProduct(product)}
                          className="h-11 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs active:scale-98 transition cursor-pointer"
                          title="Historial de cambios y auditoría"
                        >
                          <History className="size-4" />
                          <span className="hidden sm:inline">Historial</span>
                        </button>

                        <a
                          href={`/producto/${product.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-11 px-3 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs active:scale-98 transition cursor-pointer"
                          title="Ver en tienda pública"
                        >
                          <ExternalLink className="size-4 text-sky-700" />
                          <span className="hidden sm:inline">Ver</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleSoftDeleteProduct(product.id, product.title)}
                          className="h-11 px-3.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs active:scale-98 transition cursor-pointer"
                          title="Mover a papelera"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
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
                <option value={10}>10</option>
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
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-amber-950 block">
                    Comparar con Mercado Libre
                  </span>
                  <span className="text-[11px] text-amber-800">
                    Ver a cuánto lo venden los competidores
                  </span>
                </div>
                <a
                  href={buildMercadoLibreSearchUrl(quickPriceProduct.title, quickPriceProduct.brand, quickPriceProduct.model)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs"
                >
                  Buscar en ML
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

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
        <ProductEditor
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            router.refresh();
            showToast("Producto actualizado exitosamente.", "success");
          }}
        />
      )}

      {/* Product Cloning Modal */}
      {cloningProduct && (
        <ProductEditor
          initialData={cloningProduct}
          isCloning
          categories={categories}
          onClose={() => setCloningProduct(null)}
          onSaved={() => {
            setCloningProduct(null);
            router.refresh();
            showToast("Copia del producto creada exitosamente.", "success");
          }}
        />
      )}
      {quickSupplierProduct && (
        <QuickSupplierModal
          product={quickSupplierProduct}
          categories={categories}
          onClose={() => setQuickSupplierProduct(null)}
          onSaved={() => {
            setQuickSupplierProduct(null);
            router.refresh();
            showToast("Proveedor actualizado.", "success");
          }}
        />
      )}
      {auditingProduct && (
        <ProductAuditModal
          isOpen={Boolean(auditingProduct)}
          product={auditingProduct}
          onClose={() => setAuditingProduct(null)}
          onPriceRolledBack={() => {
            router.refresh();
            showToast("Precio restaurado con éxito.", "success");
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Comprehensive Product Editor Sub-Component
// -------------------------------------------------------------
function QuickSupplierModal({
  product,
  categories = [],
  onClose,
  onSaved,
}: {
  product: Product;
  categories?: Category[];
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
  const [currencyMode, setCurrencyMode] = useState<"USD" | "ARS">("USD");
  const [costUsd, setCostUsd] = useState<number | "">(
    product.supplierLivePrice ? Math.round((Number(product.supplierLivePrice) / 1920) * 100) / 100 : ""
  );
  const [exchangeRate, setExchangeRate] = useState<number>(1600);
  const [paseroFeePercent, setPaseroFeePercent] = useState<number>(20);

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

  const category = categories.find((c) => c.id === product.categoryId);

  // Compute landed cost breakdown when entering USD
  const landedBreakdown = useMemo(() => {
    if (costUsd === "" || Number(costUsd) <= 0) return null;
    return calculateLandedCostArs(Number(costUsd), exchangeRate, paseroFeePercent);
  }, [costUsd, exchangeRate, paseroFeePercent]);

  const handleCostUsdChange = (val: number | "") => {
    setCostUsd(val);
    if (val !== "" && Number(val) > 0) {
      const calc = calculateLandedCostArs(Number(val), exchangeRate, paseroFeePercent);
      setLivePrice(calc.totalLandedArs);
    } else {
      setLivePrice("");
    }
  };

  const handleExchangeRateChange = (rate: number) => {
    setExchangeRate(rate);
    if (costUsd !== "" && Number(costUsd) > 0) {
      const calc = calculateLandedCostArs(Number(costUsd), rate, paseroFeePercent);
      setLivePrice(calc.totalLandedArs);
    }
  };

  const handlePaseroChange = (pct: number) => {
    setPaseroFeePercent(pct);
    if (costUsd !== "" && Number(costUsd) > 0) {
      const calc = calculateLandedCostArs(Number(costUsd), exchangeRate, pct);
      setLivePrice(calc.totalLandedArs);
    }
  };

  // Benchmark for this category
  const benchmark = useMemo(() => {
    return getCategoryMarginBenchmark(category?.slug, product.title);
  }, [category, product.title]);

  // Suggested selling price
  const priceSuggestion = useMemo(() => {
    const cost = Number(livePrice) || 0;
    if (cost <= 0) return null;
    return calculateSuggestedRetailPrice(cost, category?.slug, product.title, { psychologicalEnding: true });
  }, [livePrice, category, product.title]);

  // Live Commercial Margin evaluation
  const marginStats = useMemo(() => {
    const cost = Number(livePrice) || 0;
    const retail = Number(retailPrice) || 0;
    if (cost > 0 && retail > 0) {
      return evaluateCommercialMargin(retail, cost, category?.slug, product.title);
    }
    return null;
  }, [livePrice, retailPrice, category, product.title]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in">
      <div className="my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-lg min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:max-h-[92dvh]">
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

        <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
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

          {/* Supplier Cost Calculation */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-zinc-700">
                Costo en Proveedor & Pasero
              </label>
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setCurrencyMode("USD");
                    if (costUsd !== "" && Number(costUsd) > 0) {
                      setLivePrice(calculateLandedCostArs(Number(costUsd), exchangeRate, paseroFeePercent).totalLandedArs);
                    }
                  }}
                  className={`rounded-md px-2 py-0.5 transition-colors cursor-pointer ${
                    currencyMode === "USD" ? "bg-white text-sky-800 shadow-2xs" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  USD (Dólar × 1600 + 20%)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyMode("ARS")}
                  className={`rounded-md px-2 py-0.5 transition-colors cursor-pointer ${
                    currencyMode === "ARS" ? "bg-white text-sky-800 shadow-2xs" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Pesos (ARS directo)
                </button>
              </div>
            </div>

            {currencyMode === "USD" ? (
              <div className="space-y-2 rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-sky-900">
                      Costo USD
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">US$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={costUsd}
                        onChange={(e) => handleCostUsdChange(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="15.50"
                        className="w-full h-9 rounded-lg border border-sky-200 bg-white pl-8 pr-2 text-xs font-bold text-zinc-900 focus:border-sky-600 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                      Dólar ($ ARS)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={exchangeRate}
                      onChange={(e) => handleExchangeRateChange(Number(e.target.value))}
                      className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-800 focus:border-sky-600 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                      Pasero (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={paseroFeePercent}
                      onChange={(e) => handlePaseroChange(Number(e.target.value))}
                      className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-800 focus:border-sky-600 outline-none"
                    />
                  </div>
                </div>

                {landedBreakdown && (
                  <div className="rounded-lg bg-white border border-sky-200/80 p-2.5 text-xs space-y-1 shadow-2xs">
                    <div className="flex justify-between text-zinc-600 text-[11px]">
                      <span>Mercadería (USD × {exchangeRate}):</span>
                      <span className="font-semibold">{formatCurrency(landedBreakdown.baseArs)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 text-[11px]">
                      <span>Pasero ({paseroFeePercent}% del valor):</span>
                      <span className="font-semibold text-amber-700">+{formatCurrency(landedBreakdown.paseroArs)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-zinc-950 pt-1 border-t border-zinc-100 text-xs">
                      <span>Costo Landed Puesto en Mano:</span>
                      <span className="text-sky-950 font-extrabold">{formatCurrency(landedBreakdown.totalLandedArs)} ARS</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
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
                {livePrice && Number(livePrice) > 0 && (
                  <p className="text-[10px] text-zinc-400">
                    Equivalente a US$ {(Number(livePrice) / (exchangeRate * (1 + paseroFeePercent / 100))).toFixed(2)} USD (con pasero y dólar a ${exchangeRate}).
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Pricing & Category Benchmark Suggestion */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-zinc-700">
                Precio Minorista Venta ($ ARS)
              </label>
              {priceSuggestion && (
                <button
                  type="button"
                  onClick={() => setRetailPrice(priceSuggestion.suggestedPrice)}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-900 hover:bg-emerald-200 transition-colors cursor-pointer"
                  title="Fijar precio recomendado para obtener el margen ideal del rubro"
                >
                  <Sparkles className="h-3 w-3 text-emerald-700" />
                  Aplicar sugerido ({formatCurrency(priceSuggestion.suggestedPrice)})
                </button>
              )}
            </div>

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

            {/* Rubro & Benchmark Info */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Rubro detectado</span>
                <span className="font-semibold text-zinc-800">{benchmark.name} ({benchmark.benchmarkMargin}% margen sugerido)</span>
              </div>
              {priceSuggestion && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Precio óptimo</span>
                  <strong className="text-emerald-800 text-xs font-extrabold">{formatCurrency(priceSuggestion.suggestedPrice)}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Live Commercial Margin Evaluation */}
          {marginStats && (
            <div className={`rounded-xl border p-3 flex items-center justify-between text-xs ${
              marginStats.status === "excelente"
                ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                : marginStats.status === "adecuado"
                ? "bg-sky-50 border-sky-200 text-sky-950"
                : "bg-amber-50 border-amber-200 text-amber-950"
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                  Rentabilidad estimada ({marginStats.status.toUpperCase()}):
                </span>
                <strong className="text-sm font-black">
                  {marginStats.marginPercent}% de margen · {formatCurrency((Number(retailPrice) || 0) - (Number(livePrice) || 0))} ganancia
                </strong>
              </div>
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-extrabold shadow-2xs">
                Mínimo: {marginStats.minMargin}%
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
