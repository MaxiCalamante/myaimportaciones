begin;
-- USD quoted and settled as USD equivalent is an identity, not a currency
-- conversion. Its original document can outlive an FX quote. Supplier cost
-- freshness, real foreign-currency FX, ARS cash settlement and carrier FX retain
-- all existing expiry/identity/accounting checks. No dates are renewed here.
do $$
declare definition text;old_value text;new_value text;
begin
 definition:=pg_get_functiondef('public.store_acquisition_cost_v2(jsonb)'::regprocedure);
 old_value:=$old$if nullif(b->>'fxSource','')is null or not coalesce(nullif(b->>'fxAt','')::timestamptz between now()-interval '24 hours'and now()+interval '5 minutes',false)$old$;
 new_value:=$new$if nullif(b->>'fxSource','')is null
 or (b->>'currency'<>'USD' and not coalesce(nullif(b->>'fxAt','')::timestamptz between now()-interval '24 hours'and now()+interval '5 minutes',false))
 or (b->>'currency'='USD' and nullif(b->>'fxAt','')::timestamptz>now()+interval '5 minutes')$new$;
 if position(old_value in definition)=0 then raise exception 'Acquisition FX contract changed';end if;
 execute replace(definition,old_value,new_value);
end$$;
commit;
