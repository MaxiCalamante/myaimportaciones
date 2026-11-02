begin;
-- A public sales channel is unrelated to account approval. Keep all cost snapshots private.
alter table public.order_items add column if not exists channel text not null default 'retail' check(channel in ('retail','wholesale'));
alter table public.order_items add column if not exists wholesale_policy_id uuid;
create table public.order_wholesale_snapshots(
 order_item_id uuid primary key references public.order_items(id) on delete cascade,
 order_id uuid not null references public.orders(id) on delete cascade,
 basis jsonb not null,created_at timestamptz not null default now()
);
alter table public.order_wholesale_snapshots enable row level security;
revoke all on public.order_wholesale_snapshots from public,anon,authenticated,service_role;
grant select on public.order_wholesale_snapshots to authenticated,service_role;
create policy admin_read on public.order_wholesale_snapshots for select to authenticated using((select public.is_admin()));
create trigger order_wholesale_snapshot_immutable before update on public.order_wholesale_snapshots for each row execute function public.prevent_order_supply_snapshot_change_v1();

create function public.create_wholesale_order_v1(payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o orders;p products;v product_variants;line jsonb;basis jsonb;policy jsonb;oid uuid:=gen_random_uuid();
 qty integer;n integer;unit numeric;mode text;title_value text;sku_value text;variant uuid;computed numeric:=0;wholesale_total numeric:=0;wholesale_units integer:=0;
 item_id uuid;all_basis jsonb:='[]';saved_basis jsonb;
begin
 if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden';end if;
 if payload is null or not(payload ?& array['request_id','request_hash','payment','items','subtotal','discount','shipping','total','name','email']) then raise exception 'Missing order fields';end if;
 perform pg_advisory_xact_lock(hashtextextended(payload->>'request_id',0));
 select * into o from orders where request_id=(payload->>'request_id')::uuid for update;
 if found then
  if o.request_hash is distinct from payload->>'request_hash' then raise exception 'Idempotency mismatch';end if;
  if o.status='cancelled' or o.reservation_expires_at<now() then raise exception 'Reservation expired';end if;
  return to_jsonb(o);
 end if;
 if payload->>'payment' not in('transferencia','mercado_pago') or jsonb_typeof(payload->'items') is distinct from 'array' then raise exception 'Invalid order';end if;
 n:=jsonb_array_length(payload->'items');
 if n not between 1 and 50 or(select count(distinct ((x->>'id')||':'||coalesce(x->>'variant_id',''))) from jsonb_array_elements(payload->'items')x)<>n then raise exception 'Invalid or duplicate items';end if;
 if length(btrim(payload->>'name'))<2 or length(payload->>'email')<5 or(payload->>'discount')::numeric is distinct from 0::numeric then raise exception 'Invalid customer or extra discount';end if;
 perform 1 from products where id in(select(x->>'id')::uuid from jsonb_array_elements(payload->'items')x) order by id for update;
 perform 1 from product_variants where id in(select nullif(x->>'variant_id','')::uuid from jsonb_array_elements(payload->'items')x) order by id for update;
 -- Policy is re-read under the reservation transaction; a browser policy never authorizes a sale.
 policy:=wholesale_public_policy_v1();
 for line in select * from jsonb_array_elements(payload->'items') loop
  if line->>'channel' is null or line->>'channel' not in('retail','wholesale') or coalesce(line->>'quantity','')!~'^[0-9]+$' then raise exception 'Invalid channel or quantity';end if;
  qty:=(line->>'quantity')::integer;if qty not between 1 and 100 then raise exception 'Quantity out of bounds';end if;
  select * into p from products where id=(line->>'id')::uuid;
  if not found or not p.is_active or p.deleted_at is not null then raise exception 'Product unavailable';end if;
  variant:=nullif(line->>'variant_id','')::uuid;
  if variant is not null then
   select * into v from product_variants where id=variant and product_id=p.id;
   if not found or not v.is_active then raise exception 'Variant unavailable';end if;
   unit:=v.retail_price;mode:=v.fulfillment_mode;title_value:=p.title||' ('||v.title||')';sku_value:=coalesce(v.sku,p.sku);
   if mode='own_stock' and(v.stock_verified_at is null or v.stock<qty)then raise exception 'Insufficient stock';end if;
   if mode='supplier' and not v.supplier_available then raise exception 'Supplier confirmation required';end if;
  else
   if p.has_variants then raise exception 'Select exact variant';end if;
   unit:=p.retail_price;mode:=p.fulfillment_mode;title_value:=p.title;sku_value:=p.sku;
   if mode='own_stock' and(p.stock_verified_at is null or p.stock<qty)then raise exception 'Insufficient stock';end if;
   if mode='supplier' and not p.supplier_available then raise exception 'Supplier confirmation required';end if;
  end if;
  if line->>'channel'='wholesale' then
   basis:=wholesale_quote_basis_v1(p.id,variant,qty,payload->>'payment');
   if basis->>'status' is distinct from 'ready' then raise exception 'Wholesale confirmation required';end if;
   unit:=(basis->>'unit_price')::numeric;wholesale_total:=wholesale_total+unit*qty;wholesale_units:=wholesale_units+qty;
  else
   if p.is_wholesale_only then raise exception 'Product unavailable for retail';end if;
   basis:=supplier_checkout_basis_v1(p.id,variant,unit,0);
  end if;
  if unit is null or unit<=0 or unit is distinct from(line->>'price')::numeric then raise exception 'Price changed';end if;
  all_basis:=all_basis||jsonb_build_array(jsonb_build_object('product_id',p.id,'variant_id',variant,'channel',line->>'channel','basis',basis));
  computed:=computed+unit*qty;
 end loop;
 if wholesale_units=0 then raise exception 'Wholesale items required';end if;
 if (policy->>'minAmountArs')::numeric is null or(policy->>'minUnits')::integer is null or(wholesale_total<(policy->>'minAmountArs')::numeric and wholesale_units<(policy->>'minUnits')::integer) then raise exception 'Wholesale minimum not met';end if;
 if computed is distinct from(payload->>'subtotal')::numeric or coalesce((payload->>'shipping')::numeric,-1)<0 or round(computed+(payload->>'shipping')::numeric,2)is distinct from(payload->>'total')::numeric then raise exception 'Total mismatch';end if;
 insert into orders(id,profile_id,status,customer_tier,payment_method,subtotal_amount,discount_amount,shipping_amount,total_amount,shipping_name,shipping_phone,shipping_address,customer_email,order_notes,tracking_code,request_id,request_hash,reservation_expires_at,shipping_option,promotion)
 values(oid,nullif(payload->>'profile_id','')::uuid,'pending','wholesale',(payload->>'payment')::payment_method,computed,0,(payload->>'shipping')::numeric,(payload->>'total')::numeric,payload->>'name',payload->>'phone',payload->>'address',payload->>'email',payload->>'notes','ORD-'||upper(replace(gen_random_uuid()::text,'-','')),(payload->>'request_id')::uuid,payload->>'request_hash',now()+case when payload->>'payment'='mercado_pago' then interval '30 minutes' else interval '24 hours' end,payload->>'shipping_option','Precios mayoristas verificados');
 for line in select * from jsonb_array_elements(payload->'items') loop
  qty:=(line->>'quantity')::integer;variant:=nullif(line->>'variant_id','')::uuid;
  select * into p from products where id=(line->>'id')::uuid;
  if variant is not null then select * into v from product_variants where id=variant;mode:=v.fulfillment_mode;title_value:=p.title||' ('||v.title||')';sku_value:=coalesce(v.sku,p.sku);
  else mode:=p.fulfillment_mode;title_value:=p.title;sku_value:=p.sku;end if;
  select x->'basis' into saved_basis from jsonb_array_elements(all_basis)x where x->>'product_id'=p.id::text and nullif(x->>'variant_id','')::uuid is not distinct from variant;
  insert into order_items(order_id,product_id,product_title,quantity,unit_price,fulfillment_mode,variant_id,variant_title,variant_sku,channel,wholesale_policy_id)
  values(oid,p.id,title_value,qty,(line->>'price')::numeric,mode,variant,case when variant is not null then v.title end,sku_value,line->>'channel',case when line->>'channel'='wholesale' then(saved_basis->>'policy_id')::uuid end)returning id into item_id;
  if line->>'channel'='wholesale' then insert into order_wholesale_snapshots(order_item_id,order_id,basis)values(item_id,oid,saved_basis);
  elsif mode='supplier' then insert into order_supply_snapshots(order_item_id,order_id,basis)values(item_id,oid,saved_basis||jsonb_build_object('quantity',qty,'payment_method',payload->>'payment'));end if;
  if mode='own_stock' then
   if variant is null then update products set stock=stock-qty where id=p.id;
   else update product_variants set stock=stock-qty where id=variant;end if;
  end if;
 end loop;
 select * into o from orders where id=oid;return to_jsonb(o);
end$$;
revoke all on function public.create_wholesale_order_v1(jsonb)from public,anon,authenticated;
grant execute on function public.create_wholesale_order_v1(jsonb)to service_role;

-- Requests are not paid orders and never reserve stock or create a payment preference.
create table public.wholesale_checkout_requests(
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,request_hash text not null,
 reference text not null unique default('SOL-'||upper(replace(gen_random_uuid()::text,'-',''))),
 profile_id uuid references public.profiles(id),contact jsonb not null,selection jsonb not null,
 status text not null default 'pending_confirmation' check(status in('pending_confirmation','confirmed','rejected')),
 reasons jsonb not null default '[]',review_notes text not null default '',reviewed_at timestamptz,reviewed_by uuid,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.wholesale_checkout_requests enable row level security;
revoke all on public.wholesale_checkout_requests from public,anon,authenticated,service_role;
grant select on public.wholesale_checkout_requests to authenticated,service_role;
create policy admin_read on public.wholesale_checkout_requests for select to authenticated using((select public.is_admin()));
create function public.create_wholesale_request_v1(payload jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r wholesale_checkout_requests;
begin
 if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden';end if;
 if jsonb_typeof(payload->'selection')is distinct from 'array' or jsonb_array_length(payload->'selection')not between 1 and 50 or length(payload->'contact'->>'email')<5 or length(payload->'contact'->>'name')<2 then raise exception 'Invalid request';end if;
 perform pg_advisory_xact_lock(hashtextextended(payload->>'request_id',0));
 select * into r from wholesale_checkout_requests where request_id=(payload->>'request_id')::uuid;
 if found then if r.request_hash is distinct from payload->>'request_hash' then raise exception 'Idempotency mismatch';end if;
 else insert into wholesale_checkout_requests(request_id,request_hash,profile_id,contact,selection,reasons)
 values((payload->>'request_id')::uuid,payload->>'request_hash',nullif(payload->>'profile_id','')::uuid,payload->'contact',payload->'selection',coalesce(payload->'reasons','[]'))returning * into r;end if;
 return jsonb_build_object('reference',r.reference,'status',r.status);
end$$;
revoke all on function public.create_wholesale_request_v1(jsonb)from public,anon,authenticated;
grant execute on function public.create_wholesale_request_v1(jsonb)to service_role;
create function public.review_wholesale_request_v1(id_input uuid,status_input text,notes_input text)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r wholesale_checkout_requests;line jsonb;basis jsonb;actor uuid:=auth.uid();
begin
 if not public.is_admin()then raise exception 'Forbidden';end if;
 if status_input not in('confirmed','rejected','pending_confirmation')or length(notes_input)>2000 then raise exception 'Invalid request review';end if;
 select * into r from wholesale_checkout_requests where id=id_input for update;if not found then raise exception 'Request missing';end if;
 if status_input='confirmed' then
  for line in select * from jsonb_array_elements(r.selection)loop
   if line->>'channel'='wholesale' then
    -- The pricing engine grants no public access to cost data. This definer invokes it internally.
    basis:=wholesale_quote_basis_v1((line->>'productId')::uuid,nullif(line->>'variantId','')::uuid,(line->>'quantity')::integer,'mercado_pago');
    if basis->>'status'is distinct from 'ready' then raise exception 'Wholesale request still requires current cost and availability';end if;
   end if;
  end loop;
 end if;
 update wholesale_checkout_requests set status=status_input,review_notes=coalesce(notes_input,''),reviewed_at=now(),reviewed_by=actor,updated_at=now()where id=r.id;
end$$;
revoke all on function public.review_wholesale_request_v1(uuid,text,text)from public,anon,service_role;
grant execute on function public.review_wholesale_request_v1(uuid,text,text)to authenticated;
commit;
