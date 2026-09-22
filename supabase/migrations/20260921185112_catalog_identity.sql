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

-- Cost provenance and explicit completeness, separate from retail catalog data.
alter table public.product_costs add column if not exists source_document text;
alter table public.product_costs add column if not exists source_page integer;
alter table public.product_costs add column if not exists expenses_confirmed boolean not null default false;
create or replace function public.save_retail_financials_v1(payload jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare p public.products; purchase numeric; fx numeric; freight numeric; extra numeric; variable numeric; fee numeric; sale numeric; minimum_amount numeric;
begin
 if not public.is_admin() then raise exception 'Forbidden'; end if;
 if payload is null or not (payload ?& array['product_id','purchase','exchange','freight','other','variable','fee','sale','minimum','currency']) then raise exception 'Missing fields'; end if;
 purchase:=(payload->>'purchase')::numeric; fx:=(payload->>'exchange')::numeric; freight:=(payload->>'freight')::numeric; extra:=(payload->>'other')::numeric; variable:=(payload->>'variable')::numeric; fee:=(payload->>'fee')::numeric; sale:=(payload->>'sale')::numeric; minimum_amount:=(payload->>'minimum')::numeric;
 if purchase is null or fx is null or freight is null or extra is null or variable is null or fee is null or sale is null or minimum_amount is null or purchase<=0 or fx<=0 or freight<0 or extra<0 or variable<0 or fee<0 or fee>=100 or sale<=0 or minimum_amount<0 or greatest(purchase,fx,freight,extra,variable,sale,minimum_amount)>1000000000 then raise exception 'Invalid amounts'; end if;
 if payload->>'currency' not in ('ARS','USD','PYG') or (payload->>'currency'='ARS' and fx<>1) then raise exception 'Invalid currency'; end if;
 if sale*(1-fee/100)<purchase*fx+freight+extra+variable+minimum_amount then raise exception 'Sale price below recorded cost floor'; end if;
 select * into p from public.products where id=(payload->>'product_id')::uuid for update;
 if not found then raise exception 'Product missing'; end if;
 insert into public.product_costs(product_id,origin_cost,currency,exchange_rate,freight_per_unit,other_landed_cost,variable_cost,payment_fee_percent,minimum_contribution,expenses_confirmed,verified_at,updated_at)
 values(p.id,purchase,payload->>'currency',fx,freight,extra,variable,fee,minimum_amount,coalesce((payload->>'expenses_confirmed')::boolean,false),now(),now())
 on conflict(product_id) do update set origin_cost=excluded.origin_cost,currency=excluded.currency,exchange_rate=excluded.exchange_rate,freight_per_unit=excluded.freight_per_unit,other_landed_cost=excluded.other_landed_cost,variable_cost=excluded.variable_cost,payment_fee_percent=excluded.payment_fee_percent,minimum_contribution=excluded.minimum_contribution,expenses_confirmed=excluded.expenses_confirmed,verified_at=now(),updated_at=now();
 if payload->>'stock' is not null then
  if coalesce((payload->>'stock_confirmed')::boolean,false) is not true then raise exception 'Physical stock confirmation required'; end if;
  perform public.verify_retail_inventory_v2(p.id,(payload->>'stock')::integer,p.specifications,p.warranty_terms);
 end if;
 update public.products set retail_price=sale where id=p.id;
end $$;
revoke all on function public.save_retail_financials_v1(jsonb) from public,anon;
grant execute on function public.save_retail_financials_v1(jsonb) to authenticated;
