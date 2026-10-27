import { WHOLESALE_ENABLED, cleanProductTitle } from "./commerce-policy";
import type { Category, PaymentMethod, Product } from "./types";
import { resolveVariantDimensions } from "./variant-preview";
// Public reads explicitly omit costs and supplier sources, including for signed-in admins.
export const PUBLIC_PRODUCT_COLUMNS = "id, slug, title, description, category_id, image_url, image_urls, retail_price, wholesale_price, wholesale_min_qty, stock, stock_verified_at, is_active, is_featured, is_wholesale_only, brand, model, sku, fulfillment_mode, supplier_available, tags, payment_methods, specifications, warranty_terms, has_variants, options_config, deleted_at, deleted_by";

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

export interface DbProductVariant {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  retail_price: number | null;
  wholesale_price: number | null;
  stock: number | null;
  stock_verified_at: string | null;
  fulfillment_mode: "own_stock" | "supplier" | null;
  supplier_available: boolean | null;
  image_url: string | null;
  is_active: boolean | null;
  options: Record<string, string> | null;
  display_order: number | null;
  created_at?: string;
  updated_at?: string;
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
  has_variants?: boolean | null;
  options_config?: { name: string; values: string[] }[] | null;
  product_variants?: DbProductVariant[] | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export function mapProductVariant(v: DbProductVariant): import("./types").ProductVariant {
  return {
    id: v.id,
    productId: v.product_id,
    title: v.title,
    sku: v.sku ?? undefined,
    retailPrice: Number(v.retail_price ?? 0),
    wholesalePrice: Number(v.wholesale_price ?? 0),
    stock: Number(v.stock ?? 0),
    stockVerifiedAt: v.stock_verified_at ?? null,
    fulfillmentMode: v.fulfillment_mode ?? "own_stock",
    supplierAvailable: Boolean(v.supplier_available),
    imageUrl: v.image_url ?? undefined,
    isActive: v.is_active ?? true,
    options: v.options && typeof v.options === "object" ? v.options : {},
    displayOrder: v.display_order ?? 0,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  };
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

export function mapProduct(product: DbProduct, admin = false, wholesale = false): Product {
  const category = Array.isArray(product.categories)
    ? product.categories[0]
    : product.categories;

  const rawVariants = Array.isArray(product.product_variants) ? product.product_variants : [];
  const variants = rawVariants.map(mapProductVariant);
  const activeVariants = variants.filter(v => admin || v.isActive);
  const activePrices = activeVariants.map(v => v.retailPrice).filter(p => p > 0);
  const minPrice = activePrices.length ? Math.min(...activePrices) : undefined;
  const maxPrice = activePrices.length ? Math.max(...activePrices) : undefined;
  const basePrice = Number(product.retail_price ?? 0);
  const effectiveRetailPrice = basePrice > 0 ? basePrice : (minPrice ?? 0);

  const hasVariants = Boolean(product.has_variants);
  const totalVariantStock = activeVariants.reduce((sum, v) => sum + v.stock, 0);
  const anyVariantVerified = activeVariants.some(v => Boolean(v.stockVerifiedAt) && v.stock > 0);
  const anySupplierAvailable = activeVariants.some(v => v.supplierAvailable);
  const effectiveStock = hasVariants ? totalVariantStock : Number(product.stock ?? 0);
  const effectiveStockVerifiedAt = hasVariants
    ? (anyVariantVerified ? (product.stock_verified_at || new Date().toISOString()) : null)
    : (product.stock_verified_at ?? null);
  const effectiveSupplierAvailable = hasVariants
    ? anySupplierAvailable
    : Boolean(product.supplier_available);

  return {
    id: product.id,
    ...(admin ? {
      sourceUrl: product.source_url ?? null,
      supplierLastCheckedAt: product.supplier_last_checked_at ?? null,
      supplierStockStatus: product.supplier_stock_status ?? null,
      supplierLivePrice: product.supplier_live_price !== null && product.supplier_live_price !== undefined ? Number(product.supplier_live_price) : null,
    } : {}),
    fulfillmentMode: product.fulfillment_mode ?? "own_stock",
    supplierAvailable: effectiveSupplierAvailable,
    active: product.is_active ?? true,
    slug: product.slug,
    title: admin ? product.title : cleanProductTitle(product.title),
    brand: product.brand ?? undefined,
    model: product.model ?? undefined,
    sku: product.sku ?? undefined,
    imageUrls: product.image_urls ?? [],
    stockVerifiedAt: effectiveStockVerifiedAt,
    specifications: product.specifications ?? {},
    warrantyTerms: product.warranty_terms ?? null,
    description: !admin && /Catálogo Oficial 2026|Formulación: Tratamiento dermatológico|100% Original Garantizado|Factura A o B/i.test(product.description ?? "") ? "Consultá la presentación, especificaciones y condiciones de este producto antes de comprar." : (product.description ?? ""),
    categoryId: product.category_id,
    categoryName: category?.name ?? "Catalogo",
    imageUrl: product.image_url ?? "",
    retailPrice: effectiveRetailPrice,
    wholesalePrice: (WHOLESALE_ENABLED || admin || wholesale) ? Number(product.wholesale_price ?? 0) : 0,
    wholesaleMinQuantity: Number(product.wholesale_min_qty ?? 1),
    stock: effectiveStock,
    paymentMethods: product.payment_methods ?? ["transferencia"],
    tags: product.tags ?? [],
    featured: Boolean(product.is_featured),
    wholesaleOnly: Boolean(product.is_wholesale_only),
    hasVariants,
    optionsConfig: hasVariants ? (admin && Array.isArray(product.options_config) ? product.options_config : resolveVariantDimensions(product.options_config, variants, admin)) : [],
    variants: activeVariants,
    minPrice,
    maxPrice,
    deletedAt: product.deleted_at ?? null,
    deletedBy: product.deleted_by ?? null,
  };
}
