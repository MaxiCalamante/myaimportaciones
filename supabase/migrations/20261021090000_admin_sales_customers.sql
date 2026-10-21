-- Operational account cart snapshots are independent from optional marketing consent.
create table public.account_carts (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 items jsonb not null default '[]'::jsonb check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=50),
 updated_at timestamptz not null default now()
);
alter table public.account_carts enable row level security;
revoke all on public.account_carts from public,anon,authenticated;
grant select on public.account_carts to authenticated;
grant all on public.account_carts to service_role;
create policy "Own or admin cart snapshots" on public.account_carts for select to authenticated using(profile_id=auth.uid() or public.is_admin());
create policy "Admins read customer favorites" on public.favorites for select to authenticated using(public.is_admin());
create policy "Admins read customer email preferences" on public.email_preferences for select to authenticated using(public.is_admin());
create index if not exists orders_profile_created on public.orders(profile_id,created_at desc,id);

create function public.save_account_cart_v1(items_input jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare canonical jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if items_input is null or jsonb_typeof(items_input)<>'array' then raise exception 'Invalid cart'; end if;
 if jsonb_array_length(items_input)>50 then raise exception 'Invalid cart'; end if;
 if exists(select 1 from jsonb_array_elements(items_input) x where
   jsonb_typeof(x)<>'object' or coalesce(x->>'id','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
   or coalesce(x->>'quantity','') !~ '^[0-9]{1,3}$'
   or (x->>'variant_id' is not null and x->>'variant_id' !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$')) then raise exception 'Invalid cart lines'; end if;
 if exists(select 1 from jsonb_array_elements(items_input) x where (x->>'quantity')::int not between 1 and 100
   or not exists(select 1 from products p where p.id=(x->>'id')::uuid)
   or (x->>'variant_id' is not null and not exists(select 1 from product_variants v where v.id=(x->>'variant_id')::uuid and v.product_id=(x->>'id')::uuid))) then raise exception 'Invalid product or variant'; end if;
 if exists(select 1 from jsonb_array_elements(items_input) x group by lower(x->>'id'),lower(coalesce(x->>'variant_id','')) having count(*)>1) then raise exception 'Duplicate cart lines'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',(x->>'id')::uuid,'variant_id',(x->>'variant_id')::uuid,'quantity',(x->>'quantity')::int) order by x->>'id',x->>'variant_id'),'[]'::jsonb) into canonical from jsonb_array_elements(items_input) x;
 insert into account_carts(profile_id,items) values(auth.uid(),canonical)
 on conflict(profile_id) do update set items=excluded.items,updated_at=now() where account_carts.items is distinct from excluded.items;
end $$;
revoke all on function public.save_account_cart_v1(jsonb) from public,anon;
grant execute on function public.save_account_cart_v1(jsonb) to authenticated;

create function public.admin_sales_list_v1(q_input text default '',status_input text default '',page_input integer default 1,customer_input uuid default null,from_input date default null,to_input date default null)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare result jsonb; term text:=left(lower(trim(coalesce(q_input,''))),100); page_number int:=greatest(1,least(100000,coalesce(page_input,1)));
begin
 if not public.is_admin() then raise exception 'Admin required'; end if;
 if coalesce(status_input,'') not in ('','pending','paid','preparing','shipped','delivered','cancelled','review') then raise exception 'Invalid status'; end if;
 with filtered as (
  select o.id,o.profile_id,o.tracking_code,o.created_at,o.status,o.total_amount,o.payment_method,o.shipping_name,o.customer_email,o.shipping_address,o.payment_review,
   p.full_name as account_name,p.email as account_email,
   (select coalesce(jsonb_agg(jsonb_build_object('product_title',i.product_title,'variant_title',i.variant_title,'quantity',i.quantity) order by i.id),'[]'::jsonb) from order_items i where i.order_id=o.id) as items
  from orders o left join profiles p on p.id=o.profile_id
  where (coalesce(status_input,'')='' or (status_input='review' and o.payment_review) or o.status::text=status_input)
   and (customer_input is null or o.profile_id=customer_input)
   and (from_input is null or o.created_at >= (from_input::timestamp at time zone 'America/Argentina/Buenos_Aires'))
   and (to_input is null or o.created_at < ((to_input+1)::timestamp at time zone 'America/Argentina/Buenos_Aires'))
   and (term='' or position(term in lower(concat_ws(' ',o.tracking_code,o.shipping_name,o.customer_email,o.shipping_phone,p.full_name,p.email)))>0
    or exists(select 1 from order_items i where i.order_id=o.id and position(term in lower(concat_ws(' ',i.product_title,i.variant_title,i.variant_sku)))>0))
 ) select jsonb_build_object('total',count(*),'revenue',coalesce(sum(total_amount) filter(where status in ('paid','preparing','shipped','delivered')),0),
   'pending',count(*) filter(where status='pending'),'review',count(*) filter(where payment_review),
   'rows',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc),'[]'::jsonb) from (select * from filtered order by created_at desc,id desc limit 20 offset (page_number-1)*20)r)) into result from filtered;
 return result;
end $$;
revoke all on function public.admin_sales_list_v1(text,text,integer,uuid,date,date) from public,anon;
grant execute on function public.admin_sales_list_v1(text,text,integer,uuid,date,date) to authenticated;

create function public.admin_customer_directory_v1(q_input text default '',filter_input text default '',page_input integer default 1)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare result jsonb; term text:=left(lower(trim(coalesce(q_input,''))),100); page_number int:=greatest(1,least(100000,coalesce(page_input,1)));
begin
 if not public.is_admin() then raise exception 'Admin required'; end if;
 if coalesce(filter_input,'') not in ('','favorites','cart','buyers') then raise exception 'Invalid filter'; end if;
 with directory as (
  select p.id,p.full_name,p.email,p.phone,p.role,p.created_at,p.business_name,
   (select count(*) from favorites f where f.profile_id=p.id) as favorites_count,
   coalesce((select sum((x->>'quantity')::int) from account_carts c cross join lateral jsonb_array_elements(c.items) x where c.profile_id=p.id),0) as cart_units,
   (select updated_at from account_carts c where c.profile_id=p.id) as cart_updated_at,
   (select count(*) from orders o where o.profile_id=p.id) as orders_count,
   (select coalesce(sum(total_amount),0) from orders o where o.profile_id=p.id and o.status in ('paid','preparing','shipped','delivered')) as total_paid
  from profiles p where term='' or position(term in lower(concat_ws(' ',p.full_name,p.email,p.phone,p.business_name)))>0
 ), filtered as(select * from directory where coalesce(filter_input,'')='' or (filter_input='favorites' and favorites_count>0) or (filter_input='cart' and cart_units>0) or (filter_input='buyers' and total_paid>0))
 select jsonb_build_object('total',count(*),'with_favorites',count(*) filter(where favorites_count>0),'with_cart',count(*) filter(where cart_units>0),'buyers',count(*) filter(where total_paid>0),
  'rows',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc),'[]'::jsonb) from (select * from filtered order by created_at desc,id desc limit 20 offset (page_number-1)*20)r)) into result from filtered;
 return result;
end $$;
revoke all on function public.admin_customer_directory_v1(text,text,integer) from public,anon;
grant execute on function public.admin_customer_directory_v1(text,text,integer) to authenticated;
