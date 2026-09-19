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

export async function getStorefrontData(): Promise<StorefrontData> {
  if (!hasSupabaseConfig()) {
    return {
      categories: demoCategories,
      products: demoProducts,
      source: "demo",
    };
  }

  const supabase = await createServerSupabaseClient();

  const [{ data: categoriesData }, { data: productsData }] = await Promise.all([
    supabase
      .from("categories")
      .select(
        "id, name, slug, parent_id, description, image_url, is_wholesale_only, display_order",
      )
      .order("display_order", { ascending: true }),
    supabase
      .from("products")
      .select(
        "id, slug, title, description, category_id, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, categories(name)",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

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
