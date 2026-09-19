"use client";

import {
  ChevronDown,
  DollarSign,
  Edit,
  FolderOpen,
  FolderPlus,
  Package,
  Plus,
  ReceiptText,
  Trash2,
  Upload,
  Users,
  X,
  Search,
  Filter,
  Layers,
  ArrowRight,
  TrendingUp,
  Inbox,
  Sparkles,
  Shield,
  ShieldCheck,
  FileSpreadsheet,
  Check,
  Truck,
} from "lucide-react";
import { useState, useTransition, useMemo } from "react";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  createProductAction,
  updateProductAction,
  updateProductStockAction,
  deleteProductAction,
  updateUserRoleAction,
  toggleWholesaleApprovalAction,
  updateOrderStatusAction,
  bulkImportProductsAction,
} from "@/app/admin/actions";
import { formatCurrency, formatDate, formatOrderStatus, formatPaymentMethod } from "@/lib/format";
import type { AdminDashboardData, PaymentMethod, Category, Product } from "@/lib/types";

const paymentMethods: PaymentMethod[] = [
  "transferencia",
  "tarjeta",
  "mercado_pago",
  "efectivo",
  "cuenta_corriente",
];

export function AdminDashboard({
  data,
  supabaseReady,
}: {
  data: AdminDashboardData;
  supabaseReady: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "orders" | "customers">("products");
  const [isPending, startTransition] = useTransition();
  const [stockState, setStockState] = useState<Record<string, number>>({});
  const [showStockAudit, setShowStockAudit] = useState(false);

  // Product Search and Filter states
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("");

  // Create modals state
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);

  // Form selection states (Create Product)
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");

  // Form pre-selection states (Create Category)
  const [createCategoryParentId, setCreateCategoryParentId] = useState("");

  // Modals / Editing states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Edit forms selection states
  const [editSelectedParentId, setEditSelectedParentId] = useState("");
  const [editSelectedSubcategoryId, setEditSelectedSubcategoryId] = useState("");

  // Bulk import state
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkMsg, setBulkMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Customer filter state
  const [customerFilter, setCustomerFilter] = useState<"all" | "admin" | "customer">("all");

  const handleUpdateRole = (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "customer" : "admin";
    const confirmText =
      newRole === "admin"
        ? "¿Seguro que querés otorgar permisos de Administrador a este usuario?"
        : "¿Seguro que querés quitar los permisos de Administrador a este usuario?";
    if (!confirm(confirmText)) return;

    startTransition(async () => {
      try {
        await updateUserRoleAction(userId, newRole);
      } catch (err: any) {
        alert("Error al actualizar rol: " + err.message);
      }
    });
  };

  const handleToggleWholesale = (userId: string, currentApproved: boolean) => {
    startTransition(async () => {
      try {
        await toggleWholesaleApprovalAction(userId, !currentApproved);
      } catch (err: any) {
        alert("Error al cambiar estado mayorista: " + err.message);
      }
    });
  };

  const handleUpdateOrderStatus = (orderId: string, status: any) => {
    startTransition(async () => {
      try {
        await updateOrderStatusAction(orderId, status);
      } catch (err: any) {
        alert("Error al actualizar estado del pedido: " + err.message);
      }
    });
  };

  const handleUpdateTrackingCode = (orderId: string, currentCode?: string) => {
    const code = prompt("Ingrese código de seguimiento de Correo / Envío:", currentCode || "");
    if (code === null) return;
    startTransition(async () => {
      try {
        const order = data.orders.find((o) => o.id === orderId);
        await updateOrderStatusAction(orderId, (order?.status as any) || "shipped", code);
      } catch (err: any) {
        alert("Error al actualizar código de seguimiento: " + err.message);
      }
    });
  };

  const handleBulkImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCsvText.trim()) return;

    try {
      const lines = bulkCsvText.trim().split("\n");
      const items: Array<{
        title: string;
        categoryName: string;
        retailPrice: number;
        wholesalePrice: number;
        wholesaleMinQuantity: number;
        stock: number;
        description: string;
      }> = [];
      for (const line of lines) {
        if (!line.trim() || line.startsWith("#") || line.toLowerCase().startsWith("titulo")) continue;
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length < 3) continue;
        const [title, categoryName, retailStr, wholesaleStr, minStr, stockStr, desc] = parts;
        items.push({
          title,
          categoryName,
          retailPrice: Number(retailStr) || 0,
          wholesalePrice: Number(wholesaleStr) || Math.round((Number(retailStr) || 0) * 0.75),
          wholesaleMinQuantity: Number(minStr) || 1,
          stock: Number(stockStr) || 10,
          description: desc || "",
        });
      }

      if (items.length === 0) {
        setBulkMsg({ type: "error", text: "No se reconocieron filas válidas en el formato." });
        return;
      }

      startTransition(async () => {
        try {
          const res = await bulkImportProductsAction(items);
          setBulkMsg({ type: "success", text: `Se importaron/actualizaron ${res.importedCount} productos con éxito.` });
          setBulkCsvText("");
        } catch (err: any) {
          setBulkMsg({ type: "error", text: "Error: " + err.message });
        }
      });
    } catch (err: any) {
      setBulkMsg({ type: "error", text: "Error de parseo: " + err.message });
    }
  };

  // Categorization helpers
  const mainCategories = useMemo(() => {
    return data.categories.filter((c) => !c.parentId);
  }, [data.categories]);

  const subcategoriesForSelectedParent = useMemo(() => {
    return data.categories.filter((c) => c.parentId === selectedParentId);
  }, [data.categories, selectedParentId]);

  const editSubcategoriesForSelectedParent = useMemo(() => {
    return data.categories.filter((c) => c.parentId === editSelectedParentId);
  }, [data.categories, editSelectedParentId]);

  // Handle inline stock change
  const handleStockChange = (productId: string, currentStock: number, change: number) => {
    const newStock = Math.max(0, (stockState[productId] ?? currentStock) + change);
    
    setStockState((prev) => ({ ...prev, [productId]: newStock }));

    startTransition(async () => {
      try {
        await updateProductStockAction(productId, newStock);
      } catch (err: any) {
        alert("Error al actualizar el stock: " + err.message);
        setStockState((prev) => ({ ...prev, [productId]: currentStock }));
      }
    });
  };

  // Handle delete actions
  const handleDeleteProduct = (productId: string, title: string) => {
    if (!confirm(`¿Estás seguro de eliminar el producto "${title}"?`)) return;

    startTransition(async () => {
      try {
        await deleteProductAction(productId);
      } catch (err: any) {
        alert("Error al eliminar el producto: " + err.message);
      }
    });
  };

  const handleDeleteCategory = (categoryId: string, name: string) => {
    const hasChildren = data.categories.some((c) => c.parentId === categoryId);
    const message = hasChildren
      ? `¿Estás seguro de eliminar la categoría "${name}"? ADVERTENCIA: Esta categoría tiene subcategorías asociadas que también se verán afectadas.`
      : `¿Estás seguro de eliminar la categoría "${name}"?`;

    if (!confirm(message)) return;

    startTransition(async () => {
      try {
        await deleteCategoryAction(categoryId);
      } catch (err: any) {
        alert("Error al eliminar la categoría: " + err.message);
      }
    });
  };

  // Open Edit Modals and pre-populate states
  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    const category = data.categories.find((c) => c.id === product.categoryId);
    if (category) {
      if (category.parentId) {
        setEditSelectedParentId(category.parentId);
        setEditSelectedSubcategoryId(category.id);
      } else {
        setEditSelectedParentId(category.id);
        setEditSelectedSubcategoryId("");
      }
    } else {
      setEditSelectedParentId("");
      setEditSelectedSubcategoryId("");
    }
  };

  // Submit forms handlers
  const handleCreateProductSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await createProductAction(formData);
        setIsCreateProductOpen(false);
        form.reset();
        setSelectedParentId("");
        setSelectedSubcategoryId("");
      } catch (err: any) {
        alert("Error al crear el producto: " + err.message);
      }
    });
  };

  const handleCreateCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await createCategoryAction(formData);
        setIsCreateCategoryOpen(false);
        form.reset();
        setCreateCategoryParentId("");
      } catch (err: any) {
        alert("Error al crear la categoría: " + err.message);
      }
    });
  };

  const handleEditProductSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateProductAction(formData);
        setEditingProduct(null);
      } catch (err: any) {
        alert("Error al guardar el producto: " + err.message);
      }
    });
  };

  const handleEditCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateCategoryAction(formData);
        setEditingCategory(null);
      } catch (err: any) {
        alert("Error al guardar la categoría: " + err.message);
      }
    });
  };

  // Filter products locally for search & select rubro
  const filteredProducts = useMemo(() => {
    return data.products.filter((product) => {
      const searchLower = productSearch.toLowerCase();
      const matchesSearch =
        product.title.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        product.tags.some((tag) => tag.toLowerCase().includes(searchLower));

      if (!productCategoryFilter) return matchesSearch;

      // Matches parent category or subcategory
      const productCategory = data.categories.find((c) => c.id === product.categoryId);
      const matchesCategory =
        product.categoryId === productCategoryFilter ||
        (productCategory && productCategory.parentId === productCategoryFilter);

      return matchesSearch && matchesCategory;
    });
  }, [data.products, data.categories, productSearch, productCategoryFilter]);

  const stats = [
    {
      label: "Ingresos totales",
      value: formatCurrency(data.stats.revenue),
      icon: DollarSign,
      color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      label: "Pedidos realizados",
      value: String(data.stats.orders),
      icon: ReceiptText,
      color: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      label: "Clientes registrados",
      value: String(data.stats.customers),
      icon: Users,
      color: "bg-purple-50 text-purple-700 border-purple-100",
    },
    {
      label: "Productos en catálogo",
      value: String(data.stats.products),
      icon: Package,
      color: "bg-amber-50 text-amber-700 border-amber-100",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6 mb-8">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
            <Sparkles className="h-3.5 w-3.5" /> Dashboard de Control
          </span>
          <h1 className="mt-2 text-3xl font-extrabold text-zinc-950 tracking-tight">
            Panel de Administración
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Gestioná el stock, los productos, las categorías y consultá pedidos comerciales.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setBulkMsg(null);
              setIsBulkImportOpen(true);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-700 shadow-sm transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Carga Masiva (CSV)
          </button>
          <button
            onClick={() => setIsCreateProductOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </button>
          <button
            onClick={() => {
              setCreateCategoryParentId("");
              setIsCreateCategoryOpen(true);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800 shadow-sm transition-colors cursor-pointer"
          >
            <FolderPlus className="h-4 w-4" />
            Nueva Categoría
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div
            className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs transition-all hover:shadow-md"
            key={stat.label}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-500">{stat.label}</span>
              <span className={`rounded-xl p-2.5 border ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-zinc-200 mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {[
            { id: "products", name: "Productos & Stock", icon: Package },
            { id: "categories", name: "Categorías & Rubros", icon: FolderOpen },
            { id: "orders", name: "Pedidos / Ventas", icon: ReceiptText },
            { id: "customers", name: "Clientes", icon: Users },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                }`}
              >
                <tab.icon
                  className={`h-4.5 w-4.5 transition-colors ${
                    isActive ? "text-emerald-600" : "text-zinc-400 group-hover:text-zinc-500"
                  }`}
                />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB CONTENT: PRODUCTS */}
      {activeTab === "products" && (
        <div className="space-y-6">
          {/* Filters and Actions Row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por título, descripción o etiqueta..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-300 outline-none focus:border-emerald-600 bg-white text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-zinc-400 font-semibold uppercase flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Filtrar por:
              </span>
              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="h-11 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white text-sm cursor-pointer min-w-44"
              >
                <option value="">Todos los rubros</option>
                {mainCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowStockAudit(!showStockAudit)}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold border transition-all cursor-pointer shadow-xs ${
                  showStockAudit
                    ? "bg-zinc-200 border-zinc-300 text-zinc-800"
                    : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
                type="button"
              >
                <TrendingUp className="h-4.5 w-4.5 text-zinc-550" />
                {showStockAudit ? "Ocultar Auditoría" : "Ver Auditoría Stock"}
              </button>
            </div>
          </div>

          {showStockAudit && (
            <div className="border border-zinc-200 rounded-2xl bg-white shadow-xs p-5 animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-650" /> Historial de Auditoría de Stock (Tabla Oculta)
                </h3>
                <span className="text-xs text-zinc-500">Últimos 50 movimientos</span>
              </div>
              <div className="overflow-x-auto max-h-[300px] rounded-xl border border-zinc-200 scrollbar-thin">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-505 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Fecha / Hora</th>
                      <th className="px-4 py-3 font-semibold">Producto</th>
                      <th className="px-4 py-3 font-semibold text-center">Modificación</th>
                      <th className="px-4 py-3 font-semibold text-center">Transición</th>
                      <th className="px-4 py-3 font-semibold text-center">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.stockLogs && data.stockLogs.length > 0 ? (
                      data.stockLogs.map((log) => {
                        const isPositive = log.changeAmount > 0;
                        let reasonText = "Ajuste manual";
                        let reasonBadge = "bg-zinc-100 text-zinc-700 border-zinc-200";

                        if (log.reason === "venta") {
                          reasonText = "Venta (Pedido)";
                          reasonBadge = "bg-blue-50 text-blue-800 border-blue-200/50";
                        } else if (log.reason === "reposicion") {
                          reasonText = "Reposición (+)";
                          reasonBadge = "bg-emerald-50 text-emerald-805 border-emerald-205/50";
                        } else if (log.reason === "creacion") {
                          reasonText = "Creación Inicial";
                          reasonBadge = "bg-purple-50 text-purple-805 border-purple-200/50";
                        } else if (log.reason === "retiro") {
                          reasonText = "Retiro (-)";
                          reasonBadge = "bg-red-50 text-red-800 border-red-200/50";
                        } else if (log.reason === "ajuste_manual") {
                          reasonText = "Ajuste Manual";
                          reasonBadge = "bg-zinc-100 text-zinc-700 border-zinc-200";
                        }

                        return (
                          <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-4 py-3 text-zinc-500 font-medium whitespace-nowrap">
                              {formatDate(log.createdAt)}
                            </td>
                            <td className="px-4 py-3 font-bold text-zinc-800">
                              {log.productTitle}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap font-extrabold text-sm">
                              <span className={isPositive ? "text-emerald-600" : "text-red-600"}>
                                {isPositive ? `+${log.changeAmount}` : log.changeAmount}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-zinc-500 font-medium whitespace-nowrap">
                              {log.previousStock} → {log.newStock}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${reasonBadge}`}>
                                {reasonText}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-zinc-400 italic">
                          No hay registros de auditoría de stock disponibles aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Producto</th>
                    <th className="px-6 py-4 font-semibold">Categoría / Subcategoría</th>
                    <th className="px-6 py-4 font-semibold">Precio Minorista</th>
                    <th className="px-6 py-4 font-semibold">Precio Mayorista</th>
                    <th className="px-6 py-4 font-semibold text-center w-44">Control de Stock</th>
                    <th className="px-6 py-4 font-semibold text-center w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center">
                          <Inbox className="h-10 w-10 text-zinc-300 mb-2" />
                          <p className="font-semibold text-zinc-700">No se encontraron productos</p>
                          <p className="text-xs text-zinc-400 mt-1">
                            {productSearch || productCategoryFilter
                              ? "Intentá cambiando los filtros de búsqueda."
                              : "Comenzá creando tu primer producto desde el botón superior."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const currentStock = stockState[product.id] ?? product.stock;
                      const prodCategory = data.categories.find(c => c.id === product.categoryId);
                      let categoryDisplay = product.categoryName;
                      if (prodCategory && prodCategory.parentId) {
                        const parent = data.categories.find(c => c.id === prodCategory.parentId);
                        if (parent) {
                          categoryDisplay = `${parent.name} > ${prodCategory.name}`;
                        }
                      }

                      return (
                        <tr key={product.id} className="hover:bg-zinc-50/40 transition-colors">
                          <td className="px-6 py-4 font-medium text-zinc-950 flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.title}
                                className="h-12 w-12 rounded-xl object-cover border border-zinc-200 shadow-xs"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 border border-dashed border-zinc-300">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-zinc-900 block line-clamp-1 max-w-xs sm:max-w-md">
                                {product.title}
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {product.featured && (
                                  <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/10">
                                    Destacado
                                  </span>
                                )}
                                {product.wholesaleOnly && (
                                  <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/10">
                                    Solo Mayorista
                                  </span>
                                )}
                                {product.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-600">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-full border border-zinc-200">
                              <Layers className="h-3 w-3 text-zinc-400" /> {categoryDisplay}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-950 font-extrabold text-sm">
                            {formatCurrency(product.retailPrice)}
                          </td>
                          <td className="px-6 py-4 text-zinc-950 font-extrabold text-sm">
                            {formatCurrency(product.wholesalePrice)}
                            <span className="text-[10px] text-zinc-500 font-normal block mt-0.5">
                              Mín: {product.wholesaleMinQuantity} unid.
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {/* Premium circular stock control buttons */}
                            <div className="flex items-center justify-center gap-2.5">
                              <button
                                onClick={() => handleStockChange(product.id, product.stock, -1)}
                                className="h-8 w-8 rounded-full border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-350 text-zinc-650 shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-base cursor-pointer"
                                disabled={currentStock <= 0 || isPending}
                                type="button"
                              >
                                -
                              </button>
                              <span className="w-10 text-center text-sm font-extrabold text-zinc-900 bg-zinc-50/50 py-1 rounded-lg border border-zinc-100 min-w-10">
                                {currentStock}
                              </span>
                              <button
                                onClick={() => handleStockChange(product.id, product.stock, 1)}
                                className="h-8 w-8 rounded-full border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-350 text-zinc-650 shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-base cursor-pointer"
                                disabled={isPending}
                                type="button"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditProduct(product)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 cursor-pointer transition-colors bg-white shadow-xs"
                                title="Editar publicación"
                                type="button"
                              >
                                <Edit className="h-4.5 w-4.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id, product.title)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 text-red-650 hover:bg-red-50 hover:text-red-700 cursor-pointer transition-colors bg-white shadow-xs"
                                title="Eliminar publicación"
                                type="button"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
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
          </div>
        </div>
      )}

      {/* TAB CONTENT: CATEGORIES HIERARCHY TREE */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <h2 className="text-xl font-bold text-zinc-955 flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-emerald-700" /> Estructura de Rubros y Categorías
            </h2>
            <button
              onClick={() => {
                setCreateCategoryParentId("");
                setIsCreateCategoryOpen(true);
              }}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Nueva Categoría Principal
            </button>
          </div>

          {mainCategories.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-500 shadow-xs">
              <div className="flex flex-col items-center justify-center">
                <FolderOpen className="h-10 w-10 text-zinc-300 mb-2" />
                <p className="font-semibold text-zinc-700">No hay categorías principales registradas</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Crea una categoría principal y luego agrégale subcategorías de ser necesario.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {mainCategories.map((parent) => {
                const subcategories = data.categories.filter((c) => c.parentId === parent.id);

                return (
                  <div
                    key={parent.id}
                    className="border border-zinc-200 rounded-2xl bg-white shadow-xs overflow-hidden flex flex-col"
                  >
                    {/* Parent Category Card Header */}
                    <div className="bg-zinc-50 border-b border-zinc-200 p-5 flex items-center gap-4">
                      {parent.imageUrl ? (
                        <img
                          src={parent.imageUrl}
                          alt={parent.name}
                          className="h-14 w-20 rounded-lg object-cover border border-zinc-200 shadow-sm"
                        />
                      ) : (
                        <div className="h-14 w-20 rounded-lg bg-zinc-200 flex items-center justify-center text-zinc-400 text-xs font-semibold border border-dashed border-zinc-300">
                          Sin foto
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-zinc-905 truncate">
                            {parent.name}
                          </h3>
                          {parent.wholesaleOnly && (
                            <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                              Mayorista
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                          {parent.description || "Sin descripción."}
                        </p>
                        <span className="text-[10px] text-zinc-455 block mt-0.5">
                          Prioridad de orden: {parent.displayOrder}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCategory(parent);
                            setEditSelectedParentId(parent.parentId || "");
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-white hover:text-zinc-900 cursor-pointer transition-colors bg-white shadow-xs"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(parent.id, parent.name)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50 hover:text-red-700 cursor-pointer transition-colors bg-white shadow-xs"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Subcategories Box */}
                    <div className="p-5 flex-1 flex flex-col justify-start">
                      <div className="flex items-center justify-between mb-3 border-b border-zinc-100 pb-2">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                          <ArrowRight className="h-3 w-3 text-zinc-300" /> Subcategorías ({subcategories.length})
                        </h4>
                        
                        {/* Direct add subcategory button - premium UX improvement */}
                        <button
                          onClick={() => {
                            setCreateCategoryParentId(parent.id);
                            setIsCreateCategoryOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Agregar Subcategoría
                        </button>
                      </div>

                      {subcategories.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic py-2">
                          No tiene subcategorías asociadas. Hacé clic en "Agregar Subcategoría" arriba para crear una.
                        </p>
                      ) : (
                        <div className="space-y-3 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                          {subcategories.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-150 hover:bg-zinc-100/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {sub.imageUrl ? (
                                  <img
                                    src={sub.imageUrl}
                                    alt={sub.name}
                                    className="h-10 w-14 rounded object-cover border border-zinc-200"
                                  />
                                ) : (
                                  <div className="h-10 w-14 rounded bg-zinc-200 flex items-center justify-center text-[10px] text-zinc-400 font-semibold border border-dashed border-zinc-300">
                                    N/A
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-zinc-800 truncate">
                                      {sub.name}
                                    </span>
                                    {sub.wholesaleOnly && (
                                      <span className="inline-flex items-center rounded bg-amber-50 px-1 py-0.2 text-[8px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/10">
                                        M
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                                    {sub.description || "Sin descripción."}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <button
                                  onClick={() => {
                                    setEditingCategory(sub);
                                    setEditSelectedParentId(sub.parentId || "");
                                  }}
                                  className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-white hover:text-zinc-900 cursor-pointer transition-colors bg-white shadow-xs"
                                  title="Editar subcategoría"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(sub.id, sub.name)}
                                  className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50 hover:text-red-700 cursor-pointer transition-colors bg-white shadow-xs"
                                  title="Eliminar subcategoría"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: ORDERS */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <h2 className="text-xl font-bold text-zinc-950 flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-emerald-700" /> Registro de Pedidos Comerciales
            </h2>
            <div className="text-xs text-zinc-500 font-semibold bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-250">
              Total facturado local: <span className="font-extrabold text-emerald-750">{formatCurrency(data.stats.revenue)}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">ID / Fecha</th>
                    <th className="px-6 py-4 font-semibold">Cliente / Canal</th>
                    <th className="px-6 py-4 font-semibold">Items del Pedido</th>
                    <th className="px-6 py-4 font-semibold">Método & Total</th>
                    <th className="px-6 py-4 font-semibold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center">
                          <Inbox className="h-10 w-10 text-zinc-300 mb-2" />
                          <p className="font-semibold text-zinc-700">No hay pedidos registrados</p>
                          <p className="text-xs text-zinc-400 mt-1">
                            Las compras que realicen tus usuarios aparecerán automáticamente en esta sección.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.orders.map((order) => (
                      <tr key={order.id} className="hover:bg-zinc-50/40 transition-colors">
                        <td className="px-6 py-4 align-top">
                          <span className="font-mono text-xs font-black text-sky-900 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg inline-block mb-1.5 shadow-xs">
                            {order.trackingCode || `ORD-${order.id.slice(0, 6).toUpperCase()}`}
                          </span>
                          <p className="text-xs text-zinc-500 font-medium">
                            {formatDate(order.createdAt)}
                          </p>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="font-bold text-zinc-900">{order.customerName}</div>
                          {order.shippingPhone && (
                            <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                              📞 {order.shippingPhone}
                            </p>
                          )}
                          {order.customerEmail && (
                            <p className="text-xs text-zinc-500 font-medium mt-0.5">{order.customerEmail}</p>
                          )}
                          {order.shippingAddress && (
                            <p className="text-[11px] text-zinc-600 mt-1 line-clamp-2">
                              📍 {order.shippingAddress}
                            </p>
                          )}
                          {order.orderNotes && (
                            <div className="text-[10px] text-amber-900 bg-amber-50 rounded p-1.5 mt-1 border border-amber-200">
                              💬 {order.orderNotes}
                            </div>
                          )}
                          <span className={`inline-block mt-2 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            order.channel === "wholesale"
                              ? "bg-amber-50 text-amber-700 border-amber-200/50"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                          }`}>
                            {order.channel === "wholesale" ? "Mayorista" : "Minorista"}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top">
                          {order.items && order.items.length > 0 ? (
                            <div className="space-y-1.5 max-w-sm">
                              {order.items.map((it, idx) => (
                                <div key={idx} className="text-xs font-medium text-zinc-600 flex items-start gap-1 justify-between">
                                  <span className="line-clamp-1 flex-1">{it.productTitle}</span>
                                  <span className="text-zinc-500 font-semibold flex-none ml-2">
                                    {it.quantity} x {formatCurrency(it.unitPrice)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400 italic">Detalle no disponible</span>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <p className="text-base font-extrabold text-zinc-950 tracking-tight">
                            {formatCurrency(order.total)}
                          </p>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase block mt-1 tracking-wider bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5 w-max">
                            {formatPaymentMethod(order.paymentMethod)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center align-top">
                          <div className="flex flex-col items-center gap-1.5">
                            <select
                              disabled={isPending}
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold border shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                                order.status === "paid" || order.status === "delivered"
                                  ? "bg-emerald-50 text-emerald-850 border-emerald-300"
                                  : order.status === "cancelled"
                                  ? "bg-red-50 text-red-850 border-red-300"
                                  : "bg-amber-50 text-amber-850 border-amber-300"
                              }`}
                            >
                              <option value="pending">Pendiente</option>
                              <option value="paid">Pagado</option>
                              <option value="preparing">En preparación</option>
                              <option value="shipped">Enviado</option>
                              <option value="delivered">Entregado</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                            <button
                              onClick={() => handleUpdateTrackingCode(order.id)}
                              className="text-[10px] text-zinc-500 hover:text-emerald-700 flex items-center gap-1 cursor-pointer font-medium"
                              title="Asignar o editar código de seguimiento"
                            >
                              <Truck className="h-3 w-3" /> Seguimiento
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CUSTOMERS & ROLES */}
      {activeTab === "customers" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-3">
            <div>
              <h2 className="text-xl font-bold text-zinc-950 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-700" /> Cuentas de Usuario y Permisos
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Gestioná los roles administrativos y autorizaciones para compras mayoristas.
              </p>
            </div>
            <div className="text-xs text-zinc-500 font-semibold bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">
              Total registrados: <span className="font-extrabold text-zinc-800">{data.stats.customers}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Usuario</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Rol</th>
                    <th className="px-6 py-4 font-semibold">Canal Mayorista</th>
                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.customers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center">
                          <Inbox className="h-10 w-10 text-zinc-300 mb-2" />
                          <p className="font-semibold text-zinc-700">No hay usuarios registrados</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.customers.map((customer) => {
                      const isAdmin = customer.role === "admin";
                      const isApproved = customer.isApprovedWholesale ?? false;

                      return (
                        <tr key={customer.id} className="hover:bg-zinc-50/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                              {customer.fullName}
                              {isAdmin && (
                                <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-700/20">
                                  <Shield className="h-2.5 w-2.5" /> Admin
                                </span>
                              )}
                            </div>
                            {customer.businessName && (
                              <p className="text-xs text-zinc-500">{customer.businessName} {customer.cuit ? `(${customer.cuit})` : ""}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 font-medium text-zinc-655 text-xs">{customer.email}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                              isAdmin
                                ? "bg-purple-50 text-purple-800 ring-purple-600/20"
                                : "bg-zinc-100 text-zinc-700 ring-zinc-500/20"
                            }`}>
                              {isAdmin ? "Administrador" : "Cliente"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              disabled={isPending}
                              onClick={() => handleToggleWholesale(customer.id, isApproved)}
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                                isApproved
                                  ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                                  : "bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200"
                              }`}
                              title="Click para cambiar autorización mayorista"
                            >
                              <Check className={`h-3 w-3 ${isApproved ? "text-amber-700" : "text-transparent"}`} />
                              {isApproved ? "Mayorista Habilitado" : "Solo Minorista"}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              disabled={isPending}
                              onClick={() => handleUpdateRole(customer.id, customer.role)}
                              className={`rounded-lg px-3 py-1 text-xs font-semibold border transition cursor-pointer ${
                                isAdmin
                                  ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                              }`}
                            >
                              {isAdmin ? "Quitar Admin" : "Hacer Admin"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO PRODUCTO (Con Sticky Header/Footer y Scrollbar Fina - Adiós a los overflows y barras feas) */}
      {isCreateProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 p-5 bg-white flex-shrink-0 z-10">
              <h3 className="text-xl font-bold text-zinc-950 flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-600" /> Publicar Nuevo Producto
              </h3>
              <button
                onClick={() => setIsCreateProductOpen(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form containing scrollable body and sticky footer */}
            <form onSubmit={handleCreateProductSubmit} className="flex-1 flex flex-col overflow-hidden" encType="multipart/form-data">
              
              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                    Título del Producto
                    <input
                      className="h-11 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white"
                      name="title"
                      required
                      placeholder="Ej. Detergente Biodegradable 1L"
                    />
                  </label>
                  <div className="grid gap-3 grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                      Categoría
                      <select
                        className="h-11 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white cursor-pointer"
                        name="category_id"
                        required
                        value={selectedParentId}
                        onChange={(e) => {
                          setSelectedParentId(e.target.value);
                          setSelectedSubcategoryId("");
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {mainCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                      Subcategoría (Opcional)
                      <select
                        className="h-11 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white cursor-pointer"
                        name="subcategory_id"
                        disabled={!selectedParentId}
                        value={selectedSubcategoryId}
                        onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                      >
                        <option value="">Ninguna</option>
                        {subcategoriesForSelectedParent.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                  Descripción
                  <textarea
                    className="min-h-20 rounded-xl border border-zinc-300 p-3 outline-none focus:border-emerald-600 bg-white"
                    name="description"
                    placeholder="Detalles sobre el producto, medidas, ingredientes..."
                  />
                </label>

                {/* pricing & image in clean grid layout */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                    Foto de Producto (Subida directa)
                    <input
                      accept="image/*"
                      className="rounded-xl border border-zinc-300 p-2 text-sm bg-white cursor-pointer w-full h-11 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
                      name="image"
                      type="file"
                    />
                  </label>
                  <div className="grid gap-2 grid-cols-4">
                    <label className="grid gap-1 text-[11px] font-bold text-zinc-600">
                      Minorista ($)
                      <input
                        className="h-11 rounded-xl border border-zinc-300 px-2 outline-none focus:border-emerald-600 bg-white text-center font-bold text-sm"
                        min="0"
                        name="retail_price"
                        required
                        type="number"
                        defaultValue={0}
                      />
                    </label>
                    <label className="grid gap-1 text-[11px] font-bold text-zinc-600">
                      Mayorista ($)
                      <input
                        className="h-11 rounded-xl border border-zinc-300 px-2 outline-none focus:border-emerald-600 bg-white text-center font-bold text-sm"
                        min="0"
                        name="wholesale_price"
                        required
                        type="number"
                        defaultValue={0}
                      />
                    </label>
                    <label className="grid gap-1 text-[11px] font-bold text-zinc-600" title="Mínimo de unidades mayoristas">
                      Mín. May.
                      <input
                        className="h-11 rounded-xl border border-zinc-300 px-2 outline-none focus:border-emerald-600 bg-white text-center font-bold text-sm"
                        min="1"
                        name="wholesale_min_qty"
                        type="number"
                        defaultValue={1}
                      />
                    </label>
                    <label className="grid gap-1 text-[11px] font-bold text-zinc-600">
                      Stock
                      <input
                        className="h-11 rounded-xl border border-zinc-300 px-2 outline-none focus:border-emerald-600 bg-white text-center font-bold text-sm"
                        min="0"
                        name="stock"
                        type="number"
                        defaultValue={0}
                      />
                    </label>
                  </div>
                </div>

                <fieldset className="grid gap-2 mt-1">
                  <legend className="text-sm font-semibold text-zinc-700">
                    Métodos de pago aceptados
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {paymentMethods.map((method) => (
                      <label
                        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 cursor-pointer hover:bg-zinc-50"
                        key={method}
                      >
                        <input
                          defaultChecked={method === "transferencia"}
                          name="payment_methods"
                          type="checkbox"
                          value={method}
                          className="cursor-pointer h-4 w-4 text-emerald-600 border-zinc-300 rounded"
                        />
                        {formatPaymentMethod(method)}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="grid gap-1.5 text-sm font-semibold text-zinc-700 sm:col-span-2">
                    Etiquetas / Tags (Separados por coma)
                    <input
                      className="h-11 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white"
                      name="tags"
                      placeholder="oferta, nuevo, pack, promo"
                    />
                  </label>
                  <div className="flex flex-wrap items-end gap-4 pb-2.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 cursor-pointer">
                      <input
                        name="is_featured"
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-605 focus:ring-emerald-600 cursor-pointer"
                      />
                      Destacado
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 cursor-pointer">
                      <input
                        name="is_wholesale_only"
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-605 focus:ring-emerald-600 cursor-pointer"
                      />
                      Solo Mayorista
                    </label>
                  </div>
                </div>
              </div>

              {/* Sticky Footer - Always visible at bottom, corrected background button color */}
              <div className="flex justify-end gap-3 p-5 bg-zinc-50 border-t border-zinc-200 flex-shrink-0 z-10">
                <button
                  onClick={() => setIsCreateProductOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-200 rounded-xl cursor-pointer transition-colors"
                  type="button"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition-colors flex items-center gap-2 shadow-xs"
                  type="submit"
                  disabled={isPending}
                >
                  {isPending && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  Publicar Producto
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA CATEGORÍA (Con Sticky Header/Footer y preselección inteligente de rubro padre) */}
      {isCreateCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl bg-white border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 p-5 bg-white flex-shrink-0 z-10">
              <h3 className="text-xl font-bold text-zinc-950 flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-emerald-600" /> 
                {createCategoryParentId ? "Crear Subcategoría" : "Crear Nueva Categoría Principal"}
              </h3>
              <button
                onClick={() => setIsCreateCategoryOpen(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form containing scrollable body and sticky footer */}
            <form onSubmit={handleCreateCategorySubmit} className="flex-1 flex flex-col overflow-hidden">
              
              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                {createCategoryParentId && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 font-medium">
                    Creando subcategoría relacionada bajo el rubro: <span className="font-bold uppercase">{data.categories.find(c => c.id === createCategoryParentId)?.name}</span>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                    Nombre del Rubro
                    <input
                      className="h-11 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white"
                      name="name"
                      required
                      placeholder="Ej. Herramientas, K-Beauty o Tecnología"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                    ¿Es subcategoría de?
                    <select
                      className="h-11 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white cursor-pointer"
                      name="parent_id"
                      value={createCategoryParentId}
                      onChange={(e) => setCreateCategoryParentId(e.target.value)}
                    >
                      <option value="">Ninguna (Es Categoría Principal)</option>
                      {mainCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                  Descripción
                  <textarea
                    className="min-h-20 rounded-xl border border-zinc-300 p-3 outline-none focus:border-emerald-600 bg-white"
                    name="description"
                    placeholder="Descripción breve del rubro..."
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2 items-center">
                  <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                    Foto de Categoría (Subida directa)
                    <input
                      accept="image/*"
                      className="rounded-xl border border-zinc-300 p-2 text-sm bg-white cursor-pointer w-full h-11 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
                      name="image"
                      type="file"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-4 mt-5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 cursor-pointer">
                      <input
                        name="is_wholesale_only"
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                      />
                      Solo Mayorista
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                      Orden de Visualización
                      <input
                        className="h-10 w-20 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white text-center font-bold"
                        name="display_order"
                        type="number"
                        defaultValue={0}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Sticky Footer - Always visible, corrected colors */}
              <div className="flex justify-end gap-3 p-5 bg-zinc-50 border-t border-zinc-200 flex-shrink-0 z-10">
                <button
                  onClick={() => setIsCreateCategoryOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-200 rounded-xl cursor-pointer transition-colors"
                  type="button"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition-colors flex items-center gap-2 shadow-xs"
                  type="submit"
                  disabled={isPending}
                >
                  {isPending && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  Crear Categoría
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PRODUCTO (Con Sticky Header/Footer y Scrollbar Fina - Resuelve overflow y invisibilidad de botón) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 p-5 bg-white flex-shrink-0 z-10">
              <h3 className="text-xl font-bold text-zinc-950 flex items-center gap-2">
                <Edit className="h-5 w-5 text-emerald-600" /> Editar Publicación de Producto
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 hover:bg-zinc-150 hover:text-zinc-900 transition-colors cursor-pointer"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form containing scrollable body and sticky footer */}
            <form onSubmit={handleEditProductSubmit} className="flex-1 flex flex-col overflow-hidden" encType="multipart/form-data">
              
              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                <input type="hidden" name="id" value={editingProduct.id} />
                <input type="hidden" name="existing_image_url" value={editingProduct.imageUrl} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                    Título del Producto
                    <input
                      className="h-11 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white font-bold text-zinc-900"
                      name="title"
                      required
                      defaultValue={editingProduct.title}
                    />
                  </label>
                  
                  <div className="grid gap-3 grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                      Categoría
                      <select
                        className="h-11 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white cursor-pointer"
                        name="category_id"
                        required
                        value={editSelectedParentId}
                        onChange={(e) => {
                          setEditSelectedParentId(e.target.value);
                          setEditSelectedSubcategoryId("");
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {mainCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                      Subcategoría (Opcional)
                      <select
                        className="h-11 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white cursor-pointer"
                        name="subcategory_id"
                        disabled={!editSelectedParentId}
                        value={editSelectedSubcategoryId}
                        onChange={(e) => setEditSelectedSubcategoryId(e.target.value)}
                      >
                        <option value="">Ninguna</option>
                        {editSubcategoriesForSelectedParent.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                  Descripción
                  <textarea
                    className="min-h-20 rounded-xl border border-zinc-300 p-3 outline-none focus:border-emerald-600 bg-white"
                    name="description"
                    defaultValue={editingProduct.description}
                  />
                </label>

                {/* pricing & image in clean grid layout */}
                <div className="grid gap-4 sm:grid-cols-2 items-center">
                  <div className="flex items-center gap-3">
                    {editingProduct.imageUrl ? (
                      <img 
                        src={editingProduct.imageUrl} 
                        alt="Actual" 
                        className="h-12 w-12 rounded-xl object-cover border border-zinc-200 shadow-sm flex-none" 
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 text-xs font-semibold flex-none">
                        Sin foto
                      </div>
                    )}
                    <label className="grid gap-1 text-xs font-semibold text-zinc-700 flex-1">
                      Cambiar Foto (Subida directa)
                      <input
                        accept="image/*"
                        className="rounded-xl border border-zinc-300 p-1.5 text-xs bg-white cursor-pointer w-full h-10 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-zinc-100 file:text-zinc-700"
                        name="image"
                        type="file"
                      />
                    </label>
                  </div>
                  
                  <div className="grid gap-2 grid-cols-4">
                    <label className="grid gap-1 text-[11px] font-bold text-zinc-650">
                      Minorista ($)
                      <input
                        className="h-11 rounded-xl border border-zinc-305 px-2 outline-none focus:border-emerald-600 bg-white text-center font-bold text-sm"
                        min="0"
                        name="retail_price"
                        required
                        type="number"
                        defaultValue={editingProduct.retailPrice}
                      />
                    </label>
                    <label className="grid gap-1 text-[11px] font-bold text-zinc-650">
                      Mayorista ($)
                      <input
                        className="h-11 rounded-xl border border-zinc-300 px-2 outline-none focus:border-emerald-600 bg-white text-center font-bold text-sm"
                        min="0"
                        name="wholesale_price"
                        required
                        type="number"
                        defaultValue={editingProduct.wholesalePrice}
                      />
                    </label>
                    <label className="grid gap-1 text-[11px] font-bold text-zinc-650">
                      Mín. May.
                      <input
                        className="h-11 rounded-xl border border-zinc-300 px-2 outline-none focus:border-emerald-600 bg-white text-center font-bold text-sm"
                        min="1"
                        name="wholesale_min_qty"
                        type="number"
                        defaultValue={editingProduct.wholesaleMinQuantity}
                      />
                    </label>
                    <label className="grid gap-1 text-[11px] font-bold text-zinc-650">
                      Stock
                      <input
                        className="h-11 rounded-xl border border-zinc-300 px-2 outline-none focus:border-emerald-600 bg-white text-center font-bold text-sm"
                        min="0"
                        name="stock"
                        type="number"
                        defaultValue={editingProduct.stock}
                      />
                    </label>
                  </div>
                </div>

                <fieldset className="grid gap-2 mt-1">
                  <legend className="text-sm font-semibold text-zinc-700">
                    Métodos de pago aceptados
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {paymentMethods.map((method) => (
                      <label
                        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 cursor-pointer hover:bg-zinc-50"
                        key={method}
                      >
                        <input
                          defaultChecked={editingProduct.paymentMethods?.includes(method)}
                          name="payment_methods"
                          type="checkbox"
                          value={method}
                          className="cursor-pointer h-4 w-4 text-emerald-650 border-zinc-300 rounded"
                        />
                        {formatPaymentMethod(method)}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="grid gap-1.5 text-sm font-semibold text-zinc-700 sm:col-span-2">
                    Etiquetas / Tags (Separados por coma)
                    <input
                      className="h-11 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white"
                      name="tags"
                      placeholder="oferta, nuevo, pack"
                      defaultValue={editingProduct.tags?.join(", ")}
                    />
                  </label>
                  <div className="flex flex-wrap items-end gap-4 pb-2.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 cursor-pointer">
                      <input 
                        name="is_featured" 
                        type="checkbox" 
                        defaultChecked={editingProduct.featured}
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-605 focus:ring-emerald-600 cursor-pointer" 
                      />
                      Destacado
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 cursor-pointer">
                      <input 
                        name="is_wholesale_only" 
                        type="checkbox" 
                        defaultChecked={editingProduct.wholesaleOnly}
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-655 focus:ring-emerald-600 cursor-pointer" 
                      />
                      Solo Mayorista
                    </label>
                  </div>
                </div>
              </div>

              {/* Sticky Footer - Always visible, corrected colors */}
              <div className="flex justify-end gap-3 p-5 bg-zinc-50 border-t border-zinc-200 flex-shrink-0 z-10">
                <button
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-200 rounded-xl cursor-pointer transition-colors"
                  type="button"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-650 hover:bg-emerald-700 rounded-xl cursor-pointer transition-colors flex items-center gap-2 shadow-xs"
                  type="submit"
                  disabled={isPending}
                >
                  {isPending && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  Guardar Cambios
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR CATEGORÍA (Con Sticky Header/Footer y Scrollbar Fina) */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl bg-white border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 p-5 bg-white flex-shrink-0 z-10">
              <h3 className="text-xl font-bold text-zinc-955 flex items-center gap-2">
                <Edit className="h-5 w-5 text-emerald-650" /> Editar Categoría / Rubro
              </h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 hover:bg-zinc-150 hover:text-zinc-900 transition-colors cursor-pointer"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form containing scrollable body and sticky footer */}
            <form onSubmit={handleEditCategorySubmit} className="flex-1 flex flex-col overflow-hidden" encType="multipart/form-data">
              
              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                <input type="hidden" name="id" value={editingCategory.id} />
                <input type="hidden" name="existing_image_url" value={editingCategory.imageUrl} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                    Nombre
                    <input
                      className="h-11 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white font-bold text-zinc-905"
                      name="name"
                      required
                      defaultValue={editingCategory.name}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                    ¿Es subcategoría de?
                    <select
                      className="h-11 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white cursor-pointer"
                      name="parent_id"
                      defaultValue={editingCategory.parentId || ""}
                    >
                      <option value="">Ninguna (Es principal)</option>
                      {mainCategories
                        .filter((c) => c.id !== editingCategory.id) // Prevent self-referencing
                        .map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                  </label>
                </div>

                <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
                  Descripción
                  <textarea
                    className="min-h-20 rounded-xl border border-zinc-300 p-3 outline-none focus:border-emerald-600 bg-white"
                    name="description"
                    defaultValue={editingCategory.description}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2 items-center">
                  <div className="flex items-center gap-3">
                    {editingCategory.imageUrl ? (
                      <img 
                        src={editingCategory.imageUrl} 
                        alt="Actual" 
                        className="h-12 w-16 rounded-lg object-cover border border-zinc-200 shadow-sm flex-none" 
                      />
                    ) : (
                      <div className="h-12 w-16 rounded-lg bg-zinc-100 border border-dashed border-zinc-300 flex items-center justify-center text-zinc-405 text-[10px] font-semibold flex-none">
                        Sin foto
                      </div>
                    )}
                    <label className="grid gap-1 text-xs font-semibold text-zinc-700 flex-1">
                      Cambiar Foto (Subida directa)
                      <input
                        accept="image/*"
                        className="rounded-xl border border-zinc-300 p-1.5 text-xs bg-white cursor-pointer w-full h-10 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-zinc-100 file:text-zinc-700"
                        name="image"
                        type="file"
                      />
                    </label>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-2 justify-end">
                    <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 cursor-pointer">
                      <input 
                        name="is_wholesale_only" 
                        type="checkbox" 
                        defaultChecked={editingCategory.wholesaleOnly}
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer" 
                      />
                      Solo mayorista
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                      Orden de Visualización
                      <input
                        className="h-10 w-16 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white text-center font-bold"
                        name="display_order"
                        type="number"
                        defaultValue={editingCategory.displayOrder}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Sticky Footer - Always visible, corrected colors */}
              <div className="flex justify-end gap-3 p-5 bg-zinc-50 border-t border-zinc-200 flex-shrink-0 z-10">
                <button
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-200 rounded-xl cursor-pointer transition-colors"
                  type="button"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-650 hover:bg-emerald-700 rounded-xl cursor-pointer transition-colors flex items-center gap-2 shadow-xs"
                  type="submit"
                  disabled={isPending}
                >
                  {isPending && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  Guardar Cambios
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      {/* MODAL: CARGA MASIVA DE PRODUCTOS */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-200 p-5 bg-white flex-shrink-0 z-10">
              <h3 className="text-xl font-bold text-zinc-950 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-sky-600" /> Carga Masiva de Productos
              </h3>
              <button
                onClick={() => setIsBulkImportOpen(false)}
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition cursor-pointer"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBulkImportSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 text-xs text-sky-900 leading-relaxed">
                  <p className="font-bold mb-1">Formato requerido (separado por comas):</p>
                  <p className="font-mono text-[11px] bg-white/70 p-2 rounded border border-sky-200">
                    Titulo, Categoría, PrecioMinorista, PrecioMayorista, MinMayorista, Stock, Descripción
                  </p>
                  <p className="mt-2 text-zinc-600">
                    Podés pegar múltiples líneas de Excel o CSV. Si la categoría ya existe se asociará automáticamente.
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase text-zinc-700">
                    Pegar Datos CSV
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setBulkCsvText(
                        `SKIN1004 Centella Toner 210ml, Cosmética Coreana, 36000, 27000, 6, 25, Tónico calmante con centella pura de Madagascar\nMedicube Zero Pore Pad 2.0, Cosmética Coreana, 42000, 31500, 6, 30, Discos exfoliantes de doble textura para poros\nApple iPhone 14 128GB, Smartphones & Tecnología, 790000, 650000, 2, 10, Apple iPhone 14 libre de fábrica con garantía\nTotal Tools Sierra Circular 1400W, Herramientas & Equipamiento, 88000, 69000, 2, 15, Sierra circular industrial 185mm 1400W`
                      )
                    }
                    className="text-xs text-sky-600 hover:text-sky-700 font-semibold cursor-pointer underline"
                  >
                    Insertar plantilla de ejemplo
                  </button>
                </div>

                <textarea
                  rows={8}
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  placeholder="Pegá aquí tus filas de productos..."
                  className="w-full rounded-xl border border-zinc-300 p-3 font-mono text-xs outline-none focus:border-sky-600 bg-zinc-50 focus:bg-white"
                />

                {bulkMsg && (
                  <div
                    className={`rounded-xl p-3 text-xs font-semibold ${
                      bulkMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {bulkMsg.text}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-5 bg-zinc-50 border-t border-zinc-200 flex-shrink-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsBulkImportOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-200 rounded-xl cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !bulkCsvText.trim()}
                  className="px-5 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  Importar Productos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
