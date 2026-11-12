begin;
-- The accepted product methods define which documented fees a shared USD base
-- must cover. New assisted publications use the products table's transfer-only
-- default; no other missing identity or empty supported set receives a fallback.
create or replace function public.store_product_pricing_payments_v1(product_input uuid) returns text[]
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare methods text[];
begin
 if product_input is null then return array['transferencia']; end if;
 select array_agg(distinct m::text order by m::text) into methods
 from products p cross join lateral unnest(p.payment_methods) m
 where p.id=product_input and m::text in('transferencia','mercado_pago');
 if coalesce(cardinality(methods),0)=0 then raise exception 'No enabled supported payment method for product'; end if;
 return methods;
end$$;
revoke all on function public.store_product_pricing_payments_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.store_product_pricing_payments_v1(uuid) to service_role;

-- Public catalogue displays have no selected payment yet. Preserve MP as the
-- default when enabled, otherwise quote the product's supported method.
-- Preserve the November 10 per-item exception boundary: one failed identity
-- remains in review without aborting other wholesale offers in the batch.
create or replace function public.wholesale_public_offers_v1(items_input jsonb,payment_input text default null)returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb;b jsonb;result jsonb:='[]';chosen text;
begin
 if jsonb_typeof(items_input)<>'array' or jsonb_array_length(items_input)>1000 then raise exception 'Invalid wholesale items';end if;
 for item in select value from jsonb_array_elements(items_input)loop
 begin
  chosen:=payment_input;
  if chosen is null then
   -- The quote function owns missing/inactive identity responses.
   if exists(select 1 from products where id=(item->>'productId')::uuid and is_active and deleted_at is null)then
    chosen:=(store_product_pricing_payments_v1((item->>'productId')::uuid))[1];
   else chosen:='transferencia';end if;
  end if;
  b:=wholesale_quote_basis_v1((item->>'productId')::uuid,nullif(item->>'variantId','')::uuid,coalesce((item->>'quantity')::integer,1),chosen);
 exception when others then
  b:=jsonb_build_object('product_id',(item->>'productId')::uuid,'variant_id',nullif(item->>'variantId','')::uuid,'unit_price',null,'status','review','reason',sqlerrm,'tiers','[]'::jsonb,'valid_until',null,'policy_id',null);
 end;
  result:=result||jsonb_build_array(jsonb_build_object('productId',b->'product_id','variantId',b->'variant_id','unitPrice',b->'unit_price','status',b->'status','reason',b->'reason','tiers',b->'tiers','validUntil',b->'valid_until','policyId',b->'policy_id'));
 end loop;return result;
end$$;

