-- REVIEW ONLY: execute only after the commercial USDT migration is installed.
-- Run as the database owner (SQL execution tool).
-- Uses the currently referenced verified acquisition quote; no hardcoded rate.
begin;
do $$
declare cfg jsonb; s public.store_money_settings; q public.supplier_fx_quotes; lease jsonb;
begin
 select config into cfg from public.supplier_tracking_settings where id for share;
 if cfg->>'acquisitionFxMode' is distinct from 'usdt' or nullif(cfg->>'usdtQuoteId','') is null then
  raise exception 'Current verified acquisition USDT quote is required';
 end if;
 select * into q from public.supplier_fx_quotes where id=(cfg->>'usdtQuoteId')::uuid;
 if q.id is null or q.source<>'criptoya-binance-totalAsk'
  or q.rate_ars is distinct from (cfg->>'acquisitionArsPerUsd')::numeric
  or q.quoted_at is distinct from (cfg->>'usdtQuotedAt')::timestamptz
  or q.quoted_at<now()-interval '24 hours' or q.quoted_at>now()+interval '1 minute'
  or q.evidence->>'purchaseParity' is distinct from '1 USD proveedor = 1 USDT' then
  raise exception 'Acquisition USDT evidence missing, changed or expired';
 end if;
 select * into s from public.store_money_settings where id for update;
 perform public.save_store_money_settings_v1(jsonb_build_object(
  'kind','usdt','refreshSeconds',s.refresh_seconds,'maxAgeSeconds',s.max_age_seconds,
  'quoteSeconds',s.quote_seconds,'adjustment',s.adjustment,'roundArs',s.round_ars,
  'maxChange',s.max_change,'retailMargin',s.retail_margin,'wholesaleMargin',s.wholesale_margin,
  'minimumMargin',s.minimum_margin),'Cotización comercial USDT: usar la misma evidencia verificada de adquisición');
 perform set_config('role','service_role',true);
 lease:=public.claim_store_exchange_refresh_v1(true);
 if lease->>'token' is null then raise exception 'Commercial FX lease unavailable';end if;
 perform public.finish_store_exchange_refresh_v1((lease->>'token')::uuid,q.rate_ars,q.quoted_at,null);
end$$;
select public.store_exchange_public_v1();
commit;
