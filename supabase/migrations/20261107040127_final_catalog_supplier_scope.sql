begin;

create table public.catalog_supplier_identity_checks (
  offer_id uuid primary key references public.supplier_offers(id),
  identity jsonb not null,
  method text not null check (method in ('gtin', 'manufacturer_model', 'exact_identity', 'admin_review')),
  checked_at timestamptz not null default now()
);

create table public.catalog_supplier_scope_runs (
  backup_sha256 text primary key check (backup_sha256 ~ '^[0-9a-f]{64}$'),
  completed_at timestamptz not null default now(),
  before_state jsonb not null,
  result jsonb not null
);

alter table public.catalog_supplier_identity_checks enable row level security;
alter table public.catalog_supplier_scope_runs enable row level security;
revoke all on public.catalog_supplier_identity_checks, public.catalog_supplier_scope_runs from public, anon, authenticated, service_role;

create function public.catalog_supplier_identity_v1(o public.supplier_offers, p public.products, v public.product_variants)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_array(o.product_id, o.variant_id, o.supplier_id, o.source_url, o.external_id,
    o.variant_key, coalesce(nullif(o.evidence->>'sourceTitle',''), o.title), o.model, o.brand, o.gtin,
    p.title, p.brand, p.model, p.sku, p.specifications, v.title, v.sku, v.options)
$$;

create function public.catalog_supplier_offer_valid_v1(offer_input uuid, as_of timestamptz default null)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from supplier_offers o
    join suppliers s on s.id = o.supplier_id
    join products p on p.id = o.product_id
    left join product_variants v on v.id = o.variant_id and v.product_id = p.id
    join catalog_supplier_identity_checks c on c.offer_id = o.id
    where o.id = offer_input and o.verification = 'verified' and o.archived_at is null
      and o.evidence->>'identityReview' is null
      and s.is_active and s.automation_authorized and s.archived_at is null
      and four_supplier_key_v1(s.website) = s.official_key and four_supplier_key_v1(o.source_url) = s.official_key
      and (o.variant_id is null or v.id is not null)
      and c.identity = catalog_supplier_identity_v1(o, p, v)
      and (as_of is null or (o.last_error is null and
        greatest(o.last_success_at, o.cost_checked_at, o.availability_checked_at) >= as_of - make_interval(hours => s.freshness_hours) and
        greatest(o.last_success_at, o.cost_checked_at, o.availability_checked_at) <= now() + interval '5 minutes'))
  )
$$;

create function public.catalog_has_supplier_v1(product_input uuid, variant_input uuid, as_of timestamptz default null)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from supplier_offers o where o.product_id = product_input
      and o.variant_id is not distinct from variant_input and o.verification = 'verified' and o.archived_at is null
      and catalog_supplier_offer_valid_v1(o.id, as_of)
  )
$$;

create function public.catalog_public_supplier_scope_v1(product_input uuid, variant_input uuid default null)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select not exists (select 1 from catalog_supplier_scope_runs) or exists (
    select 1 from products p where p.id = product_input and p.is_active and p.deleted_at is null
      and p.supplier_archived_at is null and case
        when variant_input is not null then exists (select 1 from product_variants v where v.id = variant_input
          and v.product_id = p.id and v.is_active and v.supplier_archived_at is null and catalog_has_supplier_v1(p.id, v.id))
        when p.has_variants or exists (select 1 from product_variants v where v.product_id = p.id) then
          exists (select 1 from product_variants v where v.product_id = p.id and v.is_active
            and v.supplier_archived_at is null and catalog_has_supplier_v1(p.id, v.id))
        else catalog_has_supplier_v1(p.id, null)
      end
  )
$$;

-- Keep the existing admin policies. Public reads are further constrained by exact supplier identity.
create policy catalog_supplier_products_read on public.products as restrictive for select to anon, authenticated
  using ((select is_admin()) or (deleted_at is null and catalog_public_supplier_scope_v1(id, null)));
create policy catalog_supplier_variants_read on public.product_variants as restrictive for select to anon, authenticated
  using ((select is_admin()) or catalog_public_supplier_scope_v1(product_id, id));

create function public.catalog_check_new_sale_v1(product_input uuid, variant_input uuid)
returns void language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if exists (select 1 from catalog_supplier_scope_runs) and (
    not catalog_public_supplier_scope_v1(product_input, variant_input) or
    not catalog_has_supplier_v1(product_input, variant_input, now()) or
    (variant_input is null and exists (select 1 from product_variants v where v.product_id = product_input))
  ) then
    raise exception 'Product unavailable: exact authorized supplier evidence required';
  end if;
end;
$$;

create function public.catalog_guard_new_order_item_v1()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform catalog_check_new_sale_v1(new.product_id, new.variant_id);
  return new;
end;
$$;
create trigger catalog_guard_new_order_item before insert on public.order_items
  for each row execute function public.catalog_guard_new_order_item_v1();

