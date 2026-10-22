-- Migration: 20261022130000_cascade_product_deletes_and_admin_permissions.sql
-- Fix foreign key constraints on supplier automation tables to allow safe deletion of products and variants by admins.

begin;

-- 1. supplier_offers
alter table public.supplier_offers
  drop constraint if exists supplier_offers_product_id_fkey,
  add constraint supplier_offers_product_id_fkey
    foreign key (product_id) references public.products(id) on delete cascade;

alter table public.supplier_offers
  drop constraint if exists supplier_offers_variant_id_fkey,
  add constraint supplier_offers_variant_id_fkey
    foreign key (variant_id) references public.product_variants(id) on delete cascade;

-- 2. supplier_sync_queue
alter table public.supplier_sync_queue
  drop constraint if exists supplier_sync_queue_product_id_fkey,
  add constraint supplier_sync_queue_product_id_fkey
    foreign key (product_id) references public.products(id) on delete cascade;

alter table public.supplier_sync_queue
  drop constraint if exists supplier_sync_queue_variant_id_fkey,
  add constraint supplier_sync_queue_variant_id_fkey
    foreign key (variant_id) references public.product_variants(id) on delete cascade;

-- 3. supplier_market_references
alter table public.supplier_market_references
  drop constraint if exists supplier_market_references_product_id_fkey,
  add constraint supplier_market_references_product_id_fkey
    foreign key (product_id) references public.products(id) on delete cascade;

alter table public.supplier_market_references
  drop constraint if exists supplier_market_references_variant_id_fkey,
  add constraint supplier_market_references_variant_id_fkey
    foreign key (variant_id) references public.product_variants(id) on delete cascade;

-- 4. supplier_price_decisions
alter table public.supplier_price_decisions
  drop constraint if exists supplier_price_decisions_product_id_fkey,
  add constraint supplier_price_decisions_product_id_fkey
    foreign key (product_id) references public.products(id) on delete cascade;

-- 5. supplier_link_decisions
alter table public.supplier_link_decisions
  drop constraint if exists supplier_link_decisions_product_id_fkey,
  add constraint supplier_link_decisions_product_id_fkey
    foreign key (product_id) references public.products(id) on delete cascade;

alter table public.supplier_link_decisions
  drop constraint if exists supplier_link_decisions_variant_id_fkey,
  add constraint supplier_link_decisions_variant_id_fkey
    foreign key (variant_id) references public.product_variants(id) on delete cascade;

-- 6. Grant delete/update/insert permissions on supplier tables to authenticated admins
grant delete, update, insert on public.supplier_offers to authenticated;
grant delete, update, insert on public.supplier_sync_queue to authenticated;
grant delete, update, insert on public.supplier_market_references to authenticated;
grant delete, update, insert on public.supplier_price_decisions to authenticated;
grant delete, update, insert on public.supplier_link_decisions to authenticated;

-- Ensure admin RLS policies cover delete/update for authenticated
do $$
declare
  t text;
begin
  foreach t in array array['supplier_offers','supplier_sync_queue','supplier_market_references','supplier_price_decisions','supplier_link_decisions'] loop
    execute format('drop policy if exists admin_manage_policy on public.%I', t);
    execute format('create policy admin_manage_policy on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

commit;
