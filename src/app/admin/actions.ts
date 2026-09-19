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

  const isMasterAdmin = (user.email ?? "").toLowerCase().trim() === "maximocalamante14@gmail.com";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" && !isMasterAdmin) {
    throw new Error("No tenes permisos de administrador.");
  }

  // Ensure master admin profile is saved in DB
  if (isMasterAdmin && profile?.role !== "admin") {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || "Máximo Calamante",
        role: "admin",
        customer_tier: "wholesale",
        is_approved_wholesale: true,
      },
      { onConflict: "id" }
    );
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
    } else if (options.mode === "cost_multiplier") {
      if (options.target === "retail" || options.target === "both") {
        const mult = Number(options.retailMultiplier || 2.0);
        newRetail = applyRound(estimatedCost * mult);
      }
      if (options.target === "wholesale" || options.target === "both") {
        const mult = Number(options.wholesaleMultiplier || 1.15);
        newWholesale = applyRound(estimatedCost * mult);
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
  revalidatePath("/admin");
  revalidatePath("/mayorista");

  return {
    success: true,
    updatedCount: updates.length,
    message: `¡Se actualizó exitosamente el stock de ${updates.length} productos!`,
  };
}
