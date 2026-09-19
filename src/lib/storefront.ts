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
  payment_methods: PaymentMethod[] | null;
  tags: string[] | null;
  is_featured: boolean | null;
  is_wholesale_only: boolean | null;
  categories: { name: string } | Array<{ name: string }> | null;
}

export async function getStorefrontData(options?: {
  categoryId?: string;
}): Promise<StorefrontData> {
  if (!hasSupabaseConfig()) {
    return {
      categories: demoCategories,
      products: demoProducts,
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
        "id, slug, title, description, category_id, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, categories(name)",
      )
      .eq("is_active", true);

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
      .order("created_at", { ascending: false });
  };

  // Fetch up to 4,000 products concurrently in parallel ranges (bypasses PostgREST 1000 row cap)
  const [b0, b1, b2, b3] = await Promise.all([
    buildProductsQuery().range(0, 999),
    buildProductsQuery().range(1000, 1999),
    buildProductsQuery().range(2000, 2999),
    buildProductsQuery().range(3000, 3999),
  ]);

  const productsData = [
    ...(b0.data ?? []),
    ...(b1.data ?? []),
    ...(b2.data ?? []),
    ...(b3.data ?? []),
  ];

  const categories = ((categoriesData ?? []) as unknown as DbCategory[]).map(
    mapCategory,
  );
  const products = ((productsData ?? []) as unknown as DbProduct[]).map(
    mapProduct,
  );

  return {
    categories,
    products,
    source: "supabase",
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!hasSupabaseConfig()) {
    return demoProducts.find((p) => p.slug === slug) ?? null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, title, description, category_id, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, categories(name)",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return demoProducts.find((p) => p.slug === slug) ?? null;
  }

  return mapProduct(data as unknown as DbProduct);
}

function mapCategory(category: DbCategory): Category {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parent_id,
    description: category.description ?? "",
    imageUrl: category.image_url ?? "",
    wholesaleOnly: Boolean(category.is_wholesale_only),
    displayOrder: category.display_order ?? 0,
  };
}

function mapProduct(product: DbProduct): Product {
  const category = Array.isArray(product.categories)
    ? product.categories[0]
    : product.categories;

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description ?? "",
    categoryId: product.category_id,
    categoryName: category?.name ?? "Catalogo",
    imageUrl: product.image_url ?? "",
    retailPrice: Number(product.retail_price ?? 0),
    wholesalePrice: Number(product.wholesale_price ?? product.retail_price ?? 0),
    wholesaleMinQuantity: Number(product.wholesale_min_qty ?? 1),
    stock: Number(product.stock ?? 0),
    paymentMethods: product.payment_methods ?? ["transferencia"],
    tags: product.tags ?? [],
    featured: Boolean(product.is_featured),
    wholesaleOnly: Boolean(product.is_wholesale_only),
  };
}
