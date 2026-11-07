begin;
-- PREPARED ONLY. The policy starts in preview mode; no catalogue writes or cron changes.
create table if not exists public.store_profitability_policy (
 id boolean primary key default true check(id), version integer not null default 1,
 retail_target numeric not null default 30 check(retail_target>=10 and retail_target<100),
 wholesale_target numeric not null default 18 check(wholesale_target>=10 and wholesale_target<100),
 minimum_margin numeric not null default 10 check(minimum_margin>=10 and minimum_margin<100),
 usd_step numeric not null default .01 check(usd_step in(.01,.5,1)),
 cost_max_age_seconds integer not null default 86400 check(cost_max_age_seconds between 60 and 2592000),
 enforcement text not null default 'preview' check(enforcement in('preview','enforce')),
 methods jsonb not null default '{"mercado_pago":{"confirmed":false},"transferencia":{"confirmed":false}}',
 updated_at timestamptz not null default now(), actor uuid references auth.users(id),
 check(retail_target>=minimum_margin and wholesale_target>=minimum_margin)
);
insert into store_profitability_policy(id)values(true)on conflict(id)do nothing;
create table if not exists public.store_profitability_profiles (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id),
 variant_id uuid references product_variants(id), revision integer not null default 1,
 basis jsonb not null, source_offer_id uuid references supplier_offers(id),
 updated_at timestamptz not null default now(), actor uuid references auth.users(id)
);
create unique index if not exists store_profitability_identity on store_profitability_profiles(product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));
create table if not exists public.store_profitability_offer_costs(
 offer_id uuid primary key references supplier_offers(id),basis jsonb not null,revision integer not null default 1,
 updated_at timestamptz not null default now(),actor uuid references auth.users(id)
);
alter table store_profitability_offer_costs enable row level security;
revoke all on store_profitability_offer_costs from public,anon,authenticated,service_role;
grant select on store_profitability_offer_costs to service_role;
alter table store_profitability_policy enable row level security;
alter table store_profitability_profiles enable row level security;
revoke all on store_profitability_policy,store_profitability_profiles from public,anon,authenticated;
grant select on store_profitability_policy,store_profitability_profiles to service_role;
alter table product_usd_prices add column if not exists profitability_snapshot jsonb;
alter table store_checkout_quotes add column if not exists profitability_snapshot jsonb;
alter table product_usd_prices add column if not exists acquisition_cost_usd numeric;
alter table product_usd_prices add column if not exists minimum_commercial_usd numeric;
alter table product_usd_prices add column if not exists effective_retail_margin numeric;
alter table product_usd_prices add column if not exists effective_wholesale_margin numeric;
alter table product_usd_prices add column if not exists cost_status text;
alter table product_usd_prices add column if not exists cost_source text;

create or replace function public.store_decimal_v2(value_input text)returns numeric language plpgsql immutable set search_path=public,pg_temp as $$
begin
 if value_input is null or length(value_input)>32 or value_input !~ '^([0-9]+(\.[0-9]{1,12})?|\.[0-9]{1,12})$'then raise exception 'Explicit nonnegative decimal required';end if;
 return value_input::numeric;
end$$;

