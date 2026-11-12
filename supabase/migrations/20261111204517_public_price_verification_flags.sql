begin;
-- A positive USD projection is a reference amount, not proof of profitability.
-- Only the server can ask the existing checkout validator for public booleans.
-- No price, cost, policy, inventory, quote or order is written by this function.
create or replace function public.store_public_price_verification_v1(ids_input uuid[]) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare price jsonb;product_row products;product_id_value uuid;variant_id_value uuid;
 channel text;payment text;methods text[];amount numeric;rate_id_value uuid;result jsonb;
 flags jsonb;answer jsonb:='[]';verified boolean;
begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 if ids_input is null or cardinality(ids_input)>100 then raise exception 'Verification batch exceeds 100 products';end if;
 for price in select value from jsonb_array_elements(store_usd_prices_v1(ids_input))limit 1000 loop
  product_id_value:=(price->>'productId')::uuid;variant_id_value:=nullif(price->>'variantId','')::uuid;
  rate_id_value:=nullif(price->>'rateId','')::uuid;
  flags:=jsonb_build_object('productId',product_id_value,'variantId',variant_id_value,'rateId',price->'rateId','retailArs',price->'retailArs','wholesaleArs',price->'wholesaleArs');
  foreach channel in array array['retail','wholesale']loop
   verified:=false;
   begin
    select *into product_row from products where id=product_id_value;
    if product_row.id is null or not product_row.is_active or product_row.deleted_at is not null
     or coalesce(to_jsonb(product_row)->>'commercial_status','AVAILABLE')<>'AVAILABLE'
     or(variant_id_value is null and product_row.has_variants)then raise exception 'Exact sellable identity required';end if;
    if variant_id_value is not null and not exists(select 1 from product_variants v where v.id=variant_id_value and v.product_id=product_id_value and v.is_active
     and coalesce(to_jsonb(v)->>'commercial_status','AVAILABLE')='AVAILABLE')then raise exception 'Exact sellable variant required';end if;
    if to_regprocedure('public.catalog_check_new_sale_v1(uuid,uuid)')is not null then
     perform catalog_check_new_sale_v1(product_id_value,variant_id_value);
    end if;
    if channel='retail' and product_row.is_wholesale_only then raise exception 'Wholesale-only identity';end if;
    amount:=nullif(price->>(channel||'Ars'),'')::numeric;
    if amount is null or amount<=0 or rate_id_value is null then raise exception 'Current positive reference price required';end if;
    methods:=store_product_pricing_payments_v1(product_id_value);
    foreach payment in array methods loop
     result:=store_validate_profitability_v2(jsonb_build_object('payment',payment,'subtotal',amount,'discount',0,'shipping',0,
      'items',jsonb_build_array(jsonb_build_object('id',product_id_value,'variant_id',variant_id_value,'quantity',1,'channel',channel,'price',amount))),rate_id_value,null);
     if result->>'allowed'is distinct from 'true'or result->>'state'is distinct from 'validated'then raise exception 'Checkout verification incomplete';end if;
    end loop;
    verified:=true;
   exception when others then verified:=false;
   end;
   flags:=flags||jsonb_build_object(channel||'Verified',verified);
  end loop;
  answer:=answer||jsonb_build_array(flags);
 end loop;
 return answer;
end$$;
revoke all on function public.store_public_price_verification_v1(uuid[])from public,anon,authenticated,service_role;
grant execute on function public.store_public_price_verification_v1(uuid[])to service_role;
commit;
