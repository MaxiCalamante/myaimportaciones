begin;
create table public.supplier_fx_quotes (
 id uuid primary key default gen_random_uuid(),
 rate_ars numeric(18,2) not null check(rate_ars between 100 and 100000),
 source text not null check(source='criptoya-binance-totalAsk'),
 quoted_at timestamptz not null,
 evidence jsonb not null,
 created_at timestamptz not null default now()
);
create table public.supplier_fx_price_bases (
 product_id uuid primary key references public.products(id),
 origin_usd numeric not null check(origin_usd>0),
 base_fx numeric not null check(base_fx>0),
 base_landed numeric not null check(base_landed>0),
 base_retail numeric not null check(base_retail>0),
 base_wholesale numeric not null check(base_wholesale>=0),
 last_retail numeric not null,
 last_wholesale numeric not null,
 cost_snapshot jsonb not null,
 last_checked_at timestamptz,
 last_quote_id uuid references public.supplier_fx_quotes(id),
 approved_at timestamptz not null default now(),
 approved_by uuid default auth.uid()
);
alter table public.supplier_fx_quotes enable row level security;
alter table public.supplier_fx_price_bases enable row level security;
revoke all on public.supplier_fx_quotes,public.supplier_fx_price_bases from public,anon,authenticated;
grant select on public.supplier_fx_quotes,public.supplier_fx_price_bases to authenticated;
grant all on public.supplier_fx_quotes,public.supplier_fx_price_bases to service_role;
create policy supplier_fx_quotes_admin on public.supplier_fx_quotes for select to authenticated using(public.is_admin());
create policy supplier_fx_bases_admin on public.supplier_fx_price_bases for select to authenticated using(public.is_admin());

