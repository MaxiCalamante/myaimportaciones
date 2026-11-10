-- Migration: 20261110190000_checkout_profitability_enforcement.sql
-- Description: Fortalecimiento transaccional de create_store_order_v1 para inspeccionar
--              el resultado de store_validate_profitability_v2, impedir bypass de rentabilidad
--              y validar compatibilidad de medios de pago por producto.

CREATE OR REPLACE FUNCTION public.create_store_order_v1(quote_input uuid, fingerprint_input text, customer_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare 
  q store_checkout_quotes;
  r store_exchange_rates;
  result jsonb;
  line jsonb;
  existing orders;
  p product_usd_prices;
  prof_result jsonb;
begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 perform pg_advisory_xact_lock(hashtextextended(customer_input->>'request_id',0));
 select *into existing from orders where request_id=(customer_input->>'request_id')::uuid;
 if found then
  if existing.request_hash is distinct from customer_input->>'request_hash'or existing.status='cancelled'or existing.reservation_expires_at<now()then raise exception 'Order retry mismatch or expired';end if;
  return to_jsonb(existing);
 end if;
 select *into q from store_checkout_quotes where id=quote_input for update;
 if not found or q.fingerprint is distinct from fingerprint_input or q.expires_at<now()or q.order_id is not null then raise exception 'Cotización vencida o modificada. Actualizá el resumen antes de confirmar.';end if;
 select *into r from store_exchange_rates where id=q.rate_id;
 perform set_config('mya.exchange_rate_id',coalesce(q.rate_id::text,''),true);
 -- Pin rounding as well as FX by invalidating unaccepted quotes on a settings revision.
 if r.id is not null and r.settings_version<>(select version from store_money_settings where id)then raise exception 'La configuración cambió. Volvé a cotizar.';end if;
 perform 1 from products where id in(select(x->>'id')::uuid from jsonb_array_elements(q.payload->'items')x)order by id for update;
 perform 1 from product_variants where id in(select nullif(x->>'variant_id','')::uuid from jsonb_array_elements(q.payload->'items')x)order by id for update;

 -- Validar medios de pago permitidos por producto
 for line in select value from jsonb_array_elements(q.payload->'items')loop
  if exists(
    select 1 from products 
    where id=(line->>'id')::uuid 
      and payment_methods is not null 
      and cardinality(payment_methods)>0 
      and not (q.payload->>'payment'=any(payment_methods::text[]))
  ) then
    raise exception 'El producto % no permite el medio de pago %', (line->>'id'), q.payload->>'payment';
  end if;
 end loop;

 for line in select value from jsonb_array_elements(q.prices)loop
  select *into p from product_usd_prices where product_id=(line->>'productId')::uuid and variant_id is not distinct from nullif(line->>'variantId','')::uuid for share;
  if p.revision is distinct from(line->>'revision')::integer then raise exception 'El precio USD cambió. Volvé a cotizar.';end if;
 end loop;

 for line in select value from jsonb_array_elements(q.payload->'items')loop
  perform store_usd_floor_v1((line->>'id')::uuid,nullif(line->>'variant_id','')::uuid,(line->>'price')::numeric*(1-(q.payload->>'discount')::numeric/(q.payload->>'subtotal')::numeric));
 end loop;

 -- Verificación estricta de rentabilidad (cierre del bypass: no descartar con PERFORM)
 prof_result := store_validate_profitability_v2(q.payload, q.rate_id, q.profitability_snapshot);
 if prof_result is null or prof_result->>'allowed' is distinct from 'true' or prof_result->>'state' is distinct from 'validated' then
  raise exception 'La rentabilidad del pedido no está autorizada: %', coalesce(prof_result->>'reason', 'Contribución efectiva bajo el piso mínimo comercial');
 end if;

 if exists(select 1 from jsonb_array_elements(q.payload->'items')x where x->>'channel'='wholesale')then 
  result:=create_wholesale_order_v1(customer_input||q.payload);
 else 
  result:=create_retail_order_v2(customer_input||q.payload);
 end if;

 update orders set charge_currency='ARS',exchange_snapshot=case when r.id is not null then jsonb_build_object('id',r.id,'kind',r.kind,'source',r.source,'rate',r.rate::text,'rawRate',r.raw_rate::text,'adjustment',r.adjustment::text,'sourceAt',r.source_at,'quotedAt',q.created_at,'quoteExpiresAt',q.expires_at)end where id=(result->>'id')::uuid;
 update order_items i set base_unit_usd=(x->>'usd')::numeric from jsonb_array_elements(q.prices)x where i.order_id=(result->>'id')::uuid and i.product_id=(x->>'productId')::uuid and i.variant_id is not distinct from nullif(x->>'variantId','')::uuid;
 update store_checkout_quotes set order_id=(result->>'id')::uuid where id=q.id;
 select to_jsonb(o)into result from orders o where id=(result->>'id')::uuid;
 return result;
end$function$;

-- Mecanismo de activación y control seguro del modo de enforcement
CREATE OR REPLACE FUNCTION public.set_store_profitability_enforcement_v1(target_mode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  current_policy store_profitability_policy;
BEGIN
  IF coalesce(current_setting('role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF target_mode NOT IN ('preview', 'enforce') THEN
    RAISE EXCEPTION 'Modo inválido: debe ser "preview" o "enforce"';
  END IF;
  UPDATE store_profitability_policy
  SET enforcement = target_mode, updated_at = now()
  WHERE id = true
  RETURNING * INTO current_policy;
  RETURN to_jsonb(current_policy);
END;
$$;

REVOKE ALL ON FUNCTION public.set_store_profitability_enforcement_v1(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_store_profitability_enforcement_v1(text) TO service_role;
