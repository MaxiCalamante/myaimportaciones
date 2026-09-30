"use server";
import { revalidatePath } from "next/cache";
import { invalidateAdminStorefrontCache } from "@/lib/storefront";
import { readAdminProducts } from "@/lib/admin-catalog-read";
import { getAdminClient } from "@/lib/admin-auth";
import { parseProductForm, productImageUrl, httpsUrl, validId, validateImageContent } from "@/lib/admin-product";
import { prepareProductImages } from "@/lib/admin-media";
import {
  checkAndUpdateProductSupplierStock,
  runBatchSupplierStockSync,
  type SupplierCheckResult,
} from "@/lib/supplier-sync";
function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
async function validateCategoryParent(db: Awaited<ReturnType<typeof getAdminClient>>, parentId: string, id?: string) {
  if (!parentId) return;
  validId(parentId);
  const { data, error } = await db.from("categories").select("id,parent_id").eq("id", parentId).single();
  if (error || !data || parentId === id || data.parent_id) throw new Error("Elegí un rubro principal válido. La categoría no puede ser su propio padre.");
  if (id) {
    const { count, error: countError } = await db.from("categories").select("id", { count: "exact", head: true }).eq("parent_id", id);
    if (countError || count) throw new Error("Este rubro tiene subcategorías. No puede convertirse en subcategoría.");
  }
}
export async function createCategoryAction(formData: FormData) {
  const supabase = await getAdminClient();
  const name = getString(formData, "name");
  const parentId = getString(formData, "parent_id");
  const image = formData.get("image");
  let imageUrl = productImageUrl(getString(formData, "custom_image_url"));
  await validateCategoryParent(supabase, parentId);
  if (!slugify(name) || name.length > 200) {
    throw new Error("La categoria necesita un nombre.");
  }
  if (image instanceof File && image.size > 0) {
    await validateImageContent(image);
    const safeName = image.name.replace(/[^a-zA-Z0-9.-]/g, "-");
    const path = `categories/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, image, {
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) {
      throw new Error(uploadError.message);
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    imageUrl = data.publicUrl;
  }
  const { error } = await supabase.from("categories").insert({
    name,
    slug: slugify(name),
    description: getString(formData, "description"),
    image_url: imageUrl,
    parent_id: parentId || null,
    is_wholesale_only: formData.get("is_wholesale_only") === "on",
    display_order: Number(getString(formData, "display_order") || 0),
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/mayorista");
  revalidatePath("/", "layout");
  revalidatePath("/producto/[slug]", "page");
}
export async function updateCategoryAction(formData: FormData) {
  const supabase = await getAdminClient();
  const id = getString(formData, "id");
  const name = getString(formData, "name");
  const parentId = getString(formData, "parent_id");
  const image = formData.get("image");
  let imageUrl = getString(formData, "existing_image_url");
  const customImageUrl = getString(formData, "custom_image_url");
  if (customImageUrl) imageUrl = productImageUrl(customImageUrl);
  validId(id);
  await validateCategoryParent(supabase, parentId, id);
  if (!slugify(name) || name.length > 200) {
    throw new Error("ID y Nombre de categoría son requeridos.");
  }
  if (image instanceof File && image.size > 0) {
    await validateImageContent(image);
    const safeName = image.name.replace(/[^a-zA-Z0-9.-]/g, "-");
    const path = `categories/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, image, {
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) {
      throw new Error(uploadError.message);
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    imageUrl = data.publicUrl;
  }
  const { error } = await supabase
    .from("categories")
    .update({
      name,
      slug: slugify(name),
      description: getString(formData, "description"),
      image_url: imageUrl,
      parent_id: parentId || null,
      is_wholesale_only: formData.get("is_wholesale_only") === "on",
      display_order: Number(getString(formData, "display_order") || 0),
    })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/mayorista");
  revalidatePath("/", "layout");
  revalidatePath("/producto/[slug]", "page");
}
export async function deleteCategoryAction(categoryId: string) {
  const supabase = await getAdminClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/mayorista");
  revalidatePath("/", "layout");
  revalidatePath("/producto/[slug]", "page");
}
function refreshCatalog() {
  invalidateAdminStorefrontCache();
  revalidatePath("/", "layout");
  revalidatePath("/producto/[slug]", "page");
  revalidatePath("/sitemap.xml");
}
async function checkProductCategory(db: Awaited<ReturnType<typeof getAdminClient>>, categoryId: string, parentId: string) {
  const { data, error } = await db.from("categories").select("id, parent_id").eq("id", categoryId).single();
  if (error || !data || (parentId && categoryId !== parentId && data.parent_id !== parentId)) throw new Error("La categoría seleccionada no existe o no pertenece al rubro elegido.");
}
export async function createProductAction(formData: FormData) {
  const db = await getAdminClient();
  const { fields, slug, stock } = parseProductForm(formData, true);
  await checkProductCategory(db, fields.category_id, getString(formData, "category_id"));
  const { data: match, error: slugError } = await db.from("products").select("id").eq("slug", slug).maybeSingle();
  if (slugError) throw new Error("No se pudo verificar el enlace del producto.");
  const finalSlug = match ? `${slug}-${crypto.randomUUID().slice(0, 8)}` : slug;
  const { urls, paths } = await prepareProductImages(db, formData);
  if (fields.is_active && !urls.length) throw new Error("Agregá al menos una foto antes de publicar.");
  const { data, error } = await db.from("products").insert({
    ...fields, slug: finalSlug, stock: stock ?? 0,
    stock_verified_at: fields.fulfillment_mode === "own_stock" && stock ? new Date().toISOString() : null,
    image_url: urls[0] || null, image_urls: urls,
    supplier_stock_status: "unknown", supplier_last_checked_at: null,
  }).select("id, slug").single();
  if (error || !data) {
    if (paths.length) await db.storage.from("product-images").remove(paths);
    throw new Error(error?.code === "23505" ? "Ya existe un producto con ese enlace o SKU. Revisá el catálogo." : "No se pudo guardar el producto. Revisá los datos y tu conexión.");
  }
  refreshCatalog();
  return { success: true, id: data.id, slug: data.slug };
}
export async function updateProductAction(formData: FormData) {
  const db = await getAdminClient();
  const id = validId(getString(formData, "id"));
  const { fields } = parseProductForm(formData, false);
  await checkProductCategory(db, fields.category_id, getString(formData, "category_id"));
  const { data: matches, error: readError } = await readAdminProducts(db, { ids: [id], size: 1 });
  const existing = matches?.[0] as { image_url: string | null; image_urls: string[] | null; stock: number; fulfillment_mode: string; supplier_available: boolean; source_url: string | null } | undefined;
  if (readError || !existing) throw new Error("El producto ya no está disponible para editar. Recargá el panel.");
  if (formData.has("stock") && Number(formData.get("stock")) !== existing.stock) throw new Error("Verificá el conteo físico desde Operaciones para proteger las reservas.");
  const gallery = [...new Set([existing.image_url, ...(existing.image_urls ?? [])].filter(Boolean))] as string[];
  const { urls, paths } = await prepareProductImages(db, formData, gallery);
  if (fields.is_active && !urls.length) throw new Error("Agregá al menos una foto antes de publicar.");
  try {
    if (existing.fulfillment_mode !== fields.fulfillment_mode) {
      const { error } = await db.rpc("set_product_fulfillment_v1", { product_id_input: id, mode_input: fields.fulfillment_mode, available_input: fields.supplier_available });
      if (error) throw new Error("No se pudo cambiar la modalidad. Resolvé las reservas pendientes antes de cambiarla.");
    }
    const { fulfillment_mode: mode, ...update } = fields;
    void mode;
    const { error, data } = await db.from("products").update({ ...update,
      image_url: urls[0] || null, image_urls: urls,
      ...(existing.source_url !== fields.source_url ? { supplier_last_checked_at: null, supplier_stock_status: "unknown" } : {}),
    }).eq("id", id).select("id").single();
    if (error || !data) throw new Error("No se pudo guardar la ficha. Recargá el panel y revisá tu conexión.");
  } catch (error) {
    if (paths.length) await db.storage.from("product-images").remove(paths);
    throw error;
  }
  refreshCatalog();
  return { success: true };
}

async function validatePublish(db: Awaited<ReturnType<typeof getAdminClient>>, ids: string[]) {
  const { data, error } = await db.from("products").select("id,retail_price,image_url").in("id", ids);
  if (error || !data || data.length !== new Set(ids).size || data.some(p => p.retail_price <= 0 || !p.image_url || p.image_url.includes("placeholder"))) throw new Error("Antes de publicar, cada producto debe tener precio y una foto real.");
}
export async function toggleProductActiveAction(productId: string, isActive: boolean) {
  const supabase = await getAdminClient();
  if (isActive) await validatePublish(supabase, [productId]);
  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/catalogo");
  return { success: true, isActive };
}

export async function toggleProductSupplierAvailabilityAction(productId: string, supplierAvailable: boolean) {
  const supabase = await getAdminClient();
  const { error } = await supabase
    .from("products")
    .update({
      supplier_available: supplierAvailable,
      supplier_stock_status: "unknown",
      supplier_last_checked_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/catalogo");
  revalidatePath("/admin/costos");
  return { success: true, supplierAvailable };
}

export async function checkSingleProductSupplierStockAction(productId: string): Promise<SupplierCheckResult> {
  await getAdminClient();
  const result = await checkAndUpdateProductSupplierStock(productId);
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/catalogo");
  return result;
}

export async function triggerBatchSupplierSyncAction(limit: number = 30) {
  await getAdminClient();
  const report = await runBatchSupplierStockSync({ limit });
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/catalogo");
  return report;
}

export async function quickUpdateProductPriceAction(productId: string, retailPrice: number, wholesalePrice?: number) {
  const supabase = await getAdminClient();
  if (!Number.isFinite(retailPrice) || retailPrice <= 0) throw new Error("El precio minorista debe ser mayor a cero.");
  if (wholesalePrice !== undefined && (!Number.isFinite(wholesalePrice) || wholesalePrice < 0)) throw new Error("El precio mayorista no es válido.");
  const updateData: Record<string, unknown> = {
    retail_price: retailPrice,
    updated_at: new Date().toISOString(),
  };
  if (wholesalePrice !== undefined && wholesalePrice >= 0) {
    updateData.wholesale_price = wholesalePrice;
  }
  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/catalogo");
  return { success: true };
}

export async function bulkUpdateProductStatusAction(
  productIds: string[],
  action: "activate" | "pause" | "supplier_available" | "supplier_pause" | "set_mode_supplier" | "set_mode_own"
) {
  const supabase = await getAdminClient();
  if (!Array.isArray(productIds) || !productIds.length || productIds.length > 200) throw new Error("Seleccioná entre 1 y 200 productos.");
  productIds.forEach(validId);

  let updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (action === "activate") {
    await validatePublish(supabase, productIds);
    updatePayload = { is_active: true };
  } else if (action === "pause") {
    updatePayload = { is_active: false };
  } else if (action === "supplier_available") {
    updatePayload = {
      supplier_available: true,
      supplier_stock_status: "unknown",
      supplier_last_checked_at: null,
    };
  } else if (action === "supplier_pause") {
    updatePayload = {
      supplier_available: false,
      supplier_stock_status: "unknown",
      supplier_last_checked_at: null,
    };
  } else if (action === "set_mode_supplier" || action === "set_mode_own") {
    let changed = 0;
    for (const id of [...new Set(productIds)].sort()) {
      const { error } = await supabase.rpc("set_product_fulfillment_v1", { product_id_input: id, mode_input: action === "set_mode_supplier" ? "supplier" : "own_stock", available_input: false });
      if (error) { refreshCatalog(); throw new Error(`Se actualizaron ${changed} productos. Revisá las reservas pendientes del resto y recargá antes de reintentar.`); }
      changed++;
    }
    refreshCatalog();
    return { success: true, count: changed };
  } else throw new Error("Acción inválida.");

  const { error } = await supabase
    .from("products")
    .update(updatePayload)
    .in("id", productIds);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/catalogo");
  return { success: true, count: productIds.length };
}

export async function bulkAdjustPricesAction(
  productIds: string[],
  type: "percentage" | "fixed_markup",
  amount: number
) {
  const supabase = await getAdminClient();
  if (!Array.isArray(productIds) || !productIds.length || productIds.length > 200) throw new Error("Seleccioná entre 1 y 200 productos.");
  productIds.forEach(validId);
  if (!Number.isFinite(amount) || !["percentage", "fixed_markup"].includes(type)) throw new Error("Importe o porcentaje inválido.");

  const { data: currentProducts, error: fetchError } = await supabase
    .from("products")
    .select("id, retail_price")
    .in("id", productIds);

  if (fetchError || !currentProducts) throw new Error("Error al leer productos para ajuste de precio.");
  if (currentProducts.length !== new Set(productIds).size) throw new Error("No se encontraron todos los productos seleccionados.");

  const nextPrices = currentProducts.map((p) => {
    let newPrice = Number(p.retail_price || 0);
    if (type === "percentage") {
      newPrice = Math.round(newPrice * (1 + amount / 100));
    } else {
      newPrice = Math.round(newPrice + amount);
    }
    if (!Number.isFinite(newPrice) || newPrice <= 0) throw new Error(`El ajuste dejaría sin precio al producto ${p.id}.`);
    return { id: p.id, price: newPrice };
  });
  const results = await Promise.all(nextPrices.map((product) =>
    supabase
      .from("products")
      .update({ retail_price: product.price, updated_at: new Date().toISOString() })
      .eq("id", product.id)
  ));

  if (results.some((result) => result.error)) {
    throw new Error("Algunos precios no se pudieron actualizar. Recargá el catálogo antes de reintentar.");
  }
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/catalogo");
  return { success: true, count: productIds.length };
}
export async function updateProductStockAction(productId: string, stock: number) {
  await getAdminClient(); void productId; void stock;
  throw new Error("Usá Inventario, fichas y reclamos para verificar stock sin pisar reservas.");
}
export async function updateProductWholesaleAction(
  productId: string,
  wholesalePrice: number,
  wholesaleMinQty: number
) {
  const supabase = await getAdminClient();
  const { error } = await supabase
    .from("products")
    .update({
      wholesale_price: wholesalePrice,
      wholesale_min_qty: wholesaleMinQty,
    })
    .eq("id", productId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/mayorista");
  revalidatePath("/", "layout");
  revalidatePath("/producto/[slug]", "page");
}
export async function updateProductPricesAction(
  productId: string,
  retailPrice: number,
  wholesalePrice: number
) {
  const supabase = await getAdminClient();
  const { error } = await supabase
    .from("products")
    .update({
      retail_price: retailPrice,
      wholesale_price: wholesalePrice,
    })
    .eq("id", productId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/mayorista");
  revalidatePath("/catalogo");
  return { success: true };
}
export async function deleteProductAction(productId: string) {
  const supabase = await getAdminClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/mayorista");
  revalidatePath("/", "layout");
  revalidatePath("/producto/[slug]", "page");
}
export async function updateUserRoleAction(userId: string, newRole: "admin" | "customer") {
  const supabase = await getAdminClient();
  if (newRole === "customer") {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === userId) throw new Error("No podés quitarte tu propio acceso de administrador.");
    const { count, error: countError } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if (countError || (count ?? 0) <= 1) throw new Error("Debe quedar al menos un administrador.");
  }
  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);
  if (error) {
    throw new Error(`Error al actualizar el rol: ${error.message}`);
  }
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
}
export async function toggleWholesaleApprovalAction(userId: string, isApproved: boolean) {
  const supabase = await getAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ 
      is_approved_wholesale: isApproved,
      customer_tier: isApproved ? "wholesale" : "retail",
    })
    .eq("id", userId);
  if (error) {
    throw new Error(`Error al actualizar estado mayorista: ${error.message}`);
  }
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/mayorista");
  revalidatePath("/");
}
export async function setWholesaleByEmailAction(email: string, isApproved: boolean) {
  const supabase = await getAdminClient();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error("El email es obligatorio.");
  }
  const { data: profile, error: findError } = await supabase
    .from("profiles")
    .select("id, email")
    .ilike("email", cleanEmail)
    .maybeSingle();
  if (findError) {
    throw new Error(findError.message);
  }
  if (!profile) {
    throw new Error(`No se encontró ningún usuario registrado con el email: ${cleanEmail}`);
  }
  const { error } = await supabase
    .from("profiles")
    .update({ 
      is_approved_wholesale: isApproved,
      customer_tier: isApproved ? "wholesale" : "retail",
    })
    .eq("id", profile.id);
  if (error) {
    throw new Error(`Error al actualizar estado mayorista: ${error.message}`);
  }
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/mayorista");
  revalidatePath("/");
}
export async function updateOrderStatusAction(
  orderId: string,
  status: "pending" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled",
  trackingCode?: string
) {
  const supabase = await getAdminClient();
  const { error } = trackingCode !== undefined
    ? await supabase.rpc("set_retail_carrier_tracking_v2", { order_id_input: orderId, code_input: trackingCode })
    : await supabase.rpc("set_retail_order_status_v2", { order_id_input: orderId, status_input: status });
  if (error) {
    throw new Error(`Error al actualizar estado del pedido: ${error.message}`);
  }
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/cuenta");
}
export interface BulkProductItem {
  title: string;
  categoryName?: string;
  categoryId?: string;
  retailPrice: number;
  wholesalePrice?: number;
  wholesaleMinQuantity?: number;
  stock?: number;
  description?: string;
  imageUrl?: string;
  tags?: string[];
  featured?: boolean;
  sku?: string;
  brand?: string;
  model?: string;
  sourceUrl?: string;
  supplierLivePrice?: number;
}
export async function bulkImportProductsAction(items: BulkProductItem[]) {
  const supabase = await getAdminClient();
  if (!Array.isArray(items) || items.length === 0 || items.length > 200) throw new Error("Importá entre 1 y 200 productos por vez.");
  const { data: categories, error: categoryError } = await supabase.from("categories").select("id, name, slug");
  if (categoryError) throw new Error(`No se pudieron leer las categorías: ${categoryError.message}`);
  const catMap = new Map<string, string>();
  categories?.forEach((c) => {
    catMap.set(c.name.toLowerCase().trim(), c.id);
    catMap.set(c.slug.toLowerCase().trim(), c.id);
  });
  const slugs = items.map((item) => slugify(item.title ?? ""));
  if (new Set(slugs).size !== slugs.length) throw new Error("El CSV tiene títulos repetidos que generarían el mismo enlace de producto.");
  const { data: existingProducts, error: existingError } = await readAdminProducts(supabase, { slugs, size: 200 });
  if (existingError) throw new Error(`No se pudieron verificar los productos existentes: ${existingError.message}`);
  const existingBySlug = new Map((existingProducts ?? []).map((product) => [product.slug, product]));
  const payload = items.map((item, index) => {
    const targetCatId = item.categoryId || (item.categoryName ? catMap.get(item.categoryName.toLowerCase().trim()) : undefined);
    if (!targetCatId || !categories?.some((category) => category.id === targetCatId)) throw new Error(`Fila ${index + 1}: la categoría "${item.categoryName || ""}" no existe.`);
    if (!item.title?.trim() || !Number.isFinite(item.retailPrice) || item.retailPrice <= 0) throw new Error(`Fila ${index + 1}: título o precio inválido.`);
    if (item.supplierLivePrice !== undefined && (!Number.isFinite(item.supplierLivePrice) || item.supplierLivePrice < 0)) throw new Error(`Fila ${index + 1}: costo de proveedor inválido.`);
    const slug = slugs[index];
    const existing = existingBySlug.get(slug);
    const retailPrice = Number(item.retailPrice);
    const wholesalePrice = Number(item.wholesalePrice ?? existing?.wholesale_price ?? 0);
    if (!Number.isFinite(wholesalePrice) || wholesalePrice < 0 || !Number.isInteger(item.wholesaleMinQuantity ?? 1) || (item.wholesaleMinQuantity ?? 1) < 1) throw new Error(`Fila ${index + 1}: precio o mínimo mayorista inválido.`);
    return {
        title: item.title,
        slug,
        sku: item.sku?.trim() || existing?.sku || null,
        brand: item.brand?.trim() || existing?.brand || null,
        model: item.model?.trim() || existing?.model || null,
        source_url: item.sourceUrl ? httpsUrl(item.sourceUrl.trim(), "Proveedor") : existing?.source_url || null,
        supplier_live_price: item.supplierLivePrice ?? existing?.supplier_live_price ?? null,
        description: item.description || existing?.description || "",
        category_id: targetCatId,
        image_url: item.imageUrl ? productImageUrl(item.imageUrl) : existing?.image_url || null,
        image_urls: item.imageUrl ? [productImageUrl(item.imageUrl)] : existing?.image_urls || [],
        retail_price: retailPrice,
        wholesale_price: wholesalePrice,
        wholesale_min_qty: Number(item.wholesaleMinQuantity ?? 1),
        // Stock is deliberately omitted: preserve reservations on existing products; new rows default to zero.
        payment_methods: existing?.payment_methods ?? ["transferencia"],
        tags: item.tags || existing?.tags || ["importado"],
        is_featured: existing?.is_featured ?? Boolean(item.featured),
        is_wholesale_only: existing?.is_wholesale_only ?? false,
        is_active: existing?.is_active ?? false,
        fulfillment_mode: existing?.fulfillment_mode ?? "supplier",
        supplier_available: existing?.supplier_available ?? false,
      };
  });
  const { error } = await supabase.from("products").upsert(payload, { onConflict: "slug" });
  if (error) throw new Error(`No se pudo importar el CSV: ${error.message}`);
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/admin/costos");
  revalidatePath("/mayorista");
  return { importedCount: payload.length };
}
export interface BulkPriceUpdateOptions {
  scope: "all" | "supplier" | "category" | "brand";
  scopeValue?: string;
  target: "retail" | "wholesale" | "both";
  mode: "percentage" | "cost_multiplier";
  retailPercent?: number;
  wholesalePercent?: number;
  retailMultiplier?: number;
  wholesaleMultiplier?: number;
  rounding?: "none" | "50" | "100" | "1000";
}
export async function bulkUpdatePricesAction(options: BulkPriceUpdateOptions) {
  const supabase = await getAdminClient();
  if (options.mode === "cost_multiplier") throw new Error("Usá Costos reales: el precio de venta no permite deducir el costo de compra.");
  const buildQuery = () =>
    supabase
      .from("products")
      .select("id, title, category_id, tags, retail_price, wholesale_price");
  const [b0, b1, b2, b3] = await Promise.all([
    buildQuery().range(0, 999),
    buildQuery().range(1000, 1999),
    buildQuery().range(2000, 2999),
    buildQuery().range(3000, 3999),
  ]);
  const allProducts = [
    ...(b0.data ?? []),
    ...(b1.data ?? []),
    ...(b2.data ?? []),
    ...(b3.data ?? []),
  ];
  const { data: categoriesData } = await supabase
    .from("categories")
    .select("id, slug, parent_id");
  const categories = categoriesData ?? [];
  const targetProducts = allProducts.filter((p) => {
    if (options.scope === "all") return true;
    if (options.scope === "category" && options.scopeValue) {
      const isDirect = p.category_id === options.scopeValue;
      const parentCat = categories.find((c) => c.id === p.category_id);
      const isChild = parentCat?.parent_id === options.scopeValue;
      return isDirect || isChild;
    }
    if (options.scope === "brand" && options.scopeValue) {
      const b = options.scopeValue.toUpperCase();
      const titleUpper = p.title.toUpperCase();
      const tagsUpper = (p.tags || []).map((t: string) => t.toUpperCase());
      return titleUpper.includes(b) || tagsUpper.some((t: string) => t.includes(b));
    }
    if (options.scope === "supplier" && options.scopeValue) {
      const supVal = options.scopeValue.toLowerCase();
      const titleUpper = p.title.toUpperCase();
      const tagsUpper = (p.tags || []).map((t: string) => t.toUpperCase());
      const cat = categories.find((c) => c.id === p.category_id);
      const catSlug = (cat?.slug || "").toLowerCase();
      if (supVal === "total_tools") {
        return (
          titleUpper.includes("TOTAL") ||
          titleUpper.includes("WADFOW") ||
          catSlug.includes("herramienta") ||
          tagsUpper.includes("HERRAMIENTAS")
        );
      }
      if (supVal === "atacado_usa") {
        return (
          catSlug.includes("cosmet") ||
          catSlug.includes("capilar") ||
          ["MEDICUBE", "SKIN1004", "CELIMAX", "DR. ALTHEA", "DR ALTHEA", "KARSEELL"].some((b) =>
            titleUpper.includes(b)
          )
        );
      }
      return (
        titleUpper.includes(supVal.toUpperCase()) ||
        tagsUpper.some((t: string) => t.includes(supVal.toUpperCase()))
      );
    }
    return true;
  });
  if (targetProducts.length === 0) {
    throw new Error("No se encontraron productos que coincidan con el filtro seleccionado.");
  }
  const rounding = options.rounding || "100";
  const applyRound = (val: number) => {
    if (rounding === "100") return Math.round(val / 100) * 100;
    if (rounding === "50") return Math.round(val / 50) * 50;
    if (rounding === "1000") return Math.round(val / 1000) * 1000;
    return Math.round(val);
  };
  const updates = targetProducts.map((p) => {
    const currentRetail = Number(p.retail_price || 0);
    const currentWholesale = Number(p.wholesale_price || Math.round(currentRetail * 0.75));
    const estimatedCost = Math.round(currentRetail / 2);
    let newRetail = currentRetail;
    let newWholesale = currentWholesale;
    if (options.mode === "percentage") {
      if (options.target === "retail" || options.target === "both") {
        const pct = Number(options.retailPercent || 0);
        newRetail = applyRound(currentRetail * (1 + pct / 100));
      }
      if (options.target === "wholesale" || options.target === "both") {
        const pct = Number(options.wholesalePercent || 0);
        newWholesale = applyRound(currentWholesale * (1 + pct / 100));
      }
    }
    if (newWholesale > newRetail) {
      newWholesale = Math.round(newRetail * 0.85);
    }
    newRetail = Math.max(100, newRetail);
    newWholesale = Math.max(100, newWholesale);
    return {
      id: p.id,
      retail_price: newRetail,
      wholesale_price: newWholesale,
    };
  });
  const chunkSize = 50;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((item) =>
        supabase
          .from("products")
          .update({
            retail_price: item.retail_price,
            wholesale_price: item.wholesale_price,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
      )
    );
  }
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/mayorista");
  return {
    success: true,
    updatedCount: updates.length,
    message: `¡Se actualizaron exitosamente los precios de ${updates.length} productos!`,
  };
}
export async function bulkUpdateStockAction(options: {
  scope: "all" | "supplier" | "category" | "brand";
  scopeValue?: string;
  operation: "set" | "add";
  amount: number;
}) {
  const supabase = await getAdminClient();
  throw new Error("La carga masiva de stock está pausada. Verificá inventario por producto en Operaciones.");
  const buildQuery = () =>
    supabase.from("products").select("id, title, category_id, tags, stock");
  const [b0, b1, b2, b3] = await Promise.all([
    buildQuery().range(0, 999),
    buildQuery().range(1000, 1999),
    buildQuery().range(2000, 2999),
    buildQuery().range(3000, 3999),
  ]);
  const allProducts = [
    ...(b0.data ?? []),
    ...(b1.data ?? []),
    ...(b2.data ?? []),
    ...(b3.data ?? []),
  ];
  const targetProducts = allProducts.filter((p) => {
    if (options.scope === "all") return true;
    if (options.scope === "category" && options.scopeValue) {
      return p.category_id === options.scopeValue;
    }
    if (options.scope === "brand" && options.scopeValue) {
      const b = options.scopeValue.toUpperCase();
      return p.title.toUpperCase().includes(b);
    }
    if (options.scope === "supplier" && options.scopeValue) {
      const supVal = options.scopeValue.toLowerCase();
      const titleUpper = p.title.toUpperCase();
      if (supVal === "total_tools") return titleUpper.includes("TOTAL") || titleUpper.includes("WADFOW");
      if (supVal === "atacado_usa") return ["MEDICUBE", "SKIN1004", "CELIMAX", "DR. ALTHEA", "KARSEELL"].some((b) => titleUpper.includes(b));
      return titleUpper.includes(supVal.toUpperCase());
    }
    return true;
  });
  const updates = targetProducts.map((p) => {
    const currentStock = Number(p.stock || 0);
    const newStock = options.operation === "set" ? Math.max(0, options.amount) : Math.max(0, currentStock + options.amount);
    return { id: p.id, stock: newStock };
  });
  const chunkSize = 50;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((item) =>
        supabase
          .from("products")
          .update({
            stock: item.stock,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
      )
    );
  }
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/mayorista");
  return {
    success: true,
    updatedCount: updates.length,
    message: `¡Se actualizó exitosamente el stock de ${updates.length} productos!`,
  };
}

