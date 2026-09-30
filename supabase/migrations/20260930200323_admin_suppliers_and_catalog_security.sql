-- Local preparation only. No products, orders or commercial prices are changed.
begin;
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 200),
  contact_name text check (length(contact_name)<=200),
  phone text check (phone ~ '^[0-9]{8,15}$'),
  email text check (length(email)<=254),
  website text check (website like 'https://%'),
  notes text check (length(notes)<=5000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.suppliers enable row level security;
revoke all on public.suppliers from public, anon;
grant select, insert, update on public.suppliers to authenticated;
grant all on public.suppliers to service_role;
create policy "Admins manage suppliers" on public.suppliers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create trigger suppliers_set_updated_at before update on public.suppliers for each row execute function public.set_updated_at();

-- RLS is row-level: public active rows must also hide private columns at the Data API.
-- Authenticated admins read these via a checked RPC; all writes still use existing admin RLS.
revoke select on public.products from public, anon, authenticated;
grant select (id, category_id, title, slug, description, image_url, image_urls, retail_price,
  wholesale_price, wholesale_min_qty, stock, stock_verified_at, payment_methods, tags,
  is_featured, is_wholesale_only, is_active, brand, model, sku, specifications, warranty_terms,
  fulfillment_mode, supplier_available, created_at, updated_at) on public.products to anon, authenticated;
grant select on public.products to service_role;
create or replace function public.admin_catalog_page(
  offset_input integer default 0, limit_input integer default 1000,
  ids_input uuid[] default null, slugs_input text[] default null
) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  if offset_input is null or offset_input<0 or limit_input is null or limit_input<1 or limit_input>1000
    or coalesce(cardinality(ids_input),0)>200 or coalesce(cardinality(slugs_input),0)>200 then raise exception 'Invalid page'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from (
    select * from public.products where (ids_input is null or id=any(ids_input)) and (slugs_input is null or slug=any(slugs_input))
    order by is_featured desc,created_at desc,id offset offset_input limit limit_input
  ) p);
end $$;
revoke all on function public.admin_catalog_page(integer,integer,uuid[],text[]) from public,anon;
grant execute on function public.admin_catalog_page(integer,integer,uuid[],text[]) to authenticated;

-- The earlier supplier sync RPC was SECURITY DEFINER without a role check.
create or replace function public.update_product_supplier_sync_v1(
  product_id_input uuid, available_input boolean, status_input text, live_price_input numeric default null
) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() and coalesce(current_setting('role', true),'') <> 'service_role' then raise exception 'Forbidden'; end if;
  if available_input is null or status_input is null or length(status_input)>80 or live_price_input<0 then raise exception 'Invalid supplier check'; end if;
  update public.products set supplier_available=available_input, supplier_last_checked_at=now(), supplier_stock_status=status_input,
    supplier_live_price=coalesce(live_price_input,supplier_live_price), updated_at=now() where id=product_id_input;
  if not found then raise exception 'Product missing'; end if;
end $$;
revoke all on function public.update_product_supplier_sync_v1(uuid,boolean,text,numeric) from public,anon;
grant execute on function public.update_product_supplier_sync_v1(uuid,boolean,text,numeric) to authenticated,service_role;

-- Only newly uploaded files can be removed by admins. Existing media is retained when a photo is detached.
create policy "Admins remove product images" on storage.objects for delete to authenticated
  using (bucket_id='product-images' and (select public.is_admin()));
update storage.buckets set file_size_limit=750000, allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='product-images';
commit;