-- Keep the owning functions and their existing identity, concurrency, expiry,
-- manual-price, preview and change-limit controls. Assert anchors before patching.
do $$
declare definition text; old_value text; new_value text; signature text;
begin
 signature:='public.wholesale_quote_basis_impl_v1(uuid,uuid,integer,text,boolean)';
 definition:=pg_get_functiondef(signature::regprocedure);
 old_value:='then status:=''unavailable'';reason:=''Producto no disponible.'';';
 new_value:=old_value||'elsif not(payment_input=any(store_product_pricing_payments_v1(p.id)))then status:=''unavailable'';reason:=''Medio de pago no habilitado para este producto.'';';
 if position('Medio de pago no habilitado para este producto.' in definition)=0 then
  if position(old_value in definition)=0 then raise exception 'Wholesale payment contract changed';end if;
  execute replace(definition,old_value,new_value);
 end if;

 signature:='public.store_refresh_supplier_usd_v1(uuid)';
 definition:=pg_get_functiondef(signature::regprocedure);
 old_value:='foreach payment in array array[''transferencia'',''mercado_pago'']loop';
 new_value:='foreach payment in array store_product_pricing_payments_v1(o.product_id)loop';
 if position(new_value in definition)=0 then
  if position(old_value in definition)=0 then raise exception 'Supplier payment loop contract changed'; end if;
  definition:=replace(definition,old_value,new_value);
  old_value:='md5((b-''checkedAt'')::text)';
  if position(old_value in definition)=0 then raise exception 'Supplier price hash contract changed'; end if;
  definition:=replace(definition,old_value,'md5((b-''checkedAt'')::text||store_product_pricing_payments_v1(o.product_id)::text)');
  execute definition;
 end if;

 signature:='public.store_review_product_prices_v2(uuid,uuid,jsonb,text)';
 definition:=pg_get_functiondef(signature::regprocedure);
 old_value:='payments:=case when payment_input is null then array[''transferencia'',''mercado_pago'']else array[payment_input]end;';
 new_value:='payments:=store_product_pricing_payments_v1(product_input);if payment_input is not null then if not(payment_input=any(payments))then raise exception ''Payment method not enabled for product'';end if;payments:=array[payment_input];end if;';
 if position(new_value in definition)=0 then
  if position(old_value in definition)=0 then raise exception 'Product review payment contract changed'; end if;
  execute replace(definition,old_value,new_value);
 end if;

 signature:='public.tracker_alternatives_v1(uuid,uuid)';
 if to_regprocedure(signature)is not null then
  definition:=pg_get_functiondef(signature::regprocedure);
  old_value:='foreach payment in array array[''transferencia'',''mercado_pago'']loop';
  new_value:='foreach payment in array store_product_pricing_payments_v1(product_input)loop';
  if position(new_value in definition)=0 then
   if position(old_value in definition)=0 then raise exception 'Supplier alternatives payment contract changed'; end if;
   execute replace(definition,old_value,new_value);
  end if;
 end if;

 signature:='public.tracker_publication_prices_v1(jsonb)';
 if to_regprocedure(signature)is not null then
  definition:=pg_get_functiondef(signature::regprocedure);
  old_value:='foreach payment in array array[''transferencia'',''mercado_pago''] loop';
  new_value:='foreach payment in array store_product_pricing_payments_v1(null) loop';
  if position(new_value in definition)=0 then
   if position(old_value in definition)=0 then raise exception 'Publication payment contract changed'; end if;
   execute replace(definition,old_value,new_value);
  end if;
  signature:='public.tracker_publish_opportunity_v1(uuid,uuid,text)';
  definition:=pg_get_functiondef(signature::regprocedure);
  old_value:='md5((b-''checkedAt'')::text)';
  new_value:='md5((b-''checkedAt'')::text||store_product_pricing_payments_v1(product_value)::text)';
  if position(new_value in definition)=0 then
   if position(old_value in definition)=0 then raise exception 'Publication price hash contract changed'; end if;
   execute replace(definition,old_value,new_value);
  end if;
 end if;

 -- Reject a disabled choice even in preview and when a previously accepted
 -- quote is reserved after an administrator changes the accepted methods.
 signature:='public.store_validate_profitability_v2(jsonb,uuid,jsonb)';
 definition:=pg_get_functiondef(signature::regprocedure);
 old_value:='select *into policy from store_profitability_policy where id for share;';
 new_value:='for l in select value from jsonb_array_elements(payload_input->''items'')loop if not coalesce((payload_input->>''payment'')=any(store_product_pricing_payments_v1((l->>''id'')::uuid)),false)then raise exception ''Payment method not enabled for product'';end if;end loop;'||old_value;
 if position('Payment method not enabled for product' in definition)=0 then
  if position(old_value in definition)=0 then raise exception 'Checkout validation contract changed'; end if;
  execute replace(definition,old_value,new_value);
 end if;
 signature:='public.store_checkout_prices_v1(jsonb,text,uuid)';
 definition:=pg_get_functiondef(signature::regprocedure);
 old_value:='for line in select value from jsonb_array_elements(items_input)loop';
 new_value:=old_value||' if not coalesce(payment_input=any(store_product_pricing_payments_v1((line->>''productId'')::uuid)),false)then raise exception ''Payment method not enabled for product'';end if;';
 if position('Payment method not enabled for product' in definition)=0 then
  if position(old_value in definition)=0 then raise exception 'Checkout quote contract changed'; end if;
  execute replace(definition,old_value,new_value);
 end if;
end$$;
commit;
