-- Fix wholesale public offers resilience:
-- 1. store_cost_record_v1 uses stored total_cost_usd when present instead of re-evaluating store_cost_usd_v1 on reads, and catches any error gracefully.
-- 2. wholesale_public_offers_v1 catches per-item exceptions so a single item error does not abort the entire batch.

create or replace function public.store_cost_record_v1(product_input uuid, variant_input uuid, original_input jsonb)
returns jsonb language plpgsql stable security definer set search_path to public, pg_temp as $$
declare u product_usd_prices; b jsonb; acquisition numeric; total numeric; begin
 select * into u from product_usd_prices where product_id=product_input and variant_id is not distinct from variant_input;
 if u.cost_basis is null then return original_input; end if;
 b:=u.cost_basis; acquisition:=(b->>'acquisitionArs')::numeric;
 if u.total_cost_usd is not null then
  total:=u.total_cost_usd*acquisition;
 else
  begin
   total:=store_cost_usd_v1(b)*acquisition;
  exception when others then
   return coalesce(original_input,'{}')||jsonb_build_object('expenses_confirmed',false,'usd_cost_basis',true,'error',sqlerrm);
  end;
 end if;
 return coalesce(original_input,'{}')||jsonb_build_object('origin_cost',(b->>'origin')::numeric,'currency',b->>'currency','exchange_rate',acquisition/(b->>'unitsPerUsd')::numeric,
 'landed_cost',total,'freight_per_unit',0,'other_landed_cost',total-(b->>'origin')::numeric/(b->>'unitsPerUsd')::numeric*acquisition,
 'variable_cost',(b->>'variableArs')::numeric,'payment_fee_percent',(b->>'feePercent')::numeric,'minimum_contribution',(b->>'minimumContribution')::numeric,
 'supplier_url',b->>'supplierUrl','source_document',b->>'document','expenses_confirmed',true,'verified_at',u.costs_updated_at,'usd_cost_basis',true);
end$$;

create or replace function public.wholesale_public_offers_v1(items_input jsonb, payment_input text default 'mercado_pago')
returns jsonb language plpgsql security definer set search_path to public, pg_temp as $$
declare item jsonb; b jsonb; result jsonb:='[]'; begin
 if jsonb_typeof(items_input)<>'array' or jsonb_array_length(items_input)>1000 then raise exception 'Invalid wholesale items'; end if;
 for item in select value from jsonb_array_elements(items_input) loop
 begin
  b:=wholesale_quote_basis_v1((item->>'productId')::uuid,nullif(item->>'variantId','')::uuid,coalesce((item->>'quantity')::integer,1),payment_input);
 exception when others then
  b:=jsonb_build_object('product_id',(item->>'productId')::uuid,'variant_id',nullif(item->>'variantId','')::uuid,'unit_price',null,'status','review','reason',sqlerrm,'tiers','[]'::jsonb,'valid_until',null,'policy_id',null);
 end;
 result:=result||jsonb_build_array(jsonb_build_object('productId',b->'product_id','variantId',b->'variant_id','unitPrice',b->'unit_price','status',b->'status','reason',b->'reason','tiers',b->'tiers','validUntil',b->'valid_until','policyId',b->'policy_id'));
 end loop; return result;
end$$;

grant execute on function public.wholesale_public_offers_v1(jsonb, text) to anon, authenticated, service_role;
