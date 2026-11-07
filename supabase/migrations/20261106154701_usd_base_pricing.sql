begin;
-- Additive rollout: no product or historical order amount is converted here.
create table if not exists public.store_money_settings (
 id boolean primary key default true check(id), kind text not null default 'blue' check(kind in('blue','bolsa','oficial','contadoconliqui','cripto','tarjeta','mayorista')),
 refresh_seconds integer not null default 900 check(refresh_seconds between 300 and 86400),
 max_age_seconds integer not null default 259200 check(max_age_seconds between 900 and 604800),
 quote_seconds integer not null default 900 check(quote_seconds between 60 and 1800),
 adjustment numeric(8,4) not null default 0 check(adjustment between -20 and 50),
 round_ars numeric(14,2) not null default 1 check(round_ars between .01 and 10000),
 max_change numeric not null default 20 check(max_change between 1 and 100),
 retail_margin numeric check(retail_margin>=0 and retail_margin<100),
 wholesale_margin numeric check(wholesale_margin>=0 and wholesale_margin<100),
 minimum_margin numeric check(minimum_margin>=0 and minimum_margin<100),
 version integer not null default 1, lease_token uuid, leased_until timestamptz, next_refresh timestamptz,
 last_error text, last_attempt timestamptz, updated_at timestamptz not null default now()
);
insert into public.store_money_settings(id)values(true)on conflict(id)do nothing;
create table if not exists public.store_exchange_rates (
 id uuid primary key default gen_random_uuid(), kind text not null, source text not null check(source in('dolarapi','manual')),
 raw_rate numeric(18,6) not null check(raw_rate>0 and raw_rate<10000000), rate numeric(18,6) not null check(rate>0),
 adjustment numeric not null, settings_version integer not null, source_at timestamptz not null,
 fetched_at timestamptz not null default now(), expires_at timestamptz not null, note text not null default '', actor uuid
);
create index if not exists store_exchange_latest on public.store_exchange_rates(settings_version,fetched_at desc);
create table if not exists public.store_money_audit (
 id uuid primary key default gen_random_uuid(), action text not null, detail jsonb not null,
 actor uuid default auth.uid(), created_at timestamptz not null default now()
);
create table if not exists public.product_usd_prices (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id)on delete cascade,
 variant_id uuid references product_variants(id)on delete cascade,
 retail_usd numeric(18,6) not null check(retail_usd>0 and retail_usd<10000000),
 wholesale_usd numeric(18,6) check(wholesale_usd>0 and wholesale_usd<10000000),
 retail_source text not null default 'manual' check(retail_source in('manual','automatic')),
 wholesale_source text not null default 'manual' check(wholesale_source in('manual','automatic')),
 total_cost_usd numeric(18,6) check(total_cost_usd>0), cost_basis jsonb,
 retail_margin numeric check(retail_margin>=0 and retail_margin<100), wholesale_margin numeric check(wholesale_margin>=0 and wholesale_margin<100),
 state text not null default 'review' check(state in('review','active')), revision integer not null default 1,
 migration_rate_id uuid references store_exchange_rates(id), original_prices jsonb,
 costs_updated_at timestamptz, updated_at timestamptz not null default now(), actor uuid default auth.uid(),
 unique nulls not distinct(product_id,variant_id)
);
create table if not exists public.store_checkout_quotes (
 id uuid primary key default gen_random_uuid(), fingerprint text not null, rate_id uuid references store_exchange_rates(id),
 payload jsonb not null, prices jsonb not null, expires_at timestamptz not null,
 order_id uuid unique references orders(id), created_at timestamptz not null default now()
);
alter table public.orders add column if not exists charge_currency text check(charge_currency='ARS');
alter table public.orders add column if not exists exchange_snapshot jsonb;
alter table public.order_items add column if not exists base_unit_usd numeric(18,6) check(base_unit_usd>=0);
-- No default on historical orders: null means legacy ARS contract, without claiming a historical USD rate.
do $$declare t text;begin
 foreach t in array array['store_money_settings','store_exchange_rates','store_money_audit','product_usd_prices','store_checkout_quotes']loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
 execute format('grant select on public.%I to authenticated,service_role',t);
 execute format('drop policy if exists admin_read on public.%I',t);
 execute format('create policy admin_read on public.%I for select to authenticated using ((select public.is_admin()))',t);
 end loop;
end$$;
grant insert on store_checkout_quotes to service_role;

create or replace function public.store_exchange_current_v1()returns public.store_exchange_rates language sql stable security definer set search_path=public,pg_temp as $$
 select r from store_exchange_rates r join store_money_settings s on s.id and r.settings_version=s.version and r.kind=s.kind order by r.fetched_at desc,r.id desc limit 1
