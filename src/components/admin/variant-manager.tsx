"use client";

import { useState } from "react";
import { Plus, Trash2, Copy, Sparkles, CheckSquare, Square, Layers, Image as ImageIcon } from "lucide-react";
import type { ProductOptionDimension } from "@/lib/types";
import { generateCombinations, type VariantFormInput } from "@/lib/admin-variants";

interface VariantManagerProps {
  hasVariants: boolean;
  setHasVariants: (val: boolean) => void;
  optionsConfig: ProductOptionDimension[];
  setOptionsConfig: React.Dispatch<React.SetStateAction<ProductOptionDimension[]>>;
  variants: VariantFormInput[];
  setVariants: React.Dispatch<React.SetStateAction<VariantFormInput[]>>;
  galleryUrls: string[];
  basePrice: number;
  baseFulfillmentMode: "own_stock" | "supplier";
  baseSupplierAvailable: boolean;
  disabled?: boolean;
}

export function VariantManager({
  hasVariants,
  setHasVariants,
  optionsConfig,
  setOptionsConfig,
  variants,
  setVariants,
  galleryUrls,
  basePrice,
  baseFulfillmentMode,
  baseSupplierAvailable,
  disabled = false,
}: VariantManagerProps) {
  const [newDimName, setNewDimName] = useState("");
  const [tagInputs, setTagInputs] = useState<Record<number, string>>({});
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Quick preset dimensions
  const PRESET_OPTIONS = ["Fragancia / Aroma", "Talle", "Color", "Potencia", "Capacidad / Volumen", "Presentación"];

  const handleAddDimension = (nameToAdd?: string) => {
    const name = (nameToAdd ?? newDimName).trim();
    if (!name) return;
    if (optionsConfig.length >= 3) return;
    if (optionsConfig.some(d => d.name.toLowerCase() === name.toLowerCase())) return;

    setOptionsConfig(current => [...current, { name, values: [] }]);
    setNewDimName("");
  };

  const handleRemoveDimension = (index: number) => {
    setOptionsConfig(current => current.filter((_, i) => i !== index));
  };

  const handleAddValue = (dimIndex: number) => {
    const val = (tagInputs[dimIndex] ?? "").trim();
    if (!val) return;
    setOptionsConfig(current => current.map((dim, i) => {
      if (i !== dimIndex) return dim;
      if (dim.values.includes(val)) return dim;
      return { ...dim, values: [...dim.values, val] };
    }));
    setTagInputs(current => ({ ...current, [dimIndex]: "" }));
  };

  const handleRemoveValue = (dimIndex: number, valIndex: number) => {
    setOptionsConfig(current => current.map((dim, i) => {
      if (i !== dimIndex) return dim;
      return { ...dim, values: dim.values.filter((_, vi) => vi !== valIndex) };
    }));
  };

  const handleGenerateCombinations = () => {
    if (!optionsConfig.length || optionsConfig.some(d => !d.values.length)) return;
    const combs = generateCombinations(optionsConfig);

    // Merge or replace
    const newVariants: VariantFormInput[] = combs.map((c, idx) => {
      const existing = variants.find(v => {
        const keysA = Object.keys(v.options).sort();
        const keysB = Object.keys(c.options).sort();
        if (keysA.length !== keysB.length) return false;
        return keysA.every(k => v.options[k] === c.options[k]);
      });

      if (existing) {
        return { ...existing, displayOrder: idx };
      }

      return {
        title: c.title,
        retailPrice: basePrice > 0 ? basePrice : 0,
        stock: 0,
        fulfillmentMode: baseFulfillmentMode,
        supplierAvailable: baseSupplierAvailable,
        isActive: true,
        options: c.options,
        displayOrder: idx,
      };
    });

    setVariants(newVariants);
    setSelectedIndices(new Set());
  };

  const handleApplyBulkPrice = () => {
    const num = Number(bulkPrice);
    if (!Number.isFinite(num) || num < 0) return;
    setVariants(current => current.map((v, idx) => {
      if (selectedIndices.size > 0 && !selectedIndices.has(idx)) return v;
      return { ...v, retailPrice: num };
    }));
    setBulkPrice("");
  };

  const handleApplyBulkStock = () => {
    const num = Number(bulkStock);
    if (!Number.isInteger(num) || num < 0) return;
    setVariants(current => current.map((v, idx) => {
      if (selectedIndices.size > 0 && !selectedIndices.has(idx)) return v;
      return { ...v, stock: num };
    }));
    setBulkStock("");
  };

  const handleBulkToggleActive = (active: boolean) => {
    setVariants(current => current.map((v, idx) => {
      if (selectedIndices.size > 0 && !selectedIndices.has(idx)) return v;
      return { ...v, isActive: active };
    }));
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === variants.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(variants.map((_, i) => i)));
    }
  };

  const toggleSelect = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const updateVariantField = <K extends keyof VariantFormInput>(index: number, field: K, val: VariantFormInput[K]) => {
    setVariants(current => current.map((v, i) => i === index ? { ...v, [field]: val } : v));
  };

  const removeVariant = (index: number) => {
    setVariants(current => current.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-xs">
      {/* 4.1 Header & Type Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
            <Layers className="h-5 w-5 text-sky-600" />
            Configuración de Variantes
          </h3>
          <p className="text-xs text-zinc-600">
            Definí si este producto se vende en una única presentación o tiene variantes (aromas, talles, potencias).
          </p>
        </div>

        <div className="flex rounded-xl bg-zinc-100 p-1 border border-zinc-200 self-start sm:self-auto">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setHasVariants(false)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              !hasVariants ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Producto simple
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setHasVariants(true)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              hasVariants ? "bg-sky-600 text-white shadow-xs" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Con variantes
          </button>
        </div>
      </div>

      {!hasVariants ? (
        <div className="rounded-xl bg-zinc-50 border border-dashed border-zinc-200 p-4 text-center">
          <p className="text-xs text-zinc-600">
            Este producto se publica con precio y stock únicos definidos en la ficha general.
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setHasVariants(true);
              if (!optionsConfig.length) {
                setOptionsConfig([{ name: "Fragancia", values: [] }]);
              }
            }}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Habilitar variantes (Fragancias, Talles, etc.)
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 4.2 Constructor de Opciones */}
          <div className="rounded-xl bg-zinc-50/80 border border-zinc-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-zinc-900">
                1. Opciones y Dimensiones ({optionsConfig.length}/3)
              </h4>
              <span className="text-xs text-zinc-500">Hasta 3 dimensiones</span>
            </div>

            {/* Existing Dimensions */}
            <div className="space-y-3">
              {optionsConfig.map((dim, dimIdx) => (
                <div key={dimIdx} className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                      Dimensión {dimIdx + 1}: {dim.name}
                    </span>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleRemoveDimension(dimIdx)}
                      className="text-zinc-400 hover:text-red-600 p-1 rounded-md transition"
                      title="Eliminar dimensión"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Values Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {dim.values.map((val, valIdx) => (
                      <span
                        key={valIdx}
                        className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-800"
                      >
                        {val}
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleRemoveValue(dimIdx, valIdx)}
                          className="text-zinc-400 hover:text-red-600 transition"
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    {/* Input to add tag */}
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        disabled={disabled}
                        value={tagInputs[dimIdx] ?? ""}
                        placeholder={`+ Agregar valor a ${dim.name}`}
                        onChange={e => setTagInputs(current => ({ ...current, [dimIdx]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddValue(dimIdx);
                          }
                        }}
                        className="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-xs text-zinc-900 focus:border-sky-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={disabled || !(tagInputs[dimIdx] ?? "").trim()}
                        onClick={() => handleAddValue(dimIdx)}
                        className="h-8 rounded-lg bg-zinc-200 hover:bg-zinc-300 px-2.5 text-xs font-bold text-zinc-800 transition disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new dimension */}
            {optionsConfig.length < 3 && (
              <div className="space-y-2 pt-1 border-t border-zinc-200/60">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled={disabled}
                    value={newDimName}
                    placeholder="Nombre de dimensión (ej. Fragancia, Potencia, Talle)"
                    onChange={e => setNewDimName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDimension();
                      }
                    }}
                    className="h-9 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:border-sky-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={disabled || !newDimName.trim()}
                    onClick={() => handleAddDimension()}
                    className="h-9 rounded-lg bg-sky-700 hover:bg-sky-800 px-3 text-xs font-bold text-white transition disabled:opacity-40"
                  >
                    + Agregar Dimensión
                  </button>
                </div>

                {/* Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                  <span>Sugerencias rápidas:</span>
                  {PRESET_OPTIONS.filter(p => !optionsConfig.some(d => d.name.toLowerCase().startsWith(p.slice(0, 4).toLowerCase()))).slice(0, 4).map(preset => (
                    <button
                      key={preset}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleAddDimension(preset)}
                      className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 hover:bg-zinc-100 transition text-zinc-700"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Generate button */}
            {optionsConfig.length > 0 && optionsConfig.some(d => d.values.length > 0) && (
              <div className="pt-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={handleGenerateCombinations}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 px-3 py-2 text-xs font-bold transition cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-sky-700" />
                  {variants.length > 0 ? "Actualizar matriz de combinaciones" : "Generar variantes automáticamente"}
                </button>
              </div>
            )}
          </div>

          {/* 4.3 & 4.4 Editor de Variantes y Edición Masiva */}
          {variants.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h4 className="text-sm font-bold text-zinc-900">
                  2. Listado de Variantes ({variants.length})
                </h4>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-950 font-semibold"
                  >
                    {selectedIndices.size === variants.length ? (
                      <CheckSquare className="h-3.5 w-3.5 text-sky-600" />
                    ) : (
                      <Square className="h-3.5 w-3.5" />
                    )}
                    {selectedIndices.size === variants.length ? "Deseleccionar todas" : "Seleccionar todas"}
                  </button>
                  {selectedIndices.size > 0 && (
                    <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                      {selectedIndices.size} seleccionadas
                    </span>
                  )}
                </div>
              </div>

              {/* Barra de Edición Masiva (4.4) */}
              <div className="rounded-xl bg-zinc-100/80 border border-zinc-200 p-3 flex flex-wrap items-center gap-2.5 text-xs">
                <span className="font-bold text-zinc-700 flex items-center gap-1">
                  <Copy className="h-3.5 w-3.5 text-zinc-500" />
                  Edición rápida {selectedIndices.size > 0 ? "para seleccionadas:" : "para todas:"}
                </span>

                <div className="inline-flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Precio ARS"
                    value={bulkPrice}
                    onChange={e => setBulkPrice(e.target.value)}
                    className="h-8 w-24 rounded-lg border border-zinc-300 bg-white px-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleApplyBulkPrice}
                    className="h-8 rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white px-2.5 font-bold transition"
                  >
                    Fijar precio
                  </button>
                </div>

                <div className="inline-flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Stock"
                    value={bulkStock}
                    onChange={e => setBulkStock(e.target.value)}
                    className="h-8 w-20 rounded-lg border border-zinc-300 bg-white px-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleApplyBulkStock}
                    className="h-8 rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white px-2.5 font-bold transition"
                  >
                    Fijar stock
                  </button>
                </div>

                <div className="inline-flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    onClick={() => handleBulkToggleActive(true)}
                    className="h-8 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-2.5 font-bold transition"
                  >
                    Activar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkToggleActive(false)}
                    className="h-8 rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 px-2.5 font-bold transition"
                  >
                    Desactivar
                  </button>
                </div>
              </div>

              {/* Tabla de Variantes (4.3) */}
              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-bold">
                      <th className="py-2.5 px-3 w-8 text-center">#</th>
                      <th className="py-2.5 px-3">Variante</th>
                      <th className="py-2.5 px-3 w-32">Precio Minorista</th>
                      <th className="py-2.5 px-3 w-28">Stock / Disp.</th>
                      <th className="py-2.5 px-3 w-28">SKU</th>
                      <th className="py-2.5 px-3 w-36">Foto</th>
                      <th className="py-2.5 px-3 w-20 text-center">Estado</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {variants.map((v, idx) => {
                      const isSelected = selectedIndices.has(idx);
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-zinc-50/80 transition ${
                            isSelected ? "bg-sky-50/50" : ""
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(idx)}
                              className="size-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 font-semibold text-zinc-900">
                            <div>
                              <span>{v.title}</span>
                              <div className="text-[10px] text-zinc-500 flex gap-2">
                                {Object.entries(v.options).map(([k, val]) => (
                                  <span key={k}>
                                    <strong className="text-zinc-600">{k}:</strong> {val}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="relative">
                              <span className="absolute left-2 top-2 text-zinc-400 font-bold">$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={disabled}
                                value={v.retailPrice || ""}
                                placeholder="0"
                                onChange={e => updateVariantField(idx, "retailPrice", Number(e.target.value))}
                                className="h-8 w-full rounded-lg border border-zinc-300 pl-5 pr-1 text-xs font-bold text-zinc-900 focus:border-sky-600 focus:outline-none"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            {v.fulfillmentMode === "supplier" ? (
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  disabled={disabled}
                                  checked={v.supplierAvailable}
                                  onChange={e => updateVariantField(idx, "supplierAvailable", e.target.checked)}
                                  className="size-4 rounded border-zinc-300 text-sky-600"
                                />
                                <span className="text-[11px] font-medium text-zinc-700">
                                  {v.supplierAvailable ? "Disponible" : "Agotado"}
                                </span>
                              </label>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                step="1"
                                disabled={disabled}
                                value={v.stock}
                                onChange={e => updateVariantField(idx, "stock", Number(e.target.value))}
                                className="h-8 w-full rounded-lg border border-zinc-300 px-2 text-xs font-bold text-zinc-900 focus:border-sky-600 focus:outline-none"
                              />
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              maxLength={100}
                              disabled={disabled}
                              value={v.sku ?? ""}
                              placeholder="SKU"
                              onChange={e => updateVariantField(idx, "sku", e.target.value)}
                              className="h-8 w-full rounded-lg border border-zinc-300 px-2 text-xs text-zinc-800 font-mono"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              {v.imageUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={v.imageUrl}
                                  alt="Preview"
                                  className="size-7 rounded-md object-cover border border-zinc-200 shrink-0"
                                />
                              ) : (
                                <div className="size-7 rounded-md bg-zinc-100 border border-zinc-200 grid place-items-center shrink-0">
                                  <ImageIcon className="h-3.5 w-3.5 text-zinc-400" />
                                </div>
                              )}
                              <select
                                disabled={disabled}
                                value={v.imageUrl ?? ""}
                                onChange={e => updateVariantField(idx, "imageUrl", e.target.value || undefined)}
                                className="h-8 w-full rounded-lg border border-zinc-300 px-1 text-[11px] text-zinc-700"
                              >
                                <option value="">Foto general</option>
                                {galleryUrls.map((url, i) => (
                                  <option key={url} value={url}>
                                    Foto {i + 1}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => updateVariantField(idx, "isActive", !v.isActive)}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold cursor-pointer transition ${
                                v.isActive
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300"
                              }`}
                            >
                              {v.isActive ? "Activa" : "Pausada"}
                            </button>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => removeVariant(idx)}
                              className="text-zinc-400 hover:text-red-600 transition p-1"
                              title="Eliminar variante"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
