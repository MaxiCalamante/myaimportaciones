"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/types";

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
  revalidatePath("/admin");
  revalidatePath("/mayorista");
}

export async function createProductAction(formData: FormData) {
  const supabase = await getAdminClient();
  const title = getString(formData, "title");
  const categoryId = getString(formData, "category_id");
  const subcategoryId = getString(formData, "subcategory_id");
  const image = formData.get("image");
  let imageUrl = "";

  if (!title || (!categoryId && !subcategoryId)) {
    throw new Error("El producto necesita titulo y categoria principal.");
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

  const { error } = await supabase.from("products").insert({
    title,
    slug: slugify(title),
    description: getString(formData, "description"),
    category_id: finalCategoryId,
    image_url: imageUrl,
    retail_price: Number(getString(formData, "retail_price") || 0),
    wholesale_price: Number(getString(formData, "wholesale_price") || 0),
    wholesale_min_qty: Number(getString(formData, "wholesale_min_qty") || 1),
    stock: Number(getString(formData, "stock") || 0),
    payment_methods: paymentMethods.length > 0 ? paymentMethods : ["transferencia"],
    tags: getString(formData, "tags")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    is_featured: formData.get("is_featured") === "on",
    is_wholesale_only: formData.get("is_wholesale_only") === "on",
    is_active: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/mayorista");
}

export async function updateProductAction(formData: FormData) {
  const supabase = await getAdminClient();
  const id = getString(formData, "id");
  const title = getString(formData, "title");
  const categoryId = getString(formData, "category_id");
  const subcategoryId = getString(formData, "subcategory_id");
  const image = formData.get("image");
  let imageUrl = getString(formData, "existing_image_url");

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

  const { error } = await supabase
    .from("products")
    .update({
      title,
      slug: slugify(title),
      description: getString(formData, "description"),
      category_id: finalCategoryId,
      image_url: imageUrl,
      retail_price: Number(getString(formData, "retail_price") || 0),
      wholesale_price: Number(getString(formData, "wholesale_price") || 0),
      wholesale_min_qty: Number(getString(formData, "wholesale_min_qty") || 1),
      stock: Number(getString(formData, "stock") || 0),
      payment_methods: paymentMethods.length > 0 ? paymentMethods : ["transferencia"],
      tags: getString(formData, "tags")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      is_featured: formData.get("is_featured") === "on",
      is_wholesale_only: formData.get("is_wholesale_only") === "on",
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/mayorista");
}

export async function updateProductStockAction(productId: string, stock: number) {
  const supabase = await getAdminClient();

  const { error } = await supabase
    .from("products")
    .update({ stock })
    .eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/mayorista");
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
  revalidatePath("/admin");
  revalidatePath("/mayorista");
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
  revalidatePath("/admin");
  revalidatePath("/mayorista");
}

export async function updateUserRoleAction(userId: string, newRole: "admin" | "customer") {
  const supabase = await getAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    throw new Error(`Error al actualizar el rol: ${error.message}`);
  }

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

  const updateData: { status: string; tracking_code?: string } = { status };
  if (trackingCode !== undefined) {
    updateData.tracking_code = trackingCode.trim();
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (error) {
    throw new Error(`Error al actualizar estado del pedido: ${error.message}`);
  }

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

  if (!items || items.length === 0) {
    throw new Error("No hay productos para importar.");
  }

  // Fetch all categories
  const { data: categories } = await supabase.from("categories").select("id, name, slug");
  const catMap = new Map<string, string>();
  categories?.forEach((c) => {
    catMap.set(c.name.toLowerCase().trim(), c.id);
    catMap.set(c.slug.toLowerCase().trim(), c.id);
  });

  const defaultCategoryId = categories?.[0]?.id || "";

  let successCount = 0;
  for (const item of items) {
    if (!item.title) continue;

    let targetCatId = item.categoryId;
    if (!targetCatId && item.categoryName) {
      targetCatId = catMap.get(item.categoryName.toLowerCase().trim());
    }
    if (!targetCatId) {
      targetCatId = defaultCategoryId;
    }

    const slug = slugify(item.title);
    const retailPrice = Number(item.retailPrice || 0);
    const wholesalePrice = Number(item.wholesalePrice || Math.round(retailPrice * 0.75));

    const { error } = await supabase.from("products").upsert(
      {
        title: item.title,
        slug,
        description: item.description || "",
        category_id: targetCatId,
        image_url: item.imageUrl || "/window.svg",
        retail_price: retailPrice,
        wholesale_price: wholesalePrice,
        wholesale_min_qty: Number(item.wholesaleMinQuantity || 1),
        stock: Number(item.stock || 0),
        payment_methods: ["transferencia", "tarjeta", "mercado_pago", "efectivo"],
        tags: item.tags || ["importado"],
        is_featured: Boolean(item.featured),
        is_wholesale_only: false,
        is_active: true,
      },
      { onConflict: "slug" }
    );

    if (!error) {
      successCount++;
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/mayorista");

  return { importedCount: successCount };
}