$$;
create or replace function public.store_exchange_public_v1()returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',r.id,'kind',s.kind,'rate',r.rate::text,'rawRate',r.raw_rate::text,'sourceAt',r.source_at,'fetchedAt',r.fetched_at,'expiresAt',r.expires_at,
 'status',case when r.id is null then 'missing' when r.expires_at<now()then 'stale' else 'valid'end,'source',coalesce(r.source,'dolarapi'),'adjustment',s.adjustment::text,'roundArs',s.round_ars::text,'refreshSeconds',s.refresh_seconds)
 from store_money_settings s left join lateral store_exchange_current_v1()r on true where s.id
$$;
create or replace function public.claim_store_exchange_refresh_v1(force_input boolean default false)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare s store_money_settings;r store_exchange_rates;token uuid:=gen_random_uuid();begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 select *into s from store_money_settings where id for update;select *into r from store_exchange_current_v1();
 if s.leased_until>now()or(not force_input and s.next_refresh>now())or(r.source='manual'and r.expires_at>now()and not force_input)then return '{}'::jsonb;end if;
 update store_money_settings set lease_token=token,leased_until=now()+interval '30 seconds',last_attempt=now(),next_refresh=now()+make_interval(secs=>s.refresh_seconds)where id;
 return jsonb_build_object('token',token,'kind',s.kind,'previous',r.raw_rate::text,'maxChange',s.max_change);
end$$;
create or replace function public.finish_store_exchange_refresh_v1(token_input uuid,rate_input numeric,source_at_input timestamptz,error_input text)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare s store_money_settings;previous store_exchange_rates;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 select *into s from store_money_settings where id for update;
 if s.lease_token is distinct from token_input or s.leased_until<now()then raise exception 'Refresh lease expired';end if;
 if error_input is null then
  select *into previous from store_exchange_current_v1();
  if rate_input is null or rate_input<=0 or rate_input>=10000000 or source_at_input is null or source_at_input>now()+interval '5 minutes' or source_at_input<now()-interval '7 days'
    or(previous.id is not null and(source_at_input<previous.source_at or abs(rate_input/previous.raw_rate-1)*100>s.max_change))then raise exception 'Invalid or suspicious rate';end if;
  insert into store_exchange_rates(kind,source,raw_rate,rate,adjustment,settings_version,source_at,expires_at)
  values(s.kind,'dolarapi',rate_input,round(rate_input*(1+s.adjustment/100),6),s.adjustment,s.version,source_at_input,source_at_input+make_interval(secs=>s.max_age_seconds));
 end if;
 update store_money_settings set lease_token=null,leased_until=null,last_error=left(error_input,500)where id;
end$$;
create or replace function public.save_store_money_settings_v1(config_input jsonb,note_input text)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare before_row store_money_settings;begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 if length(btrim(coalesce(note_input,'')))<5 or length(note_input)>2000 then raise exception 'Audit reason required';end if;
 if not(config_input ?& array['kind','refreshSeconds','maxAgeSeconds','quoteSeconds','adjustment','roundArs','maxChange','retailMargin','wholesaleMargin','minimumMargin'])then raise exception 'Missing settings';end if;
 select *into before_row from store_money_settings where id for update;
 update store_money_settings set kind=config_input->>'kind',refresh_seconds=(config_input->>'refreshSeconds')::integer,max_age_seconds=(config_input->>'maxAgeSeconds')::integer,
 quote_seconds=(config_input->>'quoteSeconds')::integer,adjustment=(config_input->>'adjustment')::numeric,round_ars=(config_input->>'roundArs')::numeric,max_change=(config_input->>'maxChange')::numeric,
 retail_margin=(config_input->>'retailMargin')::numeric,wholesale_margin=(config_input->>'wholesaleMargin')::numeric,minimum_margin=(config_input->>'minimumMargin')::numeric,
 version=version+1,next_refresh=null,lease_token=null,leased_until=null,updated_at=now()where id;
 if exists(select 1 from store_money_settings where id and(retail_margin<minimum_margin or wholesale_margin<minimum_margin or max_age_seconds<refresh_seconds))then raise exception 'Invalid margins or expiry';end if;
 insert into store_money_audit(action,detail)values('settings',jsonb_build_object('before',to_jsonb(before_row)-array['lease_token','leased_until'],'after',config_input,'reason',note_input));
end$$;
create or replace function public.store_manual_rate_v1(rate_input numeric,hours_input integer,note_input text)returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare s store_money_settings;result uuid;begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 if hours_input is null or hours_input not between 1 and 72 or length(btrim(coalesce(note_input,'')))<10 then raise exception 'Reason and expiry required';end if;
 select *into s from store_money_settings where id for update;
 insert into store_exchange_rates(kind,source,raw_rate,rate,adjustment,settings_version,source_at,expires_at,note,actor)
 values(s.kind,'manual',rate_input,round(rate_input*(1+s.adjustment/100),6),s.adjustment,s.version,now(),now()+make_interval(hours=>hours_input),note_input,auth.uid())returning id into result;
 update store_money_settings set lease_token=null,leased_until=null,next_refresh=null,last_error=null where id;
 insert into store_money_audit(action,detail)values('manual_rate',jsonb_build_object('rateId',result,'reason',note_input));return result;