-- Normalize documented unit costs. Percent carrier rates are policy data, never inferred
-- from a customer's quantity. Included recoverable VAT must already be excluded from costs.
create or replace function public.store_acquisition_cost_v2(b jsonb)returns numeric
language plpgsql stable security definer set search_path=public,pg_temp as $$
 declare goods numeric;carrier numeric:=0;extra numeric:=0;c jsonb;seen text[]:='{}';r jsonb;bought numeric;begin
 if b->>'status' is distinct from 'COSTO_VERIFICADO' or b->>'document' is null or length(b->>'document')<10
 or b->>'costsComplete' is distinct from 'true' or b->>'accountingConfirmed' is distinct from 'true'
 or b->>'identityVerified' is distinct from 'true' then raise exception 'Unverified or incomplete exact cost';end if;
 if not coalesce(b->>'settlementBasis'in('usd','ars_cash'),false)or length(coalesce(b->>'settlementDocument',''))<10 then raise exception 'Documented acquisition settlement basis required';end if;
 if not coalesce(b->>'currency' in('USD','ARS','PYG','BRL'),false)or nullif(b->>'origin','')is null or nullif(b->>'unitsPerUsd','')is null or(b->>'origin')::numeric<=0 or(b->>'unitsPerUsd')::numeric<=0
 or (b->>'currency'='USD'and(b->>'unitsPerUsd')::numeric<>1)then raise exception 'Invalid cost currency or FX';end if;
 if nullif(b->>'fxSource','')is null or not coalesce(nullif(b->>'fxAt','')::timestamptz between now()-interval '24 hours'and now()+interval '5 minutes',false)
 or not coalesce(nullif(b->>'checkedAt','')::timestamptz between now()-make_interval(secs=>(select cost_max_age_seconds from store_profitability_policy where id))and now()+interval '5 minutes',false)
 then raise exception 'Stale cost or acquisition FX';end if;
 goods:=store_decimal_v2(b->>'origin')/store_decimal_v2(b->>'unitsPerUsd');
 r:=b->'carrier';
 if r->>'confirmed' is distinct from 'true'or nullif(r->>'document','')is null or(r->>'validUntil')::timestamptz<now()
 or nullif(r->>'validUntil','')is null then raise exception 'Unconfirmed carrier tariff';end if;
 if r->>'kind'='percent'then
  if(r->>'percent')::numeric<0 or(r->>'percent')::numeric>=100 then raise exception 'Invalid carrier percent';end if;
  if r->>'reduced'='true'and(not coalesce((r->'procurement'->>'confirmed')::boolean,false)
   or nullif(r->'procurement'->>'id','')is null or nullif(r->'procurement'->>'document','')is null
   or nullif(r->'procurement'->>'goodsUsd','')is null or(r->'procurement'->>'goodsUsd')::numeric<=(r->>'thresholdUsd')::numeric
   or nullif(r->>'thresholdUsd','')is null)then raise exception 'Reduced carrier requires confirmed procurement operation above threshold';end if;
  carrier:=goods*store_decimal_v2(r->>'percent')/100;
 elsif r->>'kind'='fixed'then carrier:=store_decimal_v2(r->>'unitUsd');
 else raise exception 'Carrier tariff kind required';end if;
 -- Carrier USD may be settled at a distinct documented ARS rate.
 if r ? 'settlementArsPerUsd'then
  bought:=(b->>'acquisitionArsPerUsd')::numeric;
  if bought is null or bought<=0 or(r->>'settlementArsPerUsd')::numeric<=0
   or not coalesce(nullif(r->>'fxAt','')::timestamptz between now()-interval '24 hours'and now()+interval '5 minutes',false)
   or nullif(r->>'fxSource','')is null then raise exception 'Carrier settlement FX evidence required';end if;
  carrier:=carrier*(r->>'settlementArsPerUsd')::numeric/bought;
 end if;
 if jsonb_typeof(b->'components')is distinct from 'array'then raise exception 'Explicit additional costs required (including empty array)';end if;
 for c in select value from jsonb_array_elements(b->'components')loop
  if nullif(c->>'id','')is null or c->>'id'=any(seen)or c->>'kind'='payment_fee'or not coalesce(c->>'group' in('acquisition','sale','overhead'),false)
   or(c->>'amountUsd')::numeric<0 or nullif(c->>'amountUsd','')is null or nullif(c->>'document','')is null then raise exception 'Invalid or duplicate cost component';end if;
  seen:=array_append(seen,c->>'id');
  if c->>'shared'='true'and(nullif(c->>'allocationPolicy','')is null or nullif(c->>'allocationDocument','')is null)then raise exception 'Shared cost allocation required';end if;
  perform store_decimal_v2(c->>'amountUsd');
  if c->>'group'='acquisition'then extra:=extra+(c->>'amountUsd')::numeric;end if;
 end loop;
 if carrier is null or carrier<0 then raise exception 'Incomplete carrier tariff';end if;
 if b->>'settlementBasis'='ars_cash'then
  bought:=store_decimal_v2(b->>'acquisitionArsPerUsd');
  if bought<=0 or store_decimal_v2(b->>'cashCostArs')<=0 or abs((b->>'cashCostArs')::numeric-(goods+carrier+extra)*bought)>.01
   or not coalesce(nullif(b->>'acquisitionAt','')::timestamptz between now()-interval '24 hours'and now()+interval '5 minutes',false)
  then raise exception 'Actual acquisition ARS cost or its documented FX differs';end if;
 end if;
 return goods+carrier+extra;
