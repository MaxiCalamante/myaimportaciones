-- Apply after schema.sql on a new database. Existing production is additive except access hardening.
-- Existing inventory is deliberately NOT marked verified by this migration.
alter table public.products add column if not exists stock_verified_at timestamptz;
alter table public.products add column if not exists specifications jsonb not null default '{}';
alter table public.products add column if not exists warranty_terms text;
alter table public.profiles add column if not exists business_name text;
alter table public.profiles add column if not exists cuit text;
alter table public.profiles add column if not exists is_approved_wholesale boolean not null default false;
alter table public.orders alter column profile_id drop not null;
alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists order_notes text;
alter table public.orders add column if not exists request_id uuid;
alter table public.orders add column if not exists request_hash text;
alter table public.orders add column if not exists discount_amount numeric not null default 0;
alter table public.orders add column if not exists reservation_expires_at timestamptz;
alter table public.orders add column if not exists reservation_released boolean not null default false;
alter table public.orders add column if not exists payment_id text;
alter table public.orders add column if not exists payment_url text;
alter table public.orders add column if not exists payment_preference_id text;
alter table public.orders add column if not exists payment_review boolean not null default false;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists shipping_option text;
alter table public.orders add column if not exists promotion text;
create unique index if not exists orders_request_id_unique on public.orders(request_id) where request_id is not null;
create unique index if not exists orders_payment_id_unique on public.orders(payment_id) where payment_id is not null;
create index if not exists orders_reservation_expiry on public.orders(reservation_expires_at) where status='pending';
create table if not exists public.product_costs (
 product_id uuid primary key references public.products(id) on delete cascade,
 origin_cost numeric not null check(origin_cost>0), currency text not null check(currency in ('ARS','USD','PYG')),
 exchange_rate numeric not null check(exchange_rate>0), freight_per_unit numeric not null default 0 check(freight_per_unit>=0),
 other_landed_cost numeric not null default 0 check(other_landed_cost>=0),
 landed_cost numeric generated always as (origin_cost*exchange_rate+freight_per_unit+other_landed_cost) stored,
 payment_fee_percent numeric not null default 0 check(payment_fee_percent>=0 and payment_fee_percent<100),
 variable_cost numeric not null default 0 check(variable_cost>=0), minimum_contribution numeric not null default 0 check(minimum_contribution>=0),
 supplier_url text, verified_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 ml_price numeric check(ml_price>0), ml_url text, ml_checked_at timestamptz
);
alter table public.product_costs enable row level security;
drop policy if exists "Admins manage product costs" on public.product_costs;
create policy "Admins manage product costs" on public.product_costs for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select,insert,update,delete on public.product_costs to authenticated,service_role;

create table if not exists public.withdrawal_requests (
 id uuid primary key default gen_random_uuid(), request_key uuid not null unique,
 reference text not null unique default ('ARR-'||upper(replace(gen_random_uuid()::text,'-',''))),
 order_code text not null, email text not null, reason text, created_at timestamptz not null default now(),
 status text not null default 'received' check(status in ('received','contacted','resolved'))
);
alter table public.withdrawal_requests enable row level security;
create policy "Admins manage withdrawal requests" on public.withdrawal_requests for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant all on public.withdrawal_requests to service_role;
grant select,update on public.withdrawal_requests to authenticated;

-- Remove broad guest order/item write policies, including policies created outside the repository.
do $$ declare pol record; begin
 for pol in select policyname,tablename from pg_policies where schemaname='public' and tablename in ('orders','order_items') loop
  execute format('drop policy %I on public.%I',pol.policyname,pol.tablename);
 end loop;
end $$;
create policy "Customers read their orders" on public.orders for select to authenticated using(profile_id=auth.uid());
create policy "Admins read orders" on public.orders for select to authenticated using(public.is_admin());
create policy "Customers read their items" on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.profile_id=auth.uid()));
create policy "Admins read items" on public.order_items for select to authenticated using(public.is_admin());
revoke insert,update,delete on public.orders,public.order_items from anon,authenticated;
grant select on public.orders,public.order_items to authenticated;
grant all on public.orders,public.order_items to service_role;
-- Old functions must not bypass stock or expose tracking data.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('decrement_product_stock','get_order_by_tracking','can_insert_order_item') loop
  execute format('revoke all on function %s from public,anon,authenticated', f.signature);
 end loop;
end $$;

create or replace function public.expire_retail_reservations_v2() returns integer language plpgsql security definer set search_path=public as $$
declare o record; affected integer:=0;
begin
 for o in select id from public.orders where status='pending' and reservation_expires_at<now() and not reservation_released order by id for update skip locked loop
  perform 1 from public.products where id in(select product_id from public.order_items where order_id=o.id) order by id for update;
  update public.products p set stock=p.stock+i.quantity from public.order_items i where i.order_id=o.id and p.id=i.product_id;
  update public.orders set status='cancelled',reservation_released=true where id=o.id;
  affected:=affected+1;
 end loop;
 return affected;
