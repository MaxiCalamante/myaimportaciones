"use client";

import { useState, useTransition, useMemo } from "react";
import {
  PackagePlus,
  X,
  ExternalLink,
  DollarSign,
  Layers,
  Sparkles,
  UploadCloud,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  TrendingUp,
  Percent,
  ShieldCheck,
  Boxes,
  Tag,
  FileText,
  Eye,
} from "lucide-react";
import type { Category, PaymentMethod } from "@/lib/types";
import { createProductAction } from "@/app/admin/actions";
import { formatCurrency } from "@/lib/format";

interface CreateProductModalProps {
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onProductCreated?: () => void;
}

export function CreateProductModal({
  categories,
  isOpen,
  onClose,
  onProductCreated,
}: CreateProductModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  // Main navigation tabs
  const [activeSection, setActiveSection] = useState<
    "general" | "supplier" | "pricing" | "media_stock" | "details"
  >("general");

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [sku, setSku] = useState("");

  // Supplier & Fulfillment
  const [sourceUrl, setSourceUrl] = useState("");
  const [supplierLivePrice, setSupplierLivePrice] = useState<number | "">("");
  const [fulfillmentMode, setFulfillmentMode] = useState<"supplier" | "own_stock">("supplier");
  const [supplierAvailable, setSupplierAvailable] = useState(true);

  // Pricing
  const [retailPrice, setRetailPrice] = useState<number | "">("");
  const [wholesalePrice, setWholesalePrice] = useState<number | "">("");
  const [wholesaleMinQty, setWholesaleMinQty] = useState<number>(3);

  // Stock & Logistics
  const [stock, setStock] = useState<number>(0);
  const [weightKg, setWeightKg] = useState<string>("");

  // Media
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");

  // Details & Specs
  const [description, setDescription] = useState("");
  const [warrantyTerms, setWarrantyTerms] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([
    { key: "Origen", value: "" },
  ]);

  // Flags
  const [isFeatured, setIsFeatured] = useState(false);
  const [isWholesaleOnly, setIsWholesaleOnly] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<PaymentMethod[]>([
    "transferencia",
    "tarjeta",
    "mercado_pago",
  ]);

  // Categories hierarchy
  const mainCategories = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const subcategories = useMemo(() => {
    if (!selectedParentId) return [];
    return categories.filter((c) => c.parentId === selectedParentId);
  }, [categories, selectedParentId]);

  // Auto-slug generator
  const autoSlug = useMemo(() => {
    if (slug) return slug;
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }, [title, slug]);

  // Margin and profit calculation
  const marginStats = useMemo(() => {
    const cost = Number(supplierLivePrice) || 0;
    const retail = Number(retailPrice) || 0;
    const wholesale = Number(wholesalePrice) || 0;

    let retailGrossMargin = 0;
    let retailGrossProfit = 0;
    if (retail > 0 && cost > 0) {
      retailGrossProfit = retail - cost;
      retailGrossMargin = Math.round((retailGrossProfit / retail) * 100);
    }

    let wholesaleGrossMargin = 0;
    let wholesaleGrossProfit = 0;
    if (wholesale > 0 && cost > 0) {
      wholesaleGrossProfit = wholesale - cost;
      wholesaleGrossMargin = Math.round((wholesaleGrossProfit / wholesale) * 100);
    }

    let wholesaleDiscount = 0;
    if (retail > 0 && wholesale > 0) {
      wholesaleDiscount = Math.round(((retail - wholesale) / retail) * 100);
    }

    return {
      cost,
      retail,
      wholesale,
      retailGrossProfit,
      retailGrossMargin,
      wholesaleGrossProfit,
      wholesaleGrossMargin,
      wholesaleDiscount,
    };
  }, [supplierLivePrice, retailPrice, wholesalePrice]);

  if (!isOpen) return null;

  // Handle local file selection with preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
  };

  // Quick tag suggestion handler
  const handleAddTag = (t: string) => {
    const clean = t.trim().toLowerCase();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  // Specs handlers
  const handleAddSpecRow = () => {
    setSpecs([...specs, { key: "", value: "" }]);
  };

  const handleUpdateSpec = (idx: number, field: "key" | "value", val: string) => {
    const next = [...specs];
    next[idx][field] = val;
    setSpecs(next);
  };

  const handleRemoveSpec = (idx: number) => {
    setSpecs(specs.filter((_, i) => i !== idx));
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    if (!title.trim()) {
      setErrorMessage("Por favor ingresá el título del producto.");
      setActiveSection("general");
      return;
    }

    if (!selectedParentId && !selectedSubcategoryId) {
      setErrorMessage("Por favor seleccioná una categoría para el producto.");
      setActiveSection("general");
      return;
    }

    if (!retailPrice || Number(retailPrice) <= 0) {
      setErrorMessage("El precio minorista debe ser mayor a 0.");
      setActiveSection("pricing");
      return;
    }

    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("slug", autoSlug);
    formData.set("category_id", selectedParentId);
    if (selectedSubcategoryId) {
      formData.set("subcategory_id", selectedSubcategoryId);
    }
    if (brand.trim()) formData.set("brand", brand.trim());
    if (model.trim()) formData.set("model", model.trim());
    if (sku.trim()) formData.set("sku", sku.trim());

    // Supplier
    if (sourceUrl.trim()) formData.set("source_url", sourceUrl.trim());
    if (supplierLivePrice !== "") formData.set("supplier_live_price", String(supplierLivePrice));
    formData.set("fulfillment_mode", fulfillmentMode);
    formData.set("supplier_available_present", "true");
    if (supplierAvailable) formData.set("supplier_available", "on");

    // Pricing
    formData.set("retail_price", String(retailPrice));
    formData.set(
      "wholesale_price",
      String(wholesalePrice !== "" ? wholesalePrice : Math.round(Number(retailPrice) * 0.75))
    );
    formData.set("wholesale_min_qty", String(wholesaleMinQty || 1));

    // Stock & Logistics
    formData.set("stock", String(stock || 0));

    // Media
    if (imageFile) {
      formData.set("image", imageFile);
    } else if (customImageUrl.trim()) {
      formData.set("custom_image_url", customImageUrl.trim());
    }

    // Details & Specs
    formData.set("description", description.trim());
    if (warrantyTerms.trim()) formData.set("warranty_terms", warrantyTerms.trim());

    // Serialize specs
    const specsObj: Record<string, string> = {};
    if (weightKg.trim()) specsObj["peso_kg"] = weightKg.trim();
    for (const item of specs) {
      if (item.key.trim() && item.value.trim()) {
        specsObj[item.key.trim()] = item.value.trim();
      }
    }
    if (Object.keys(specsObj).length > 0) {
      formData.set("specifications", JSON.stringify(specsObj));
    }

    // Tags
    const finalTags = [...tags];
    if (stock > 0 && !finalTags.includes("en_stock")) {
      finalTags.push("en_stock");
    }
    formData.set("tags", finalTags.join(","));

    // Payment methods
    for (const pm of selectedPaymentMethods) {
      formData.append("payment_methods", pm);
    }

    // Flags
    formData.set("is_active_present", "true");
    if (isActive) formData.set("is_active", "on");
    if (isFeatured) formData.set("is_featured", "on");
    if (isWholesaleOnly) formData.set("is_wholesale_only", "on");

    startTransition(async () => {
      try {
        await createProductAction(formData);
        if (onProductCreated) onProductCreated();
        onClose();
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : "Error inesperado al crear el producto."
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-zinc-200 shadow-2xl overflow-hidden">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 bg-gradient-to-r from-emerald-50/70 via-white to-zinc-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <PackagePlus className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-zinc-950 tracking-tight flex items-center gap-2">
                Publicar Nuevo Producto
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                  Control Total
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Carga completa con enlace a proveedor, rentabilidad y ficha técnica.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ERROR ALERT */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SECTION NAVIGATION PILLS */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-zinc-200 bg-zinc-50/70 px-6 py-2.5 scrollbar-none shrink-0">
          {[
            { id: "general", label: "1. Datos Básicos", icon: Layers },
            { id: "supplier", label: "2. Proveedor & Costo", icon: ExternalLink },
            { id: "pricing", label: "3. Precios & Margen", icon: DollarSign },
            { id: "media_stock", label: "4. Imagen & Stock", icon: UploadCloud },
            { id: "details", label: "5. Ficha & Publicación", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as typeof activeSection)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* FORM & SCROLLABLE BODY */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ============================================================== */}
            {/* TAB 1: DATOS BÁSICOS */}
            {/* ============================================================== */}
            {activeSection === "general" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-600" /> Identificación y Categoría
                  </h3>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-700">
                      Título del Producto <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej. Taladro Percutor Inalámbrico 20V Total Tools con 2 Baterías"
                      className="w-full h-11 rounded-xl border border-zinc-300 bg-white px-3.5 text-sm font-medium text-zinc-950 placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                    />
                    {title && (
                      <p className="text-[11px] text-zinc-500 font-mono">
                        URL pública: <span className="text-emerald-700 font-semibold">/producto/{autoSlug}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700">
                        Categoría Principal <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={selectedParentId}
                        onChange={(e) => {
                          setSelectedParentId(e.target.value);
                          setSelectedSubcategoryId("");
                        }}
                        className="w-full h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-950 focus:border-emerald-600 outline-none cursor-pointer"
                      >
                        <option value="">Elegí una categoría...</option>
                        {mainCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700">
                        Subcategoría (Opcional)
                      </label>
                      <select
                        value={selectedSubcategoryId}
                        onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                        disabled={!selectedParentId || subcategories.length === 0}
                        className="w-full h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-950 focus:border-emerald-600 outline-none cursor-pointer disabled:bg-zinc-100 disabled:text-zinc-400"
                      >
                        <option value="">
                          {subcategories.length === 0
                            ? "Sin subcategorías disponibles"
                            : "Ninguna (Categoría principal directa)"}
                        </option>
                        {subcategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" /> Marca, Modelo y Código SKU
                  </h3>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700">Marca</label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Ej. Total, Wadfow, Medicube"
                        className="w-full h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium focus:border-emerald-600 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700">Modelo</label>
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Ej. TIDLI20012, K-Zero 100"
                        className="w-full h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium focus:border-emerald-600 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700">Código SKU / Código Barra</label>
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="Ej. TOT-20V-001"
                        className="w-full h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium focus:border-emerald-600 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: PROVEEDOR Y COSTO */}
            {/* ============================================================== */}
            {activeSection === "supplier" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-sky-950 flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-sky-700" /> Enlace Directo al Proveedor (Atajo Rápido)
                      </h3>
                      <p className="text-xs text-sky-800 mt-1">
                        Pegá aquí la URL exacta de la página de tu mayorista (Total Tools, Atacado USA, etc.). Te permitirá abrir el producto con un solo clic para verificar precio y stock en segundos.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-700">URL del Proveedor</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="https://www.totalherramientasoficial.com.py/producto/... o https://atacadousa.com.py/..."
                        className="flex-1 h-11 rounded-xl border border-zinc-300 bg-white px-3.5 text-sm font-medium focus:border-emerald-600 outline-none"
                      />
                      {sourceUrl && (
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-sky-600 px-4 text-xs font-bold text-white hover:bg-sky-700 transition-colors shadow-xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Probar enlace
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700">
                        Precio de Costo / Proveedor ($ ARS)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={supplierLivePrice}
                          onChange={(e) =>
                            setSupplierLivePrice(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          placeholder="Ej. 45000"
                          className="w-full h-11 rounded-xl border border-zinc-300 bg-white pl-8 pr-3 text-sm font-bold text-zinc-900 focus:border-emerald-600 outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Costo de compra en mayorista para calcular márgenes y rentabilidad.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700">
                        Modalidad de Fulfillment
                      </label>
                      <select
                        value={fulfillmentMode}
                        onChange={(e) =>
                          setFulfillmentMode(e.target.value as "supplier" | "own_stock")
                        }
                        className="w-full h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-900 focus:border-emerald-600 outline-none cursor-pointer"
                      >
                        <option value="supplier">
                          📦 Proveedor / Bajo Pedido (Envío directo desde mayorista)
                        </option>
                        <option value="own_stock">
                          🏢 Stock Físico Propio (En depósito para entrega inmediata)
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-sky-200 bg-white p-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-zinc-900 block">
                        Disponibilidad Inicial en Mayorista
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        Marcá si el producto está disponible hoy en la web del mayorista.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={supplierAvailable}
                        onChange={(e) => setSupplierAvailable(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      <span className="ml-2 text-xs font-bold text-zinc-700">
                        {supplierAvailable ? "Disponible" : "Agotado"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: PRECIOS Y MARGEN */}
            {/* ============================================================== */}
            {activeSection === "pricing" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" /> Estructura de Precios
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700">
                        Precio Minorista ($ ARS) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                          $
                        </span>
                        <input
                          type="number"
                          required
                          min="1"
                          step="1"
                          value={retailPrice}
                          onChange={(e) =>
                            setRetailPrice(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          placeholder="Ej. 85000"
                          className="w-full h-11 rounded-xl border border-zinc-300 bg-white pl-8 pr-3 text-base font-extrabold text-zinc-950 focus:border-emerald-600 outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500">Precio público al consumidor.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700">
                        Precio Mayorista ($ ARS)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={wholesalePrice}
                          onChange={(e) =>
                            setWholesalePrice(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          placeholder={
                            retailPrice ? String(Math.round(Number(retailPrice) * 0.75)) : "Ej. 65000"
                          }
                          className="w-full h-11 rounded-xl border border-zinc-300 bg-white pl-8 pr-3 text-base font-extrabold text-zinc-950 focus:border-emerald-600 outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500">Sugerido: 25% desc. sobre minorista.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700">
                        Mínimo Mayorista (Unidades)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={wholesaleMinQty}
                        onChange={(e) => setWholesaleMinQty(Math.max(1, Number(e.target.value)))}
                        className="w-full h-11 rounded-xl border border-zinc-300 bg-white px-3 text-base font-extrabold text-zinc-950 text-center focus:border-emerald-600 outline-none"
                      />
                      <p className="text-[11px] text-zinc-500">Unidades mínimas para tarifa B2B.</p>
                    </div>
                  </div>
                </div>

                {/* SIMULADOR DE RENTABILIDAD EN VIVO */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-emerald-700" /> Simulador de Margen en Tiempo Real
                    </h4>
                    {marginStats.cost > 0 && (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                        Costo base: {formatCurrency(marginStats.cost)}
                      </span>
                    )}
                  </div>

                  {marginStats.cost > 0 && marginStats.retail > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-emerald-200 bg-white p-3">
                        <span className="text-[11px] font-semibold text-zinc-500 block">
                          Venta Minorista
                        </span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-lg font-extrabold text-zinc-950">
                            {formatCurrency(marginStats.retailGrossProfit)}
                          </span>
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded-md ${
                              marginStats.retailGrossMargin >= 30
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            +{marginStats.retailGrossMargin}% margen
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">
                          Ganancia bruta por unidad vendida
                        </span>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-white p-3">
                        <span className="text-[11px] font-semibold text-zinc-500 block">
                          Venta Mayorista (Pack x{wholesaleMinQty})
                        </span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-lg font-extrabold text-zinc-950">
                            {formatCurrency(
                              marginStats.wholesaleGrossProfit * (wholesaleMinQty || 1)
                            )}
                          </span>
                          <span className="text-xs font-black px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
                            +{marginStats.wholesaleGrossMargin}% margen
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">
                          Ganancia bruta por lote mayorista ({marginStats.wholesaleDiscount}% desc.)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-800 italic">
                      Ingresá el costo de proveedor en la pestaña anterior y el precio minorista para ver los márgenes automáticos.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: IMAGEN Y STOCK */}
            {/* ============================================================== */}
            {activeSection === "media_stock" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* IMAGEN Y MULTIMEDIA */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <UploadCloud className="h-4 w-4 text-emerald-600" /> Imagen del Producto
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-700">
                          Opción A: Pegar URL de Imagen Directa
                        </label>
                        <input
                          type="url"
                          value={customImageUrl}
                          onChange={(e) => {
                            setCustomImageUrl(e.target.value);
                            if (e.target.value) {
                              setImageFile(null);
                              setImagePreviewUrl(e.target.value);
                            }
                          }}
                          placeholder="https://imagenes.../producto.jpg"
                          className="w-full h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium focus:border-emerald-600 outline-none"
                        />
                        <p className="text-[11px] text-zinc-500">
                          Ideal si copiaste el link de imagen del proveedor.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-700">
                          Opción B: Subir Archivo desde tu Dispositivo
                        </label>
                        <label className="flex flex-col items-center justify-center h-28 rounded-2xl border-2 border-dashed border-zinc-300 bg-white hover:bg-zinc-50 hover:border-emerald-500 transition-all cursor-pointer p-4 text-center">
                          <UploadCloud className="h-6 w-6 text-zinc-400 mb-1" />
                          <span className="text-xs font-bold text-zinc-700">
                            Elegir foto o arrastrar aquí
                          </span>
                          <span className="text-[10px] text-zinc-400">PNG, JPG, WEBP hasta 5MB</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* LIVE IMAGE PREVIEW */}
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-3 min-h-[160px]">
                      {imagePreviewUrl ? (
                        <div className="relative group w-full h-full flex items-center justify-center">
                          <img
                            src={imagePreviewUrl}
                            alt="Vista previa"
                            className="max-h-44 w-auto rounded-xl object-contain shadow-xs border border-zinc-100"
                            onError={() => setImagePreviewUrl("")}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreviewUrl("");
                              setCustomImageUrl("");
                              setImageFile(null);
                            }}
                            className="absolute top-1 right-1 rounded-full bg-red-600 p-1.5 text-white shadow-md hover:bg-red-700 transition-colors"
                            title="Quitar imagen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-zinc-400 py-6">
                          <Eye className="h-8 w-8 mx-auto mb-1 text-zinc-300" />
                          <span className="text-xs font-semibold">Vista previa de imagen</span>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            Cargá una URL o subí un archivo para previsualizarlo
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* INVENTARIO Y STOCK */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-emerald-600" /> Inventario & Logística
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700">
                        Stock Físico Propio Inicial (Unidades)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={stock}
                        onChange={(e) => setStock(Math.max(0, Number(e.target.value)))}
                        className="w-full h-11 rounded-xl border border-zinc-300 bg-white px-3 text-base font-extrabold text-zinc-950 focus:border-emerald-600 outline-none"
                      />
                      <p className="text-[11px] text-zinc-500">
                        Si es 0 y está en modo proveedor, se venderá a pedido sin bloquearse.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700">
                        Peso Estimado por Unidad (kg)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        placeholder="Ej. 1.85"
                        className="w-full h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium focus:border-emerald-600 outline-none"
                      />
                      <p className="text-[11px] text-zinc-500">
                        Utilizado para cotizaciones automáticas de flete y envíos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 5: FICHA Y PUBLICACIÓN */}
            {/* ============================================================== */}
            {activeSection === "details" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* DESCRIPCIÓN & GARANTÍA */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" /> Descripción y Términos
                  </h3>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-700">
                      Descripción Detallada del Producto
                    </label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Características principales, qué incluye la caja, especificaciones de voltaje, rendimiento, usos recomendados..."
                      className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm font-normal text-zinc-900 focus:border-emerald-600 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-700">
                      Condiciones de Garantía
                    </label>
                    <input
                      type="text"
                      value={warrantyTerms}
                      onChange={(e) => setWarrantyTerms(e.target.value)}
                      placeholder="Ej. 12 meses oficial Total Tools. 30 días cambio directo por falla de fábrica."
                      className="w-full h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium focus:border-emerald-600 outline-none"
                    />
                  </div>
                </div>

                {/* ESPECIFICACIONES TÉCNICAS (KEY-VALUE) */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                        <Tag className="h-4 w-4 text-emerald-600" /> Especificaciones Técnicas
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        Atributos técnicos para la tabla de la página del producto.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSpecRow}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Agregar fila
                    </button>
                  </div>

                  <div className="space-y-2">
                    {specs.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.key}
                          onChange={(e) => handleUpdateSpec(idx, "key", e.target.value)}
                          placeholder="Propiedad (ej. Potencia)"
                          className="w-1/3 h-10 rounded-xl border border-zinc-300 bg-white px-3 text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={item.value}
                          onChange={(e) => handleUpdateSpec(idx, "value", e.target.value)}
                          placeholder="Valor (ej. 850W / 220V)"
                          className="flex-1 h-10 rounded-xl border border-zinc-300 bg-white px-3 text-xs font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSpec(idx)}
                          className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ETIQUETAS / TAGS */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-emerald-600" /> Etiquetas / Tags de Búsqueda
                  </h3>

                  <div className="flex flex-wrap gap-1.5">
                    {["en_stock", "oferta", "nuevo", "destacado", "herramientas", "k-beauty", "combo", "profesional"].map(
                      (preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleAddTag(preset)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
                            tags.includes(preset)
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                          }`}
                        >
                          +{preset}
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag(tagInput);
                        }
                      }}
                      placeholder="Escribí una etiqueta y presioná Enter..."
                      className="flex-1 h-10 rounded-xl border border-zinc-300 bg-white px-3 text-xs font-medium focus:border-emerald-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(tagInput)}
                      className="h-10 rounded-xl bg-zinc-900 px-4 text-xs font-bold text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Agregar
                    </button>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-900 border border-emerald-200"
                        >
                          {t}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            className="hover:text-red-600 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* SWITCHES DE PUBLICACIÓN */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 grid gap-4 sm:grid-cols-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-900 block">Activo en Tienda</span>
                      <span className="text-[10px] text-zinc-500">Visible para compradores</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-900 block">Destacado</span>
                      <span className="text-[10px] text-zinc-500">Aparece en portada</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isWholesaleOnly}
                      onChange={(e) => setIsWholesaleOnly(e.target.checked)}
                      className="h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-900 block">Solo Mayoristas</span>
                      <span className="text-[10px] text-zinc-500">Oculto a público minorista</span>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* STICKY FOOTER */}
          <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50/90 px-6 py-4 shrink-0">
            <div className="text-xs text-zinc-500 font-medium hidden sm:block">
              {title ? (
                <span>
                  Creando: <strong className="text-zinc-900">{title}</strong>
                </span>
              ) : (
                <span>Completá los campos requeridos para publicar</span>
              )}
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-xl px-5 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-200/70 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Publicando producto...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Publicar en Catálogo
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