create function public.record_supplier_usdt_quote_v1(quote_input jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare qid uuid; rate numeric:=(quote_input->>'rateArs')::numeric; stamp timestamptz:=(quote_input->>'quotedAt')::timestamptz; cfg jsonb;
begin
 if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
 select config into cfg from supplier_tracking_settings where id=true for update;
 if quote_input->>'source' is distinct from 'criptoya-binance-totalAsk' or rate is null or rate not between 100 and 100000 or stamp is null or stamp>now()+interval '1 minute' or stamp<now()-interval '15 minutes' then raise exception 'Invalid or expired USDT quote'; end if;
 if (quote_input->'evidence'->>'primaryAsk')::numeric is null or (quote_input->'evidence'->>'ask')::numeric is null or (quote_input->'evidence'->>'primaryAsk')::numeric<=0 or (quote_input->'evidence'->>'ask')::numeric<=0 or abs((quote_input->'evidence'->>'ask')::numeric/(quote_input->'evidence'->>'primaryAsk')::numeric-1)>0.02 or rate<(quote_input->'evidence'->>'ask')::numeric or rate/(quote_input->'evidence'->>'ask')::numeric>1.03 then raise exception 'USDT sources disagree'; end if;
 if cfg->>'usdtQuotedAt' is not null and stamp<(cfg->>'usdtQuotedAt')::timestamptz then raise exception 'Older USDT quote'; end if;
 if cfg->>'usdtQuoteId' is not null and abs(rate/(cfg->>'acquisitionArsPerUsd')::numeric-1)>0.05 then raise exception 'USDT change exceeds 5 percent; manual review required'; end if;
 insert into supplier_fx_quotes(rate_ars,source,quoted_at,evidence) values(rate,quote_input->>'source',stamp,quote_input->'evidence') returning id into qid;
 if cfg->>'acquisitionFxMode'='usdt' then
  update supplier_tracking_settings set config=config||jsonb_build_object('acquisitionArsPerUsd',rate,'usdtQuoteId',qid,'usdtQuotedAt',stamp,'usdtSource',quote_input->>'source','fxConfirmedOn',to_char(stamp at time zone 'America/Argentina/Buenos_Aires','YYYY-MM-DD')),updated_at=now() where id=true;
 end if;
 return qid;
end $$;
revoke all on function public.record_supplier_usdt_quote_v1(jsonb) from public,anon,authenticated;
grant execute on function public.record_supplier_usdt_quote_v1(jsonb) to service_role;

create function public.enroll_supplier_fx_prices_v1(product_inputs uuid[],confirmed_input boolean,expected_input jsonb) returns integer
language plpgsql security definer set search_path=public as $$
declare pid uuid;p products;c product_costs;n integer:=0;
begin
 if (not public.is_admin() and coalesce(current_setting('role',true),'')<>'service_role') or confirmed_input is distinct from true then raise exception 'Forbidden'; end if;
 if product_inputs is null or cardinality(product_inputs) not between 1 and 500 then raise exception 'Invalid batch'; end if;
 if expected_input->>'quoteId' is null or expected_input->>'quoteId' is distinct from (select config->>'usdtQuoteId' from supplier_tracking_settings where id=true) then raise exception 'USDT quote changed; preview again'; end if;
 if not exists(select 1 from supplier_fx_quotes where id=(expected_input->>'quoteId')::uuid and quoted_at between now()-interval '24 hours' and now()+interval '1 minute') then raise exception 'USDT quote expired'; end if;
 foreach pid in array product_inputs loop
  select * into p from products where id=pid for update;
  select * into c from product_costs where product_id=pid;
  if p.retail_price is distinct from (expected_input->'prices'->pid::text->>'retail')::numeric or p.wholesale_price is distinct from (expected_input->'prices'->pid::text->>'wholesale')::numeric then raise exception 'Price changed; preview again'; end if;
  if jsonb_build_object('origin_cost',c.origin_cost,'currency',c.currency,'exchange_rate',c.exchange_rate,'landed_cost',c.landed_cost) is distinct from expected_input->'prices'->pid::text->'cost' then raise exception 'Cost changed; preview again'; end if;
  if p.id is null or not p.is_active or p.deleted_at is not null or p.fulfillment_mode<>'supplier' or p.retail_price<=0 or exists(select 1 from product_variants where product_id=pid) then raise exception 'Product requires individual review: %',pid; end if;
  if c.product_id is null or c.currency<>'USD' or c.origin_cost<=0 or c.exchange_rate<=0 or c.landed_cost<c.origin_cost*c.exchange_rate then raise exception 'Invalid historical USD basis: %',pid; end if;
  insert into supplier_fx_price_bases(product_id,origin_usd,base_fx,base_landed,base_retail,base_wholesale,last_retail,last_wholesale,cost_snapshot)
  values(pid,c.origin_cost,c.exchange_rate,c.landed_cost,p.retail_price,p.wholesale_price,p.retail_price,p.wholesale_price,jsonb_build_object('origin_cost',c.origin_cost,'currency',c.currency,'exchange_rate',c.exchange_rate,'landed_cost',c.landed_cost)) on conflict(product_id) do nothing;
  if found then n:=n+1; end if;
 end loop;
 update supplier_tracking_settings set config=config||jsonb_build_object('usdtAutoPrices',true),updated_at=now() where id=true;
 return n;
end $$;
revoke all on function public.enroll_supplier_fx_prices_v1(uuid[],boolean,jsonb) from public,anon;
grant execute on function public.enroll_supplier_fx_prices_v1(uuid[],boolean,jsonb) to authenticated,service_role;

create function public.apply_supplier_fx_price_v1(product_input uuid,quote_input uuid) returns text
language plpgsql security definer set search_path=public as $$
declare b supplier_fx_price_bases;p products;c product_costs;q supplier_fx_quotes;o supplier_offers;r supplier_market_references;cfg jsonb;landed numeric;retail numeric;wholesale numeric;step numeric;state text:='blocked';why text:='';
begin
 if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
 select config into cfg from supplier_tracking_settings where id=true;
 if cfg->>'enabled' is distinct from 'true' or cfg->>'autoPrices' is distinct from 'true' or cfg->>'usdtAutoPrices' is distinct from 'true' or cfg->>'acquisitionFxMode' is distinct from 'usdt' then return 'disabled'; end if;
 select * into b from supplier_fx_price_bases where product_id=product_input for update;
 if not found then return 'not_enrolled'; end if;
 select * into p from products where id=product_input for update;
 select * into c from product_costs where product_id=product_input;
 select * into q from supplier_fx_quotes where id=quote_input;
 step:=(cfg->>'roundArs')::numeric;
 if q.id is null or q.id::text is distinct from cfg->>'usdtQuoteId' or q.quoted_at<now()-interval '24 hours' or q.quoted_at>now()+interval '1 minute' or step is null or step<=0 then why:='Cotización USDT vencida, sustituida o inválida';
 elsif not p.is_active or p.deleted_at is not null or p.fulfillment_mode<>'supplier' or exists(select 1 from product_variants where product_id=p.id) then why:='Producto pausado, stock propio o requiere costo por variante';
 elsif p.retail_price is distinct from b.last_retail or p.wholesale_price is distinct from b.last_wholesale then why:='Precio editado fuera del ajuste USDT: revisar base';
 elsif jsonb_build_object('origin_cost',c.origin_cost,'currency',c.currency,'exchange_rate',c.exchange_rate,'landed_cost',c.landed_cost) is distinct from b.cost_snapshot then why:='Costo histórico editado: revisar base USDT';
 else
  -- A fresh, exact, unchanged USD quote is required for automatic application.
  select * into o from supplier_offers where product_id=p.id and variant_id is null and verification='verified' and currency='USD' and origin_cost=b.origin_usd and availability='in_stock' and last_error is null and cost_checked_at between now()-interval '24 hours' and now()+interval '1 minute' and availability_checked_at between now()-interval '24 hours' and now()+interval '1 minute' and coalesce(evidence->>'costScope','')<>'supplier_quote_inclusions_unconfirmed' order by cost_checked_at desc limit 1;
  if o.id is null then why:='Sin oferta exacta vigente con el mismo costo USD de la base';
  else
   landed:=round(b.base_landed+b.origin_usd*(q.rate_ars-b.base_fx),2);
   retail:=ceil(b.base_retail*(landed/b.base_landed)/step)*step;
   wholesale:=case when b.base_wholesale>0 then ceil(b.base_wholesale*(landed/b.base_landed)/step)*step else 0 end;
   select * into r from supplier_market_references where product_id=p.id and variant_id is null and identity_verified and last_error is null and checked_at between now()-interval '48 hours' and now()+interval '1 minute' and price_ars>0 order by price_ars limit 1;
   if landed<=0 or retail<landed/(1-(cfg->>'targetMarginPercent')::numeric/100) then why:='Margen registrado insuficiente: requiere revisión';
   elsif r.id is not null and retail>floor(r.price_ars*(1-coalesce((cfg->'productDiscountPercent'->>p.id::text)::numeric,(cfg->>'marketDiscountPercent')::numeric)/100)/step)*step then state:='proposal';why:='Ajuste USDT supera el objetivo del comparable exacto: revisar competitividad';
   elsif abs(retail-p.retail_price)>p.retail_price*(cfg->>'maxPriceChangePercent')::numeric/100 or (p.wholesale_price>0 and abs(wholesale-p.wholesale_price)>p.wholesale_price*(cfg->>'maxPriceChangePercent')::numeric/100) then state:='proposal';why:='Cambio USDT supera el límite automático';
   elsif retail=p.retail_price and wholesale=p.wholesale_price then state:='unchanged';why:='Precio alineado con la cotización USDT';
   else state:='applied';why:='Ajuste por USDT conservando margen sobre costos registrados; gastos finales pendientes';
    update products set retail_price=retail,wholesale_price=wholesale,updated_at=now() where id=p.id;
    update supplier_fx_price_bases set last_retail=retail,last_wholesale=wholesale,last_quote_id=q.id where product_id=p.id;
   end if;
  end if;
 end if;
 update supplier_fx_price_bases set last_checked_at=now() where product_id=product_input;
 if state<>'applied' and exists(select 1 from supplier_price_decisions where product_id=p.id and status=state and reason=why and created_at>now()-interval '24 hours') then return state; end if;
 insert into supplier_price_decisions(product_id,offer_id,reference_id,old_price,new_price,landed_ars,status,reason,basis)
 values(p.id,o.id,r.id,p.retail_price,retail,landed,state,why,jsonb_build_object('kind','usdt_fx','quoteId',q.id,'fx',q.rate_ars,'oldWholesale',p.wholesale_price,'newWholesale',wholesale,'baseFx',b.base_fx,'historicalCostsPreserved',true));
 return state;
end $$;
revoke all on function public.apply_supplier_fx_price_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.apply_supplier_fx_price_v1(uuid,uuid) to service_role;
commit;
