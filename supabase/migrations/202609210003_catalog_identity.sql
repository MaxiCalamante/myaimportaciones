alter table public.products add column if not exists brand text;
alter table public.products add column if not exists model text;
alter table public.products add column if not exists sku text;
alter table public.products add column if not exists image_urls text[] not null default '{}';
alter table public.products add column if not exists source_url text;
create index if not exists products_public_brand on public.products(brand) where is_active and not is_wholesale_only;
create or replace function public.public_catalog_facets() returns jsonb
language sql stable security invoker set search_path=public as $$
 select jsonb_build_object(
 'brands', coalesce((select jsonb_agg(b order by b.brand) from (select brand,count(*) as count from public.products where is_active and not is_wholesale_only and brand is not null group by brand)b),'[]'::jsonb),
 'categories',coalesce((select jsonb_agg(c) from (select category_id,count(*) as count from public.products where is_active and not is_wholesale_only group by category_id)c),'[]'::jsonb));
$$;
grant execute on function public.public_catalog_facets() to anon,authenticated;