end$$;

-- A transaction may pin its own accepted quote. Clients cannot call this resolver.
create or replace function public.store_price_ars_v1(product_input uuid,variant_input uuid,channel_input text,legacy_input numeric)returns numeric language plpgsql stable security definer set search_path=public,pg_temp as $$
declare p product_usd_prices;r store_exchange_rates;s store_money_settings;usd numeric;rate_id uuid;begin
 select *into p from product_usd_prices where product_id=product_input and variant_id is not distinct from variant_input;
 if not found then return legacy_input;end if;
 if p.state<>'active'then raise exception 'USD price requires review';end if;
 usd:=case when channel_input='wholesale'then p.wholesale_usd else p.retail_usd end;
 if usd is null then raise exception 'USD channel price missing';end if;
 rate_id:=nullif(current_setting('mya.exchange_rate_id',true),'')::uuid;
 if rate_id is null then select *into r from store_exchange_current_v1();else select *into r from store_exchange_rates where id=rate_id;end if;
 select *into s from store_money_settings where id;
 if r.id is null or(r.expires_at<now()and rate_id is null)then raise exception 'Exchange rate missing or stale';end if;
 return round(usd*r.rate/s.round_ars)*s.round_ars;
end$$;
create or replace function public.store_usd_prices_v1(ids_input uuid[])returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare r store_exchange_rates;s store_money_settings;begin
 if cardinality(ids_input)>5000 then raise exception 'Too many products';end if;
 select *into r from store_exchange_current_v1();select *into s from store_money_settings where id;
 return coalesce((select jsonb_agg(jsonb_build_object('productId',u.product_id,'variantId',u.variant_id,'retailUsd',u.retail_usd::text,'wholesaleUsd',u.wholesale_usd::text,
 'retailArs',case when r.id is not null then round(u.retail_usd*r.rate/s.round_ars)*s.round_ars end,
 'wholesaleArs',case when r.id is not null then round(u.wholesale_usd*r.rate/s.round_ars)*s.round_ars end,'rateId',r.id))
 from product_usd_prices u join products p on p.id=u.product_id where u.product_id=any(ids_input)and u.state='active'and p.is_active and p.deleted_at is null),'[]'::jsonb);
end$$;
create or replace function public.store_cost_usd_v1(b jsonb)returns numeric language plpgsql stable set search_path=public,pg_temp as $$
declare units numeric;acquisition numeric;carrier numeric;begin
 if b is null or coalesce((b->>'confirmed')::boolean,false)=false or length(btrim(coalesce(b->>'document','')))<10
 or not(b?&array['currency','origin','unitsPerUsd','fxEvidence','fxAt','acquisitionArs','acquisitionAt','carrierPercent','carrierFixedUsd','carrierArs','carrierAt','extraUsd','extraArs','feePercent','variableArs','minimumContribution','supplierUrl'])then raise exception 'Incomplete documented cost basis';end if;
 if b->>'currency' not in('USD','PYG','ARS','BRL')or(b->>'currency'='USD'and(b->>'unitsPerUsd')::numeric<>1)
 or b->>'currency'<>'USD'and length(btrim(b->>'fxEvidence'))<10 then raise exception 'Original currency conversion requires evidence';end if;
 units:=(b->>'unitsPerUsd')::numeric;acquisition:=(b->>'acquisitionArs')::numeric;
 if units is null or units<=0 or acquisition is null or acquisition<=0 or(b->>'origin')::numeric<=0 then raise exception 'Invalid acquisition rate or origin';end if;
 if exists(select 1 from unnest(array['origin','carrierPercent','carrierFixedUsd','carrierArs','extraUsd','extraArs','feePercent','variableArs','minimumContribution'])key where b->>key is null or(b->>key)::numeric<0 or(b->>key)::numeric>1e12)or(b->>'feePercent')::numeric>=100 or(b->>'carrierArs')::numeric<=0 then raise exception 'Invalid cost amounts';end if;
 if exists(select 1 from unnest(array['acquisitionAt','carrierAt','fxAt'])key where nullif(b->>key,'')::timestamptz is null or(b->>key)::timestamptz<now()-interval '24 hours'or(b->>key)::timestamptz>now()+interval '5 minutes')then raise exception 'Cost FX evidence expired';end if;
 carrier:=((b->>'origin')::numeric/units*(b->>'carrierPercent')::numeric/100+(b->>'carrierFixedUsd')::numeric)*(b->>'carrierArs')::numeric/acquisition;
 return round((b->>'origin')::numeric/units+carrier+(b->>'extraUsd')::numeric+(b->>'extraArs')::numeric/acquisition,6);
