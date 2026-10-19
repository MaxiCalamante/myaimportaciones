-- Migration: 20261019150000_product_variants_system.sql
-- Universal Product Variants System for MYA Importaciones
-- Supports simple products and products with 1, 2 or 3 option dimensions.
-- Safe, backwards-compatible, with atomic row-level concurrency protection.

begin;

-- 1. Extend products table with variant metadata
alter table public.products add column if not exists has_variants boolean not null default false;
alter table public.products add column if not exists options_config jsonb not null default '[]'::jsonb;

-- 2. Create product_variants table
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 250),
  sku text check (sku is null or length(trim(sku)) <= 100),
  retail_price numeric(12,2) not null check (retail_price >= 0),
  wholesale_price numeric(12,2) not null default 0 check (wholesale_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  stock_verified_at timestamptz,
  fulfillment_mode text not null default 'own_stock' check (fulfillment_mode in ('own_stock','supplier')),
  supplier_available boolean not null default false,
  image_url text,
  is_active boolean not null default true,
  options jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger for updated_at
drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

-- Indexes for performance
create index if not exists idx_product_variants_product_id on public.product_variants(product_id);
create index if not exists idx_product_variants_active on public.product_variants(product_id) where is_active;
create index if not exists idx_product_variants_sku on public.product_variants(sku) where sku is not null;

-- Prevent duplicate combination within the same product
create unique index if not exists idx_product_variants_unique_options 
  on public.product_variants(product_id, (options::text));

-- 3. Extend order_items table to link and snapshot variants immutably
alter table public.order_items add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
alter table public.order_items add column if not exists variant_title text;
alter table public.order_items add column if not exists variant_sku text;

-- 4. Row Level Security for product_variants
alter table public.product_variants enable row level security;

-- Public can view active variants of active products
drop policy if exists "Public read active product variants" on public.product_variants;
create policy "Public read active product variants" on public.product_variants
  for select to anon, authenticated
  using (
    is_active = true 
    and exists (
      select 1 from public.products p 
      where p.id = product_variants.product_id 
      and p.is_active = true
    )
  );

-- Admins can read all variants
drop policy if exists "Admins view all product variants" on public.product_variants;
create policy "Admins view all product variants" on public.product_variants
  for select to authenticated
  using (public.is_admin());

-- Admins can insert, update, delete variants
drop policy if exists "Admins insert product variants" on public.product_variants;
create policy "Admins insert product variants" on public.product_variants
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update product variants" on public.product_variants;
create policy "Admins update product variants" on public.product_variants
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete product variants" on public.product_variants;
create policy "Admins delete product variants" on public.product_variants
  for delete to authenticated
  using (public.is_admin());

grant select on public.product_variants to anon, authenticated;
grant all on public.product_variants to service_role;
grant insert, update, delete on public.product_variants to authenticated;

-- Ensure public access to products columns includes has_variants and options_config
grant select (
  id, category_id, title, slug, description, image_url, image_urls, retail_price,
  wholesale_price, wholesale_min_qty, stock, stock_verified_at, payment_methods, tags,
  is_featured, is_wholesale_only, is_active, brand, model, sku, specifications, warranty_terms,
  fulfillment_mode, supplier_available, created_at, updated_at, has_variants, options_config
) on public.products to anon, authenticated;

-- 5. Updated RPC for atomic retail reservation and ordering with variants support
create or replace function public.create_retail_order_v2(payload jsonb) 
returns jsonb language plpgsql security definer set search_path=public as $$
declare 
  o public.orders; 
  p public.products; 
  v public.product_variants;
  line jsonb; 
  oid uuid := gen_random_uuid(); 
  computed numeric := 0; 
  count_items integer; 
  qty integer;
  line_variant_id uuid;
  line_effective_price numeric;
  line_fulfillment text;
  line_title text;
  line_sku text;
begin
  if payload is null or not (payload ?& array['request_id','request_hash','payment','items','subtotal','discount','shipping','total','name','email']) or exists(select 1 from jsonb_each(payload) where key in ('request_id','request_hash','payment','items','subtotal','discount','shipping','total','name','email') and value='null'::jsonb) then 
    raise exception 'Missing order fields'; 
  end if;

  perform pg_advisory_xact_lock(hashtextextended(payload->>'request_id',0));

  select * into o from public.orders where request_id=(payload->>'request_id')::uuid;
  if found then
    if o.request_hash is distinct from payload->>'request_hash' then 
      raise exception 'Idempotency mismatch'; 
    end if;
    if o.status='cancelled' then 
      raise exception 'Reservation expired'; 
    end if;
    return to_jsonb(o);
  end if;

  if payload->>'payment' not in ('transferencia','mercado_pago','efectivo') or jsonb_typeof(payload->'items')<>'array' then 
    raise exception 'Invalid order'; 
  end if;

  count_items := jsonb_array_length(payload->'items');
  if count_items < 1 or count_items > 50 then 
    raise exception 'Invalid items count'; 
  end if;

  -- Ensure unique item lines in cart (distinct product_id + variant_id pair)
  if (select count(distinct coalesce(x->>'variant_id', x->>'id')) from jsonb_array_elements(payload->'items') x) <> count_items then 
    raise exception 'Duplicate items in cart'; 
  end if;

  if length(trim(payload->>'name')) < 2 or length(payload->>'email') < 5 then 
    raise exception 'Invalid customer'; 
  end if;

  -- Lock products in consistent order
  perform 1 from public.products 
  where id in (select (x->>'id')::uuid from jsonb_array_elements(payload->'items') x) 
  order by id for update;

  -- Lock variants in consistent order if present
  perform 1 from public.product_variants 
  where id in (
    select (x->>'variant_id')::uuid 
    from jsonb_array_elements(payload->'items') x 
    where x->>'variant_id' is not null and x->>'variant_id' <> ''
  ) 
  order by id for update;

  -- Validate each line item
  for line in select * from jsonb_array_elements(payload->'items') loop
    if (line->>'quantity') !~ '^[0-9]+$' then 
      raise exception 'Invalid quantity'; 
    end if;
    qty := (line->>'quantity')::integer;
    if qty < 1 or qty > 100 then 
      raise exception 'Quantity out of bounds'; 
    end if;

    select * into p from public.products where id=(line->>'id')::uuid;
    if not found or not p.is_active or p.is_wholesale_only then 
      raise exception 'Product unavailable'; 
    end if;

    if line->>'variant_id' is not null and line->>'variant_id' <> '' then
      line_variant_id := (line->>'variant_id')::uuid;
      select * into v from public.product_variants where id = line_variant_id and product_id = p.id;
      if not found or not v.is_active then 
        raise exception 'Variant unavailable for %', p.title; 
      end if;

      line_effective_price := v.retail_price;
      line_fulfillment := v.fulfillment_mode;

      if line_fulfillment = 'own_stock' and (v.stock_verified_at is null or v.stock < qty) then 
        raise exception 'Insufficient stock for variant %', v.title; 
      end if;

      if line_fulfillment = 'supplier' and not v.supplier_available then 
        raise exception 'Variant % not available from supplier', v.title; 
      end if;

      if line_effective_price <= 0 or line_effective_price <> (line->>'price')::numeric then 
        raise exception 'Price changed for variant %', v.title; 
      end if;

      line_title := p.title || ' (' || v.title || ')';
      line_sku := coalesce(v.sku, p.sku);
    else
      -- Simple product without variant
      line_variant_id := null;
      line_effective_price := p.retail_price;
      line_fulfillment := p.fulfillment_mode;

      if line_fulfillment = 'own_stock' and (p.stock_verified_at is null or p.stock < qty) then 
        raise exception 'Insufficient stock for %', p.title; 
      end if;

      if line_fulfillment = 'supplier' and not p.supplier_available then 
        raise exception 'Product % not available from supplier', p.title; 
      end if;

      if line_effective_price <= 0 or line_effective_price <> (line->>'price')::numeric then 
        raise exception 'Price changed for %', p.title; 
      end if;

      line_title := p.title;
      line_sku := p.sku;
    end if;

    computed := computed + line_effective_price * qty;
  end loop;

  if computed <> (payload->>'subtotal')::numeric 
     or (payload->>'discount')::numeric < 0 
     or (payload->>'discount')::numeric > computed 
     or (payload->>'shipping')::numeric < 0 
     or round(computed - (payload->>'discount')::numeric + (payload->>'shipping')::numeric, 2) <> (payload->>'total')::numeric then 
    raise exception 'Total mismatch'; 
  end if;

  insert into public.orders(
    id, profile_id, status, customer_tier, payment_method, 
    subtotal_amount, discount_amount, shipping_amount, total_amount, 
    shipping_name, shipping_phone, shipping_address, customer_email, 
    order_notes, tracking_code, request_id, request_hash, 
    reservation_expires_at, shipping_option, promotion
  )
  values(
    oid, 
    (payload->>'profile_id')::uuid, 
    'pending', 
    'retail', 
    (payload->>'payment')::public.payment_method, 
    computed, 
    (payload->>'discount')::numeric, 
    (payload->>'shipping')::numeric, 
    (payload->>'total')::numeric, 
    payload->>'name', 
    payload->>'phone', 
    payload->>'address', 
    payload->>'email', 
    payload->>'notes', 
    'ORD-' || upper(replace(gen_random_uuid()::text,'-','')), 
    (payload->>'request_id')::uuid, 
    payload->>'request_hash', 
    now() + case when payload->>'payment' = 'mercado_pago' then interval '30 minutes' else interval '24 hours' end, 
    payload->>'shipping_option', 
    payload->>'promotion'
  );

  for line in select * from jsonb_array_elements(payload->'items') loop
    qty := (line->>'quantity')::integer;
    if line->>'variant_id' is not null and line->>'variant_id' <> '' then
      line_variant_id := (line->>'variant_id')::uuid;
      select * into v from public.product_variants where id = line_variant_id;
      select * into p from public.products where id = (line->>'id')::uuid;

      insert into public.order_items(
        order_id, product_id, product_title, quantity, unit_price, 
        fulfillment_mode, variant_id, variant_title, variant_sku
      ) values (
        oid, p.id, p.title || ' (' || v.title || ')', qty, v.retail_price, 
        v.fulfillment_mode, v.id, v.title, coalesce(v.sku, p.sku)
      );

      if v.fulfillment_mode = 'own_stock' then
        update public.product_variants set stock = stock - qty where id = v.id;
      end if;
    else
      select * into p from public.products where id = (line->>'id')::uuid;

      insert into public.order_items(
        order_id, product_id, product_title, quantity, unit_price, 
        fulfillment_mode, variant_id, variant_title, variant_sku
      ) values (
        oid, p.id, p.title, qty, p.retail_price, 
        p.fulfillment_mode, null, null, p.sku
      );

      if p.fulfillment_mode = 'own_stock' then
        update public.products set stock = stock - qty where id = p.id;
      end if;
    end if;
  end loop;

  select * into o from public.orders where id = oid;
  return to_jsonb(o);
end $$;

-- 6. Updated reservation expiration to restore stock to variants when applicable
create or replace function public.expire_retail_reservations_v2() 
returns integer language plpgsql security definer set search_path=public as $$
declare 
  o record; 
  affected integer := 0;
begin
  for o in select id from public.orders 
           where status = 'pending' 
             and reservation_expires_at < now() 
             and not reservation_released 
           order by id for update skip locked loop

    -- Restore simple products stock
    perform 1 from public.products 
    where id in (select product_id from public.order_items where order_id = o.id and variant_id is null) 
    order by id for update;

    update public.products p 
    set stock = p.stock + i.quantity 
    from public.order_items i 
    where i.order_id = o.id and p.id = i.product_id and i.fulfillment_mode = 'own_stock' and i.variant_id is null;

    -- Restore variant stock
    perform 1 from public.product_variants 
    where id in (select variant_id from public.order_items where order_id = o.id and variant_id is not null) 
    order by id for update;

    update public.product_variants v 
    set stock = v.stock + i.quantity 
    from public.order_items i 
    where i.order_id = o.id and v.id = i.variant_id and i.fulfillment_mode = 'own_stock' and i.variant_id is not null;

    update public.orders set status = 'cancelled', reservation_released = true where id = o.id;
    affected := affected + 1;
  end loop;
  return affected;
end $$;

-- 7. Updated order status transition function to safely restore stock on cancellation
create or replace function public.set_retail_order_status_v2(order_id_input uuid, status_input text) 
returns void language plpgsql security definer set search_path=public as $$
declare 
  o public.orders;
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  select * into o from public.orders where id = order_id_input for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status::text = status_input then return; end if;

  if (o.status = 'pending' and status_input = 'paid' and o.payment_method <> 'mercado_pago' and not o.reservation_released and (o.reservation_expires_at is null or o.reservation_expires_at > now())) then
    update public.orders set status = 'paid', paid_at = now() where id = o.id;
  elsif (o.status = 'paid' and status_input = 'preparing') or (o.status = 'preparing' and status_input = 'shipped') or (o.status = 'shipped' and status_input = 'delivered') then
    update public.orders set status = status_input::public.order_status where id = o.id;
  elsif o.status = 'pending' and status_input = 'cancelled' then
    if o.reservation_expires_at is not null and not o.reservation_released then
      -- Simple products
      perform 1 from public.products 
      where id in (select product_id from public.order_items where order_id = o.id and variant_id is null) 
      order by id for update;

      update public.products p 
      set stock = p.stock + i.quantity 
      from public.order_items i 
      where i.order_id = o.id and p.id = i.product_id and i.fulfillment_mode = 'own_stock' and i.variant_id is null;

      -- Product variants
      perform 1 from public.product_variants 
      where id in (select variant_id from public.order_items where order_id = o.id and variant_id is not null) 
      order by id for update;

      update public.product_variants v 
      set stock = v.stock + i.quantity 
      from public.order_items i 
      where i.order_id = o.id and v.id = i.variant_id and i.fulfillment_mode = 'own_stock' and i.variant_id is not null;
    end if;
    update public.orders set status = 'cancelled', reservation_released = true where id = o.id;
  else 
    raise exception 'Invalid transition. Paid cancellations require refund review.';
  end if;
end $$;

commit;