end$$;

-- The single contribution engine. All inputs/outputs use PostgreSQL NUMERIC; monetary
-- outputs are decimal strings. UI, automatic proposals and checkout call this function.
create or replace function public.store_profitability_v2(p jsonb)returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare policy store_profitability_policy;method jsonb;tier jsonb;tiers jsonb;line jsonb;c jsonb;b jsonb;
 acquisition numeric;variable numeric;cost numeric:=0;sum_paid numeric:=0;unit numeric;paid numeric;q integer;rate numeric;
 vat numeric;net_factor numeric;target numeric;step numeric;ars_step numeric;fee_percent numeric;net_percent numeric;fixed numeric;
 denominator numeric;auto_price numeric;floor_price numeric;best_auto numeric;best_floor numeric;
 actual_fee numeric;revenue numeric;contribution numeric;margin numeric;discount numeric;lines jsonb:='[]';outcomes jsonb:='[]';
 matched integer:=0;total_qty integer:=0;valid boolean;min_tier numeric;max_tier numeric;actual_tier jsonb;reserve_fee numeric:=0;previous_max numeric:=0;price_step numeric;round_qty integer:=1;
begin
 if coalesce(current_setting('role',true),'')<>'service_role'and not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 select *into policy from store_profitability_policy where id;
 if not coalesce(p->>'channel' in('retail','wholesale'),false)then raise exception 'Invalid channel';end if;
 target:=case when p->>'channel'='wholesale'then policy.wholesale_target else policy.retail_target end;
 method:=policy.methods->(p->>'paymentMethod');
 if method->>'confirmed' is distinct from 'true' or nullif(method->>'document','')is null
 or nullif(method->>'validUntil','')is null or(method->>'validUntil')::timestamptz<now()then raise exception 'Payment fee unknown or stale';end if;
 if not coalesce(method->>'rounding'in('exact','ceil_cent_ars'),false)then raise exception 'Payment fee rounding must be confirmed';end if;
 if p->>'accountingBasis'='gross_no_vat'and p->>'accountingConfirmed'='true'then vat:=0;
 elsif p->>'accountingBasis'='vat_included_net'and p->>'accountingConfirmed'='true'then vat:=(p->>'vatPercent')::numeric;
 else raise exception 'Accounting basis must be explicitly confirmed';end if;
 if vat is null or vat<0 or vat>=100 then raise exception 'Invalid included VAT';end if;
 net_factor:=1/(1+vat/100);rate:=store_decimal_v2(p->>'publicArsPerUsd');ars_step:=store_decimal_v2(coalesce(p->>'arsStep','.01'));step:=policy.usd_step;
 if rate is null or rate<=0 or ars_step<=0 or ars_step>10000 then raise exception 'Invalid public FX or ARS rounding';end if;
 if method->>'rounding'='ceil_cent_ars'then reserve_fee:=.01/rate;end if;
 if jsonb_typeof(p->'lines')is distinct from 'array'or jsonb_array_length(p->'lines')not between 1 and 50 then raise exception 'Invalid lines';end if;
 for line in select value from jsonb_array_elements(p->'lines')loop
  q:=(line->>'quantity')::integer;b:=line->'cost';
  if q is null or q not between 1 and 10000 then raise exception 'Invalid quantity';end if;
  acquisition:=store_acquisition_cost_v2(b);variable:=0;
  if b->>'accountingBasis' is distinct from p->>'accountingBasis'or (vat>0 and(b->>'vatPercent')::numeric is distinct from vat)then raise exception 'Cost and revenue accounting bases differ';end if;
  for c in select value from jsonb_array_elements(b->'components')loop
   if c->>'group'='sale'or(c->>'group'='overhead'and c->>'allocated'='true')then
    if c->>'group'='overhead'and nullif(c->>'allocationPolicy','')is null then raise exception 'Overhead allocation policy required';end if;
    variable:=variable+case when c ? 'cashArs'then store_decimal_v2(c->>'cashArs')/rate else(c->>'amountUsd')::numeric end;
   end if;
  end loop;
  if b->>'settlementBasis'='ars_cash'then
   acquisition:=store_decimal_v2(b->>'cashCostArs')/rate;
  end if;
  cost:=cost+(acquisition+variable)*q;total_qty:=total_qty+q;
  unit:=case when nullif(line->>'unitUsd','')is not null then store_decimal_v2(line->>'unitUsd')end;
  discount:=case when line->>'discountEligible'='true'then coalesce((line->>'discountPercent')::numeric,0)else 0 end;
  if discount<0 or discount>=100 or unit<0 then raise exception 'Invalid discount or price';end if;
  -- Explicit effective cents may be supplied by server promotion allocation, never by browser.
  paid:=case when line ? 'paidArs'then store_decimal_v2(line->>'paidArs')/rate else round(round(unit*rate/ars_step)*ars_step*q*(1-discount/100),2)/rate end;
  if paid<0 or(paid is null and unit is not null)then raise exception 'Invalid effective paid amount';end if;
  sum_paid:=sum_paid+coalesce(paid,0);
  lines:=lines||jsonb_build_array(jsonb_build_object('key',line->>'key','quantity',q,'costUsd',(acquisition+variable)*q,'paidUsd',paid,'acquisitionUnitUsd',acquisition::text,'saleUnitUsd',variable::text));
 end loop;
 if coalesce((p->>'fixedSaleUsd')::numeric,0)<0 or coalesce((p->>'shippingCollectedArs')::numeric,0)<0 then raise exception 'Invalid sale costs';end if;
 cost:=cost+coalesce((p->>'fixedSaleUsd')::numeric,0);
 sum_paid:=sum_paid+coalesce((p->>'shippingCollectedArs')::numeric,0)/rate;
 if jsonb_array_length(p->'lines')=1 then round_qty:=total_qty;end if;price_step:=step*round_qty;
 tiers:=method->'tiers';
 if jsonb_typeof(tiers)is distinct from 'array'or jsonb_array_length(tiers)not between 1 and 20 then raise exception 'Explicit fee tiers required';end if;
 for tier in select value from jsonb_array_elements(tiers)order by store_decimal_v2(value->>'minUsd')loop
  fee_percent:=store_decimal_v2(tier->>'percentGross');net_percent:=store_decimal_v2(tier->>'percentNet');
  fixed:=store_decimal_v2(tier->>'fixedUsd')+store_decimal_v2(tier->>'fixedArs')/rate;
  min_tier:=store_decimal_v2(tier->>'minUsd');max_tier:=case when tier->>'maxUsd'is not null then store_decimal_v2(tier->>'maxUsd')end;
  if min_tier is distinct from previous_max then raise exception 'Fee tiers overlap or leave a gap';end if;previous_max:=max_tier;
  if fee_percent is null or net_percent is null or fixed is null or fee_percent<0 or net_percent<0 or fixed<0 or min_tier is null or min_tier<0 or max_tier<=min_tier then raise exception 'Incomplete fee structure';end if;
  denominator:=net_factor*(1-target/100-net_percent/100)-fee_percent/100;
  if denominator<=0 then raise exception 'Impossible target after fees';end if;
  auto_price:=ceil(greatest((cost+fixed+reserve_fee)/denominator,ceil(min_tier/round_qty*rate/ars_step)*ars_step*round_qty/rate)/price_step)*price_step;
  -- Protect even a downward ARS half-step after USD rounding.
  if round(auto_price/round_qty*rate/ars_step)*ars_step*round_qty/rate*denominator<cost+fixed then auto_price:=ceil((auto_price+ars_step*round_qty/rate)/price_step)*price_step;end if;
  if round(auto_price/round_qty*rate/ars_step)*ars_step*round_qty/rate>=min_tier and(max_tier is null or round(auto_price/round_qty*rate/ars_step)*ars_step*round_qty/rate<max_tier)then best_auto:=least(best_auto,auto_price);end if;
  denominator:=net_factor*(1-policy.minimum_margin/100-net_percent/100)-fee_percent/100;
  if denominator<=0 then raise exception 'Impossible safety margin after fees';end if;
  floor_price:=ceil(greatest((cost+fixed+reserve_fee)/denominator,ceil(min_tier/round_qty*rate/ars_step)*ars_step*round_qty/rate)/price_step)*price_step;
  if round(floor_price/round_qty*rate/ars_step)*ars_step*round_qty/rate*denominator<cost+fixed then floor_price:=ceil((floor_price+ars_step*round_qty/rate)/price_step)*price_step;end if;
  if round(floor_price/round_qty*rate/ars_step)*ars_step*round_qty/rate>=min_tier and(max_tier is null or round(floor_price/round_qty*rate/ars_step)*ars_step*round_qty/rate<max_tier)then best_floor:=least(best_floor,floor_price);end if;
  if sum_paid>=min_tier and(max_tier is null or sum_paid<max_tier)then matched:=matched+1;actual_tier:=tier;end if;
 end loop;
 if previous_max is not null then raise exception 'Fee tiers must cover the full amount range';end if;
 if best_auto is null or best_floor is null then raise exception 'No fee tier yields a valid price';end if;
 valid:=false;
 if sum_paid>0 then
  if matched<>1 then raise exception 'Ambiguous or missing applicable fee tier';end if;
  actual_fee:=sum_paid*(actual_tier->>'percentGross')::numeric/100+sum_paid*net_factor*(actual_tier->>'percentNet')::numeric/100+(actual_tier->>'fixedUsd')::numeric+(actual_tier->>'fixedArs')::numeric/rate;
  if method->>'rounding'='ceil_cent_ars'then actual_fee:=ceil(actual_fee*rate*100)/(100*rate);end if;
  revenue:=sum_paid*net_factor;contribution:=revenue-cost-actual_fee;margin:=contribution/revenue*100;valid:=margin>=policy.minimum_margin;
  for line in select value from jsonb_array_elements(lines)loop
   -- Allocate order fees and explicitly declared shared sale expenses by paid revenue.
   paid:=(line->>'paidUsd')::numeric;
   if paid is null or paid<=0 then valid:=false;else
    unit:=(paid*net_factor-(line->>'costUsd')::numeric-(actual_fee+coalesce((p->>'fixedSaleUsd')::numeric,0))*paid/sum_paid)/(paid*net_factor)*100;
    valid:=valid and unit>=policy.minimum_margin;
    outcomes:=outcomes||jsonb_build_array(line||jsonb_build_object('effectiveMargin',unit::text));
   end if;
  end loop;
 end if;
 return jsonb_build_object('policyVersion',policy.version,'targetMargin',target::text,'minimumMargin',policy.minimum_margin::text,
  'acquisitionAndSaleCostUsd',cost::text,'automaticTotalUsd',best_auto::text,'automaticUnitUsd',case when round_qty=total_qty then(best_auto/round_qty)::text end,'minimumTotalUsd',best_floor::text,'quantity',total_qty,
  'effectivePaidUsd',trim_scale(sum_paid)::text,'effectivePaidArs',trim_scale(sum_paid*rate)::text,'netRevenueUsd',trim_scale(revenue)::text,'feesUsd',trim_scale(actual_fee)::text,
  'contributionUsd',trim_scale(contribution)::text,'effectiveMargin',trim_scale(margin)::text,'allowed',valid,'lines',outcomes,'roundUsd',step::text);
end$$;

revoke all on function store_decimal_v2(text),store_acquisition_cost_v2(jsonb),store_profitability_v2(jsonb)from public,anon,authenticated,service_role;
grant execute on function store_profitability_v2(jsonb)to authenticated,service_role;
commit;