end$$;
create or replace function public.save_product_usd_v1(product_input uuid,variant_input uuid,prices_input jsonb,note_input text)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare old_row product_usd_prices;begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 if length(btrim(coalesce(note_input,'')))<10 then raise exception 'Price reason required';end if;
 perform 1 from products where id=product_input for update;if not found then raise exception 'Product missing';end if;
 if variant_input is not null and not exists(select 1 from product_variants where id=variant_input and product_id=product_input)then raise exception 'Wrong variant';end if;
 select *into old_row from product_usd_prices where product_id=product_input and variant_id is not distinct from variant_input for update;
 if coalesce(old_row.revision,0) is distinct from(prices_input->>'revision')::integer then raise exception 'Price changed: reload editor';end if;
 insert into product_usd_prices(product_id,variant_id,retail_usd,wholesale_usd,retail_source,wholesale_source,retail_margin,wholesale_margin,state,original_prices)
 values(product_input,variant_input,(prices_input->>'retailUsd')::numeric,(prices_input->>'wholesaleUsd')::numeric,prices_input->>'retailSource',prices_input->>'wholesaleSource',
 (prices_input->>'retailMargin')::numeric,(prices_input->>'wholesaleMargin')::numeric,'active',case when variant_input is null then(select jsonb_build_object('currency','ARS','retail',retail_price,'wholesale',wholesale_price)from products where id=product_input)else(select jsonb_build_object('currency','ARS','retail',retail_price,'wholesale',wholesale_price)from product_variants where id=variant_input)end)
 on conflict(product_id,variant_id)do update set retail_usd=excluded.retail_usd,wholesale_usd=excluded.wholesale_usd,retail_source=excluded.retail_source,wholesale_source=excluded.wholesale_source,
 retail_margin=excluded.retail_margin,wholesale_margin=excluded.wholesale_margin,state='active',revision=product_usd_prices.revision+1,updated_at=now(),actor=auth.uid();
 if prices_input->'costBasis' is not null and prices_input->'costBasis'<>'null'::jsonb then
  update product_usd_prices set total_cost_usd=store_cost_usd_v1(prices_input->'costBasis'),cost_basis=prices_input->'costBasis',costs_updated_at=now()where product_id=product_input and variant_id is not distinct from variant_input;
 end if;
 insert into store_money_audit(action,detail)values('product_usd',jsonb_build_object('productId',product_input,'variantId',variant_input,'before',to_jsonb(old_row),'after',prices_input,'reason',note_input));
end$$;

-- Dry-run report and explicit per-identity application. Original ARS values are backed up atomically.
create or replace function public.migrate_product_usd_v1(product_input uuid,variant_input uuid,rate_input uuid,expected_input jsonb,apply_input boolean default false)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r store_exchange_rates;retail numeric;wholesale numeric;result jsonb;begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 select *into r from store_exchange_rates where id=rate_input;
 if not found or r.expires_at<now()then raise exception 'Reference rate missing or expired';end if;
 if variant_input is null then select retail_price,wholesale_price into retail,wholesale from products where id=product_input for update;
 else select retail_price,wholesale_price into retail,wholesale from product_variants where id=variant_input and product_id=product_input for update;end if;
 if retail is null or retail<=0 or expected_input->>'currency' is distinct from 'ARS' or retail is distinct from(expected_input->>'retail')::numeric or wholesale is distinct from(expected_input->>'wholesale')::numeric then raise exception 'Original currency or prices require review';end if;
 result:=jsonb_build_object('retailUsd',round(retail/r.rate,6)::text,'wholesaleUsd',case when wholesale>0 then round(wholesale/r.rate,6)::text end,'rateId',r.id,'original',expected_input);
 if apply_input then
  insert into product_usd_prices(product_id,variant_id,retail_usd,wholesale_usd,original_prices,migration_rate_id,state)
  values(product_input,variant_input,round(retail/r.rate,6),case when wholesale>0 then round(wholesale/r.rate,6)end,expected_input,r.id,'active');
  insert into store_money_audit(action,detail)values('migration',result||jsonb_build_object('productId',product_input,'variantId',variant_input));
 end if;return result;
end$$;

-- Legacy editors and older workers may still read the original ARS amounts. They must never
-- silently overwrite a dollarized identity. Stock and availability updates remain permitted.
create or replace function public.guard_usd_legacy_write_v1()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare pid uuid;vid uuid;begin
 if tg_table_name='products'then pid:=new.id;vid:=null;else pid:=new.product_id;vid:=new.id;end if;
 if(new.retail_price is distinct from old.retail_price or new.wholesale_price is distinct from old.wholesale_price)and exists(select 1 from product_usd_prices where product_id=pid and variant_id is not distinct from vid)then raise exception 'Este producto usa USD. Editá sus precios en Configuración monetaria.';end if;
 return new;
