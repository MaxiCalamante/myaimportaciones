import type { PublicWholesaleOffer } from "./wholesale-v2";

export type AccountRole = "admin" | "customer";

export type CustomerTier = "retail" | "wholesale";

export type ProductChannel = "retail" | "wholesale";

export type OrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentMethod =
  | "transferencia"
  | "tarjeta"
  | "mercado_pago"
  | "efectivo"
  | "cuenta_corriente";

export type DataSource = "demo" | "supabase";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
  imageUrl: string;
  wholesaleOnly: boolean;
  displayOrder: number;
}

export interface ProductOptionDimension {
  name: string;
  values: string[];
}

export type CommercialStatus =
  | "AVAILABLE"
  | "OUT_OF_STOCK"
  | "UNKNOWN"
  | "STALE"
  | "HIDDEN"
  | "ARCHIVED"
  | "REVIEW_REQUIRED";

export interface ProductVariant {
  retailUsd?: string;
  wholesaleUsd?: string | null;
  wholesaleOffer?: PublicWholesaleOffer;
  priceVerified?: boolean;
  wholesalePriceVerified?: boolean;
  isPurchasable?: boolean;
  id: string;
  productId: string;
  title: string;
  sku?: string | null;
  retailPrice: number;
  wholesalePrice?: number;
  stock: number;
  stockVerifiedAt?: string | null;
  fulfillmentMode: "own_stock" | "supplier";
  supplierAvailable: boolean;
  commercialStatus?: CommercialStatus;
  outOfStockSince?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  options: Record<string, string>;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
  priceWarning?: string;
}

export interface Product {
  retailUsd?: string;
  wholesaleUsd?: string | null;
  wholesaleOffer?: PublicWholesaleOffer;
  priceVerified?: boolean;
  wholesalePriceVerified?: boolean;
  isPurchasable?: boolean;
  priceWarning?: string;
  sourceUrl?: string | null;
  supplierLastCheckedAt?: string | null;
  supplierStockStatus?: string | null;
  supplierLivePrice?: number | null;
  fulfillmentMode?: "own_stock" | "supplier";
  supplierAvailable?: boolean;
  commercialStatus?: CommercialStatus;
  outOfStockSince?: string | null;
  active?: boolean;
  brand?: string;
  model?: string;
  sku?: string;
  imageUrls?: string[];
  stockVerifiedAt?: string | null;
  specifications?: Record<string, string>;
  warrantyTerms?: string | null;
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  imageUrl: string;
  retailPrice: number;
  wholesalePrice: number;
  wholesaleMinQuantity: number;
  stock: number;
  paymentMethods: PaymentMethod[];
  tags: string[];
  featured: boolean;
  wholesaleOnly: boolean;
  hasVariants?: boolean;
  optionsConfig?: ProductOptionDimension[];
  variants?: ProductVariant[];
  minPrice?: number;
  maxPrice?: number;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface StorefrontData {
  error?: string;
  categories: Category[];
  products: Product[];
  source: DataSource;
}

export interface CustomerSummary {
  id: string;
  fullName: string;
  email: string;
  role: AccountRole;
  customerTier: CustomerTier;
  createdAt: string;
  ordersCount: number;
  totalSpent: number;
  businessName?: string;
  cuit?: string;
  isApprovedWholesale?: boolean;
}

export interface CartLine {
  product: Product;
  quantity: number;
  channel: ProductChannel;
  variantId?: string | null;
  variantTitle?: string | null;
  variantPrice?: number | null;
  variantImage?: string | null;
  variantSku?: string | null;
  selectedOptions?: Record<string, string>;
}

export interface OrderItemSummary {
  productTitle: string;
  quantity: number;
  unitPrice: number;
  variantId?: string | null;
  variantTitle?: string | null;
  variantSku?: string | null;
}

export interface OrderSummary {
  id: string;
  trackingCode?: string;
  carrierTrackingCode?: string;
  customerName: string;
  customerEmail: string;
  shippingPhone?: string;
  shippingAddress?: string;
  orderNotes?: string;
  channel: ProductChannel;
  status: OrderStatus;
  total: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  items: OrderItemSummary[];
}

export interface StockLog {
  id: string;
  productId: string;
  productTitle: string;
  changeAmount: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
}

export interface AdminDashboardData {
  source: DataSource;
  stats: {
    revenue: number;
    orders: number;
    customers: number;
    products: number;
  };
  customers: CustomerSummary[];
  orders: OrderSummary[];
  products: Product[];
  categories: Category[];
  stockLogs: StockLog[];
}
