begin;
-- Additive commercial FX option. Existing selection, USD prices, costs and orders remain untouched.
alter table public.store_money_settings drop constraint store_money_settings_kind_check;
alter table public.store_money_settings add constraint store_money_settings_kind_check
 check(kind in('blue','bolsa','oficial','contadoconliqui','cripto','tarjeta','mayorista','usdt'));
alter table public.store_exchange_rates drop constraint store_exchange_rates_source_check;
alter table public.store_exchange_rates add constraint store_exchange_rates_source_check check(source in('dolarapi','manual','usdt'));
alter table public.store_exchange_rates add column supplier_fx_quote_id uuid references public.supplier_fx_quotes(id);
alter table public.store_exchange_rates add constraint store_exchange_usdt_evidence_check
 check((source='usdt' and kind='usdt' and supplier_fx_quote_id is not null)or(source<>'usdt' and supplier_fx_quote_id is null));

create or replace function public.finish_store_exchange_refresh_v1(token_input uuid,rate_input numeric,source_at_input timestamptz,error_input text)returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare s store_money_settings;previous store_exchange_rates;q supplier_fx_quotes;expiry timestamptz;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 select *into s from store_money_settings where id for update;
 if s.lease_token is distinct from token_input or s.leased_until<now()then raise exception 'Refresh lease expired';end if;
 if error_input is null then
  select *into previous from store_exchange_current_v1();
  if rate_input is null or rate_input<=0 or rate_input>=10000000 or source_at_input is null or source_at_input>now()+interval '5 minutes' or source_at_input<now()-interval '7 days'
    or(previous.id is not null and(source_at_input<previous.source_at or abs(rate_input/previous.raw_rate-1)*100>s.max_change))then raise exception 'Invalid or suspicious rate';end if;
  expiry:=source_at_input+make_interval(secs=>s.max_age_seconds);
  if s.kind='usdt'then
   -- The shared recorder already checks both live sources. Never accept a naked rate or a config number as evidence.
   select *into q from supplier_fx_quotes where rate_ars=rate_input and quoted_at=source_at_input
    and source='criptoya-binance-totalAsk' and quoted_at between now()-interval '24 hours' and now()+interval '1 minute'
    and evidence->>'purchaseParity'='1 USD proveedor = 1 USDT' order by created_at desc,id desc limit 1;
   if q.id is null then raise exception 'USDT quote missing, unverified or expired';end if;
   expiry:=least(expiry,q.quoted_at+interval '24 hours');
  end if;
  insert into store_exchange_rates(kind,source,raw_rate,rate,adjustment,settings_version,source_at,expires_at,supplier_fx_quote_id)
  values(s.kind,case when s.kind='usdt'then 'usdt'else 'dolarapi'end,rate_input,round(rate_input*(1+s.adjustment/100),6),s.adjustment,s.version,source_at_input,expiry,q.id);
 end if;
 update store_money_settings set lease_token=null,leased_until=null,last_error=left(error_input,500)where id;
end$$;

create or replace function public.store_exchange_public_v1()returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',r.id,'kind',s.kind,'rate',r.rate::text,'rawRate',r.raw_rate::text,'sourceAt',r.source_at,'fetchedAt',r.fetched_at,'expiresAt',r.expires_at,
 'status',case when r.id is null then 'missing' when r.expires_at<now()then 'stale' else 'valid'end,
 'source',coalesce(r.source,case when s.kind='usdt'then 'usdt'else 'dolarapi'end),'adjustment',s.adjustment::text,'roundArs',s.round_ars::text,'refreshSeconds',s.refresh_seconds)
 from store_money_settings s left join lateral store_exchange_current_v1()r on true where s.id
$$;
-- Preserve the existing public snapshot / private refresh permission boundary.
revoke all on function public.finish_store_exchange_refresh_v1(uuid,numeric,timestamptz,text)from public,anon,authenticated;
grant execute on function public.finish_store_exchange_refresh_v1(uuid,numeric,timestamptz,text)to service_role;
revoke all on function public.store_exchange_public_v1()from public;
grant execute on function public.store_exchange_public_v1()to anon,authenticated,service_role;
commit;
