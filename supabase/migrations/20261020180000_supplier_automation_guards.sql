begin;
-- Preserve the existing, explicitly delegated 3% exception for the historical USA electronics.
with recursive electronic_categories as (
 select id from categories where slug='electronica'
 union all select c.id from categories c join electronic_categories e on c.parent_id=e.id
), exceptions as (
 select coalesce(jsonb_object_agg(p.id::text,3),'{}'::jsonb) discounts from products p
 where p.category_id in(select id from electronic_categories) and p.source_url ~ '^https://(www\.)?atacadousa\.com\.py/'
)
update supplier_tracking_settings set config=config||jsonb_build_object('productDiscountPercent',exceptions.discounts) from exceptions where id=true;
-- A live pause also applies to a worker that started before the admin changed configuration.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.refresh_supplier_availability_v1(uuid)'::regprocedure);
 definition:=replace(definition,'for v in select null::uuid as id',
  'if not exists(select 1 from supplier_tracking_settings where id=true and config->>''enabled''=''true'' and config->>''autoStock''=''true'') then return false; end if; for v in select null::uuid as id');
 execute definition;
 definition:=pg_get_functiondef('public.apply_supplier_price_v1(uuid,uuid,uuid,numeric,numeric,numeric,jsonb)'::regprocedure);
 definition:=replace(definition,'if not coalesce((cfg->>''autoPrices'')::boolean,false)',
  'if not coalesce((cfg->>''enabled'')::boolean,false) or not coalesce((cfg->>''autoPrices'')::boolean,false)');
 definition:=replace(definition,'(cfg->>''marketDiscountPercent'')::numeric',
  'coalesce((cfg->''productDiscountPercent''->>p.id::text)::numeric,(cfg->>''marketDiscountPercent'')::numeric)');
 execute definition;
end $$;
create function public.approve_supplier_price_v1(decision_input uuid,confirmed_input boolean) returns void language plpgsql security definer set search_path=public as $$
declare d supplier_price_decisions;p products;o supplier_offers;r supplier_market_references;cfg jsonb;
begin
 if not public.is_admin() or confirmed_input is distinct from true then raise exception 'Forbidden'; end if;
 select * into d from supplier_price_decisions where id=decision_input for update;
 if not found or d.status<>'proposal' then raise exception 'Proposal missing or already reviewed'; end if;
 select * into p from products where id=d.product_id for update;
 select * into o from supplier_offers where id=d.offer_id;
 select * into r from supplier_market_references where id=d.reference_id;
 select config into cfg from supplier_tracking_settings where id=true;
 if p.retail_price is distinct from d.old_price or not p.is_active or exists(select 1 from product_variants where product_id=p.id) then raise exception 'Product changed; generate a new decision'; end if;
 if o.id is null or o.product_id is distinct from p.id or o.variant_id is not null or o.verification<>'verified' or o.availability<>'in_stock' or o.last_error is not null or o.cost_checked_at is null or o.cost_checked_at<now()-interval '24 hours' or o.availability_checked_at is null or o.availability_checked_at<now()-interval '24 hours' then raise exception 'Offer evidence expired'; end if;
 if r.id is null or r.product_id is distinct from p.id or r.variant_id is not null or not r.identity_verified or r.last_error is not null or r.checked_at is null or r.checked_at<now()-interval '48 hours' then raise exception 'Reference evidence expired'; end if;
 if d.new_price<>floor(r.price_ars*(1-coalesce((cfg->'productDiscountPercent'->>p.id::text)::numeric,(cfg->>'marketDiscountPercent')::numeric)/100)/(cfg->>'roundArs')::numeric)*(cfg->>'roundArs')::numeric then raise exception 'Reference or policy changed'; end if;
 if d.new_price is null or d.landed_ars is null or d.landed_ars<=0 or d.new_price<d.landed_ars/(1-(cfg->>'targetMarginPercent')::numeric/100) then raise exception 'Insufficient margin'; end if;
 if (d.basis->>'costCheckedAt')::timestamptz is distinct from o.cost_checked_at then raise exception 'Cost changed; recalculate first'; end if;
 if (d.basis->>'referenceCheckedAt')::timestamptz is distinct from r.checked_at then raise exception 'Reference changed; recalculate first'; end if;
 if (d.basis->>'fx')::numeric is distinct from (cfg->>'acquisitionArsPerUsd')::numeric or (cfg->>'fxConfirmedOn')::date<current_date-3 then raise exception 'Exchange rate changed or expired'; end if;
 update products set retail_price=d.new_price,updated_at=now() where id=p.id;
 update supplier_price_decisions set status='applied',reason='Aprobado expresamente por administrador; evidencia y precio anterior revalidados',basis=basis||jsonb_build_object('approvedBy',auth.uid(),'approvedAt',now()) where id=d.id;
end $$;
revoke all on function approve_supplier_price_v1(uuid,boolean) from public,anon;
grant execute on function approve_supplier_price_v1(uuid,boolean) to authenticated;
commit;