create function public.catalog_check_quote_items_v1(items_input jsonb)
returns void language plpgsql stable security definer set search_path = public, pg_temp as $$
declare item jsonb;
begin
  if jsonb_typeof(items_input) is distinct from 'array' or jsonb_array_length(items_input) not between 1 and 50 then
    raise exception 'Invalid checkout lines';
  end if;
  for item in select value from jsonb_array_elements(items_input) loop
    perform catalog_check_new_sale_v1((item->>'productId')::uuid, nullif(item->>'variantId','')::uuid);
  end loop;
end;
$$;

-- Explicit links created through the existing audited link RPC retain their identity proof.
create function public.catalog_check_new_link_v1()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare offer supplier_offers;
declare product products;
declare variant product_variants;
begin
  if new.status <> 'linked' or new.method not in ('gtin','manufacturer_model','exact_identity','admin_review') then return new; end if;
  select * into offer from supplier_offers where id = new.offer_id;
  if offer.verification is distinct from 'verified' or offer.archived_at is not null
    or offer.product_id is distinct from new.product_id or offer.variant_id is distinct from new.variant_id
    or new.evidence->>'sourceTitle' is distinct from coalesce(offer.evidence->>'sourceTitle', offer.title) then return new; end if;
  perform tracker_validate_url_v1(offer.supplier_id, offer.source_url);
  select * into product from products where id = offer.product_id;
  select * into variant from product_variants where id = offer.variant_id;
  insert into catalog_supplier_identity_checks(offer_id, identity, method)
  values(offer.id, catalog_supplier_identity_v1(offer, product, variant), new.method)
  on conflict (offer_id) do update set identity = excluded.identity, method = excluded.method, checked_at = now();
  return new;
end;
$$;
create trigger catalog_check_new_supplier_link after insert on public.supplier_link_decisions
  for each row execute function public.catalog_check_new_link_v1();

-- Use the same quote entry point on both sides of the application release.
do $$
declare definition text;
declare marker text;
declare signature text;
begin
  definition := pg_get_functiondef('public.store_checkout_prices_v1(jsonb,text,uuid)'::regprocedure);
  marker := 'if jsonb_typeof(items_input)';
  if position(marker in definition) = 0 then raise exception 'Store quote contract changed'; end if;
  execute replace(definition, marker, 'perform catalog_check_quote_items_v1(items_input); ' || marker);
  foreach signature in array array['supplier_checkout_basis_v1(uuid,uuid,numeric,numeric)', 'wholesale_quote_basis_impl_v1(uuid,uuid,integer,text,boolean)'] loop
    definition := pg_get_functiondef(('public.' || signature)::regprocedure);
    marker := 'and so.verification=''verified'' and so.availability=''in_stock''';
    if position(marker in definition) = 0 then raise exception 'Supplier checkout selection changed: %', signature; end if;
    execute replace(definition, marker,
      'and so.archived_at is null and (not exists (select 1 from catalog_supplier_scope_runs) or catalog_supplier_offer_valid_v1(so.id)) ' || marker);
  end loop;
end;
$$;

