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
  Copy,
  MessageCircle,
  ExternalLink,
  Building2,
  Boxes,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Percent,
  Calculator,
  Megaphone,
} from "lucide-react";
import { useState, useTransition, useMemo } from "react";
import { PricingEngine } from "@/components/admin/pricing-engine";
import { SupplierResaleSystem } from "@/components/admin/supplier-resale-system";
import { MarketingHub } from "@/components/admin/marketing-hub";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  createProductAction,
  updateProductAction,
  updateProductStockAction,
  updateProductWholesaleAction,
  deleteProductAction,
  updateUserRoleAction,
  toggleWholesaleApprovalAction,
  setWholesaleByEmailAction,
  updateOrderStatusAction,
  bulkImportProductsAction,
} from "@/app/admin/actions";
import { formatCurrency, formatDate, formatOrderStatus, formatPaymentMethod } from "@/lib/format";
import { getWhatsAppUrl } from "@/lib/site";
import type { AdminDashboardData, PaymentMethod, Category, Product } from "@/lib/types";
import { isProductImmediateStock } from "@/lib/shipping";

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
  const [activeTab, setActiveTab] = useState<
    "products" | "pricing_engine" | "resale_system" | "marketing" | "suppliers" | "categories" | "orders" | "customers"
  >("products");
  const [isPending, startTransition] = useTransition();
  const [stockState, setStockState] = useState<Record<string, number>>({});
  const [showStockAudit, setShowStockAudit] = useState(false);

  // Suppliers & Cost Control tab states
  const [supplierFilter, setSupplierFilter] = useState<"all" | "total_tools" | "atacado_usa">("all");
  const [supplierStockFilter, setSupplierStockFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierWholesaleInputs, setSupplierWholesaleInputs] = useState<Record<string, { price: number; minQty: number }>>({});
  const [supplierStockInputs, setSupplierStockInputs] = useState<Record<string, number>>({});
  const [supplierActionFeedback, setSupplierActionFeedback] = useState<Record<string, string>>({});

  // Custom Suppliers & Commercial Tools state
  const [customSuppliers, setCustomSuppliers] = useState<
    Array<{ id: string; name: string; categoryType: string; url?: string; phone?: string; notes?: string }>
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mya_custom_suppliers");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupUrl, setNewSupUrl] = useState("");
  const [newSupCategory, setNewSupCategory] = useState("Herramientas");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupNotes, setNewSupNotes] = useState("");

  // Quick Import Calculator state
  const [showImportCalc, setShowImportCalc] = useState(false);
  const [calcCurrency, setCalcCurrency] = useState<"usd" | "pyg">("usd");
  const [calcCost, setCalcCost] = useState<number>(25);
  const [calcExchangeRate, setCalcExchangeRate] = useState<number>(1350);
  const [calcShippingPercent, setCalcShippingPercent] = useState<number>(10);
  const [calcWholesaleMarkup, setCalcWholesaleMarkup] = useState<number>(20);
  const [calcRetailMarkup, setCalcRetailMarkup] = useState<number>(100);

  // WhatsApp Wholesale List Generator state
  const [copiedWhatsAppList, setCopiedWhatsAppList] = useState(false);
  const [copiedCalcQuote, setCopiedCalcQuote] = useState(false);

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

  // Customer filter and search states
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<"all" | "wholesale" | "retail" | "admin">("all");
  const [quickWholesaleEmail, setQuickWholesaleEmail] = useState("");
  const [copiedWholesaleLink, setCopiedWholesaleLink] = useState(false);

  const handleCopyWholesaleLink = () => {
    const url = `${window.location.origin}/mayorista`;
    navigator.clipboard.writeText(url);
    setCopiedWholesaleLink(true);
    setTimeout(() => setCopiedWholesaleLink(false), 2500);
  };

  const handleSaveNewSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;

    const newSupplier = {
      id: `custom_${Date.now()}`,
      name: newSupName.trim(),
      categoryType: newSupCategory,
      url: newSupUrl.trim() || "#",
      phone: newSupPhone.trim(),
      notes: newSupNotes.trim(),
    };

    const updated = [...customSuppliers, newSupplier];
    setCustomSuppliers(updated);
    try {
      localStorage.setItem("mya_custom_suppliers", JSON.stringify(updated));
    } catch {}

    setNewSupName("");
    setNewSupUrl("");
    setNewSupPhone("");
    setNewSupNotes("");
    setIsNewSupplierModalOpen(false);
    alert(`¡Proveedor "${newSupplier.name}" registrado con éxito! Ahora podés seleccionarlo en el Ajustador Masivo de Precios y en el Panel B2B.`);
  };

  const handleCopyCalcQuote = () => {
    const baseArs = calcCost * calcExchangeRate;
    const landedCost = baseArs * (1 + calcShippingPercent / 100);
    const wholesalePrice = Math.round((landedCost * (1 + calcWholesaleMarkup / 100)) / 100) * 100;
    const retailPrice = Math.round((landedCost * (1 + calcRetailMarkup / 100)) / 100) * 100;
    const mlRefPrice = Math.round((retailPrice * 1.08) / 100) * 100;

    const text = `📊 *COTIZACIÓN DE IMPORTACIÓN B2B - MYA IMPORTACIONES*
Origen: ${calcCost} ${calcCurrency.toUpperCase()} (TC: $${calcExchangeRate} ARS)
Logística / Despacho: +${calcShippingPercent}%
────────────────────────────
📦 Costo puesto en ARS: $${Math.round(landedCost).toLocaleString("es-AR")}
💼 Precio Mayorista (+${calcWholesaleMarkup}%): $${wholesalePrice.toLocaleString("es-AR")}
🏷️ Precio Minorista / PVP (+${calcRetailMarkup}%): $${retailPrice.toLocaleString("es-AR")}
🛒 Referencia Mercado Libre: $${mlRefPrice.toLocaleString("es-AR")} (Ahorro cliente: -8%)
💰 Ganancia Neta Minorista: $${(retailPrice - landedCost).toLocaleString("es-AR")}
💰 Ganancia Neta Mayorista: $${(wholesalePrice - landedCost).toLocaleString("es-AR")}`;

    navigator.clipboard.writeText(text);
    setCopiedCalcQuote(true);
    setTimeout(() => setCopiedCalcQuote(false), 2500);
  };

  const handleQuickWholesaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickWholesaleEmail.trim()) return;

    startTransition(async () => {
      try {
        await setWholesaleByEmailAction(quickWholesaleEmail, true);
        alert(`¡El usuario ${quickWholesaleEmail} fue habilitado como cliente Mayorista con éxito!`);
        setQuickWholesaleEmail("");
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

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

  const handleSaveSupplierWholesale = (productId: string, defaultWholesalePrice: number, defaultMinQty: number) => {
    const input = supplierWholesaleInputs[productId];
    const wholesalePrice = input?.price !== undefined ? input.price : defaultWholesalePrice;
    const minQty = input?.minQty !== undefined ? input.minQty : defaultMinQty;

    startTransition(async () => {
      try {
        await updateProductWholesaleAction(productId, wholesalePrice, minQty);
        setSupplierActionFeedback((prev) => ({ ...prev, [productId]: "✓ Guardado B2B" }));
        setTimeout(() => {
          setSupplierActionFeedback((prev) => {
            const next = { ...prev };
            delete next[productId];
            return next;
          });
        }, 2500);
      } catch (err: any) {
        alert("Error al actualizar condición mayorista: " + err.message);
      }
    });
  };

  const handleSaveSupplierStock = (productId: string, fallbackStock: number) => {
    const newStock = supplierStockInputs[productId] !== undefined ? supplierStockInputs[productId] : fallbackStock;

    startTransition(async () => {
      try {
        await updateProductStockAction(productId, newStock);
        setStockState((prev) => ({ ...prev, [productId]: newStock }));
        setSupplierActionFeedback((prev) => ({ ...prev, [`stock_${productId}`]: "✓ Stock OK" }));
        setTimeout(() => {
          setSupplierActionFeedback((prev) => {
            const next = { ...prev };
            delete next[`stock_${productId}`];
            return next;
          });
        }, 2500);
      } catch (err: any) {
        alert("Error al actualizar stock: " + err.message);
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

  // Filter customers for search & category filter
  const filteredCustomers = useMemo(() => {
    return data.customers.filter((customer) => {
      const search = customerSearch.toLowerCase().trim();
      const matchesSearch =
        !search ||
        customer.fullName.toLowerCase().includes(search) ||
        customer.email.toLowerCase().includes(search) ||
        Boolean(customer.businessName && customer.businessName.toLowerCase().includes(search)) ||
        Boolean(customer.cuit && customer.cuit.toLowerCase().includes(search));

      if (!matchesSearch) return false;

      if (customerFilter === "wholesale") return customer.isApprovedWholesale;
      if (customerFilter === "retail") return !customer.isApprovedWholesale && customer.role !== "admin";
      if (customerFilter === "admin") return customer.role === "admin";
      return true;
    });
  }, [data.customers, customerSearch, customerFilter]);

  // Helper to categorize supplier and calculate cost basis
  const getProductSupplier = (product: Product) => {
    const titleUpper = product.title.toUpperCase();
    const tagsUpper = product.tags.map((t) => t.toUpperCase());
    const cat = data.categories.find((c) => c.id === product.categoryId);
    const catSlug = (cat?.slug || "").toLowerCase();

    const isCosmetic =
      catSlug.includes("cosmet") ||
      catSlug.includes("capilar") ||
      catSlug.includes("tonico") ||
      catSlug.includes("locion") ||
      catSlug.includes("shampoo") ||
      catSlug.includes("aceite") ||
      tagsUpper.includes("COSMETICA COREANA") ||
      tagsUpper.includes("CUIDADO CAPILAR") ||
      tagsUpper.includes("ATACADO USA") ||
      titleUpper.includes("MEDICUBE") ||
      titleUpper.includes("KARSEELL") ||
      titleUpper.includes("ANUA") ||
      titleUpper.includes("SKIN1004") ||
      titleUpper.includes("CELIMAX") ||
      titleUpper.includes("DR. ALTHEA") ||
      titleUpper.includes("REEDLE") ||
      titleUpper.includes("NUMBUZIN") ||
      titleUpper.includes("DEAR BODY") ||
      titleUpper.includes("VICTORIA'S SECRET");

    const isTool =
      titleUpper.includes("TOTAL") ||
      titleUpper.includes("WADFOW") ||
      catSlug.includes("herramienta") ||
      catSlug.includes("taladro") ||
      catSlug.includes("amoladora") ||
      catSlug.includes("soldador") ||
      catSlug.includes("generador") ||
      catSlug.includes("bateria") ||
      tagsUpper.includes("HERRAMIENTAS");

    if (isCosmetic) {
      const costArs = Math.round(product.retailPrice / 2);
      const costUsd = Number((costArs / 1300).toFixed(2));
      return {
        id: "atacado_usa" as const,
        name: "Atacado USA",
        categoryType: "Cosméticos & K-Beauty",
        badgeColor: "bg-pink-50 text-pink-700 border-pink-200",
        url: "https://atacadousa.com.py/20-cosmeticos",
        costUsd,
        costArs,
      };
    }

    if (isTool) {
      const costArs = Math.round(product.retailPrice / 2);
      const costUsd = Number((costArs / 1300).toFixed(2));
      return {
        id: "total_tools" as const,
        name: "Total Tools Paraguay",
        categoryType: "Herramientas Industriales",
        badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
        url: "https://www.totalherramientasoficial.com.py/home",
        costUsd,
        costArs,
      };
    }

    const costArs = Math.round(product.retailPrice / 2);
    const costUsd = Number((costArs / 1300).toFixed(2));
    return {
      id: "general" as const,
      name: "Total Tools / Wadfow",
      categoryType: "Herramientas & Equipamiento",
      badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
      url: "https://www.totalherramientasoficial.com.py/home",
      costUsd,
      costArs,
    };
  };

  // Supplier metrics stats
  const supplierMetrics = useMemo(() => {
    let totalToolsCount = 0;
    let atacadoUsaCount = 0;
    let outOfStockCount = 0;

    data.products.forEach((p) => {
      const sup = getProductSupplier(p);
      const s = stockState[p.id] ?? p.stock;
      if (s <= 0) outOfStockCount++;
      if (sup.id === "total_tools" || sup.id === "general") totalToolsCount++;
      else if (sup.id === "atacado_usa") atacadoUsaCount++;
    });

    return {
      totalProducts: data.products.length,
      totalToolsCount,
      atacadoUsaCount,
      outOfStockCount,
    };
  }, [data.products, data.categories, stockState]);

  // Filtered supplier products
  const filteredSupplierProducts = useMemo(() => {
    return data.products
      .map((product) => {
        const supplier = getProductSupplier(product);
        const currentStock = stockState[product.id] ?? product.stock;
        return { product, supplier, currentStock };
      })
      .filter(({ product, supplier, currentStock }) => {
        // Supplier filter
        if (supplierFilter !== "all" && supplier.id !== supplierFilter) return false;

        // Stock filter
        if (supplierStockFilter === "in_stock" && currentStock <= 0) return false;
        if (supplierStockFilter === "low_stock" && (currentStock <= 0 || currentStock > 5)) return false;
        if (supplierStockFilter === "out_of_stock" && currentStock > 0) return false;

        // Search query
        if (supplierSearch.trim()) {
          const q = supplierSearch.toLowerCase().trim();
          const matchTitle = product.title.toLowerCase().includes(q);
          const matchDesc = product.description.toLowerCase().includes(q);
          const matchTags = product.tags.some((t) => t.toLowerCase().includes(q));
          const matchSupplier = supplier.name.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchTags && !matchSupplier) return false;
        }

        return true;
      });
  }, [data.products, data.categories, stockState, supplierFilter, supplierStockFilter, supplierSearch]);

  // Pagination for suppliers
  const SUPPLIERS_PER_PAGE = 30;
  const totalSupplierPages = Math.max(1, Math.ceil(filteredSupplierProducts.length / SUPPLIERS_PER_PAGE));
  const paginatedSupplierProducts = useMemo(() => {
    const start = (supplierPage - 1) * SUPPLIERS_PER_PAGE;
    return filteredSupplierProducts.slice(start, start + SUPPLIERS_PER_PAGE);
  }, [filteredSupplierProducts, supplierPage]);

  const handleGenerateWhatsAppList = () => {
    const listToExport = filteredSupplierProducts.slice(0, 50);
    if (listToExport.length === 0) {
      alert("No hay productos filtrados para armar la lista.");
      return;
    }

    let text = `📦 *CATÁLOGO MAYORISTA - MYA IMPORTACIONES*\n`;
    text += `📍 *Precios Directos de Importación (Origen Paraguay / USA)*\n`;
    text += `🗓️ Actualizado: ${new Date().toLocaleDateString("es-AR")}\n`;
    text += `────────────────────────────\n\n`;

    listToExport.forEach(({ product, supplier }) => {
      const wholesale = product.wholesalePrice || Math.round(product.retailPrice * 0.75);
      const minQty = product.wholesaleMinQuantity || 1;
      text += `🔹 *${product.title}*\n`;
      text += `   💲 Precio Mayorista: $${wholesale.toLocaleString("es-AR")} (Mín. ${minQty} un.)\n`;
      text += `   🏷️ Precio Sugerido Venta Público: $${product.retailPrice.toLocaleString("es-AR")}\n`;
      text += `   📦 Stock Disponible: ${product.stock > 0 ? `${product.stock} un.` : "A pedido"}\n\n`;
    });

    text += `────────────────────────────\n`;
    text += `📲 *Para hacer tu pedido directo al WhatsApp:* +54 9 2494638919\n`;
    text += `✉️ Email comercial: maximocalamante14@gmail.com\n`;
    text += `🌐 Catálogo Completo Online: ${window.location.origin}/mayorista\n`;

    navigator.clipboard.writeText(text);
    setCopiedWhatsAppList(true);
    setTimeout(() => setCopiedWhatsAppList(false), 3000);
  };

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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 ring-1 ring-inset ring-sky-600/20">
            <Sparkles className="h-3.5 w-3.5 text-sky-600" /> Dashboard de Control Oficial
          </span>
          <h1 className="mt-2 text-3xl font-extrabold text-zinc-950 tracking-tight">
            Panel de Administración
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Control de stock en tiempo real, márgenes de importación directa y métricas comerciales de MYA.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveTab("pricing_engine")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-bold text-white hover:bg-amber-600 shadow-sm transition-colors cursor-pointer"
          >
            <Percent className="h-4 w-4" />
            Ajustar Precios (%)
          </button>
          <button
            onClick={() => {
              setBulkMsg(null);
              setIsBulkImportOpen(true);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-bold text-white hover:bg-sky-700 shadow-sm transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Carga Masiva (CSV)
          </button>
          <button
            onClick={() => setIsCreateProductOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-bold text-white hover:bg-zinc-800 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </button>
          <button
            onClick={() => {
              setCreateCategoryParentId("");
              setIsCreateCategoryOpen(true);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white border border-zinc-300 px-5 text-sm font-bold text-zinc-800 hover:bg-zinc-100 shadow-sm transition-colors cursor-pointer"
          >
            <FolderPlus className="h-4 w-4 text-zinc-600" />
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
      <div className="border-b border-zinc-200 mb-6 overflow-x-auto">
        <nav className="flex space-x-8 min-w-max" aria-label="Tabs">
          {[
            { id: "products", name: "Productos & Stock", icon: Package },
            { id: "pricing_engine", name: "Ajustador Masivo de Precios (%)", icon: Percent },
            { id: "resale_system", name: "Cálculo & Reventa B2B", icon: Calculator },
            { id: "marketing", name: "Marketing & Píxeles Ads", icon: Megaphone },
            { id: "suppliers", name: "Proveedores & Costos (B2B)", icon: Truck },
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
                    ? "border-sky-600 text-sky-700"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                }`}
              >
                <tab.icon
                  className={`h-4.5 w-4.5 transition-colors ${
                    isActive ? "text-sky-600" : "text-zinc-400 group-hover:text-zinc-500"
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
                                {isProductImmediateStock(product) ? (
                                  <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                                    ⚡ Stock Inmediato (24hs)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-800 ring-1 ring-inset ring-sky-600/20">
                                    ✈️ Importación (3-7d)
                                  </span>
                                )}
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
                                {product.tags
                                  .filter((tag) => !["en_stock", "en stock", "stock inmediato", "stock_inmediato"].includes(tag.toLowerCase()))
                                  .map((tag) => (
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

      {/* TAB CONTENT: PRICING ENGINE */}
      {activeTab === "pricing_engine" && (
        <PricingEngine
          products={data.products}
          categories={data.categories}
          customSuppliers={customSuppliers}
        />
      )}

      {/* TAB CONTENT: RESALE SYSTEM & B2B PROFIT ENGINE */}
      {activeTab === "resale_system" && (
        <SupplierResaleSystem
          products={data.products}
          categories={data.categories}
          customSuppliers={customSuppliers}
        />
      )}

      {/* TAB CONTENT: MARKETING & ADS HUB */}
      {activeTab === "marketing" && (
        <MarketingHub />
      )}

      {/* TAB CONTENT: SUPPLIERS & COST CONTROL (B2B) */}
      {activeTab === "suppliers" && (
        <div className="space-y-6">
          {/* Top Info Banner */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-cyan-50/60 p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                    <Building2 className="h-3.5 w-3.5" /> B2B & Supply Chain Hub
                  </span>
                  <span className="text-xs text-zinc-500 font-medium">Cotización referencia: 1 USD = $1.350 ARS</span>
                </div>
                <h2 className="mt-2 text-2xl font-black text-zinc-900 tracking-tight">
                  Control de Proveedores, Costos y Stock Mayorista
                </h2>
                <p className="mt-1 text-sm text-zinc-600 max-w-3xl">
                  Monitoreá en tiempo real los costos de compra en origen (Paraguay / USA), márgenes brutos,
                  condiciones para clientes mayoristas y enlaces directos a las plataformas oficiales de abastecimiento.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("pricing_engine")}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 shadow-xs transition-all cursor-pointer"
                >
                  <Percent className="h-3.5 w-3.5" />
                  Ajustar Precios Masivamente
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportCalc(!showImportCalc)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold shadow-xs transition-all cursor-pointer ${
                    showImportCalc
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-blue-900 border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  <Calculator className="h-3.5 w-3.5" />
                  {showImportCalc ? "Ocultar Calculadora" : "Calculadora de Importación"}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateWhatsAppList}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-all cursor-pointer"
                  title="Copiar lista de precios mayorista filtrada formateada para WhatsApp"
                >
                  {copiedWhatsAppList ? <Check className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                  {copiedWhatsAppList ? "¡Lista Copiada!" : "Lista Mayorista WhatsApp"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewSupplierModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Registrar Proveedor
                </button>
                <a
                  href="https://www.totalherramientasoficial.com.py/home"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-300 bg-white px-3.5 py-2.5 text-xs font-bold text-cyan-900 hover:bg-cyan-50 hover:border-cyan-400 shadow-xs transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-cyan-600" />
                  Total Tools PY
                </a>
                <a
                  href="https://atacadousa.com.py/20-cosmeticos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-pink-300 bg-white px-3.5 py-2.5 text-xs font-bold text-pink-900 hover:bg-pink-50 hover:border-pink-400 shadow-xs transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-pink-600" />
                  Atacado USA
                </a>
              </div>
            </div>
          </div>

          {/* Interactive B2B Import & Margin Calculator */}
          {showImportCalc && (
            <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-md animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4 mb-5 gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                    <Calculator className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-950">
                      Calculadora Rápida de Costo de Importación & Precios de Venta
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Calculá al instante el costo puesto en ARS, precio mayorista sugerido y precio minorista competitivo frente a Mercado Libre.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCalcQuote}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 transition-all cursor-pointer"
                  >
                    {copiedCalcQuote ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedCalcQuote ? "¡Cotización Copiada!" : "Copiar Cotización"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportCalc(false)}
                    className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Calculator Inputs */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 mb-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    Moneda Origen
                  </label>
                  <select
                    value={calcCurrency}
                    onChange={(e) => {
                      const curr = e.target.value as "usd" | "pyg";
                      setCalcCurrency(curr);
                      if (curr === "pyg" && calcExchangeRate === 1350) setCalcExchangeRate(0.175);
                      if (curr === "usd" && calcExchangeRate === 0.175) setCalcExchangeRate(1350);
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 text-xs font-semibold bg-white outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="usd">Dólares (USD)</option>
                    <option value="pyg">Guaraníes (PYG)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    Costo en Origen ({calcCurrency.toUpperCase()})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={calcCurrency === "usd" ? "0.5" : "1000"}
                    value={calcCost}
                    onChange={(e) => setCalcCost(Math.max(0, Number(e.target.value)))}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 text-xs font-bold bg-white outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    Tipo de Cambio (ARS)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={calcCurrency === "usd" ? "10" : "0.01"}
                    value={calcExchangeRate}
                    onChange={(e) => setCalcExchangeRate(Math.max(0, Number(e.target.value)))}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 text-xs font-bold bg-white outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    Logística & Aduana (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={calcShippingPercent}
                    onChange={(e) => setCalcShippingPercent(Math.max(0, Number(e.target.value)))}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 text-xs font-bold bg-white outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    Margen Mayorista (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={calcWholesaleMarkup}
                    onChange={(e) => setCalcWholesaleMarkup(Math.max(0, Number(e.target.value)))}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 text-xs font-bold bg-white outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    Margen Minorista (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={calcRetailMarkup}
                    onChange={(e) => setCalcRetailMarkup(Math.max(0, Number(e.target.value)))}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 text-xs font-bold bg-white outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Calculator Output KPI Cards */}
              {(() => {
                const baseArs = calcCost * calcExchangeRate;
                const landedCost = baseArs * (1 + calcShippingPercent / 100);
                const wholesalePrice = Math.round((landedCost * (1 + calcWholesaleMarkup / 100)) / 100) * 100;
                const retailPrice = Math.round((landedCost * (1 + calcRetailMarkup / 100)) / 100) * 100;
                const mlRefPrice = Math.round((retailPrice * 1.08) / 100) * 100;
                const retailProfit = retailPrice - landedCost;
                const wholesaleProfit = wholesalePrice - landedCost;

                return (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl bg-zinc-50 p-4 border border-zinc-200">
                    <div className="rounded-xl bg-white p-4 border border-zinc-200 shadow-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        Costo Puesto en Argentina
                      </span>
                      <p className="mt-2 text-2xl font-black text-zinc-900">
                        {formatCurrency(Math.round(landedCost))}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Base: {formatCurrency(Math.round(baseArs))} + {calcShippingPercent}% flete
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-4 border border-purple-200 shadow-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                        Precio Mayorista Sugerido
                      </span>
                      <p className="mt-2 text-2xl font-black text-purple-800">
                        {formatCurrency(wholesalePrice)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-purple-600">
                        +{formatCurrency(wholesaleProfit)} neta (+{calcWholesaleMarkup}%)
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-4 border border-emerald-200 shadow-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                        Precio Minorista / PVP (2x)
                      </span>
                      <p className="mt-2 text-2xl font-black text-emerald-800">
                        {formatCurrency(retailPrice)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-emerald-600">
                        +{formatCurrency(retailProfit)} neta (+{calcRetailMarkup}%)
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-4 border border-amber-200 shadow-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                        Ref. Mercado Libre (-8% ahorro)
                      </span>
                      <p className="mt-2 text-2xl font-black text-amber-800">
                        {formatCurrency(mlRefPrice)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-amber-600">
                        Tu tienda es -{formatCurrency(mlRefPrice - retailPrice)} más barata
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Metrics summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Tools Paraguay</span>
                <span className="rounded-lg bg-cyan-50 p-2 text-cyan-700">
                  <Truck className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-black text-zinc-900">
                {supplierMetrics.totalToolsCount.toLocaleString("es-AR")}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Herramientas industriales (Margen PVP: 50% / 2.0x costo)
              </p>
            </div>

            <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Atacado USA Cosméticos</span>
                <span className="rounded-lg bg-pink-50 p-2 text-pink-700">
                  <Sparkles className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-black text-zinc-900">
                {supplierMetrics.atacadoUsaCount.toLocaleString("es-AR")}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                K-Beauty & Cuidado Facial (Margen PVP: 50% / Mayorista: 15%)
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Tools & Wadfow</span>
                <span className="rounded-lg bg-cyan-50 p-2 text-cyan-700">
                  <Package className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-black text-zinc-900">
                {supplierMetrics.totalToolsCount.toLocaleString("es-AR")}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Herramientas Eléctricas, Batería & Manuales
              </p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Control de Disponibilidad</span>
                <span className="rounded-lg bg-amber-50 p-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-black text-amber-900">
                {supplierMetrics.outOfStockCount.toLocaleString("es-AR")}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Artículos sin stock para reorden de compra
              </p>
            </div>
          </div>

          {/* Filters & Search Row */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar por producto, marca (TOTAL, Medicube, Karseell...), SKU o categoría..."
                  value={supplierSearch}
                  onChange={(e) => {
                    setSupplierSearch(e.target.value);
                    setSupplierPage(1);
                  }}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-300 outline-none focus:border-emerald-600 bg-white text-sm"
                />
              </div>

              {/* Clear filters if active */}
              {(supplierFilter !== "all" || supplierStockFilter !== "all" || supplierSearch.trim()) && (
                <button
                  onClick={() => {
                    setSupplierFilter("all");
                    setSupplierStockFilter("all");
                    setSupplierSearch("");
                    setSupplierPage(1);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Limpiar filtros
                </button>
              )}
            </div>

            {/* Supplier Filter Chips & Stock Chips */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-100">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-1">
                Proveedor:
              </span>
              {[
                { id: "all", label: `Todos (${supplierMetrics.totalProducts})` },
                { id: "total_tools", label: `Total Tools PY (${supplierMetrics.totalToolsCount})` },
                { id: "atacado_usa", label: `Atacado USA Cosméticos (${supplierMetrics.atacadoUsaCount})` },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => {
                    setSupplierFilter(chip.id as any);
                    setSupplierPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    supplierFilter === chip.id
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {chip.label}
                </button>
              ))}

              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-4 mr-1">
                Stock:
              </span>
              {[
                { id: "all", label: "Cualquiera" },
                { id: "in_stock", label: "En Stock (>0)" },
                { id: "low_stock", label: "Stock Crítico (1 a 5)" },
                { id: "out_of_stock", label: "Sin Stock (0)" },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => {
                    setSupplierStockFilter(chip.id as any);
                    setSupplierPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    supplierStockFilter === chip.id
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Supplier Products Table */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold w-72">Producto</th>
                    <th className="px-4 py-4 font-semibold">Proveedor & Origen</th>
                    <th className="px-4 py-4 font-semibold">Costo Proveedor</th>
                    <th className="px-4 py-4 font-semibold">Precio Minorista (PVP)</th>
                    <th className="px-4 py-4 font-semibold">Condición Mayorista (B2B)</th>
                    <th className="px-4 py-4 font-semibold text-center w-48">Stock & Disponibilidad</th>
                    <th className="px-4 py-4 font-semibold text-center w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {paginatedSupplierProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center">
                          <Inbox className="h-10 w-10 text-zinc-300 mb-2" />
                          <p className="font-semibold text-zinc-700">No se encontraron productos con estos criterios</p>
                          <p className="text-xs text-zinc-400 mt-1">
                            Ajustá el término de búsqueda o seleccioná otro proveedor.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedSupplierProducts.map(({ product, supplier, currentStock }) => {
                      const wholesaleInput = supplierWholesaleInputs[product.id];
                      const wholesalePriceValue = wholesaleInput?.price !== undefined ? wholesaleInput.price : product.wholesalePrice;
                      const wholesaleMinQtyValue = wholesaleInput?.minQty !== undefined ? wholesaleInput.minQty : product.wholesaleMinQuantity;

                      const stockInputValue = supplierStockInputs[product.id] !== undefined ? supplierStockInputs[product.id] : currentStock;

                      const isWholesaleModified = wholesaleInput !== undefined && (wholesaleInput.price !== product.wholesalePrice || wholesaleInput.minQty !== product.wholesaleMinQuantity);
                      const isStockModified = supplierStockInputs[product.id] !== undefined && supplierStockInputs[product.id] !== currentStock;

                      const wholesaleFeedback = supplierActionFeedback[product.id];
                      const stockFeedback = supplierActionFeedback[`stock_${product.id}`];

                      const grossProfitArs = product.retailPrice - supplier.costArs;

                      let stockBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      let stockText = `${currentStock} en stock`;
                      if (currentStock <= 0) {
                        stockBadgeClass = "bg-red-50 text-red-700 border-red-200";
                        stockText = "Agotado / Sin stock";
                      } else if (currentStock <= 5) {
                        stockBadgeClass = "bg-amber-50 text-amber-800 border-amber-200";
                        stockText = `Stock bajo (${currentStock})`;
                      }

                      return (
                        <tr key={product.id} className="hover:bg-zinc-50/80 transition-colors">
                          {/* Product Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                                <img
                                  src={product.imageUrl || "/placeholder.png"}
                                  alt={product.title}
                                  className="h-full w-full object-contain p-1"
                                  loading="lazy"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-zinc-900 truncate max-w-xs" title={product.title}>
                                  {product.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] font-mono text-zinc-400">
                                    ID: {product.id.slice(0, 8)}
                                  </span>
                                  {product.tags.length > 0 && (
                                    <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                                      {product.tags[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Supplier & Origin */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold border ${supplier.badgeColor}`}>
                                {supplier.name}
                              </span>
                              <div>
                                {supplier.url !== "#" ? (
                                  <a
                                    href={supplier.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" /> Ver proveedor
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-zinc-400">Directo fábrica</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Cost Provider */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div>
                              <p className="font-extrabold text-zinc-900">
                                {formatCurrency(supplier.costArs)}
                              </p>
                              <p className="text-xs font-semibold text-zinc-500">
                                ${supplier.costUsd.toFixed(2)} USD
                              </p>
                            </div>
                          </td>

                          {/* Retail Price (PVP) */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div>
                              <p className="font-black text-emerald-700">
                                {formatCurrency(product.retailPrice)}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                  +100% (2x)
                                </span>
                                <span className="text-[11px] text-zinc-500">
                                  +{formatCurrency(grossProfitArs)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Wholesale Conditions (B2B) */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <span className="absolute left-2 top-2 text-xs text-zinc-400">$</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={100}
                                    value={wholesalePriceValue}
                                    onChange={(e) => {
                                      const p = Number(e.target.value);
                                      setSupplierWholesaleInputs((prev) => ({
                                        ...prev,
                                        [product.id]: {
                                          price: p,
                                          minQty: wholesaleMinQtyValue,
                                        },
                                      }));
                                    }}
                                    className="h-8 w-28 pl-5 pr-2 rounded-lg border border-zinc-300 text-xs font-bold text-zinc-900 focus:border-emerald-600 outline-none"
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-zinc-500 font-medium">Min:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={wholesaleMinQtyValue}
                                    onChange={(e) => {
                                      const q = Number(e.target.value);
                                      setSupplierWholesaleInputs((prev) => ({
                                        ...prev,
                                        [product.id]: {
                                          price: wholesalePriceValue,
                                          minQty: q,
                                        },
                                      }));
                                    }}
                                    className="h-8 w-14 px-2 rounded-lg border border-zinc-300 text-xs font-bold text-zinc-900 focus:border-emerald-600 outline-none text-center"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSaveSupplierWholesale(product.id, product.wholesalePrice, product.wholesaleMinQuantity)}
                                  disabled={isPending}
                                  className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isWholesaleModified
                                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                  }`}
                                  title="Guardar precio y mínimo mayorista"
                                >
                                  {wholesaleFeedback || "Guardar"}
                                </button>
                              </div>
                              <p className="text-[10px] text-zinc-400">
                                Margen B2B aprox: {wholesalePriceValue > 0 ? Math.round(((wholesalePriceValue - supplier.costArs) / wholesalePriceValue) * 100) : 0}%
                              </p>
                            </div>
                          </td>

                          {/* Stock & Availability */}
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${stockBadgeClass}`}>
                                {stockText}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  value={stockInputValue}
                                  onChange={(e) => {
                                    const s = Number(e.target.value);
                                    setSupplierStockInputs((prev) => ({
                                      ...prev,
                                      [product.id]: s,
                                    }));
                                  }}
                                  className="h-8 w-16 px-2 rounded-lg border border-zinc-300 text-xs font-bold text-zinc-900 focus:border-emerald-600 outline-none text-center"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveSupplierStock(product.id, currentStock)}
                                  disabled={isPending}
                                  className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isStockModified
                                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                  }`}
                                  title="Actualizar cantidad disponible"
                                >
                                  {stockFeedback || "Actualizar"}
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <a
                                href={`/producto/${product.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                                title="Ver publicación en la tienda"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(product)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
                                title="Editar detalles completos"
                              >
                                <Edit className="h-4 w-4" />
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

            {/* Pagination Controls */}
            {filteredSupplierProducts.length > SUPPLIERS_PER_PAGE && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
                <p className="text-xs text-zinc-500 font-medium">
                  Mostrando del{" "}
                  <span className="font-bold text-zinc-900">
                    {(supplierPage - 1) * SUPPLIERS_PER_PAGE + 1}
                  </span>{" "}
                  al{" "}
                  <span className="font-bold text-zinc-900">
                    {Math.min(supplierPage * SUPPLIERS_PER_PAGE, filteredSupplierProducts.length)}
                  </span>{" "}
                  de <span className="font-bold text-zinc-900">{filteredSupplierProducts.length}</span>{" "}
                  artículos vinculados a proveedores
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSupplierPage((p) => Math.max(1, p - 1))}
                    disabled={supplierPage === 1}
                    className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-zinc-300 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </button>
                  <span className="text-xs font-bold text-zinc-700 px-2">
                    Página {supplierPage} de {totalSupplierPages}
                  </span>
                  <button
                    onClick={() => setSupplierPage((p) => Math.min(totalSupplierPages, p + 1))}
                    disabled={supplierPage === totalSupplierPages}
                    className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-zinc-300 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
                  >
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
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
                <Users className="h-5 w-5 text-emerald-700" /> Cuentas de Usuario y Clientes Mayoristas
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Compartí enlaces privados a clientes comerciales y habilitá sus cuentas para ver el catálogo mayorista.
              </p>
            </div>
            <div className="text-xs text-zinc-500 font-semibold bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">
              Total registrados: <span className="font-extrabold text-zinc-800">{data.stats.customers}</span>
            </div>
          </div>

          {/* Quick Wholesale Actions & Sharing */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Box 1: Compartir enlace mayorista */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4.5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" /> Enlace Privado del Catálogo Mayorista
                </p>
                <p className="mt-1 text-xs text-amber-800/80 leading-relaxed">
                  Copiá el enlace para enviárselo directamente por WhatsApp a ferreterías, comercios o revendedores.
                </p>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyWholesaleLink}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold px-3.5 py-2 text-xs transition shadow-xs cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedWholesaleLink ? "¡Enlace Copiado!" : "Copiar Link Mayorista"}
                </button>
                <a
                  href={getWhatsAppUrl("Hola! Acá te comparto el enlace exclusivo para acceder a nuestro catálogo mayorista de MYA Importaciones:")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 text-xs transition shadow-xs"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Enviar por WhatsApp
                </a>
              </div>
            </div>

            {/* Box 2: Habilitar por Email */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 flex flex-col justify-between shadow-xs">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Habilitar Cliente Mayorista por Email
                </p>
                <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                  Ingresá el email de un usuario ya registrado para otorgarle condición de cliente mayorista de inmediato.
                </p>
              </div>
              <form onSubmit={handleQuickWholesaleSubmit} className="mt-3.5 flex gap-2">
                <input
                  type="email"
                  placeholder="ejemplo@comercio.com"
                  value={quickWholesaleEmail}
                  onChange={(e) => setQuickWholesaleEmail(e.target.value)}
                  className="flex-1 h-9.5 rounded-xl border border-zinc-300 px-3 text-xs outline-none focus:border-emerald-600 bg-white"
                  required
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-3.5 py-2 text-xs transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  Habilitar Mayorista
                </button>
              </form>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o empresa..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full h-9.5 pl-9 pr-3 rounded-xl border border-zinc-300 outline-none focus:border-emerald-600 bg-white text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: `Todos (${data.customers.length})` },
                { id: "wholesale", label: `Mayoristas (${data.customers.filter(c => c.isApprovedWholesale).length})` },
                { id: "retail", label: `Minoristas (${data.customers.filter(c => !c.isApprovedWholesale && c.role !== "admin").length})` },
                { id: "admin", label: `Admins (${data.customers.filter(c => c.role === "admin").length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCustomerFilter(f.id as any)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    customerFilter === f.id
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold text-xs">Usuario / Comercio</th>
                    <th className="px-6 py-3.5 font-semibold text-xs">Email</th>
                    <th className="px-6 py-3.5 font-semibold text-xs">Rol</th>
                    <th className="px-6 py-3.5 font-semibold text-xs">Estado Mayorista</th>
                    <th className="px-6 py-3.5 font-semibold text-xs text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center">
                          <Inbox className="h-10 w-10 text-zinc-300 mb-2" />
                          <p className="font-semibold text-zinc-700">No se encontraron usuarios</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const isAdmin = customer.role === "admin";
                      const isApproved = customer.isApprovedWholesale ?? false;

                      return (
                        <tr key={customer.id} className="hover:bg-zinc-50/40 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="font-bold text-zinc-900 flex items-center gap-1.5 text-xs sm:text-sm">
                              {customer.fullName}
                              {isAdmin && (
                                <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-700/20">
                                  <Shield className="h-2.5 w-2.5" /> Admin
                                </span>
                              )}
                            </div>
                            {customer.businessName && (
                              <p className="text-[11px] text-zinc-500 font-medium">{customer.businessName} {customer.cuit ? `(CUIT: ${customer.cuit})` : ""}</p>
                            )}
                          </td>
                          <td className="px-6 py-3.5 font-medium text-zinc-650 text-xs">{customer.email}</td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                              isAdmin
                                ? "bg-purple-50 text-purple-800 ring-purple-600/20"
                                : "bg-zinc-100 text-zinc-700 ring-zinc-500/20"
                            }`}>
                              {isAdmin ? "Administrador" : "Cliente"}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <button
                              disabled={isPending}
                              onClick={() => handleToggleWholesale(customer.id, isApproved)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                isApproved
                                  ? "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                                  : "bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200"
                              }`}
                              title="Hacé clic para cambiar la autorización mayorista"
                            >
                              <Check className={`h-3.5 w-3.5 ${isApproved ? "text-amber-700" : "text-transparent"}`} />
                              {isApproved ? "Mayorista Habilitado" : "Solo Minorista"}
                            </button>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <button
                              disabled={isPending}
                              onClick={() => handleUpdateRole(customer.id, customer.role)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition cursor-pointer ${
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

                {/* Immediate Stock Checkbox */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 space-y-1">
                  <label className="flex items-center gap-2 text-sm font-bold text-emerald-950 cursor-pointer">
                    <input
                      name="is_in_stock_immediate"
                      type="checkbox"
                      className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>⚡ En Stock Inmediato (Despacho 24hs Tandil)</span>
                  </label>
                  <p className="text-[11px] text-emerald-850 leading-relaxed pl-6">
                    Dejar desmarcado para productos de importación directa (plazo de entrega al cliente de 3 a 7 días hábiles). Marcar únicamente si tenés unidades físicas en depósito listas para despachar en el día.
                  </p>
                </div>

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

                {/* Immediate Stock Checkbox */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 space-y-1">
                  <label className="flex items-center gap-2 text-sm font-bold text-emerald-950 cursor-pointer">
                    <input 
                      name="is_in_stock_immediate" 
                      type="checkbox" 
                      defaultChecked={isProductImmediateStock(editingProduct)}
                      className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                    />
                    <span>⚡ En Stock Inmediato (Despacho 24hs Tandil)</span>
                  </label>
                  <p className="text-[11px] text-emerald-850 leading-relaxed pl-6">
                    Dejar desmarcado para productos de importación directa (plazo de entrega al cliente de 3 a 7 días hábiles). Marcar únicamente si tenés unidades físicas en depósito listas para despachar en el día.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="grid gap-1.5 text-sm font-semibold text-zinc-700 sm:col-span-2">
                    Etiquetas / Tags (Separados por coma)
                    <input
                      className="h-11 rounded-xl border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white"
                      name="tags"
                      placeholder="oferta, nuevo, pack"
                      defaultValue={editingProduct.tags
                        ?.filter(
                          (t) => !["en_stock", "en stock", "stock inmediato", "stock_inmediato"].includes(t.toLowerCase())
                        )
                        .join(", ")}
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
                        `SKIN1004 Centella Toner 210ml, Cosmética Coreana, 36000, 27000, 6, 25, Tónico calmante con centella pura de Madagascar\nMedicube Zero Pore Pad 2.0, Cosmética Coreana, 42000, 31500, 6, 30, Discos exfoliantes de doble textura para poros\nWadfow Rotomartillo 800W, Herramientas & Equipamiento, 65000, 48000, 3, 20, Rotomartillo electro-neumático profesional SDS Plus\nTotal Tools Sierra Circular 1400W, Herramientas & Equipamiento, 88000, 69000, 2, 15, Sierra circular industrial 185mm 1400W`
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

      {/* MODAL: REGISTRAR NUEVO PROVEEDOR */}
      {isNewSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-zinc-200 bg-zinc-50">
              <h3 className="text-lg font-extrabold text-zinc-950 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" /> Registrar Nuevo Proveedor Comercial
              </h3>
              <button
                type="button"
                onClick={() => setIsNewSupplierModalOpen(false)}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-700 mb-1">
                  Nombre del Proveedor / Empresa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Distribuidora Asunción Tools, Monalisa, etc."
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-700 mb-1">
                  Rubro / Categoría Principal
                </label>
                <select
                  value={newSupCategory}
                  onChange={(e) => setNewSupCategory(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm outline-none focus:border-emerald-600 font-medium bg-white cursor-pointer"
                >
                  <option value="Herramientas">Herramientas & Maquinaria</option>
                  <option value="Cosméticos">Cosméticos & K-Beauty</option>
                  <option value="Tecnología">Smartphones & Tecnología</option>
                  <option value="Calzado">Calzado & Indumentaria</option>
                  <option value="General">Bazar & Varios</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-700 mb-1">
                  Enlace Web / Catálogo Oficial
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newSupUrl}
                  onChange={(e) => setNewSupUrl(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm outline-none focus:border-emerald-600 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-700 mb-1">
                  Teléfono / WhatsApp de Contacto
                </label>
                <input
                  type="text"
                  placeholder="+595 981 ... o +54 9 ..."
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-700 mb-1">
                  Notas o Condiciones (Mínimos de compra, plazos, fletes)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej: Descuento 10% llevando más de 5 bultos. Despacho por encomienda..."
                  value={newSupNotes}
                  onChange={(e) => setNewSupNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-300 text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsNewSupplierModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newSupName.trim()}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
