"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { Camera, ImagePlus, X } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { createProductAction, updateProductAction } from "@/app/admin/actions";
import { MAX_PRODUCT_IMAGES } from "@/lib/admin-product";
import { optimizeProductPhoto } from "@/lib/image-upload";

const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200";
export function ProductEditor({ product, categories, onClose, onSaved }: { product?: Product; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState(product?.fulfillmentMode ?? "supplier");
  const category = categories.find(c => c.id === product?.categoryId);
  const [parentId, setParentId] = useState(category?.parentId ?? category?.id ?? "");
  const [childId, setChildId] = useState(category?.parentId ? category.id : "");
  const [kept, setKept] = useState<string[]>([...new Set([product?.imageUrl, ...(product?.imageUrls ?? [])].filter((url): url is string => Boolean(url)))]);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const photoRef = useRef(photos);
  useEffect(() => { photoRef.current = photos; }, [photos]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    node?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { node?.close(); document.body.style.overflow = overflow; previous?.focus(); photoRef.current.forEach(photo => URL.revokeObjectURL(photo.url)); };
  }, []);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    if (kept.length + photos.length + files.length > MAX_PRODUCT_IMAGES) { setError(`Podés agregar hasta ${MAX_PRODUCT_IMAGES} fotos en total.`); return; }
    setProcessing(true);
    const next: { file: File; url: string }[] = [];
    try {
      for (const input of Array.from(files)) {
        const file = await optimizeProductPhoto(input);
        next.push({ file, url: URL.createObjectURL(file) });
      }
      setPhotos(current => [...current, ...next]);
    } catch (err) { next.forEach(photo => URL.revokeObjectURL(photo.url)); setError(err instanceof Error ? err.message : "No se pudo preparar la foto."); }
    finally { setProcessing(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || processing) return;
    const form = new FormData(event.currentTarget);
    form.set("category_id", parentId);
    form.set("subcategory_id", childId);
    form.set("gallery_present", "true");
    kept.forEach(url => form.append("keep_image_url", url));
    photos.forEach(photo => form.append("images", photo.file));
    setError("");
    startTransition(async () => {
      try { if (product) await updateProductAction(form); else await createProductAction(form); onSaved(); }
      catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar. Probá nuevamente."); }
    });
  }
  return <dialog ref={dialog} aria-labelledby="product-editor-title" onCancel={event => { event.preventDefault(); if (!pending && !processing) onClose(); }} className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-zinc-950 shadow-2xl backdrop:bg-black/60 sm:w-[calc(100%-3rem)]">
    <form onSubmit={submit}>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white px-4 py-3 sm:px-6"><div><h2 id="product-editor-title" className="text-lg font-bold">{product ? "Editar producto" : "Nuevo producto"}</h2><p className="text-xs text-zinc-600">Precios en pesos argentinos. Revisá la ficha antes de publicarla.</p></div><button type="button" aria-label="Cerrar editor" disabled={pending || processing} onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-xl border disabled:opacity-40"><X className="size-5" /></button></header>
      <div className="space-y-7 px-4 py-5 sm:px-6">
        {product && <input type="hidden" name="id" value={product.id} />}
        <fieldset disabled={pending || processing} className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-base font-bold">Ficha del producto</legend>
          <label className="text-sm font-semibold sm:col-span-2">Título *<input name="title" required minLength={2} maxLength={200} defaultValue={product?.title} className={fieldClass} autoFocus /></label>
          <label className="text-sm font-semibold">Rubro *<select required value={parentId} onChange={e => { setParentId(e.target.value); setChildId(""); }} className={fieldClass}><option value="">Elegí una categoría</option>{categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="text-sm font-semibold">Subcategoría<select value={childId} disabled={!parentId} onChange={e => setChildId(e.target.value)} className={fieldClass}><option value="">Sin subcategoría</option>{categories.filter(c => c.parentId === parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          {!categories.length && <p className="text-sm text-amber-800 sm:col-span-2">Creá primero una categoría desde el panel.</p>}
          <label className="text-sm font-semibold">Marca<input name="brand" maxLength={200} defaultValue={product?.brand} className={fieldClass} /></label>
          <label className="text-sm font-semibold">Modelo<input name="model" maxLength={200} defaultValue={product?.model} className={fieldClass} /></label>
          <label className="text-sm font-semibold">SKU / código del proveedor<input name="sku" maxLength={100} defaultValue={product?.sku} className={fieldClass} /></label>
          <label className="text-sm font-semibold">Precio minorista (ARS)<input name="retail_price" type="number" inputMode="decimal" min="0" max="9999999999.99" step="0.01" defaultValue={product?.retailPrice ?? ""} className={fieldClass} /><span className="mt-1 block text-xs font-normal text-zinc-600">Podés dejarlo vacío en un borrador. Para publicar debe ser mayor a cero.</span></label>
          <input type="hidden" name="wholesale_price" value={product?.wholesalePrice ?? 0} /><input type="hidden" name="wholesale_min_qty" value={product?.wholesaleMinQuantity ?? 1} />
          <label className="text-sm font-semibold sm:col-span-2">Descripción<textarea name="description" rows={4} maxLength={10000} defaultValue={product?.description} className={fieldClass} placeholder="Presentación, contenido y detalles reales del producto." /></label>
        </fieldset>
        <fieldset disabled={pending || processing} className="space-y-4"><legend className="mb-3 text-base font-bold">Disponibilidad y proveedor</legend>
          <label className="block text-sm font-semibold">Modalidad<select name="fulfillment_mode" value={mode} onChange={e => setMode(e.target.value as typeof mode)} className={fieldClass}><option value="supplier">Compra y despacho por proveedor</option><option value="own_stock">Stock propio verificado</option></select></label>
          {mode === "supplier" ? <label className="flex min-h-11 items-start gap-3 rounded-xl bg-sky-50 p-3 text-sm"><input type="checkbox" name="supplier_available" defaultChecked={product?.supplierAvailable ?? false} className="mt-1 size-5 shrink-0" /><span>Confirmé disponibilidad con el proveedor.<span className="block text-xs text-zinc-600">Habilita agregar al carrito; entrega y pago siguen sujetos a confirmación.</span></span></label> : product ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Stock registrado: {product.stockVerifiedAt ? `${product.stock} unidades` : "sin verificar"}. Para modificar cantidades, guardá esta ficha y usá <Link href="/admin/operaciones" className="font-bold underline">Operaciones → Verificar inventario</Link>.</p> : <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Cantidad física contada<input name="stock" type="number" inputMode="numeric" min="0" max="100000" step="1" defaultValue="0" className={fieldClass} /></label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="stock_confirmed" className="size-5" />Confirmo el conteo físico.</label></div>}
          <label className="block text-sm font-semibold">Enlace exacto del producto del proveedor<input name="source_url" type="url" maxLength={2000} defaultValue={product?.sourceUrl ?? ""} placeholder="https://..." className={fieldClass} /><span className="mt-1 block text-xs font-normal text-zinc-600">Sólo visible en administración. La verificación automática admite los proveedores integrados.</span></label>
          <input type="hidden" name="supplier_live_price" value={product?.supplierLivePrice ?? ""} />
          <p className="text-xs text-zinc-600">Cargá costos, moneda, cambio y gastos reales en <Link href="/admin/costos" className="underline">Stock y costos</Link>. No se calcula margen con precios de distinta moneda.</p>
          <label className="block text-sm font-semibold">Peso de la unidad preparada (kg)<input type="number" name="weight_kg" inputMode="decimal" step="0.001" min="0" max="1000" defaultValue={product?.specifications?.peso_kg ?? ""} className={fieldClass} /><span className="mt-1 block text-xs font-normal text-zinc-600">Dejalo vacío si aún no está confirmado. El envío se cotiza antes del pago.</span></label>
        </fieldset>
        <fieldset disabled={pending || processing} className="space-y-3"><legend className="mb-3 text-base font-bold">Fotos del producto</legend>
          <p className="text-sm text-zinc-600">Hasta 4 fotos. La primera será la portada. Usá fotos reales y con permiso de uso.</p>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-900"><ImagePlus className="size-5" />Galería / archivos<input aria-label="Seleccionar fotos de galería" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={pending || processing} className="sr-only" onChange={e => { void addPhotos(e.target.files); e.target.value = ""; }} /></label>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-semibold"><Camera className="size-5" />Tomar foto<input aria-label="Tomar foto con la cámara" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={pending || processing} className="sr-only" onChange={e => { void addPhotos(e.target.files); e.target.value = ""; }} /></label>
          </div>
          {processing && <p role="status" className="text-sm text-sky-800">Preparando las fotos…</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[...kept.map(url => ({ url, file: null })), ...photos].map((photo, i) => <div key={photo.url} className="relative rounded-xl border p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- local previews and already stored media */}
            <img src={photo.url} alt={`Foto ${i + 1} del producto`} className="aspect-square w-full object-contain" />
            <span className="block text-xs text-zinc-600">{i === 0 ? "Portada" : `Foto ${i + 1}`}</span><button type="button" aria-label={`Quitar foto ${i + 1}`} className="absolute right-1 top-1 grid size-11 place-items-center rounded-xl border bg-white" onClick={() => { if (photo.file) { URL.revokeObjectURL(photo.url); setPhotos(current => current.filter(p => p.url !== photo.url)); } else setKept(current => current.filter(url => url !== photo.url)); }}><X className="size-4" /></button>
          </div>)}</div>
          <label className="block text-sm font-semibold">O agregar una URL de imagen<input name="custom_image_url" type="url" maxLength={2000} className={fieldClass} placeholder="https://.../foto.jpg" /><span className="mt-1 block text-xs font-normal text-zinc-600">Supabase y proveedores integrados. Para otro sitio, subí el archivo.</span></label>
        </fieldset>
        <fieldset disabled={pending || processing} className="space-y-4"><legend className="mb-3 text-base font-bold">Detalles y publicación</legend>
          <label className="block text-sm font-semibold">Especificaciones<textarea name="specifications" rows={4} maxLength={30000} className={fieldClass} defaultValue={Object.entries(product?.specifications ?? {}).filter(([k]) => k !== "peso_kg").map(([k, v]) => `${k}: ${v}`).join("\n")} placeholder={"Contenido: 50 ml\nModelo: ..."} /><span className="mt-1 block text-xs font-normal text-zinc-600">Una por línea: Nombre: valor. No agregues beneficios o certificaciones sin respaldo.</span></label>
          <label className="block text-sm font-semibold">Garantía y condiciones<textarea name="warranty_terms" rows={2} maxLength={3000} defaultValue={product?.warrantyTerms ?? ""} className={fieldClass} /></label>
          <label className="block text-sm font-semibold">Etiquetas, separadas por coma<input name="tags" maxLength={1000} defaultValue={product?.tags.join(", ")} className={fieldClass} /></label>
          {(product?.paymentMethods ?? ["transferencia"]).map(method => <input key={method} type="hidden" name="payment_methods" value={method} />)}
          <input type="hidden" name="is_active_present" value="true" /><input type="hidden" name="supplier_available_present" value="true" />
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="is_active" defaultChecked={product?.active ?? false} className="size-5" />Publicar en el catálogo (requiere foto y precio).</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="is_featured" defaultChecked={product?.featured ?? false} className="size-5" />Destacar en la página de inicio.</label>
          {product?.wholesaleOnly && <input type="hidden" name="is_wholesale_only" value="on" />}
        </fieldset>
      </div>
      <footer className="sticky bottom-0 border-t bg-white px-4 py-3 sm:px-6">{error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}<div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={pending || processing} onClick={onClose} className="min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-40">Cancelar</button><button type="submit" disabled={pending || processing || !categories.length} className="min-h-11 rounded-xl bg-sky-700 px-5 text-sm font-bold text-white disabled:opacity-40">{pending ? "Guardando…" : product ? "Guardar cambios" : "Guardar producto"}</button></div></footer>
    </form>
  </dialog>;
}
