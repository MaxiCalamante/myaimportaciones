"use client";

import { useState, useTransition, useId } from "react";
import type { Category } from "@/lib/types";
import { createCategoryAction, updateCategoryAction } from "@/app/admin/actions";
import {
  FolderPlus,
  FolderOpen,
  Edit,
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface CategoryModalProps {
  isOpen: boolean;
  categories: Category[];
  initialParentId?: string;
  categoryToEdit?: Category | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function CategoryModal({
  isOpen,
  categories,
  initialParentId = "",
  categoryToEdit,
  onClose,
  onSuccess,
}: CategoryModalProps) {
  const isEditing = Boolean(categoryToEdit);
  const [name, setName] = useState(categoryToEdit?.name || "");
  const [parentId, setParentId] = useState(
    categoryToEdit ? categoryToEdit.parentId || "" : initialParentId
  );
  const [description, setDescription] = useState(categoryToEdit?.description || "");
  const [displayOrder, setDisplayOrder] = useState<number>(categoryToEdit?.displayOrder ?? 0);
  const [wholesaleOnly, setWholesaleOnly] = useState(Boolean(categoryToEdit?.wholesaleOnly));
  const [customImageUrl, setCustomImageUrl] = useState(categoryToEdit?.imageUrl || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(categoryToEdit?.imageUrl || null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputId = useId();

  if (!isOpen) return null;

  // Potential parents (only top-level categories, excluding itself if editing)
  const availableParents = categories.filter(
    (c) => !c.parentId && (!categoryToEdit || c.id !== categoryToEdit.id)
  );

  const slugPreview = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setCustomImageUrl("");
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(String(event.target?.result ?? ""));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setCustomImageUrl(url);
    setImageFile(null);
    setImagePreview(url.trim() ? url : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("El nombre de la categoría es obligatorio.");
      return;
    }

    const formData = new FormData();
    if (isEditing && categoryToEdit) {
      formData.set("id", categoryToEdit.id);
    }
    formData.set("name", name.trim());
    formData.set("parent_id", parentId);
    formData.set("description", description.trim());
    formData.set("display_order", String(displayOrder));
    if (wholesaleOnly) formData.set("is_wholesale_only", "on");
    if (isEditing && categoryToEdit) formData.set("existing_image_url", categoryToEdit.imageUrl || "");

    if (imageFile) {
      formData.set("image", imageFile);
    } else if (customImageUrl.trim()) {
      formData.set("custom_image_url", customImageUrl.trim());
    }

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateCategoryAction(formData);
          onSuccess(`Categoría "${name}" actualizada con éxito.`);
        } else {
          await createCategoryAction(formData);
          onSuccess(`Categoría "${name}" creada con éxito.`);
        }
        onClose();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error al guardar la categoría.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative my-auto w-full max-w-lg min-h-0 flex flex-col rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 sm:p-5 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              {isEditing ? <Edit className="h-5 w-5" /> : <FolderPlus className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-zinc-950 truncate">
                {isEditing ? "Editar Categoría" : "Nueva Categoría"}
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-500 truncate">
                {isEditing ? "Modificá los datos del rubro." : "Creá un rubro o subcategoría para tu catálogo."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition cursor-pointer shrink-0"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 flex flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {/* Name & Slug preview */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
              Nombre de la Categoría *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Herramientas Eléctricas, Cosméticos..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-semibold text-zinc-900 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
            {slugPreview && (
              <span className="block mt-1 text-[11px] text-zinc-400 font-mono">
                Enlace en tienda: /catalogo?category={slugPreview}
              </span>
            )}
          </div>

          {/* Hierarchy: Parent Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
              Jerarquía / Categoría Padre
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 text-sm font-medium text-zinc-800 focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="">-- Ninguna (Categoría Principal) --</option>
              {availableParents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  📁 Subcategoría de: {parent.name}
                </option>
              ))}
            </select>
            <span className="block mt-1 text-[11px] text-zinc-500">
              Dejá en blanco si es un rubro principal, o elegí un rubro para crear una subcategoría.
            </span>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
              Descripción (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Breve descripción que se mostrará en el catálogo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-xs text-zinc-800 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Image Upload & Preview */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
              Imagen de Portada
            </label>
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 flex items-center justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Vista previa"
                    className="h-full w-full object-cover"
                    onError={() => setImagePreview(null)}
                  />
                ) : (
                  <FolderOpen className="h-7 w-7 text-zinc-400" />
                )}
              </div>

              {/* Upload controls */}
              <div className="flex-1 space-y-2">
                <label
                  htmlFor={fileInputId}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer shadow-2xs"
                >
                  <Upload className="h-3.5 w-3.5" /> Subir archivo de imagen
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <input
                  type="url"
                  placeholder="O ingresá URL externa (https://...)"
                  value={customImageUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 p-2 text-xs text-zinc-700 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Options: Priority & Wholesale */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-zinc-700">
                Orden de Visualización
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                className="mt-1 w-full rounded-xl border border-zinc-300 p-2 text-xs font-bold"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wholesaleOnly}
                  onChange={(e) => setWholesaleOnly(e.target.checked)}
                  className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
                />
                Exclusiva Mayorista
              </label>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800 flex items-start gap-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          </div>

          {/* Sticky Footer */}
          <div className="flex items-center justify-end gap-2.5 p-4 sm:p-5 border-t border-zinc-100 bg-zinc-50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
            >
              {isPending ? (
                "Guardando…"
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {isEditing ? "Guardar Cambios" : "Crear Categoría"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
