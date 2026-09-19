"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  Wrench,
  Check,
  ShoppingCart,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Flame,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useCommerce } from "@/components/commerce/commerce-provider";
import type { Product } from "@/lib/types";

interface SmartBuyerAdvisorProps {
  products: Product[];
}

export function SmartBuyerAdvisor({ products }: SmartBuyerAdvisorProps) {
  const { addToCart, setCartOpen } = useCommerce();
  const [activeTab, setActiveTab] = useState<"kbeauty" | "tools">("kbeauty");

  // K-Beauty State
  const [skinType, setSkinType] = useState<string>("oily");
  const [skinGoal, setSkinGoal] = useState<string>("pores");
  const [kbeautyAdded, setKbeautyAdded] = useState(false);

  // Tools State
  const [toolProfile, setToolProfile] = useState<string>("professional");
  const [toolPower, setToolPower] = useState<string>("cordless");
  const [toolAdded, setToolAdded] = useState(false);

  // Helper to match catalog products
  const findProduct = (terms: string[]): Product => {
    for (const term of terms) {
      const q = term.toLowerCase();
      const match = products.find(
        (p) => p.title.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q)
      );
      if (match) return match;
    }
    return products[0];
  };

  // K-Beauty recommendations matrix
  const getKBeautyRoutine = () => {
    if (skinType === "oily" || skinGoal === "pores") {
      return {
        title: "Rutina Anti-Poros & Control de Sebo Glass Skin",
        description: "Equilibra la producción de grasa, limpia profundamente los poros dilatados y calma la textura de la piel.",
        products: [
          findProduct(["medicube zero pore pad", "medicube", "centella"]),
          findProduct(["centella ampoule", "skin1004 madagascar", "serum"]),
          findProduct(["dr althea 345", "crema", "celimax"]),
        ],
      };
    }
    if (skinType === "spots" || skinGoal === "glow") {
      return {
        title: "Rutina Antimanchas & Glow Coreano Iluminador",
        description: "Aclara el tono desigual, disminuye marcas post-acné y aporta luminosidad natural con Centella y Ácido Hialurónico.",
        products: [
          findProduct(["centella ampoule", "skin1004", "serum"]),
          findProduct(["hyalu-cica", "sun serum", "centella"]),
          findProduct(["dr althea", "crema", "medicube"]),
        ],
      };
    }
    // Default dry / barrier repair
    return {
      title: "Rutina Reparadora de Barrera & Ultra Hidratación",
      description: "Recupera la barrera cutánea dañada por ácidos o factores climáticos, devolviendo suavidad y elasticidad inmediata.",
      products: [
        findProduct(["centella ampoule", "skin1004"]),
        findProduct(["celimax", "dual barrier", "dr althea"]),
        findProduct(["hyalu-cica", "sun serum", "crema"]),
      ],
    };
  };

  // Tools recommendations matrix
  const getToolsCombo = () => {
    if (toolProfile === "construction" || toolPower === "corded") {
      return {
        title: "Combo Obra & Taller Pesado 220V Total Tools",
        description: "Potencia bruta para corte de metales, demolición y perforación en hormigón sin interrupciones.",
        products: [
          findProduct(["amoladora angular 850w", "amoladora", "herramientas"]),
          findProduct(["taladro percutor", "taladro", "percutor"]),
          findProduct(["caja de herramientas", "valija", "destornilladores"]),
        ],
      };
    }
    return {
      title: "Combo Profesional Inalámbrico 20V Total Share",
      description: "Libertad de movimiento con baterías intercambiables de 20V de alta durabilidad para montajes y carpintería.",
      products: [
        findProduct(["taladro percutor 20v", "taladro", "herramientas"]),
        findProduct(["set destornilladores", "puntas", "wadfow"]),
        findProduct(["caja", "maletin", "amoladora"]),
      ],
    };
  };

  const kbeautyRoutine = getKBeautyRoutine();
  const kbeautyTotalPrice = kbeautyRoutine.products.reduce((acc, p) => acc + (p?.retailPrice || 0), 0);
  const kbeautyComboPrice = Math.round(kbeautyTotalPrice * 0.9); // 10% combo discount

  const toolsCombo = getToolsCombo();
  const toolsTotalPrice = toolsCombo.products.reduce((acc, p) => acc + (p?.retailPrice || 0), 0);
  const toolsComboPrice = Math.round(toolsTotalPrice * 0.9);

  const handleAddKBeautyRoutine = () => {
    kbeautyRoutine.products.forEach((prod) => {
      if (prod) addToCart(prod, "retail", 1);
    });
    setKbeautyAdded(true);
    setCartOpen(true);
    setTimeout(() => setKbeautyAdded(false), 3000);
  };

  const handleAddToolsCombo = () => {
    toolsCombo.products.forEach((prod) => {
      if (prod) addToCart(prod, "retail", 1);
    });
    setToolAdded(true);
    setCartOpen(true);
    setTimeout(() => setToolAdded(false), 3000);
  };

  return (
    <section className="py-12 sm:py-16 bg-white border-b border-zinc-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            Asesor Inteligente de Compra
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-zinc-950">
            ¿No sabés qué producto elegir? Te lo resolvemos en 2 pasos
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-zinc-600 leading-relaxed">
            Elegí tu categoría y respondé 2 preguntas rápidas. Te armamos el combo exacto con un <strong>10% de descuento especial</strong>.
          </p>

          {/* Category Switcher Tabs */}
          <div className="mt-6 inline-flex rounded-2xl bg-zinc-100 p-1.5 border border-zinc-200">
            <button
              type="button"
              onClick={() => setActiveTab("kbeauty")}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === "kbeauty"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              <Sparkles className="h-4 w-4 text-pink-500" />
              Diagnóstico Facial K-Beauty
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tools")}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === "tools"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              <Wrench className="h-4 w-4 text-emerald-600" />
              Selector de Herramientas Total Tools
            </button>
          </div>
        </div>

        {/* Tab 1: K-Beauty Interactive Quiz */}
        {activeTab === "kbeauty" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
            {/* Questions (Left 6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Question 1: Skin Type */}
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-6 space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-pink-600 block">
                  Paso 1: ¿Cuál es tu tipo de piel?
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "oily", label: "Grasa o Mixta", sub: "Brillo en zona T y poros visibles" },
                    { id: "dry", label: "Seca o Sensible", sub: "Tirantez, descamación y rojez" },
                    { id: "spots", label: "Con Manchas o Acné", sub: "Marcas oscuras y textura irregular" },
                    { id: "mature", label: "Madura / Primeras Líneas", sub: "Pérdida de firmeza y elasticidad" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSkinType(item.id)}
                      className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                        skinType === item.id
                          ? "bg-zinc-950 text-white border-zinc-950 shadow-md"
                          : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                      }`}
                    >
                      <span className="text-xs font-bold block">{item.label}</span>
                      <span className={`text-[10px] block mt-0.5 ${skinType === item.id ? "text-zinc-300" : "text-zinc-500"}`}>
                        {item.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: Goal */}
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-6 space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-pink-600 block">
                  Paso 2: ¿Cuál es tu objetivo principal?
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "pores", label: "Limpieza & Poros", sub: "Minimizar puntos negros y grasitud" },
                    { id: "glow", label: "Glass Skin & Brillo", sub: "Tono parejo y luminosidad coreana" },
                    { id: "barrier", label: "Calma & Reparación", sub: "Aliviar rojeces y proteger barrera" },
                    { id: "hydrate", label: "Hidratación Profunda", sub: "Piel suave y jugosa todo el día" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSkinGoal(item.id)}
                      className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                        skinGoal === item.id
                          ? "bg-zinc-950 text-white border-zinc-950 shadow-md"
                          : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                      }`}
                    >
                      <span className="text-xs font-bold block">{item.label}</span>
                      <span className={`text-[10px] block mt-0.5 ${skinGoal === item.id ? "text-zinc-300" : "text-zinc-500"}`}>
                        {item.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendation Card (Right 6 cols) */}
            <div className="lg:col-span-6 rounded-3xl border-2 border-pink-500/40 bg-gradient-to-br from-pink-50/40 via-white to-amber-50/30 p-6 sm:p-8 shadow-lg space-y-6">
              <div className="flex items-center justify-between border-b border-pink-100 pb-4">
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-pink-600 bg-pink-100 px-2.5 py-0.5 rounded-full">
                    <Sparkles className="h-3 w-3" /> Rutina Personalizada Recomendada
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-zinc-950 mt-1.5">
                    {kbeautyRoutine.title}
                  </h3>
                </div>
                <span className="text-xs font-black text-pink-700 bg-pink-100/80 px-2.5 py-1 rounded-xl">
                  -10% COMBO
                </span>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed">
                {kbeautyRoutine.description}
              </p>

              {/* Steps list */}
              <div className="space-y-3">
                {kbeautyRoutine.products.map((prod, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-white border border-zinc-200 shadow-xs"
                  >
                    <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-zinc-100">
                      {prod?.imageUrl ? (
                        <Image src={prod.imageUrl} alt={prod.title} fill className="object-cover" />
                      ) : (
                        <Sparkles className="h-6 w-6 m-auto text-pink-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block">
                        Paso {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-zinc-900 truncate">{prod?.title || "Producto K-Beauty"}</h4>
                      <span className="text-[11px] text-zinc-500">{formatCurrency(prod?.retailPrice || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price & Action */}
              <div className="border-t border-pink-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-zinc-400 line-through block">
                    Precio Regular: {formatCurrency(kbeautyTotalPrice)}
                  </span>
                  <div className="text-2xl font-black text-zinc-950">
                    {formatCurrency(kbeautyComboPrice)}
                    <span className="text-xs font-bold text-emerald-600 ml-2">Ahorrás {formatCurrency(kbeautyTotalPrice - kbeautyComboPrice)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddKBeautyRoutine}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {kbeautyAdded ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-white" />
                      ¡Rutina Agregada al Carrito!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      Llevar Rutina Completa
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Total Tools Interactive Selector */}
        {activeTab === "tools" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
            {/* Questions (Left 6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Question 1: Profile */}
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-6 space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 block">
                  Paso 1: ¿Para qué tipo de trabajo las necesitás?
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: "home", label: "Hogar & Hobbista", sub: "Arreglos y mantenimiento" },
                    { id: "professional", label: "Taller & Profesional", sub: "Mecánica e instalaciones" },
                    { id: "construction", label: "Obra & Pesado", sub: "Construcción continua" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setToolProfile(item.id)}
                      className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                        toolProfile === item.id
                          ? "bg-zinc-950 text-white border-zinc-950 shadow-md"
                          : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                      }`}
                    >
                      <span className="text-xs font-bold block">{item.label}</span>
                      <span className={`text-[10px] block mt-0.5 ${toolProfile === item.id ? "text-zinc-300" : "text-zinc-500"}`}>
                        {item.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: Power */}
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-6 space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 block">
                  Paso 2: ¿Qué tipo de tecnología preferís?
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "cordless", label: "Inalámbrico 20V (Batería)", sub: "Libertad total de movimiento, misma batería para todo" },
                    { id: "corded", label: "Con Cable 220V", sub: "Máxima potencia continua sin pausas para recargar" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setToolPower(item.id)}
                      className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                        toolPower === item.id
                          ? "bg-zinc-950 text-white border-zinc-950 shadow-md"
                          : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                      }`}
                    >
                      <span className="text-xs font-bold block">{item.label}</span>
                      <span className={`text-[10px] block mt-0.5 ${toolPower === item.id ? "text-zinc-300" : "text-zinc-500"}`}>
                        {item.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendation Card (Right 6 cols) */}
            <div className="lg:col-span-6 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/40 via-white to-zinc-50 p-6 sm:p-8 shadow-lg space-y-6">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    <Wrench className="h-3 w-3" /> Selección Recomendada Total Tools
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-zinc-950 mt-1.5">
                    {toolsCombo.title}
                  </h3>
                </div>
                <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-xl">
                  -10% COMBO
                </span>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed">
                {toolsCombo.description}
              </p>

              {/* Tools Items list */}
              <div className="space-y-3">
                {toolsCombo.products.map((prod, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-white border border-zinc-200 shadow-xs"
                  >
                    <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-zinc-100">
                      {prod?.imageUrl ? (
                        <Image src={prod.imageUrl} alt={prod.title} fill className="object-cover" />
                      ) : (
                        <Wrench className="h-6 w-6 m-auto text-emerald-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Componente {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-zinc-900 truncate">{prod?.title || "Herramienta Total Tools"}</h4>
                      <span className="text-[11px] text-zinc-500">{formatCurrency(prod?.retailPrice || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price & Action */}
              <div className="border-t border-emerald-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-zinc-400 line-through block">
                    Precio Regular: {formatCurrency(toolsTotalPrice)}
                  </span>
                  <div className="text-2xl font-black text-zinc-950">
                    {formatCurrency(toolsComboPrice)}
                    <span className="text-xs font-bold text-emerald-600 ml-2">Ahorrás {formatCurrency(toolsTotalPrice - toolsComboPrice)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddToolsCombo}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {toolAdded ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-white" />
                      ¡Combo Agregado al Carrito!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      Llevar Combo Completo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