end$$;
drop trigger if exists protect_usd_prices on products;
create trigger protect_usd_prices before update of retail_price,wholesale_price on products for each row execute function guard_usd_legacy_write_v1();
drop trigger if exists protect_usd_prices on product_variants;
create trigger protect_usd_prices before update of retail_price,wholesale_price on product_variants for each row execute function guard_usd_legacy_write_v1();

create or replace function public.store_refresh_supplier_usd_v1(offer_input uuid)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o supplier_offers;p product_usd_prices;b jsonb;total numeric;retail numeric;wholesale numeric;s store_money_settings;minimum numeric;rm numeric;wm numeric;begin
 if coalesce(current_setting('role',true),'')<>'service_role'and not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 select *into o from supplier_offers where id=offer_input for share;
 if not found then return jsonb_build_object('status','missing');end if;
 perform 1 from products where id=o.product_id for update;
 select *into p from product_usd_prices where product_id=o.product_id and variant_id is not distinct from o.variant_id for update;
 if not found then return jsonb_build_object('status','legacy');end if;
 if o.verification<>'verified'or o.availability<>'in_stock'or o.last_error is not null or o.origin_cost<=0 or o.cost_checked_at<now()-interval '24 hours'or o.cost_checked_at>now()+interval '5 minutes'
 or o.availability_checked_at<now()-interval '24 hours'or coalesce(o.evidence->>'costScope','')='supplier_quote_inclusions_unconfirmed'
 or not exists(select 1 from suppliers where id=o.supplier_id and is_active and o.cost_checked_at>=now()-make_interval(hours=>freshness_hours))then return jsonb_build_object('status','review','reason','Supplier evidence missing or stale');end if;
 b:=p.cost_basis;
 if b is null or b->>'currency' is distinct from o.currency or b->>'supplierUrl' is distinct from o.source_url then return jsonb_build_object('status','review','reason','Exact documented cost basis missing');end if;
 b:=b||jsonb_build_object('origin',o.origin_cost,'offerId',o.id,'observedAt',o.cost_checked_at);
 begin total:=store_cost_usd_v1(b);exception when others then
  insert into store_money_audit(action,detail)values('supplier_usd_review',jsonb_build_object('productId',p.product_id,'variantId',p.variant_id,'reason',sqlerrm));
  return jsonb_build_object('status','review','reason',sqlerrm);
 end;
 select *into s from store_money_settings where id;minimum:=s.minimum_margin;
 rm:=coalesce(p.retail_margin,s.retail_margin);wm:=coalesce(p.wholesale_margin,s.wholesale_margin);
 if minimum is null or rm is null or wm is null or rm<minimum or wm<minimum or greatest(rm,wm)+(b->>'feePercent')::numeric>=100 then return jsonb_build_object('status','review','reason','Commercial margins require configuration');end if;
 retail:=case when p.retail_source='manual'then p.retail_usd else ceil((total+(b->>'variableArs')::numeric/(b->>'acquisitionArs')::numeric)/(1-(rm+(b->>'feePercent')::numeric)/100)*100)/100 end;
 wholesale:=case when p.wholesale_source='manual'then p.wholesale_usd else ceil((total+(b->>'variableArs')::numeric/(b->>'acquisitionArs')::numeric)/(1-(wm+(b->>'feePercent')::numeric)/100)*100)/100 end;
 if abs(retail/p.retail_usd-1)*100>s.max_change or(p.wholesale_usd>0 and abs(wholesale/p.wholesale_usd-1)*100>s.max_change)then
  insert into store_money_audit(action,detail)values('supplier_usd_review',jsonb_build_object('productId',p.product_id,'variantId',p.variant_id,'retailUsd',retail,'wholesaleUsd',wholesale,'reason','Change limit exceeded'));
  return jsonb_build_object('status','review','reason','Change limit exceeded');
 end if;
 update product_usd_prices set retail_usd=retail,wholesale_usd=wholesale,total_cost_usd=total,cost_basis=b,costs_updated_at=now(),updated_at=now(),revision=revision+1 where id=p.id;
 begin
  perform store_usd_floor_v1(p.product_id,p.variant_id,store_price_ars_v1(p.product_id,p.variant_id,'retail',null));
  if wholesale is not null then perform store_usd_floor_v1(p.product_id,p.variant_id,store_price_ars_v1(p.product_id,p.variant_id,'wholesale',null));end if;
 exception when others then
  insert into store_money_audit(action,detail)values('supplier_usd_margin_alert',jsonb_build_object('productId',p.product_id,'variantId',p.variant_id,'reason',sqlerrm,'costUsd',total));
 end;
 insert into store_money_audit(action,detail)values('supplier_usd',jsonb_build_object('productId',p.product_id,'variantId',p.variant_id,'before',to_jsonb(p),'retailUsd',retail,'wholesaleUsd',wholesale,'costUsd',total,'offerId',o.id));
 return jsonb_build_object('status','applied');
