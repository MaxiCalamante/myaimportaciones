"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { Camera, ImagePlus, X, CopyPlus } from "lucide-react";
import type { Category, Product, ProductOptionDimension } from "@/lib/types";
import { createProductAction, updateProductAction, getProductVariantsAction } from "@/app/admin/actions";
import { MAX_PRODUCT_IMAGES } from "@/lib/admin-product";
import { optimizeProductPhoto } from "@/lib/image-upload";
import { publicUrl, productDescription } from "@/lib/seo";
import { VariantManager } from "./variant-manager";
import type { VariantFormInput } from "@/lib/admin-variants";

const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200";

export interface ProductEditorProps {
  product?: Product;
  initialData?: Partial<Product>;
  isCloning?: boolean;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export function ProductEditor({
  product,
  initialData,
  isCloning = false,
  categories,
  onClose,
  onSaved,
}: ProductEditorProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const sourceData = isCloning ? initialData : product;
  const isEditing = Boolean(product?.id && !isCloning);

  const [mode, setMode] = useState<"supplier" | "own_stock">(sourceData?.fulfillmentMode ?? "supplier");
  const category = categories.find(c => c.id === sourceData?.categoryId);
  const [parentId, setParentId] = useState(() => {
    if (category?.parentId) return category.parentId;
    if (category?.id) return category.id;
    const firstParent = categories.find(c => !c.parentId);
    return firstParent?.id ?? "";
  });
  const [childId, setChildId] = useState(() => (category?.parentId ? category.id : ""));
  const [kept, setKept] = useState<string[]>([
    ...new Set(
      [sourceData?.imageUrl, ...(sourceData?.imageUrls ?? [])].filter(
        (url): url is string => Boolean(url)
      )
    ),
  ]);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const photoRef = useRef(photos);
  useEffect(() => {
    photoRef.current = photos;
  }, [photos]);

  // Product Variants state
  const [hasVariants, setHasVariants] = useState(Boolean(sourceData?.hasVariants));
  const [optionsConfig, setOptionsConfig] = useState<ProductOptionDimension[]>(
    sourceData?.optionsConfig ?? []
  );
  const [variants, setVariants] = useState<VariantFormInput[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(() =>
    Boolean(product?.id || (isCloning && initialData?.id))
  );

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    node?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Load existing variants if editing a product OR cloning from an existing product
    const sourceId = product?.id || (isCloning ? initialData?.id : undefined);
    if (sourceId) {
      getProductVariantsAction(sourceId)
        .then(data => {
          if (data && data.length > 0) {
            // For cloning: strip IDs so they are inserted as new variants
            const mappedVariants = isCloning
              ? (data as VariantFormInput[]).map(v => ({ ...v, id: "" }))
              : (data as VariantFormInput[]);
            setVariants(mappedVariants);
            setHasVariants(true);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingVariants(false));
    } else {
      setLoadingVariants(false);
    }

    return () => {
      node?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
      photoRef.current.forEach(photo => URL.revokeObjectURL(photo.url));
    };
  }, [product?.id, isCloning, initialData?.id]);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    if (kept.length + photos.length + files.length > MAX_PRODUCT_IMAGES) {
      setError(`Podés agregar hasta ${MAX_PRODUCT_IMAGES} fotos en total.`);
      return;
    }
    setProcessing(true);
    const next: { file: File; url: string }[] = [];
    try {
      for (const input of Array.from(files)) {
        const file = await optimizeProductPhoto(input);
        next.push({ file, url: URL.createObjectURL(file) });
      }
      setPhotos(current => [...current, ...next]);
    } catch (err) {
      next.forEach(photo => URL.revokeObjectURL(photo.url));
      setError(err instanceof Error ? err.message : "No se pudo preparar la foto.");
    } finally {
      setProcessing(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || processing) return;
    if (!parentId) {
      setError("Por favor seleccioná una categoría o rubro principal.");
      return;
    }
    const form = new FormData(event.currentTarget);
    form.set("category_id", parentId);
    form.set("subcategory_id", childId);
    form.set("gallery_present", "true");
    kept.forEach(url => form.append("keep_image_url", url));
    photos.forEach(photo => form.append("images", photo.file));

    // Variants payload
    form.set("has_variants", hasVariants ? "true" : "false");
    form.set("options_config", JSON.stringify(optionsConfig));
    form.set("variants_json", JSON.stringify(variants));

    setError("");
    startTransition(async () => {
      try {
        const result = isEditing
          ? await updateProductAction(form)
          : await createProductAction(form);
        if (!result.success) {
          setError(result.error);
          return;
        }
        onSaved();
      } catch {
        setError("No se pudo guardar. Revisá tu conexión y probá nuevamente.");
      }
    });
  }

  const allGalleryUrls = [...kept, ...photos.map(p => p.url)];

  return (
    <dialog
      ref={dialog}
      aria-labelledby="product-editor-title"
      onCancel={event => {
        event.preventDefault();
        if (!pending && !processing) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-zinc-950 shadow-2xl backdrop:bg-black/60 sm:w-[calc(100%-3rem)]"
    >
      <form onSubmit={submit}>
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            {isCloning && (
              <span className="flex size-9 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                <CopyPlus className="size-5" />
              </span>
            )}
            <div>
              <h2 id="product-editor-title" className="text-lg font-bold">
                {isCloning ? "Clonar producto" : isEditing ? "Editar producto" : "Nuevo producto"}
              </h2>
              <p className="text-xs text-zinc-600">
                {isCloning
                  ? "Creando una nueva publicación basada en una ficha existente. Guardá como borrador o publicala."
                  : "Precios en pesos argentinos. Configurá ficha, variantes y stock con control de concurrencia."}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar editor"
            disabled={pending || processing}
            onClick={onClose}
            className="grid size-11 shrink-0 place-items-center rounded-xl border disabled:opacity-40 hover:bg-zinc-100 transition cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="space-y-7 px-4 py-5 sm:px-6">
          {isEditing && <input type="hidden" name="id" value={product!.id} />}

          {/* Ficha básica */}
          <fieldset disabled={pending || processing} className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-base font-bold text-zinc-950">Ficha del producto</legend>
            <label className="text-sm font-semibold sm:col-span-2">
              Título *
              <input
                name="title"
                required
                minLength={2}
                maxLength={200}
                defaultValue={isCloning && sourceData?.title ? `${sourceData.title} (Copia)` : sourceData?.title}
                className={fieldClass}
                autoFocus
              />
            </label>
            <label className="text-sm font-semibold">
              Rubro *
              <select
                required
                value={parentId}
                onChange={e => {
                  setParentId(e.target.value);
                  setChildId("");
                }}
                className={fieldClass}
              >
                <option value="">Elegí una categoría</option>
                {categories.filter(c => !c.parentId).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Subcategoría
              <select
                value={childId}
                disabled={!parentId}
                onChange={e => setChildId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Sin subcategoría</option>
                {categories.filter(c => c.parentId === parentId).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {!categories.length && (
              <p className="text-sm text-amber-800 sm:col-span-2">
                Creá primero una categoría desde el panel.
              </p>
            )}
            <label className="text-sm font-semibold">
              Marca
              <input
                name="brand"
                maxLength={200}
                defaultValue={sourceData?.brand}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-semibold">
              Modelo
              <input
                name="model"
                maxLength={200}
                defaultValue={sourceData?.model}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-semibold">
              SKU principal / código del proveedor
              <input
                name="sku"
                maxLength={100}
                defaultValue={isCloning && sourceData?.sku ? `${sourceData.sku}-COPIA` : sourceData?.sku}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-semibold">
              {hasVariants ? "Precio minorista de referencia (ARS)" : "Precio minorista (ARS) *"}
              <input
                name="retail_price"
                type="number"
                inputMode="decimal"
                min="0"
                max="9999999999.99"
                step="0.01"
                defaultValue={sourceData?.retailPrice ?? ""}
                className={fieldClass}
              />
              <span className="mt-1 block text-xs font-normal text-zinc-600">
                {hasVariants
                  ? "Con variantes activas, el precio de la tienda mostrará 'Desde $...' o el precio de cada variante."
                  : "Podés dejarlo vacío en un borrador. Para publicar debe ser mayor a cero."}
              </span>
            </label>
            <input type="hidden" name="wholesale_price" value={sourceData?.wholesalePrice ?? 0} />
            <input type="hidden" name="wholesale_min_qty" value={sourceData?.wholesaleMinQuantity ?? 1} />
            <label className="text-sm font-semibold sm:col-span-2">
              Descripción
              <textarea
                name="description"
                rows={4}
                maxLength={10000}
                defaultValue={sourceData?.description}
                className={fieldClass}
                placeholder="Presentación, contenido y detalles reales del producto."
              />
            </label>
          </fieldset>

          {/* Sistema Universal de Variantes (Fase 4) */}
          <VariantManager
            hasVariants={hasVariants}
            setHasVariants={setHasVariants}
            optionsConfig={optionsConfig}
            setOptionsConfig={setOptionsConfig}
            variants={variants}
            setVariants={setVariants}
            galleryUrls={allGalleryUrls}
            basePrice={sourceData?.retailPrice ?? 0}
            baseFulfillmentMode={mode}
            baseSupplierAvailable={sourceData?.supplierAvailable ?? true}
            disabled={pending || processing || loadingVariants}
          />

          {/* SEO del producto */}
          <details className="rounded-xl border border-zinc-200 p-4">
            <summary className="cursor-pointer font-semibold text-zinc-900">
              SEO del producto (opcional)
            </summary>
            <fieldset disabled={pending || processing} className="min-w-0">
              <p className="mt-2 text-sm text-zinc-600">
                Se completa automáticamente con la ficha. Personalizá sólo si necesitás mejorar cómo se presenta en buscadores. Al limpiar estos campos se restauran los valores automáticos.
              </p>
              <label className="mt-3 block text-sm font-semibold">
                Título SEO
                <input
                  name="seo_title"
                  maxLength={90}
                  defaultValue={sourceData?.specifications?._seo_title || ""}
                  placeholder={sourceData?.title || "Nombre comercial del producto"}
                  className={fieldClass}
                />
              </label>
              <label className="mt-3 block text-sm font-semibold">
                Descripción SEO
                <input
                  name="seo_description"
                  maxLength={180}
                  defaultValue={sourceData?.specifications?._seo_description || ""}
                  placeholder={isEditing && product ? productDescription(product) : "Se genera con el nombre y los detalles del producto."}
                  className={fieldClass}
                />
              </label>
              {isEditing && product && (
                <p className="mt-3 break-all text-xs text-zinc-600">
                  URL canónica: {publicUrl(`/producto/${product.slug}`)}
                </p>
              )}
            </fieldset>
          </details>

          {/* Disponibilidad y proveedor */}
          <fieldset disabled={pending || processing} className="space-y-4">
            <legend className="mb-3 text-base font-bold text-zinc-950">Disponibilidad general y proveedor</legend>
            <label className="block text-sm font-semibold">
              Modalidad de abastecimiento
              <select
                name="fulfillment_mode"
                value={mode}
                onChange={e => setMode(e.target.value as typeof mode)}
                className={fieldClass}
              >
                <option value="supplier">Compra y despacho por proveedor</option>
                <option value="own_stock">Stock propio verificado</option>
              </select>
            </label>
            {mode === "supplier" ? (
              <label className="flex min-h-11 items-start gap-3 rounded-xl bg-sky-50 p-3 text-sm">
                <input
                  type="checkbox"
                  name="supplier_available"
                  defaultChecked={sourceData?.supplierAvailable ?? false}
                  className="mt-1 size-5 shrink-0"
                />
                <span>
                  Confirmé disponibilidad general con el proveedor.
                  <span className="block text-xs text-zinc-600">
                    Habilita comprar el producto; cada variante puede tener su disponibilidad específica.
                  </span>
                </span>
              </label>
            ) : isEditing && product && !hasVariants ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Stock registrado: {product.stockVerifiedAt ? `${product.stock} unidades` : "sin verificar"}. Para modificar cantidades de productos simples, usá{" "}
                <Link href="/admin/operaciones" className="font-bold underline">
                  Operaciones → Verificar inventario
                </Link>.
              </p>
            ) : !hasVariants ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  Cantidad física contada
                  <input
                    name="stock"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100000"
                    step="1"
                    defaultValue="0"
                    className={fieldClass}
                  />
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" name="stock_confirmed" className="size-5" />
                  Confirmo el conteo físico.
                </label>
              </div>
            ) : null}
            <label className="block text-sm font-semibold">
              Enlace exacto del producto del proveedor
              <input
                name="source_url"
                type="url"
                maxLength={2000}
                defaultValue={sourceData?.sourceUrl ?? ""}
                placeholder="https://..."
                className={fieldClass}
              />
              <span className="mt-1 block text-xs font-normal text-zinc-600">
                Sólo visible en administración.
              </span>
            </label>
            <input type="hidden" name="supplier_live_price" value={sourceData?.supplierLivePrice ?? ""} />
            <p className="text-xs text-zinc-600">
              Cargá costos, moneda, cambio y gastos reales en{" "}
              <Link href="/admin/costos" className="underline">
                Stock y costos
              </Link>.
            </p>
            <label className="block text-sm font-semibold">
              Peso de la unidad preparada (kg)
              <input
                type="number"
                name="weight_kg"
                inputMode="decimal"
                step="0.001"
                min="0"
                max="1000"
                defaultValue={sourceData?.specifications?.peso_kg ?? ""}
                className={fieldClass}
              />
              <span className="mt-1 block text-xs font-normal text-zinc-600">
                Dejalo vacío si aún no está confirmado. El envío se cotiza antes del pago.
              </span>
            </label>
          </fieldset>

          {/* Fotos del producto */}
          <fieldset disabled={pending || processing} className="space-y-3">
            <legend className="mb-3 text-base font-bold text-zinc-950">Fotos del producto</legend>
            <p className="text-sm text-zinc-600">
              Hasta 4 fotos generales. La primera será la portada. Las variantes pueden asociarse a cualquiera de estas fotos sin duplicar almacenamiento.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1 min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-900 hover:bg-sky-100 active:scale-98 transition flex shadow-2xs">
                <ImagePlus className="size-5 text-sky-700" />
                <span>Galería / archivos</span>
                <input
                  aria-label="Seleccionar fotos de galería"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={pending || processing}
                  className="sr-only"
                  onChange={e => {
                    void addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className="flex-1 min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-300 px-4 text-sm font-bold text-zinc-800 hover:bg-zinc-50 active:scale-98 transition flex shadow-2xs">
                <Camera className="size-5 text-zinc-600" />
                <span>Tomar foto</span>
                <input
                  aria-label="Tomar foto con la cámara"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  disabled={pending || processing}
                  className="sr-only"
                  onChange={e => {
                    void addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {processing && <p role="status" className="text-sm text-sky-800">Preparando las fotos…</p>}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[...kept.map(url => ({ url, file: null })), ...photos].map((photo, i) => (
                <div key={photo.url} className="relative rounded-xl border p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={`Foto ${i + 1} del producto`} className="aspect-square w-full object-contain" />
                  <span className="block text-xs text-zinc-600 mt-1 font-medium">{i === 0 ? "Portada" : `Foto ${i + 1}`}</span>
                  <button
                    type="button"
                    aria-label={`Quitar foto ${i + 1}`}
                    className="absolute right-1 top-1 grid size-9 place-items-center rounded-xl border bg-white shadow-xs hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                    onClick={() => {
                      if (photo.file) {
                        URL.revokeObjectURL(photo.url);
                        setPhotos(current => current.filter(p => p.url !== photo.url));
                      } else {
                        setKept(current => current.filter(url => url !== photo.url));
                      }
                    }}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <label className="block text-sm font-semibold">
              O agregar una URL de imagen
              <input
                name="custom_image_url"
                type="url"
                maxLength={2000}
                className={fieldClass}
                placeholder="https://.../foto.jpg"
              />
              <span className="mt-1 block text-xs font-normal text-zinc-600">
                Supabase y proveedores integrados.
              </span>
            </label>
          </fieldset>

          {/* Detalles y publicación */}
          <fieldset disabled={pending || processing} className="space-y-4">
            <legend className="mb-3 text-base font-bold text-zinc-950">Detalles y publicación</legend>
            <label className="block text-sm font-semibold">
              Especificaciones técnicas
              <textarea
                name="specifications"
                rows={4}
                maxLength={30000}
                className={fieldClass}
                defaultValue={Object.entries(sourceData?.specifications ?? {})
                  .filter(([k]) => k !== "peso_kg" && !k.startsWith("_seo_"))
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("\n")}
                placeholder={"Contenido: 50 ml\nModelo: ..."}
              />
              <span className="mt-1 block text-xs font-normal text-zinc-600">
                Una por línea: Nombre: valor.
              </span>
            </label>
            <label className="block text-sm font-semibold">
              Garantía y condiciones
              <textarea
                name="warranty_terms"
                rows={2}
                maxLength={3000}
                defaultValue={sourceData?.warrantyTerms ?? ""}
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-semibold">
              Etiquetas, separadas por coma
              <input
                name="tags"
                maxLength={1000}
                defaultValue={sourceData?.tags?.join(", ")}
                className={fieldClass}
              />
            </label>
            {(sourceData?.paymentMethods ?? ["transferencia"]).map(method => (
              <input key={method} type="hidden" name="payment_methods" value={method} />
            ))}
            <input type="hidden" name="is_active_present" value="true" />
            <input type="hidden" name="supplier_available_present" value="true" />
            <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={isCloning ? false : (sourceData?.active ?? false)}
                className="size-5 rounded border-zinc-300 text-sky-600"
              />
              Publicar en el catálogo (requiere foto y precio).
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                name="is_featured"
                defaultChecked={isCloning ? false : (sourceData?.featured ?? false)}
                className="size-5 rounded border-zinc-300 text-sky-600"
              />
              Destacar en la página de inicio.
            </label>
            {sourceData?.wholesaleOnly && <input type="hidden" name="is_wholesale_only" value="on" />}
          </fieldset>
        </div>

        <footer className="sticky bottom-0 z-20 border-t border-zinc-200 bg-white px-4 py-3 sm:px-6 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          {error && (
            <div role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 border border-red-200 flex items-start gap-2">
              <span className="font-bold shrink-0">Aviso:</span>
              <span className="flex-1">{error}</span>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <button
              type="button"
              disabled={pending || processing}
              onClick={onClose}
              className="min-h-12 w-full sm:w-auto rounded-xl border border-zinc-300 px-5 text-sm font-semibold disabled:opacity-40 hover:bg-zinc-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || processing || !categories.length}
              className="min-h-12 w-full sm:w-auto rounded-xl bg-sky-700 hover:bg-sky-800 active:scale-98 px-6 text-sm font-bold text-white disabled:opacity-40 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {pending ? (
                <>
                  <span className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Guardando…</span>
                </>
              ) : isCloning ? (
                "Crear copia del producto"
              ) : isEditing ? (
                "Guardar cambios"
              ) : (
                "Guardar producto"
              )}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