create function public.apply_final_catalog_scope_v1(plan jsonb, backup_sha256_input text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare product_ids uuid[];
declare variant_ids uuid[];
declare offer_ids uuid[];
declare parent_flags uuid[];
declare expected_products uuid[];
declare expected_variants uuid[];
declare before_state jsonb;
declare result jsonb;
declare approved_count integer;
declare as_of timestamptz := (plan->>'at')::timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('mya_final_catalog_supplier_scope', 0));
  select r.result into result from catalog_supplier_scope_runs r where r.backup_sha256 = backup_sha256_input;
  if found then return result; end if;
  if exists (select 1 from catalog_supplier_scope_runs) then raise exception 'Cleanup already applied'; end if;
  if as_of not between now() - interval '30 minutes' and now() + interval '5 minutes' then raise exception 'Refresh catalog snapshot'; end if;
  lock table suppliers, products, product_variants, supplier_offers in share row exclusive mode;

  insert into catalog_supplier_identity_checks(offer_id, identity, method)
  select o.id, a.identity, a.method
  from jsonb_to_recordset(plan->'checks') as a(id uuid, identity jsonb, method text)
  join supplier_offers o on o.id = a.id
  join suppliers s on s.id = o.supplier_id
  join products p on p.id = o.product_id
  left join product_variants v on v.id = o.variant_id and v.product_id = p.id
  where o.verification = 'verified' and o.archived_at is null and o.evidence->>'identityReview' is null
    and s.is_active and s.automation_authorized and s.archived_at is null
    and four_supplier_key_v1(s.website) = s.official_key and four_supplier_key_v1(o.source_url) = s.official_key
    and (o.variant_id is null or v.id is not null) and a.identity = catalog_supplier_identity_v1(o, p, v)
  on conflict (offer_id) do update set identity = excluded.identity, method = excluded.method, checked_at = now();
  get diagnostics approved_count = row_count;
  if approved_count <> jsonb_array_length(plan->'checks') then raise exception 'Offer identity changed after snapshot'; end if;

  select array(select p.id from products p where p.deleted_at is null and p.supplier_archived_at is null and not (case
    when p.has_variants or exists (select 1 from product_variants v where v.product_id = p.id) then exists (
      select 1 from product_variants v where v.product_id = p.id and v.is_active and v.supplier_archived_at is null
        and catalog_has_supplier_v1(p.id, v.id, as_of))
    else catalog_has_supplier_v1(p.id, null, as_of) end) order by p.id) into product_ids;
  select array(select v.id from product_variants v where v.supplier_archived_at is null and
    (v.product_id = any(product_ids) or not catalog_has_supplier_v1(v.product_id, v.id, as_of)) order by v.id) into variant_ids;
  select array(select value::uuid from jsonb_array_elements_text(plan->'products') order by value::uuid) into expected_products;
  select array(select value::uuid from jsonb_array_elements_text(plan->'variants') order by value::uuid) into expected_variants;
  if product_ids is distinct from expected_products or variant_ids is distinct from expected_variants then
    raise exception 'Catalog changed after snapshot (products %, variants %)', cardinality(product_ids), cardinality(variant_ids);
  end if;

  select array(select p.id from products p where p.is_active and p.deleted_at is null and not p.has_variants
    and p.id <> all(product_ids) and exists (select 1 from product_variants v where v.product_id = p.id and v.is_active and v.id <> all(variant_ids))) into parent_flags;
  select array(select o.id from supplier_offers o where o.archived_at is null and o.product_id is not null and (
    o.product_id = any(product_ids) or o.variant_id = any(variant_ids) or
    (o.verification = 'verified' and not catalog_supplier_offer_valid_v1(o.id)))) into offer_ids;

  before_state := jsonb_build_object(
    'products', (select coalesce(jsonb_agg(to_jsonb(p)), '[]') from products p where p.id = any(product_ids || parent_flags)),
    'variants', (select coalesce(jsonb_agg(to_jsonb(v)), '[]') from product_variants v where v.id = any(variant_ids)),
    'offers', (select coalesce(jsonb_agg(to_jsonb(o)), '[]') from supplier_offers o where o.id = any(offer_ids)),
    'legacy_queue', (select coalesce(jsonb_agg(to_jsonb(q)), '[]') from supplier_sync_queue q where q.product_id = any(product_ids) or q.variant_id = any(variant_ids))
  );

  update products set is_active = false, supplier_available = false, supplier_archived_at = now(),
    supplier_archive_reason = 'Sin vinculación exacta y vigente a proveedor autorizado', deleted_at = now()
    where id = any(product_ids);
  update product_variants set is_active = false, supplier_available = false, supplier_archived_at = now() where id = any(variant_ids);
  update products set has_variants = true where id = any(parent_flags);
  update supplier_offers set archived_at = now() where id = any(offer_ids);
  update supplier_sync_queue set state = 'blocked', leased_until = null, last_error = 'Identidad comercial archivada'
    where product_id = any(product_ids) or variant_id = any(variant_ids);

  result := jsonb_build_object('productsArchived', cardinality(product_ids), 'variantsArchived', cardinality(variant_ids),
    'offersArchived', cardinality(offer_ids), 'parentFlagsCorrected', cardinality(parent_flags),
    'productsActive', (select count(*) from products where is_active and deleted_at is null),
    'variantsActive', (select count(*) from product_variants v join products p on p.id = v.product_id where p.is_active and p.deleted_at is null and v.is_active));
  insert into catalog_supplier_scope_runs(backup_sha256, before_state, result) values(backup_sha256_input, before_state, result);
  return result;
end;
$$;

revoke all on function public.catalog_supplier_identity_v1(public.supplier_offers,public.products,public.product_variants),
  public.catalog_supplier_offer_valid_v1(uuid,timestamptz), public.catalog_has_supplier_v1(uuid,uuid,timestamptz),
  public.catalog_public_supplier_scope_v1(uuid,uuid), public.catalog_check_new_sale_v1(uuid,uuid),
  public.catalog_guard_new_order_item_v1(), public.catalog_check_quote_items_v1(jsonb),
  public.catalog_check_new_link_v1(), public.apply_final_catalog_scope_v1(jsonb,text) from public, anon, authenticated, service_role;
grant execute on function public.catalog_public_supplier_scope_v1(uuid,uuid) to anon, authenticated, service_role;
grant execute on function public.catalog_check_new_sale_v1(uuid,uuid), public.catalog_check_quote_items_v1(jsonb) to service_role;

commit;
