create extension if not exists pgcrypto;

do $$
begin
  create type public.account_role as enum ('admin', 'customer');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.customer_tier as enum ('retail', 'wholesale');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_status as enum (
    'pending',
    'paid',
    'preparing',
    'shipped',
    'delivered',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method as enum (
    'transferencia',
    'tarjeta',
    'mercado_pago',
    'efectivo',
    'cuenta_corriente'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  role public.account_role not null default 'customer',
  customer_tier public.customer_tier not null default 'retail',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_wholesale_only boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  title text not null,
  slug text not null unique,
  description text,
  image_url text,
  retail_price numeric(12,2) not null default 0,
  wholesale_price numeric(12,2) not null default 0,
  wholesale_min_qty integer not null default 1,
  stock integer not null default 0,
  payment_methods public.payment_method[] not null default array['transferencia'::public.payment_method],
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  is_wholesale_only boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, product_id)
);

create table if not exists public.cart_items (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  customer_tier public.customer_tier not null default 'retail',
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, product_id, customer_tier)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'pending',
  customer_tier public.customer_tier not null default 'retail',
  payment_method public.payment_method not null default 'transferencia',
  subtotal_amount numeric(12,2) not null default 0,
  shipping_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  shipping_name text,
  shipping_phone text,
  shipping_address text,
  tracking_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_title text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_tier text;
begin
  requested_tier := coalesce(new.raw_user_meta_data ->> 'customer_tier', 'retail');

  insert into public.profiles (id, email, full_name, customer_tier)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case
      when requested_tier = 'wholesale' then 'wholesale'::public.customer_tier
      else 'retail'::public.customer_tier
    end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.favorites enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can read categories" on public.categories;
create policy "Anyone can read categories"
on public.categories for select
using (true);

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
on public.categories for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can read active products" on public.products;
create policy "Anyone can read active products"
on public.products for select
using (is_active = true);

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
on public.products for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users manage own favorites" on public.favorites;
create policy "Users manage own favorites"
on public.favorites for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "Users manage own cart" on public.cart_items;
create policy "Users manage own cart"
on public.cart_items for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders"
on public.orders for select
using (auth.uid() = profile_id);

drop policy if exists "Users create own orders" on public.orders;
create policy "Users create own orders"
on public.orders for insert
with check (auth.uid() = profile_id);

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders"
on public.orders for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items"
on public.order_items for select
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.profile_id = auth.uid()
  )
);

drop policy if exists "Users create own order items" on public.order_items;
create policy "Users create own order items"
on public.order_items for insert
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.profile_id = auth.uid()
  )
);

drop policy if exists "Admins manage order items" on public.order_items;
create policy "Admins manage order items"
on public.order_items for all
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can read product images" on storage.objects;
create policy "Public can read product images"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "Admins upload product images" on storage.objects;
create policy "Admins upload product images"
on storage.objects for insert
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admins update product images" on storage.objects;
create policy "Admins update product images"
on storage.objects for update
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

-- Stock logs / audit table
create table if not exists public.stock_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  change_amount integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.stock_logs enable row level security;

drop policy if exists "Admins read stock_logs" on public.stock_logs;
create policy "Admins read stock_logs"
on public.stock_logs for select
using (public.is_admin());

create or replace function public.log_stock_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  diff integer;
  prev_stock integer;
  new_stock integer;
  log_reason text;
begin
  if tg_op = 'INSERT' then
    if new.stock = 0 then
      return new;
    end if;
    diff := new.stock;
    prev_stock := 0;
    new_stock := new.stock;
    log_reason := 'creacion';
  else
    diff := new.stock - old.stock;
    if diff = 0 then
      return new;
    end if;
    prev_stock := old.stock;
    new_stock := new.stock;
    
    log_reason := current_setting('app.stock_change_reason', true);
    if log_reason is null or log_reason = '' then
      if diff > 0 then
        log_reason := 'reposicion';
      else
        log_reason := 'ajuste_manual';
      end if;
    end if;
  end if;

  insert into public.stock_logs (product_id, change_amount, previous_stock, new_stock, reason)
  values (new.id, diff, prev_stock, new_stock, log_reason);

  return new;
end;
$$;

drop trigger if exists on_product_stock_change on public.products;
create trigger on_product_stock_change
  after insert or update of stock on public.products
  for each row execute function public.log_stock_change();

create or replace function public.decrement_product_stock(product_id uuid, qty integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.stock_change_reason', 'venta', true);

  update public.products
  set stock = stock - qty
  where id = product_id;
end;
$$;

