alter table public.products add column if not exists fulfillment_mode text not null default 'own_stock' check (fulfillment_mode in ('own_stock','supplier'));
alter table public.products add column if not exists supplier_available boolean not null default false;
alter table public.order_items add column if not exists fulfillment_mode text not null default 'own_stock' check (fulfillment_mode in ('own_stock','supplier'));
-- Business owner confirmed supplier fulfillment for the active catalog on 2026-09-22.
-- Do not reinterpret physical inventory or old order reservations.
update public.products set fulfillment_mode='supplier',supplier_available=true where is_active and not is_wholesale_only and brand is not null and stock_verified_at is null;
create or replace function public.expire_retail_reservations_v2() returns integer language plpgsql security definer set search_path=public as $$
declare o record; affected integer:=0;
begin
 for o in select id from public.orders where status='pending' and reservation_expires_at<now() and not reservation_released order by id for update skip locked loop
  perform 1 from public.products where id in(select product_id from public.order_items where order_id=o.id) order by id for update;
  update public.products p set stock=p.stock+i.quantity from public.order_items i where i.order_id=o.id and p.id=i.product_id and i.fulfillment_mode='own_stock';
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
  if not found or not p.is_active or p.is_wholesale_only or qty<1 or qty>100 or (p.fulfillment_mode='own_stock' and (p.stock_verified_at is null or p.stock<qty)) or (p.fulfillment_mode='supplier' and not p.supplier_available) or p.retail_price<=0 or p.retail_price<>(line->>'price')::numeric then raise exception 'Product unavailable or price changed'; end if;
  computed:=computed+p.retail_price*qty;
 end loop;
 if computed<>(payload->>'subtotal')::numeric or (payload->>'discount')::numeric<0 or (payload->>'discount')::numeric>computed or (payload->>'shipping')::numeric<0 or round(computed-(payload->>'discount')::numeric+(payload->>'shipping')::numeric,2)<>(payload->>'total')::numeric then raise exception 'Total mismatch'; end if;
 insert into public.orders(id,profile_id,status,customer_tier,payment_method,subtotal_amount,discount_amount,shipping_amount,total_amount,shipping_name,shipping_phone,shipping_address,customer_email,order_notes,tracking_code,request_id,request_hash,reservation_expires_at,shipping_option,promotion)
 values(oid,(payload->>'profile_id')::uuid,'pending','retail',(payload->>'payment')::public.payment_method,computed,(payload->>'discount')::numeric,(payload->>'shipping')::numeric,(payload->>'total')::numeric,payload->>'name',payload->>'phone',payload->>'address',payload->>'email',payload->>'notes','ORD-'||upper(replace(gen_random_uuid()::text,'-','')),(payload->>'request_id')::uuid,payload->>'request_hash',now()+case when payload->>'payment'='mercado_pago' then interval '30 minutes' else interval '24 hours' end,payload->>'shipping_option',payload->>'promotion');
 for line in select * from jsonb_array_elements(payload->'items') loop
  insert into public.order_items(order_id,product_id,product_title,quantity,unit_price,fulfillment_mode) select oid,id,title,(line->>'quantity')::integer,retail_price,fulfillment_mode from public.products where id=(line->>'id')::uuid;
  update public.products set stock=stock-(line->>'quantity')::integer where id=(line->>'id')::uuid and fulfillment_mode='own_stock';
 end loop;
 select * into o from public.orders where id=oid;
 return to_jsonb(o);
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
   update public.products p set stock=p.stock+i.quantity from public.order_items i where i.order_id=o.id and p.id=i.product_id and i.fulfillment_mode='own_stock';
  end if;
  update public.orders set status='cancelled',reservation_released=true where id=o.id;
 else raise exception 'Invalid transition. Paid cancellations require refund review.';
 end if;
end $$;
create or replace function public.set_product_fulfillment_v1(product_id_input uuid,mode_input text,available_input boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() or mode_input is null or mode_input not in ('own_stock','supplier') or available_input is null then raise exception 'Forbidden or invalid mode'; end if;
 perform 1 from public.products where id=product_id_input for update;
 if not found then raise exception 'Product missing'; end if;
 if exists(select 1 from public.order_items i join public.orders o on o.id=i.order_id where i.product_id=product_id_input and o.status='pending' and not o.reservation_released) then raise exception 'Resolve reservations before switching fulfillment'; end if;
 update public.products set fulfillment_mode=mode_input,supplier_available=available_input,stock_verified_at=case when fulfillment_mode<>mode_input then null else stock_verified_at end where id=product_id_input;
end $$;
revoke all on function public.set_product_fulfillment_v1(uuid,text,boolean) from public,anon;
grant execute on function public.set_product_fulfillment_v1(uuid,text,boolean) to authenticated;
