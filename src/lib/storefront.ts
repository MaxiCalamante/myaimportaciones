import { readAllPages } from "@/lib/read-all-pages";
import { cache } from "react";
import { WHOLESALE_ENABLED, isExcludedCategory, cleanProductTitle } from "@/lib/commerce-policy";
import { demoCategories, demoProducts } from "@/lib/demo-data";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Category, PaymentMethod, Product, StorefrontData } from "@/lib/types";

interface DbCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  image_url: string | null;
  is_wholesale_only: boolean | null;
  display_order: number | null;
}

interface DbProduct {
  brand?: string | null;
  model?: string | null;
  sku?: string | null;
  image_urls?: string[] | null;
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category_id: string;
  image_url: string | null;
  retail_price: number | null;
  wholesale_price: number | null;
  wholesale_min_qty: number | null;
  stock: number | null;
  stock_verified_at?: string | null;
  specifications?: Record<string, string>;
  warranty_terms?: string | null;
  payment_methods: PaymentMethod[] | null;
  tags: string[] | null;
  is_featured: boolean | null;
  is_wholesale_only: boolean | null;
  categories: { name: string } | Array<{ name: string }> | null;
}

export const getStorefrontData = cache(async function getStorefrontData(options?: {
  categoryId?: string;
  admin?: boolean;
  limit?: number;
}): Promise<StorefrontData> {
  if (!hasSupabaseConfig()) {
    return {
      categories: demoCategories.filter(c => !isExcludedCategory(c.slug)),
      products: demoProducts.filter(p => !p.wholesaleOnly && !/iphone|smartphone|celular/i.test(p.title)),
      source: "demo",
    };
  }

  const supabase = await createServerSupabaseClient();

  const { data: categoriesData } = await supabase
    .from("categories")
    .select(
      "id, name, slug, parent_id, description, image_url, is_wholesale_only, display_order",
    )
    .order("display_order", { ascending: true });

  const buildProductsQuery = () => {
    let query = supabase
      .from("products")
      .select(
        "*, categories(name)",
      )
      .eq("is_active", true);

    if (!WHOLESALE_ENABLED && !options?.admin) query = query.eq("is_wholesale_only", false);
    if (options?.categoryId) {
      const childIds = ((categoriesData ?? []) as unknown as DbCategory[])
        .filter((c) => c.parent_id === options.categoryId)
        .map((c) => c.id);

      if (childIds.length > 0) {
        query = query.in("category_id", [options.categoryId, ...childIds]);
      } else {
        query = query.eq("category_id", options.categoryId);
      }
    }

    return query
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false }).order("id");
  };

  const productsData = options?.admin
    ? await readAllPages((from, to) => buildProductsQuery().range(from, to))
    : (await buildProductsQuery().limit(options?.limit ?? 24)).data ?? [];


  const categories = ((categoriesData ?? []) as unknown as DbCategory[]).map(
    mapCategory,
  );
  const excluded = new Set(categories.filter(c => isExcludedCategory(c.slug)).map(c => c.id));
  const products = ((productsData ?? []) as unknown as DbProduct[]).map(p => mapProduct(p, options?.admin)).filter(p => !excluded.has(p.categoryId) && !/iphone|smartphone|celular/i.test(p.title));

  return {
    categories: categories.filter(c => !isExcludedCategory(c.slug) && !excluded.has(c.parentId ?? "")),
    products,
    source: "supabase",
  };
});

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!hasSupabaseConfig()) {
    return demoProducts.find((p) => p.slug === slug) ?? null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, categories(name)",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data || (!WHOLESALE_ENABLED && data.is_wholesale_only) || /iphone|smartphone|celular/i.test(data.title)) return null;

  return mapProduct(data as unknown as DbProduct);
}

export function mapCategory(category: DbCategory): Category {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parent_id,
    description: /garant[ií]a oficial|stock inmediato|24\s*h|100%/i.test(category.description ?? "") ? "Consultá productos, disponibilidad y condiciones de compra." : (category.description ?? ""),
    imageUrl: category.image_url ?? "",
    wholesaleOnly: Boolean(category.is_wholesale_only),
    displayOrder: category.display_order ?? 0,
  };
}

export function mapProduct(product: DbProduct, admin = false): Product {
  const category = Array.isArray(product.categories)
    ? product.categories[0]
    : product.categories;

  return {
    id: product.id,
    slug: product.slug,
    title: cleanProductTitle(product.title),
    brand: product.brand ?? undefined,
    model: product.model ?? undefined,
    sku: product.sku ?? undefined,
    imageUrls: product.image_urls ?? [],
    stockVerifiedAt: product.stock_verified_at ?? null,
    specifications: product.specifications ?? {},
    warrantyTerms: product.warranty_terms ?? null,
    description: /Catálogo Oficial 2026|Formulación: Tratamiento dermatológico|100% Original Garantizado|Factura A o B/i.test(product.description ?? "") ? "Consultá la presentación, especificaciones y condiciones de este producto antes de comprar." : (product.description ?? ""),
    categoryId: product.category_id,
    categoryName: category?.name ?? "Catalogo",
    imageUrl: product.image_url ?? "",
    retailPrice: Number(product.retail_price ?? 0),
    wholesalePrice: (WHOLESALE_ENABLED || admin) ? Number(product.wholesale_price ?? 0) : 0,
    wholesaleMinQuantity: Number(product.wholesale_min_qty ?? 1),
    stock: Number(product.stock ?? 0),
    paymentMethods: product.payment_methods ?? ["transferencia"],
    tags: product.tags ?? [],
    featured: Boolean(product.is_featured),
    wholesaleOnly: Boolean(product.is_wholesale_only),
  };
}
