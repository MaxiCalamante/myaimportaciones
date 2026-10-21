export const UUID_PATTERN = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const salesStatuses = ['', 'pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'review'] as const;
export type SaleStatus = 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
export interface SaleLine { product_title: string; variant_title: string | null; quantity: number; unit_price?: number; variant_sku?: string | null; fulfillment_mode?: string }
export interface SaleSummary {
 id: string; profile_id: string | null; tracking_code: string; created_at: string; status: SaleStatus;
 total_amount: number; payment_method: string; shipping_name: string; customer_email: string;
 shipping_address: string; payment_review: boolean; account_name: string | null; account_email: string | null; items: SaleLine[];
}
export interface SalesList { total: number; revenue: number; pending: number; review: number; rows: SaleSummary[] }
export interface CustomerRecord {
 id: string; full_name: string; email: string; phone: string | null; role: string; created_at: string; business_name: string | null;
 favorites_count: number; cart_units: number; cart_updated_at: string | null; orders_count: number; total_paid: number;
}
export interface CustomerDirectory { total: number; with_favorites: number; with_cart: number; buyers: number; rows: CustomerRecord[] }
export function adminPageNumber(value?: string) { const n=Number(value); return Number.isInteger(n)&&n>0 ? Math.min(n,100000):1; }
export function adminDate(value?: string) {
 if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
 const date=new Date(`${value}T00:00:00Z`);
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value ? value:null;
}
export function allowedOrderStatuses(status: SaleStatus, method: string): SaleStatus[] {
 if (status==='pending') return method==='mercado_pago'?['pending','cancelled']:['pending','paid','cancelled'];
 if (status==='paid') return ['paid','preparing'];
 if (status==='preparing') return ['preparing','shipped'];
 if (status==='shipped') return ['shipped','delivered'];
 return [status];
}