export async function quickUpdateSupplierLinkAction(
  productId: string,
  sourceUrl: string,
  livePrice?: number | null,
  fulfillmentMode: "own_stock" | "supplier" = "supplier",
  supplierAvailable: boolean = true
) {
  const supabase = await getAdminClient();
  const cleanUrl = httpsUrl(sourceUrl.trim(), "Proveedor");
  validId(productId);
  if (livePrice !== undefined && livePrice !== null && (!Number.isFinite(livePrice) || livePrice < 0)) throw new Error("Costo de proveedor inválido.");
  const { error: modeError } = await supabase.rpc("set_product_fulfillment_v1", { product_id_input: productId, mode_input: fulfillmentMode, available_input: supplierAvailable });
  if (modeError) throw new Error("No se pudo cambiar la modalidad. Revisá las reservas pendientes.");
  const updateData: Record<string, unknown> = {
    source_url: cleanUrl || null,
    supplier_available: supplierAvailable,
    updated_at: new Date().toISOString(),
  };

  if (livePrice !== undefined && livePrice !== null && Number.isFinite(livePrice) && livePrice >= 0) {
    updateData.supplier_live_price = livePrice;
  }

  updateData.supplier_last_checked_at = null;
  updateData.supplier_stock_status = "unknown";

  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (error) {
    throw new Error("No se pudo actualizar el enlace de proveedor: " + error.message);
  }

  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  return { success: true };
}
