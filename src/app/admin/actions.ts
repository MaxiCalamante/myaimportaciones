"use server";
import { revalidatePath } from "next/cache";
import { invalidateAdminStorefrontCache } from "@/lib/storefront";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/types";
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
async function getAdminClient() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Tenes que iniciar sesion.");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    throw new Error("No tenes permisos de administrador.");
  }
  return supabase;
}
export async function createCategoryAction(formData: FormData) {
  const supabase = await getAdminClient();
  const name = getString(formData, "name");
  const parentId = getString(formData, "parent_id");
  const image = formData.get("image");
  let imageUrl = "";
  if (!name) {
    throw new Error("La categoria necesita un nombre.");
  }
  if (image instanceof File && image.size > 0) {
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
}
export async function updateCategoryAction(formData: FormData) {
  const supabase = await getAdminClient();
  const id = getString(formData, "id");
  const name = getString(formData, "name");
  const parentId = getString(formData, "parent_id");
  const image = formData.get("image");
  let imageUrl = getString(formData, "existing_image_url");
  if (!id || !name) {
    throw new Error("ID y Nombre de categoría son requeridos.");
  }
  if (image instanceof File && image.size > 0) {
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
}
export async function createProductAction(formData: FormData) {
  const supabase = await getAdminClient();
  const title = getString(formData, "title");
  const categoryId = getString(formData, "category_id");
  const subcategoryId = getString(formData, "subcategory_id");
  const brand = getString(formData, "brand") || null;
  const model = getString(formData, "model") || null;
  const sku = getString(formData, "sku") || null;
  const sourceUrl = getString(formData, "source_url") || null;
  const customSlug = getString(formData, "slug");
  const customImageUrl = getString(formData, "custom_image_url");
  const image = formData.get("image");

  if (!title || (!categoryId && !subcategoryId)) {
    throw new Error("El producto necesita título y categoría principal.");
  }

  let imageUrl = customImageUrl || "";
  if (image instanceof File && image.size > 0) {
    const safeName = image.name.replace(/[^a-zA-Z0-9.-]/g, "-");
    const path = `products/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, image, {
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) {
      throw new Error("Error al subir imagen: " + uploadError.message);
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    imageUrl = data.publicUrl;
  }

  const paymentMethods = formData
    .getAll("payment_methods")
    .filter((value): value is PaymentMethod => typeof value === "string");

  const finalCategoryId = subcategoryId || categoryId;
  const retailPrice = Number(getString(formData, "retail_price") || 0);
  const wholesalePrice = Number(
    getString(formData, "wholesale_price") || (retailPrice > 0 ? Math.round(retailPrice * 0.75) : 0)
  );
  const wholesaleMinQty = Number(getString(formData, "wholesale_min_qty") || 1);
  const stock = Number(getString(formData, "stock") || 0);
  const fulfillmentMode = getString(formData, "fulfillment_mode") || "supplier";
  const supplierAvailable = formData.has("supplier_available_present")
    ? formData.get("supplier_available") === "on"
    : true;
  const supplierLivePrice = getString(formData, "supplier_live_price")
    ? Number(getString(formData, "supplier_live_price"))
    : null;

  let tags = getString(formData, "tags")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const isInStockImmediate = formData.get("is_in_stock_immediate") === "on" || stock > 0;
  if (isInStockImmediate && !tags.some((t) => t.toLowerCase() === "en_stock")) {
    tags.push("en_stock");
  }

  // Specifications JSON or key-value
  let specifications: Record<string, string> = {};
  const specsRaw = getString(formData, "specifications");
  if (specsRaw) {
    try {
      specifications = JSON.parse(specsRaw);
    } catch {
      const lines = specsRaw.split("\n");
      for (const line of lines) {
        const colonIdx = line.indexOf(":");
        if (colonIdx !== -1) {
          const k = line.slice(0, colonIdx).trim();
          const v = line.slice(colonIdx + 1).trim();
          if (k && v) specifications[k] = v;
        }
      }
    }
  }

  const baseSlug = customSlug ? slugify(customSlug) : slugify(title);
  // Ensure slug uniqueness
  const { data: existingSlug } = await supabase
    .from("products")
    .select("id")
    .eq("slug", baseSlug)
    .maybeSingle();

  const finalSlug = existingSlug
    ? `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`
    : baseSlug;

  const insertData = {
    title,
    slug: finalSlug,
    description: getString(formData, "description") || null,
    category_id: finalCategoryId,
    image_url: imageUrl || null,
    image_urls: imageUrl ? [imageUrl] : [],
    retail_price: retailPrice,
    wholesale_price: wholesalePrice,
    wholesale_min_qty: wholesaleMinQty,
    stock,
    stock_verified_at: stock > 0 ? new Date().toISOString() : null,
    payment_methods: paymentMethods.length > 0 ? paymentMethods : ["transferencia"],
    tags,
    is_featured: formData.get("is_featured") === "on",
    is_wholesale_only: formData.get("is_wholesale_only") === "on",
    is_active: formData.has("is_active_present") ? formData.get("is_active") === "on" : true,
    brand,
    model,
    sku,
    source_url: sourceUrl,
    fulfillment_mode: ["own_stock", "supplier"].includes(fulfillmentMode) ? fulfillmentMode : "supplier",
    supplier_available: supplierAvailable,
    supplier_live_price: supplierLivePrice,
    supplier_last_checked_at: sourceUrl ? new Date().toISOString() : null,
    supplier_stock_status: sourceUrl ? (supplierAvailable ? "in_stock" : "out_of_stock") : null,
    specifications,
    warranty_terms: getString(formData, "warranty_terms") || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: createdProduct, error } = await supabase
    .from("products")
    .insert(insertData)
    .select("id, slug")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/mayorista");
  revalidatePath("/catalogo");

  return { success: true, id: createdProduct.id, slug: createdProduct.slug };
}
export async function updateProductAction(formData: FormData) {
  const supabase = await getAdminClient();
  const id = getString(formData, "id");
  const title = getString(formData, "title");
  const categoryId = getString(formData, "category_id");
  const subcategoryId = getString(formData, "subcategory_id");
  const image = formData.get("image");
  let imageUrl = getString(formData, "existing_image_url");
  const customImageUrl = getString(formData, "custom_image_url");
  if (customImageUrl) {
    imageUrl = customImageUrl;
  }
  if (!id || !title || (!categoryId && !subcategoryId)) {
    throw new Error("El producto necesita ID, título y categoría principal.");
  }
  if (image instanceof File && image.size > 0) {
    const safeName = image.name.replace(/[^a-zA-Z0-9.-]/g, "-");
    const path = `products/${crypto.randomUUID()}-${safeName}`;
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
  const paymentMethods = formData
    .getAll("payment_methods")
    .filter((value): value is PaymentMethod => typeof value === "string");
  const finalCategoryId = subcategoryId || categoryId;
  const isInStockImmediate = formData.get("is_in_stock_immediate") === "on";
  let tags = getString(formData, "tags")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (isInStockImmediate) {
    if (!tags.some((t) => t.toLowerCase() === "en_stock")) {
      tags.push("en_stock");
    }
  } else {
    tags = tags.filter(
      (t) => !["en_stock", "en stock", "stock inmediato", "stock_inmediato"].includes(t.toLowerCase())
    );
  }

  const updateData: Record<string, unknown> = {
    title,
    slug: slugify(title),
    description: getString(formData, "description"),
    category_id: finalCategoryId,
    image_url: imageUrl,
    retail_price: Number(getString(formData, "retail_price") || 0),
    wholesale_price: Number(getString(formData, "wholesale_price") || 0),
    wholesale_min_qty: Number(getString(formData, "wholesale_min_qty") || 1),
    payment_methods: paymentMethods.length > 0 ? paymentMethods : ["transferencia"],
    tags,
    is_featured: formData.get("is_featured") === "on",
    is_wholesale_only: formData.get("is_wholesale_only") === "on",
    updated_at: new Date().toISOString(),
  };

  if (formData.has("brand")) updateData.brand = getString(formData, "brand") || null;
  if (formData.has("model")) updateData.model = getString(formData, "model") || null;
  if (formData.has("sku")) updateData.sku = getString(formData, "sku") || null;
  if (formData.has("source_url")) updateData.source_url = getString(formData, "source_url") || null;

  if (formData.has("fulfillment_mode")) {
    const mode = getString(formData, "fulfillment_mode");
    if (["own_stock", "supplier"].includes(mode)) {
      updateData.fulfillment_mode = mode;
    }
  }

  if (formData.has("is_active_present")) {
    updateData.is_active = formData.get("is_active") === "on";
  }

  if (formData.has("supplier_available_present")) {
    updateData.supplier_available = formData.get("supplier_available") === "on";
  }

  if (formData.has("stock")) {
    const s = Number(getString(formData, "stock") || 0);
    updateData.stock = s;
    if (s > 0) updateData.stock_verified_at = new Date().toISOString();
  }

  if (formData.has("supplier_live_price")) {
    const p = getString(formData, "supplier_live_price");
    updateData.supplier_live_price = p ? Number(p) : null;
  }

  if (formData.has("warranty_terms")) {
    updateData.warranty_terms = getString(formData, "warranty_terms") || null;
  }

  if (formData.has("specifications")) {
    const specsRaw = getString(formData, "specifications");
    if (specsRaw) {
      try {
        updateData.specifications = JSON.parse(specsRaw);
      } catch {
        const specs: Record<string, string> = {};
        const lines = specsRaw.split("\n");
        for (const line of lines) {
          const colonIdx = line.indexOf(":");
          if (colonIdx !== -1) {
            const k = line.slice(0, colonIdx).trim();
            const v = line.slice(colonIdx + 1).trim();
            if (k && v) specs[k] = v;
          }
        }
        updateData.specifications = specs;
      }
    }
  }

  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
  revalidatePath("/mayorista");
  revalidatePath("/catalogo");
}

export async function toggleProductActiveAction(productId: string, isActive: boolean) {
  const supabase = await getAdminClient();
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
      supplier_stock_status: supplierAvailable ? "in_stock" : "out_of_stock",
      supplier_last_checked_at: new Date().toISOString(),
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
  if (retailPrice <= 0) throw new Error("El precio minorista debe ser mayor a cero.");
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
  if (!productIds || productIds.length === 0) throw new Error("No hay productos seleccionados.");

  let updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (action === "activate") {
    updatePayload = { is_active: true };
  } else if (action === "pause") {
    updatePayload = { is_active: false };
  } else if (action === "supplier_available") {
    updatePayload = {
      supplier_available: true,
      supplier_stock_status: "in_stock",
      supplier_last_checked_at: new Date().toISOString(),
    };
  } else if (action === "supplier_pause") {
    updatePayload = {
      supplier_available: false,
      supplier_stock_status: "out_of_stock",
      supplier_last_checked_at: new Date().toISOString(),
    };
  } else if (action === "set_mode_supplier") {
    updatePayload = { fulfillment_mode: "supplier" };
  } else if (action === "set_mode_own") {
    updatePayload = { fulfillment_mode: "own_stock" };
  }

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
  if (!productIds || productIds.length === 0) throw new Error("No hay productos seleccionados.");
  if (!Number.isFinite(amount)) throw new Error("Importe o porcentaje inválido.");

  const { data: currentProducts, error: fetchError } = await supabase
    .from("products")
    .select("id, retail_price")
    .in("id", productIds);

  if (fetchError || !currentProducts) throw new Error("Error al leer productos para ajuste de precio.");

  const updates = currentProducts.map((p) => {
    let newPrice = Number(p.retail_price || 0);
    if (type === "percentage") {
      newPrice = Math.round(newPrice * (1 + amount / 100));
    } else {
      newPrice = Math.round(newPrice + amount);
    }
    if (newPrice < 0) newPrice = 0;
    return supabase
      .from("products")
      .update({ retail_price: newPrice, updated_at: new Date().toISOString() })
      .eq("id", p.id);
  });

  await Promise.all(updates);
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
  const payload = items.map((item, index) => {
    const targetCatId = item.categoryId || (item.categoryName ? catMap.get(item.categoryName.toLowerCase().trim()) : undefined);
    if (!targetCatId || !categories?.some((category) => category.id === targetCatId)) throw new Error(`Fila ${index + 1}: la categoría "${item.categoryName || ""}" no existe.`);
    if (!item.title?.trim() || !Number.isFinite(item.retailPrice) || item.retailPrice <= 0) throw new Error(`Fila ${index + 1}: título o precio inválido.`);
    const slug = slugify(item.title);
    const retailPrice = Number(item.retailPrice);
    const wholesalePrice = Number(item.wholesalePrice ?? Math.round(retailPrice * 0.75));
    if (!Number.isFinite(wholesalePrice) || wholesalePrice < 0 || !Number.isInteger(item.wholesaleMinQuantity ?? 1) || (item.wholesaleMinQuantity ?? 1) < 1) throw new Error(`Fila ${index + 1}: precio o mínimo mayorista inválido.`);
    return {
        title: item.title,
        slug,
        description: item.description || "",
        category_id: targetCatId,
        image_url: item.imageUrl || "/window.svg",
        retail_price: retailPrice,
        wholesale_price: wholesalePrice,
        wholesale_min_qty: Number(item.wholesaleMinQuantity ?? 1),
        // Stock is deliberately omitted: preserve reservations on existing products; new rows default to zero.
        payment_methods: ["transferencia", "tarjeta", "mercado_pago", "efectivo"],
        tags: item.tags || ["importado"],
        is_featured: Boolean(item.featured),
        is_wholesale_only: false,
        is_active: true,
      };
  });
  const { error } = await supabase.from("products").upsert(payload, { onConflict: "slug" });
  if (error) throw new Error(`No se pudo importar el CSV: ${error.message}`);
  revalidatePath("/");
  invalidateAdminStorefrontCache();
  revalidatePath("/admin");
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
  const cleanUrl = sourceUrl.trim();
  const updateData: Record<string, unknown> = {
    source_url: cleanUrl || null,
    fulfillment_mode: fulfillmentMode,
    supplier_available: supplierAvailable,
    updated_at: new Date().toISOString(),
  };

  if (livePrice !== undefined && livePrice !== null && !isNaN(livePrice)) {
    updateData.supplier_live_price = livePrice;
  }

  if (cleanUrl) {
    updateData.supplier_last_checked_at = new Date().toISOString();
    updateData.supplier_stock_status = supplierAvailable ? "in_stock" : "out_of_stock";
  } else {
    updateData.supplier_last_checked_at = null;
    updateData.supplier_stock_status = null;
  }

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