end$$;

create or replace function public.store_usd_floor_v1(product_input uuid,variant_input uuid,net_input numeric)returns void language plpgsql stable security definer set search_path=public,pg_temp as $$
declare p product_usd_prices;c product_costs;b jsonb;cost numeric;fee numeric;variable numeric;contribution numeric;minimum numeric;required numeric;begin
 select *into p from product_usd_prices where product_id=product_input and variant_id is not distinct from variant_input;
 if not found then return;end if;
 select minimum_margin into minimum from store_money_settings where id;
 if minimum is null then raise exception 'Configure minimum USD margin';end if;
 b:=p.cost_basis;
 if b is not null then cost:=store_cost_usd_v1(b)*(b->>'acquisitionArs')::numeric;fee:=(b->>'feePercent')::numeric;variable:=(b->>'variableArs')::numeric;required:=(b->>'minimumContribution')::numeric;
 else
  if variant_input is not null then raise exception 'Exact variant USD costs required';end if;
  select *into c from product_costs where product_id=product_input;
  if not found or not c.expenses_confirmed or c.verified_at is null or c.verified_at<now()-interval '30 days'or c.verified_at>now()+interval '5 minutes'or c.landed_cost<=0 then raise exception 'Confirmed USD costs required';end if;
  cost:=c.landed_cost;fee:=c.payment_fee_percent;variable:=c.variable_cost;required:=c.minimum_contribution;
 end if;
 if net_input is null or net_input<=0 or cost is null or fee is null or variable is null or required is null then raise exception 'Incomplete contribution basis';end if;
 contribution:=net_input*(1-fee/100)-cost-variable;
 if contribution<required or contribution/net_input*100<minimum then raise exception 'USD margin below minimum; review price or costs';end if;
end$$;

create or replace function public.store_cost_record_v1(product_input uuid,variant_input uuid,original_input jsonb)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare u product_usd_prices;b jsonb;acquisition numeric;total numeric;begin
 select *into u from product_usd_prices where product_id=product_input and variant_id is not distinct from variant_input;
 if u.cost_basis is null then return original_input;end if;
 b:=u.cost_basis;acquisition:=(b->>'acquisitionArs')::numeric;total:=store_cost_usd_v1(b)*acquisition;
 return coalesce(original_input,'{}')||jsonb_build_object('origin_cost',(b->>'origin')::numeric,'currency',b->>'currency','exchange_rate',acquisition/(b->>'unitsPerUsd')::numeric,
 'landed_cost',total,'freight_per_unit',0,'other_landed_cost',total-(b->>'origin')::numeric/(b->>'unitsPerUsd')::numeric*acquisition,
 'variable_cost',(b->>'variableArs')::numeric,'payment_fee_percent',(b->>'feePercent')::numeric,'minimum_contribution',(b->>'minimumContribution')::numeric,
 'supplier_url',b->>'supplierUrl','source_document',b->>'document','expenses_confirmed',true,'verified_at',u.costs_updated_at,'usd_cost_basis',true);
end$$;

