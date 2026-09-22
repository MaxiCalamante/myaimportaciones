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

export interface Product {
  fulfillmentMode?: "own_stock" | "supplier";
  supplierAvailable?: boolean;
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
}

export interface StorefrontData {
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

export interface OrderItemSummary {
  productTitle: string;
  quantity: number;
  unitPrice: number;
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
