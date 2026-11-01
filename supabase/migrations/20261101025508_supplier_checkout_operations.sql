begin;

-- Costs and supplier evidence never join the customer-visible order_items table.
create table public.order_supply_snapshots (
  order_item_id uuid primary key references public.order_items(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  basis jsonb not null check (jsonb_typeof(basis)='object'),
  frozen_at timestamptz not null default now()
);
create index order_supply_snapshots_order on public.order_supply_snapshots(order_id);
alter table public.order_supply_snapshots enable row level security;
revoke all on public.order_supply_snapshots from public,anon,authenticated,service_role;
grant select on public.order_supply_snapshots to authenticated,service_role;
create policy admin_read on public.order_supply_snapshots for select to authenticated using ((select public.is_admin()));

create function public.prevent_order_supply_snapshot_change_v1() returns trigger language plpgsql set search_path=public as $$
begin raise exception 'Order supply snapshot is immutable'; end $$;
create trigger order_supply_snapshot_immutable before update on public.order_supply_snapshots
for each row execute function public.prevent_order_supply_snapshot_change_v1();
revoke all on function public.prevent_order_supply_snapshot_change_v1() from public,anon,authenticated,service_role;

-- Called under the reservation transaction's product/variant locks, or for a quote.
-- Verified manual/CSV evidence is valid too; automation authorization is unrelated to buying.
create function public.supplier_checkout_basis_v1(product_input uuid,variant_input uuid,price_input numeric,discount_input numeric default 0)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p products;v product_variants;c product_costs;o supplier_offers;s suppliers;mode text;expected_price numeric;net_price numeric;
begin
  if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
  select * into p from products where id=product_input;
  if not found or not p.is_active or p.is_wholesale_only or p.deleted_at is not null then raise exception 'Product unavailable'; end if;
  if variant_input is not null then
    select * into v from product_variants where id=variant_input and product_id=p.id;
    if not found or not v.is_active then raise exception 'Variant unavailable'; end if;
    mode:=v.fulfillment_mode;expected_price:=v.retail_price;
  else
    if p.has_variants then raise exception 'Select exact variant'; end if;
    mode:=p.fulfillment_mode;expected_price:=p.retail_price;
  end if;
  if expected_price<=0 or price_input is distinct from expected_price then raise exception 'Price changed'; end if;
  if mode<>'supplier' then return null; end if;
  if discount_input is null or discount_input<0 or discount_input>price_input then raise exception 'Invalid discount'; end if;
  select * into c from product_costs where product_id=p.id for share;
  if not found or not c.expenses_confirmed or c.verified_at is null or c.verified_at<now()-interval '30 days' or c.verified_at>now()+interval '5 minutes'
     or c.landed_cost is null or c.landed_cost<=0 or c.exchange_rate<=0 or c.variable_cost is null or c.payment_fee_percent is null or c.minimum_contribution is null then
    raise exception 'Supplier costs incomplete or expired';
  end if;
  -- Product costs belong to the same exact offer, currency and origin amount. A changed
  -- supplier quote cannot silently reuse a still-dated but obsolete landed-cost record.
  select so.* into o from supplier_offers so join suppliers sp on sp.id=so.supplier_id
   where so.product_id=p.id and so.variant_id is not distinct from variant_input
     and so.verification='verified' and so.availability='in_stock' and so.last_error is null and sp.is_active
     and so.origin_cost=c.origin_cost and so.currency=c.currency
     and nullif(c.supplier_url,'') is not null and so.source_url=c.supplier_url
     and so.cost_checked_at between now()-make_interval(hours=>sp.freshness_hours) and now()+interval '5 minutes'
     and so.availability_checked_at between now()-make_interval(hours=>sp.freshness_hours) and now()+interval '5 minutes'
   order by least(so.cost_checked_at,so.availability_checked_at) desc,so.id limit 1 for share of so,sp;
  if not found then raise exception 'Supplier offer evidence unavailable, changed or expired'; end if;
  select * into s from suppliers where id=o.supplier_id;
  net_price:=price_input-discount_input;
  if net_price-c.landed_cost-c.variable_cost-net_price*c.payment_fee_percent/100<c.minimum_contribution then
    raise exception 'Supplier contribution below confirmed minimum';
  end if;
  return jsonb_build_object('product_id',p.id,'variant_id',variant_input,'unit_price',price_input,'discount_per_unit',discount_input,
    'landed_cost',c.landed_cost,'variable_cost',c.variable_cost,'payment_fee_percent',c.payment_fee_percent,
    'minimum_contribution',c.minimum_contribution,'cost_verified_at',c.verified_at,'cost_currency',c.currency,'exchange_rate',c.exchange_rate,
    'freight_per_unit',c.freight_per_unit,'other_landed_cost',c.other_landed_cost,
    'offer',to_jsonb(o),'supplier',jsonb_build_object('id',s.id,'name',s.name,'freshness_hours',s.freshness_hours),'checked_at',now());
end $$;
revoke all on function public.supplier_checkout_basis_v1(uuid,uuid,numeric,numeric) from public,anon,authenticated,service_role;

create function public.supplier_checkout_quote_v1(items_input jsonb,payment_input text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare line jsonb;basis jsonb;result jsonb:='[]';
begin
  if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
  if jsonb_typeof(items_input) is distinct from 'array' or jsonb_array_length(items_input) not between 1 and 50 or payment_input not in ('transferencia','mercado_pago','efectivo') then raise exception 'Invalid supplier quote'; end if;
  for line in select * from jsonb_array_elements(items_input) loop
    basis:=supplier_checkout_basis_v1((line->>'id')::uuid,nullif(line->>'variant_id','')::uuid,(line->>'price')::numeric,0);
    if basis is not null then result:=result||jsonb_build_array(basis); end if;
  end loop;
  return result;
end $$;
revoke all on function public.supplier_checkout_quote_v1(jsonb,text) from public,anon,authenticated;
grant execute on function public.supplier_checkout_quote_v1(jsonb,text) to service_role;

-- Preserve all existing reservation, item snapshots, payment method and expiry behavior.
-- The base is inaccessible through the Data API after this additive guard is installed.
alter function public.create_retail_order_v2(jsonb) rename to create_retail_order_reserved_v2;
revoke all on function public.create_retail_order_reserved_v2(jsonb) from public,anon,authenticated,service_role;
create function public.create_retail_order_v2(payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare line jsonb;basis jsonb;all_basis jsonb:='[]';result jsonb;discount_unit numeric;item record;
begin
  if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
  if payload is null or nullif(payload->>'request_id','') is null then raise exception 'Missing order fields'; end if;
  perform pg_advisory_xact_lock(hashtextextended(payload->>'request_id',0));
  -- A retry returns the accepted snapshot even when the supplier or prices changed later.
  if exists(select 1 from orders where request_id=(payload->>'request_id')::uuid) then
    return create_retail_order_reserved_v2(payload);
  end if;
  if jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_array_length(payload->'items') not between 1 and 50 or (payload->>'subtotal')::numeric<=0 then raise exception 'Invalid order items'; end if;
  perform 1 from products where id in(select (x->>'id')::uuid from jsonb_array_elements(payload->'items') x) order by id for update;
  perform 1 from product_variants where id in(select nullif(x->>'variant_id','')::uuid from jsonb_array_elements(payload->'items') x) order by id for update;
  perform 1 from product_costs where product_id in(select (x->>'id')::uuid from jsonb_array_elements(payload->'items') x) order by product_id for share;
  for line in select * from jsonb_array_elements(payload->'items') loop
    discount_unit:=(line->>'price')::numeric*(payload->>'discount')::numeric/(payload->>'subtotal')::numeric;
    basis:=supplier_checkout_basis_v1((line->>'id')::uuid,nullif(line->>'variant_id','')::uuid,(line->>'price')::numeric,discount_unit);
    if basis is not null then all_basis:=all_basis||jsonb_build_array(basis); end if;
  end loop;
  result:=create_retail_order_reserved_v2(payload);
  for item in select * from order_items where order_id=(result->>'id')::uuid and fulfillment_mode='supplier' loop
    select x into basis from jsonb_array_elements(all_basis) x where x->>'product_id'=item.product_id::text and nullif(x->>'variant_id','')::uuid is not distinct from item.variant_id;
    if basis is null then raise exception 'Supplier cost snapshot missing'; end if;
    insert into order_supply_snapshots(order_item_id,order_id,basis)values(item.id,item.order_id,basis||jsonb_build_object('quantity',item.quantity,'payment_method',payload->>'payment'));
  end loop;
  return result;
end $$;
revoke all on function public.create_retail_order_v2(jsonb) from public,anon,authenticated;
grant execute on function public.create_retail_order_v2(jsonb) to service_role;

-- A refunded, duplicated or disputed payment cannot advance toward dispatch.
do $$declare definition text;marker text:='if o.status::text = status_input then return; end if;';begin
  definition:=pg_get_functiondef('public.set_retail_order_status_v2(uuid,text)'::regprocedure);
  if position(marker in definition)=0 then raise exception 'Order status function marker missing'; end if;
  definition:=replace(definition,marker,marker||E'\n  if o.payment_review and status_input in (''paid'',''preparing'',''shipped'',''delivered'') then raise exception ''Payment review required before fulfillment''; end if;');
  execute definition;
end $$;

-- Procurement and logistics are independent of the existing payment/order status.
create table public.order_supply_operations (
  order_item_id uuid primary key references public.order_items(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null default 'pending_supplier' check(status in ('pending_supplier','supplier_confirmed','purchased','in_transit','received','dispatched','delivered','blocked','cancelled')),
  supplier_id uuid references public.suppliers(id) on delete restrict,
  responsible text not null default '' check(length(responsible)<=200),
  estimated_cost numeric check(estimated_cost>=0),actual_cost numeric check(actual_cost>=0),
  tracking_code text not null default '' check(length(tracking_code)<=200),
  notes text not null default '' check(length(notes)<=2000),
  version integer not null default 0,updated_at timestamptz not null default now()
);
create index order_supply_operations_order on public.order_supply_operations(order_id);
create table public.order_supply_operation_history (
  id uuid primary key default gen_random_uuid(),order_item_id uuid not null references public.order_items(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  request_id uuid not null unique,request_hash text not null,
  before_value jsonb,after_value jsonb not null,actor uuid default auth.uid(),created_at timestamptz not null default now()
);
create index order_supply_operation_history_order on public.order_supply_operation_history(order_id,created_at);
do $$declare t text;begin
  foreach t in array array['order_supply_operations','order_supply_operation_history'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
    execute format('grant select on public.%I to authenticated,service_role',t);
    execute format('create policy admin_read on public.%I for select to authenticated using ((select public.is_admin()))',t);
  end loop;
end $$;
create function public.set_order_supply_operation_v1(order_item_input uuid,expected_version_input integer,request_id_input uuid,payload_input jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare i order_items;o orders;previous order_supply_operations;next_value order_supply_operations;history order_supply_operation_history;request_hash text;next_status text;sid uuid;allowed text[];
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  if request_id_input is null or expected_version_input is null or expected_version_input<0 or jsonb_typeof(payload_input) is distinct from 'object' then raise exception 'Invalid logistics update'; end if;
  request_hash:=md5(jsonb_build_object('item',order_item_input,'version',expected_version_input,'payload',payload_input)::text);
  perform pg_advisory_xact_lock(hashtextextended(request_id_input::text,0));
  select * into history from order_supply_operation_history where request_id=request_id_input;
  if found then
    if history.request_hash<>request_hash then raise exception 'Idempotency mismatch'; end if;
    return history.after_value;
  end if;
  select * into i from order_items where id=order_item_input;
  if not found or i.fulfillment_mode<>'supplier' then raise exception 'Supplier order item missing'; end if;
  select * into o from orders where id=i.order_id for update;
  select * into previous from order_supply_operations where order_item_id=i.id for update;
  if coalesce(previous.version,0)<>expected_version_input then raise exception 'Logistics version changed; reload order'; end if;
  next_status:=payload_input->>'status';sid:=nullif(payload_input->>'supplier_id','')::uuid;
  if next_status is null or next_status not in ('pending_supplier','supplier_confirmed','purchased','in_transit','received','dispatched','delivered','blocked','cancelled') then raise exception 'Invalid logistics status'; end if;
  if coalesce(length(payload_input->>'responsible'),0)>200 or coalesce(length(payload_input->>'tracking_code'),0)>200 or coalesce(length(payload_input->>'notes'),0)>2000 then raise exception 'Logistics field too long'; end if;
  if (payload_input->>'estimated_cost')::numeric<0 or (payload_input->>'actual_cost')::numeric<0
     or coalesce(payload_input->>'estimated_cost','') in ('NaN','Infinity','-Infinity') or coalesce(payload_input->>'actual_cost','') in ('NaN','Infinity','-Infinity') then raise exception 'Invalid logistics cost'; end if;
  if sid is not null and not exists(select 1 from suppliers where id=sid and is_active) then raise exception 'Supplier inactive'; end if;
  if sid is not null and not exists(select 1 from supplier_offers where supplier_id=sid and product_id=i.product_id and variant_id is not distinct from i.variant_id and verification='verified') then raise exception 'Supplier does not match exact order item'; end if;
  if next_status not in ('pending_supplier','blocked','cancelled') and (sid is null or length(trim(coalesce(payload_input->>'responsible','')))<2) then raise exception 'Supplier and responsible person required'; end if;
  if o.status='cancelled' and next_status not in ('blocked','cancelled') then raise exception 'Order cancelled'; end if;
  if next_status in ('purchased','in_transit','received','dispatched','delivered') and (o.status not in ('paid','preparing','shipped','delivered') or o.payment_review) then raise exception 'Confirmed payment without review required'; end if;
  allowed:=case coalesce(previous.status,'pending_supplier')
    when 'pending_supplier' then array['pending_supplier','supplier_confirmed','blocked','cancelled']
    when 'supplier_confirmed' then array['supplier_confirmed','purchased','blocked','cancelled']
    when 'purchased' then array['purchased','in_transit','received','blocked']
    when 'in_transit' then array['in_transit','received','blocked']
    when 'received' then array['received','dispatched','blocked']
    when 'dispatched' then array['dispatched','delivered','blocked']
    when 'delivered' then array['delivered','blocked']
    when 'blocked' then array['blocked','pending_supplier','cancelled']
    else array['cancelled'] end;
  if not(next_status=any(allowed)) then raise exception 'Invalid logistics transition'; end if;
  if next_status='blocked' and length(trim(coalesce(payload_input->>'notes','')))<3 then raise exception 'Explain logistics blocker'; end if;
  insert into order_supply_operations(order_item_id,order_id,status,supplier_id,responsible,estimated_cost,actual_cost,tracking_code,notes,version)
    values(i.id,i.order_id,next_status,sid,trim(coalesce(payload_input->>'responsible','')),(payload_input->>'estimated_cost')::numeric,(payload_input->>'actual_cost')::numeric,
      trim(coalesce(payload_input->>'tracking_code','')),trim(coalesce(payload_input->>'notes','')),coalesce(previous.version,0)+1)
    on conflict(order_item_id) do update set status=excluded.status,supplier_id=excluded.supplier_id,responsible=excluded.responsible,estimated_cost=excluded.estimated_cost,
      actual_cost=excluded.actual_cost,tracking_code=excluded.tracking_code,notes=excluded.notes,version=excluded.version,updated_at=now() returning * into next_value;
  insert into order_supply_operation_history(order_item_id,order_id,request_id,request_hash,before_value,after_value)
    values(i.id,i.order_id,request_id_input,request_hash,case when previous.order_item_id is null then null else to_jsonb(previous) end,to_jsonb(next_value));
  return to_jsonb(next_value);
end $$;
revoke all on function public.set_order_supply_operation_v1(uuid,integer,uuid,jsonb) from public,anon,service_role;
grant execute on function public.set_order_supply_operation_v1(uuid,integer,uuid,jsonb) to authenticated;

-- Refresh the evidence date even when the confirmed boolean did not change.
do $$ declare definition text;begin
 if to_regprocedure('public.refresh_supplier_availability_v1(uuid)') is not null then
  definition:=pg_get_functiondef('public.refresh_supplier_availability_v1(uuid)'::regprocedure);
  definition:=replace(definition,'and supplier_available is distinct from (available>0)','');
  execute definition;
 end if;
end $$;
grant select(supplier_last_checked_at) on public.products to anon,authenticated;
commit;
