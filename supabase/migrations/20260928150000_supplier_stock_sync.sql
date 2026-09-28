-- Migration: 20260928150000_supplier_stock_sync.sql
-- Adds columns and helpers for automated supplier stock verification and real-time product control

alter table public.products add column if not exists supplier_last_checked_at timestamptz;
alter table public.products add column if not exists supplier_stock_status text default 'unknown';
alter table public.products add column if not exists supplier_live_price numeric;

create index if not exists idx_products_supplier_sync on public.products(fulfillment_mode, supplier_last_checked_at) where is_active;

-- RPC to update supplier sync results securely
create or replace function public.update_product_supplier_sync_v1(
  product_id_input uuid,
  available_input boolean,
  status_input text,
  live_price_input numeric default null
) returns void language plpgsql security definer set search_path=public as $$
begin
  update public.products
  set supplier_available = available_input,
      supplier_last_checked_at = now(),
      supplier_stock_status = status_input,
      supplier_live_price = coalesce(live_price_input, supplier_live_price),
      updated_at = now()
  where id = product_id_input;
end;
$$;

revoke all on function public.update_product_supplier_sync_v1(uuid, boolean, text, numeric) from public, anon;
grant execute on function public.update_product_supplier_sync_v1(uuid, boolean, text, numeric) to authenticated, service_role;
