import { WHOLESALE_ENABLED, cleanProductTitle } from "./commerce-policy";
import type { Category, PaymentMethod, Product } from "./types";
// Public reads explicitly omit costs and supplier sources, including for signed-in admins.
export const PUBLIC_PRODUCT_COLUMNS = "id, slug, title, description, category_id, image_url, image_urls, retail_price, wholesale_price, wholesale_min_qty, stock, stock_verified_at, is_active, is_featured, is_wholesale_only, brand, model, sku, fulfillment_mode, supplier_available, tags, payment_methods, specifications, warranty_terms";

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  image_url: string | null;
  is_wholesale_only: boolean | null;
  display_order: number | null;
}

export interface DbProduct {
  source_url?: string | null;
  supplier_last_checked_at?: string | null;
  supplier_stock_status?: string | null;
  supplier_live_price?: number | null;
  fulfillment_mode?: "own_stock" | "supplier";
  supplier_available?: boolean;
  is_active?: boolean;
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

export function mapCategory(category: DbCategory, admin = false): Category {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parent_id,
    description: !admin && /garant[ií]a oficial|stock inmediato|24\s*h|100%/i.test(category.description ?? "") ? "Consultá productos, disponibilidad y condiciones de compra." : (category.description ?? ""),
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
    ...(admin ? {
      sourceUrl: product.source_url ?? null,
      supplierLastCheckedAt: product.supplier_last_checked_at ?? null,
      supplierStockStatus: product.supplier_stock_status ?? null,
      supplierLivePrice: product.supplier_live_price !== null && product.supplier_live_price !== undefined ? Number(product.supplier_live_price) : null,
    } : {}),
    fulfillmentMode: product.fulfillment_mode ?? "own_stock",
    supplierAvailable: Boolean(product.supplier_available),
    active: product.is_active ?? true,
    slug: product.slug,
    title: admin ? product.title : cleanProductTitle(product.title),
    brand: product.brand ?? undefined,
    model: product.model ?? undefined,
    sku: product.sku ?? undefined,
    imageUrls: product.image_urls ?? [],
    stockVerifiedAt: product.stock_verified_at ?? null,
    specifications: product.specifications ?? {},
    warrantyTerms: product.warranty_terms ?? null,
    description: !admin && /Catálogo Oficial 2026|Formulación: Tratamiento dermatológico|100% Original Garantizado|Factura A o B/i.test(product.description ?? "") ? "Consultá la presentación, especificaciones y condiciones de este producto antes de comprar." : (product.description ?? ""),
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