-- Adapt the owning reservation functions, keeping their stock, supplier and payment guards.
do $$declare definition text;name text;begin
 foreach name in array array['supplier_checkout_basis_v1(uuid,uuid,numeric,numeric)','create_retail_order_reserved_v2(jsonb)','create_wholesale_order_v1(jsonb)']loop
  definition:=pg_get_functiondef(('public.'||name)::regprocedure);
  if position('store_price_ars_v1(p.id' in definition)>0 then continue;end if;
  if position('v.retail_price' in definition)=0 or position('p.retail_price' in definition)=0 then raise exception 'Reservation function changed: %',name;end if;
  definition:=replace(definition,'v.retail_price','store_price_ars_v1(p.id,v.id,''retail'',v.retail_price)');
  definition:=replace(definition,'p.retail_price','store_price_ars_v1(p.id,null,''retail'',p.retail_price)');
  if name='supplier_checkout_basis_v1(uuid,uuid,numeric,numeric)'then
   definition:=replace(definition,'select * into c from product_costs where product_id=p.id for share;',
   'select * into c from product_costs where product_id=p.id for share;
    if exists(select 1 from product_usd_prices where product_id=p.id and variant_id is not distinct from variant_input and cost_basis is not null)then
     select jsonb_populate_record(c,jsonb_build_object(''origin_cost'',(u.cost_basis->>''origin'')::numeric,''currency'',u.cost_basis->>''currency'',
     ''exchange_rate'',(u.cost_basis->>''acquisitionArs'')::numeric/(u.cost_basis->>''unitsPerUsd'')::numeric,
     ''landed_cost'',store_cost_usd_v1(u.cost_basis)*(u.cost_basis->>''acquisitionArs'')::numeric,''freight_per_unit'',0,
     ''other_landed_cost'',(store_cost_usd_v1(u.cost_basis)-(u.cost_basis->>''origin'')::numeric/(u.cost_basis->>''unitsPerUsd'')::numeric)*(u.cost_basis->>''acquisitionArs'')::numeric,
     ''variable_cost'',(u.cost_basis->>''variableArs'')::numeric,''payment_fee_percent'',(u.cost_basis->>''feePercent'')::numeric,
     ''minimum_contribution'',(u.cost_basis->>''minimumContribution'')::numeric,''supplier_url'',u.cost_basis->>''supplierUrl'',''expenses_confirmed'',true,''verified_at'',u.costs_updated_at))into c
     from product_usd_prices u where u.product_id=p.id and u.variant_id is not distinct from variant_input;
    end if;');
  end if;
  execute definition;
 end loop;
end$$;

-- Preserve wholesale eligibility, cost freshness, stock and commercial floors. Independent
-- USD base replaces only the price candidate; existing quantity/payment benefits still apply.
do $$declare definition text;marker text;replacement text;begin
 definition:=pg_get_functiondef('public.wholesale_quote_basis_impl_v1(uuid,uuid,integer,text,boolean)'::regprocedure);
 if position('cost:=store_cost_record_v1' in definition)>0 then return;end if;
 marker:='price:=coalesce(control.fixed_price,case when control."freeze" then nullif(registered,0)end,ceil(greatest(floor_price,total_cost/(1-(target+fee)/100)*(1-discount/100))/step)*step);';
 replacement:='if exists(select 1 from product_usd_prices where product_id=product_input and variant_id is not distinct from variant_input) then
 price:=store_price_ars_v1(product_input,variant_input,''wholesale'',null)*(1-discount/100);
 price:=round(price/step)*step;
 if t is not null then price:=round(price*(1-base_target_placeholder/100)/(1-target/100)/step)*step;end if;
 else '||marker||'end if;';
 replacement:=replace(replacement,'base_target_placeholder','coalesce((override->>''target'')::numeric,(r.config->>''targetMarginPercent'')::numeric)');
 if position(marker in definition)=0 then raise exception 'Wholesale price marker changed';end if;
 definition:=replace(definition,marker,replacement);
 definition:=replace(definition,'select * into control from wholesale_product_controls',
  'cost:=store_cost_record_v1(product_input,variant_input,cost);select * into control from wholesale_product_controls');
 definition:=replace(definition,'if cost->>''currency''=''USD''then',
  'if cost->>''currency''=''USD''and coalesce((cost->>''usd_cost_basis'')::boolean,false)=false then');
 definition:=replace(definition,'retail:=p.retail_price','retail:=store_price_ars_v1(p.id,null,''retail'',p.retail_price)');
 definition:=replace(definition,'retail:=v.retail_price','retail:=store_price_ars_v1(p.id,v.id,''retail'',v.retail_price)');
 -- USD references are independent of legacy ARS change thresholds; their own revision audit applies.
 definition:=replace(definition,'elsif registered>0 and abs(price/registered-1)','elsif not exists(select 1 from product_usd_prices where product_id=product_input and variant_id is not distinct from variant_input) and registered>0 and abs(price/registered-1)');
 execute definition;
end$$;

create or replace function public.store_checkout_prices_v1(items_input jsonb,payment_input text,rate_input uuid)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare line jsonb;result jsonb:='[]';basis jsonb;p product_usd_prices;legacy numeric;price numeric;r store_exchange_rates;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 if jsonb_typeof(items_input)is distinct from 'array'or jsonb_array_length(items_input)not between 1 and 50 then raise exception 'Invalid items';end if;
 if to_regprocedure('public.catalog_check_quote_items_v1(jsonb)') is not null then
  perform catalog_check_quote_items_v1(items_input);
 end if;
 if rate_input is not null then select *into r from store_exchange_rates where id=rate_input;if not found or r.expires_at<now()then raise exception 'Exchange rate expired';end if;end if;
 perform set_config('mya.exchange_rate_id',coalesce(rate_input::text,''),true);
 for line in select value from jsonb_array_elements(items_input)loop
  select *into p from product_usd_prices where product_id=(line->>'productId')::uuid and variant_id is not distinct from nullif(line->>'variantId','')::uuid;
  if p.id is not null and rate_input is null then raise exception 'Exchange rate required';end if;
  if nullif(line->>'variantId','')is null then select retail_price into legacy from products where id=(line->>'productId')::uuid;
  else select retail_price into legacy from product_variants where id=(line->>'variantId')::uuid and product_id=(line->>'productId')::uuid;end if;
  if line->>'channel'='wholesale'then
   basis:=wholesale_quote_basis_v1((line->>'productId')::uuid,nullif(line->>'variantId','')::uuid,(line->>'quantity')::integer,payment_input);price:=(basis->>'unit_price')::numeric;
  else price:=store_price_ars_v1((line->>'productId')::uuid,nullif(line->>'variantId','')::uuid,'retail',legacy);
   basis:=supplier_checkout_basis_v1((line->>'productId')::uuid,nullif(line->>'variantId','')::uuid,price,0);
  end if;
  if price is not null then perform store_usd_floor_v1((line->>'productId')::uuid,nullif(line->>'variantId','')::uuid,price);end if;
  result:=result||jsonb_build_array(jsonb_build_object('productId',line->>'productId','variantId',line->>'variantId','price',price,'basis',basis,'revision',p.revision,'usd',case when line->>'channel'='wholesale'then p.wholesale_usd::text else p.retail_usd::text end));
 end loop;return result;
end$$;

create or replace function public.create_store_order_v1(quote_input uuid,fingerprint_input text,customer_input jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare q store_checkout_quotes;r store_exchange_rates;result jsonb;line jsonb;existing orders;p product_usd_prices;begin
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
 for line in select value from jsonb_array_elements(q.prices)loop
  select *into p from product_usd_prices where product_id=(line->>'productId')::uuid and variant_id is not distinct from nullif(line->>'variantId','')::uuid for share;
  if p.revision is distinct from(line->>'revision')::integer then raise exception 'El precio USD cambió. Volvé a cotizar.';end if;
 end loop;
 for line in select value from jsonb_array_elements(q.payload->'items')loop
  perform store_usd_floor_v1((line->>'id')::uuid,nullif(line->>'variant_id','')::uuid,(line->>'price')::numeric*(1-(q.payload->>'discount')::numeric/(q.payload->>'subtotal')::numeric));
 end loop;
 if exists(select 1 from jsonb_array_elements(q.payload->'items')x where x->>'channel'='wholesale')then result:=create_wholesale_order_v1(customer_input||q.payload);
 else result:=create_retail_order_v2(customer_input||q.payload);end if;
 update orders set charge_currency='ARS',exchange_snapshot=case when r.id is not null then jsonb_build_object('id',r.id,'kind',r.kind,'source',r.source,'rate',r.rate::text,'rawRate',r.raw_rate::text,'adjustment',r.adjustment::text,'sourceAt',r.source_at,'quotedAt',q.created_at,'quoteExpiresAt',q.expires_at)end where id=(result->>'id')::uuid;
 update order_items i set base_unit_usd=(x->>'usd')::numeric from jsonb_array_elements(q.prices)x where i.order_id=(result->>'id')::uuid and i.product_id=(x->>'productId')::uuid and i.variant_id is not distinct from nullif(x->>'variantId','')::uuid;
 update store_checkout_quotes set order_id=(result->>'id')::uuid where id=q.id;
 select to_jsonb(o)into result from orders o where id=(result->>'id')::uuid;return result;
end$$;

create or replace function public.store_protect_order_currency_v1()returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if old.exchange_snapshot is not null and(new.exchange_snapshot is distinct from old.exchange_snapshot or new.total_amount is distinct from old.total_amount
 or new.subtotal_amount is distinct from old.subtotal_amount or new.discount_amount is distinct from old.discount_amount or new.shipping_amount is distinct from old.shipping_amount or new.charge_currency is distinct from old.charge_currency)then raise exception 'Accepted order currency and amounts are immutable';end if;
 return new;
end$$;
drop trigger if exists store_order_currency_immutable on orders;
create trigger store_order_currency_immutable before update on orders for each row execute function store_protect_order_currency_v1();

do $$declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and(p.proname like 'store_%'or p.proname in('claim_store_exchange_refresh_v1','finish_store_exchange_refresh_v1','save_store_money_settings_v1','save_product_usd_v1','migrate_product_usd_v1','guard_usd_legacy_write_v1','create_store_order_v1'))loop
 execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
 end loop;
end$$;
grant execute on function store_exchange_public_v1(),store_usd_prices_v1(uuid[])to anon,authenticated,service_role;
grant execute on function save_store_money_settings_v1(jsonb,text),store_manual_rate_v1(numeric,integer,text),save_product_usd_v1(uuid,uuid,jsonb,text),migrate_product_usd_v1(uuid,uuid,uuid,jsonb,boolean)to authenticated;
grant execute on function claim_store_exchange_refresh_v1(boolean),finish_store_exchange_refresh_v1(uuid,numeric,timestamptz,text),store_checkout_prices_v1(jsonb,text,uuid),create_store_order_v1(uuid,text,jsonb)to service_role;
grant execute on function store_refresh_supplier_usd_v1(uuid)to service_role;
commit;