end $$;

create or replace function public.create_retail_order_v2(payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.orders; p public.products; line jsonb; oid uuid:=gen_random_uuid(); computed numeric:=0; count_items integer; qty integer;
begin
 if payload is null or not (payload ?& array['request_id','request_hash','payment','items','subtotal','discount','shipping','total','name','email']) or exists(select 1 from jsonb_each(payload) where key in ('request_id','request_hash','payment','items','subtotal','discount','shipping','total','name','email') and value='null'::jsonb) then raise exception 'Missing order fields'; end if;
 perform pg_advisory_xact_lock(hashtextextended(payload->>'request_id',0));
 select * into o from public.orders where request_id=(payload->>'request_id')::uuid;
 if found then
  if o.request_hash is distinct from payload->>'request_hash' then raise exception 'Idempotency mismatch'; end if;
  if o.status='cancelled' then raise exception 'Reservation expired'; end if;
  return to_jsonb(o);
 end if;
 if payload->>'payment' not in ('transferencia','mercado_pago','efectivo') or jsonb_typeof(payload->'items')<>'array' then raise exception 'Invalid order'; end if;
 count_items:=jsonb_array_length(payload->'items');
 if count_items<1 or count_items>50 or (select count(distinct x->>'id') from jsonb_array_elements(payload->'items') x)<>count_items then raise exception 'Invalid items'; end if;
 if length(trim(payload->>'name'))<2 or length(payload->>'email')<5 then raise exception 'Invalid customer'; end if;
 -- Lock all products in consistent order, preventing overselling and deadlocks.
 perform 1 from public.products where id in(select (x->>'id')::uuid from jsonb_array_elements(payload->'items') x) order by id for update;
 for line in select * from jsonb_array_elements(payload->'items') loop
  if (line->>'quantity') !~ '^[0-9]+$' then raise exception 'Invalid quantity'; end if;
  qty:=(line->>'quantity')::integer;
  select * into p from public.products where id=(line->>'id')::uuid;
  if not found or not p.is_active or p.is_wholesale_only or p.stock_verified_at is null or qty<1 or qty>100 or p.stock<qty or p.retail_price<=0 or p.retail_price<>(line->>'price')::numeric then raise exception 'Product unavailable or price changed'; end if;
  computed:=computed+p.retail_price*qty;
 end loop;
 if computed<>(payload->>'subtotal')::numeric or (payload->>'discount')::numeric<0 or (payload->>'discount')::numeric>computed or (payload->>'shipping')::numeric<0 or round(computed-(payload->>'discount')::numeric+(payload->>'shipping')::numeric,2)<>(payload->>'total')::numeric then raise exception 'Total mismatch'; end if;
 insert into public.orders(id,profile_id,status,customer_tier,payment_method,subtotal_amount,discount_amount,shipping_amount,total_amount,shipping_name,shipping_phone,shipping_address,customer_email,order_notes,tracking_code,request_id,request_hash,reservation_expires_at,shipping_option,promotion)
 values(oid,(payload->>'profile_id')::uuid,'pending','retail',(payload->>'payment')::public.payment_method,computed,(payload->>'discount')::numeric,(payload->>'shipping')::numeric,(payload->>'total')::numeric,payload->>'name',payload->>'phone',payload->>'address',payload->>'email',payload->>'notes','ORD-'||upper(replace(gen_random_uuid()::text,'-','')),(payload->>'request_id')::uuid,payload->>'request_hash',now()+case when payload->>'payment'='mercado_pago' then interval '30 minutes' else interval '24 hours' end,payload->>'shipping_option',payload->>'promotion');
 for line in select * from jsonb_array_elements(payload->'items') loop
  insert into public.order_items(order_id,product_id,product_title,quantity,unit_price) select oid,id,title,(line->>'quantity')::integer,retail_price from public.products where id=(line->>'id')::uuid;
  update public.products set stock=stock-(line->>'quantity')::integer where id=(line->>'id')::uuid;
 end loop;
 select * into o from public.orders where id=oid;
 return to_jsonb(o);
end $$;

create or replace function public.reconcile_retail_payment_v2(order_id_input uuid,payment_id_input text,amount_input numeric,status_input text) returns void language plpgsql security definer set search_path=public as $$
declare o public.orders;
begin
 select * into o from public.orders where id=order_id_input for update;
 if not found or o.payment_method<>'mercado_pago' or o.total_amount<>amount_input then raise exception 'Payment mismatch'; end if;
 if o.payment_id is not null and o.payment_id<>payment_id_input then
  update public.orders set payment_review=true where id=o.id; return;
 end if;
 if status_input='approved' then
  if o.reservation_released or o.status='cancelled' or (o.status='pending' and o.reservation_expires_at<now()) then
   update public.orders set payment_id=payment_id_input,payment_review=true where id=o.id; return;
  end if;
  update public.orders set payment_id=payment_id_input,paid_at=coalesce(paid_at,now()),status=case when status='pending' then 'paid'::public.order_status else status end where id=o.id;
 elsif status_input in ('refunded','charged_back') then
  update public.orders set payment_review=true,payment_id=payment_id_input where id=o.id;
 end if;
end $$;

create or replace function public.set_retail_order_status_v2(order_id_input uuid,status_input text) returns void language plpgsql security definer set search_path=public as $$
declare o public.orders;
begin
 if not public.is_admin() then raise exception 'Forbidden'; end if;
 select * into o from public.orders where id=order_id_input for update;
 if not found then raise exception 'Order not found'; end if;
 if o.status::text=status_input then return; end if;
 if (o.status='pending' and status_input='paid' and o.payment_method<>'mercado_pago' and not o.reservation_released and (o.reservation_expires_at is null or o.reservation_expires_at>now())) then
  update public.orders set status='paid',paid_at=now() where id=o.id;
 elsif (o.status='paid' and status_input='preparing') or (o.status='preparing' and status_input='shipped') or (o.status='shipped' and status_input='delivered') then
  update public.orders set status=status_input::public.order_status where id=o.id;
 elsif o.status='pending' and status_input='cancelled' then
  if o.reservation_expires_at is not null and not o.reservation_released then
   perform 1 from public.products where id in(select product_id from public.order_items where order_id=o.id) order by id for update;
   update public.products p set stock=p.stock+i.quantity from public.order_items i where i.order_id=o.id and p.id=i.product_id;
  end if;
  update public.orders set status='cancelled',reservation_released=true where id=o.id;
 else raise exception 'Invalid transition. Paid cancellations require refund review.';
 end if;
end $$;
revoke all on function public.create_retail_order_v2(jsonb),public.expire_retail_reservations_v2(),public.reconcile_retail_payment_v2(uuid,text,numeric,text),public.set_retail_order_status_v2(uuid,text) from public,anon,authenticated;
grant execute on function public.create_retail_order_v2(jsonb),public.expire_retail_reservations_v2(),public.reconcile_retail_payment_v2(uuid,text,numeric,text) to service_role;
grant execute on function public.set_retail_order_status_v2(uuid,text) to authenticated;

create or replace function public.verify_retail_inventory_v2(product_id_input uuid, stock_input integer, specifications_input jsonb, warranty_input text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() or stock_input is null or stock_input<0 or stock_input>100000 then raise exception 'Forbidden or invalid stock'; end if;
 perform 1 from public.products where id=product_id_input for update;
 if not found then raise exception 'Product missing'; end if;
 if exists(select 1 from public.order_items i join public.orders o on o.id=i.order_id where i.product_id=product_id_input and o.status='pending' and not o.reservation_released) then raise exception 'Resolve pending reservations before recount'; end if;
 update public.products set stock=stock_input,stock_verified_at=now(),specifications=specifications_input,warranty_terms=warranty_input where id=product_id_input;
end $$;
revoke all on function public.verify_retail_inventory_v2(uuid,integer,jsonb,text) from public,anon;
grant execute on function public.verify_retail_inventory_v2(uuid,integer,jsonb,text) to authenticated;

create table if not exists public.commerce_request_limits (key text primary key, window_start timestamptz not null, attempts integer not null);
alter table public.commerce_request_limits enable row level security;
create or replace function public.consume_commerce_request_v2(key_input text, limit_input integer) returns boolean language plpgsql security definer set search_path=public as $$
declare attempts_now integer;
begin
 if limit_input<1 or limit_input>100 or length(key_input)<>64 then return false; end if;
 insert into public.commerce_request_limits(key,window_start,attempts) values(key_input,now(),1)
 on conflict(key) do update set window_start=case when commerce_request_limits.window_start<now()-interval '10 minutes' then now() else commerce_request_limits.window_start end,
 attempts=case when commerce_request_limits.window_start<now()-interval '10 minutes' then 1 else least(commerce_request_limits.attempts+1,101) end returning attempts into attempts_now;
 delete from public.commerce_request_limits where window_start<now()-interval '1 day';
 return attempts_now<=limit_input;
end $$;
revoke all on function public.consume_commerce_request_v2(text,integer) from public,anon,authenticated;
grant execute on function public.consume_commerce_request_v2(text,integer) to service_role;

alter table public.orders add column if not exists carrier_tracking_code text;
create or replace function public.set_retail_carrier_tracking_v2(order_id_input uuid,code_input text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() or code_input is null or length(code_input)>160 then raise exception 'Forbidden or invalid tracking'; end if;
 update public.orders set carrier_tracking_code=trim(code_input) where id=order_id_input;
 if not found then raise exception 'Order missing'; end if;
end $$;
revoke all on function public.set_retail_carrier_tracking_v2(uuid,text) from public,anon;
grant execute on function public.set_retail_carrier_tracking_v2(uuid,text) to authenticated;
