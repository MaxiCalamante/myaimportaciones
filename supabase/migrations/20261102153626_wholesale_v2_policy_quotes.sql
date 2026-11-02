begin;

-- Versioned private finance. The initial snapshot carries only the owner's public minimums.
create table public.wholesale_v2_policies(id uuid primary key default gen_random_uuid(),config jsonb not null,created_at timestamptz not null default now(),actor uuid default auth.uid());
insert into public.wholesale_v2_policies(config)values('{"minAmountArs":100000,"minUnits":5,"confirmed":false,"autoUpdate":false,"minimumMarginPercent":null,"targetMarginPercent":null,"paymentFees":{"mercado_pago":null,"transferencia":null},"riskPercent":null,"fixedUnitArs":null,"transferDiscountPercent":null,"roundArs":100,"costValidityHours":24,"maxPriceChangePercent":20,"categoryMargins":{},"brandMargins":{},"productMargins":{},"quantityMargins":[],"notes":"Pendiente de ratificar costos, comisiones y márgenes."}');
create table public.wholesale_product_controls(
 id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products(id),variant_id uuid references public.product_variants(id),
 enabled boolean not null default true,identity_confirmed boolean not null default false,eligibility_confirmed boolean not null default false,media_authorized boolean not null default false,compliance_confirmed boolean not null default false,
 evidence text not null default '',"freeze" boolean not null default false,fixed_price numeric check(fixed_price>0 and fixed_price<=1e12),
 approved_policy_id uuid references public.wholesale_v2_policies(id),last_priced_at timestamptz,updated_at timestamptz not null default now(),actor uuid default auth.uid());
create unique index wholesale_controls_identity on public.wholesale_product_controls(product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));
-- A missing variant cost remains missing. No inherited parent cost and no zero-valued seed.
create table public.wholesale_variant_costs(
 variant_id uuid primary key references public.product_variants(id),product_id uuid not null references public.products(id),
 origin_cost numeric check(origin_cost>0 and origin_cost<=1e12),currency text check(currency in('USD','ARS','PYG')),exchange_rate numeric check(exchange_rate>0 and exchange_rate<=1e12),
 freight_per_unit numeric check(freight_per_unit>=0 and freight_per_unit<=1e12),other_landed_cost numeric check(other_landed_cost>=0 and other_landed_cost<=1e12),
 landed_cost numeric generated always as(origin_cost*exchange_rate+freight_per_unit+other_landed_cost) stored,
 variable_cost numeric check(variable_cost>=0 and variable_cost<=1e12),payment_fee_percent numeric check(payment_fee_percent>=0 and payment_fee_percent<100),minimum_contribution numeric check(minimum_contribution>=0 and minimum_contribution<=1e12),
 supplier_url text,source_document text,expenses_confirmed boolean not null default false,verified_at timestamptz,updated_at timestamptz not null default now(),actor uuid default auth.uid());
create table public.wholesale_price_events(id uuid primary key default gen_random_uuid(),product_id uuid references public.products(id),variant_id uuid references public.product_variants(id),action text not null,detail jsonb not null default '{}',created_at timestamptz not null default now(),actor uuid default auth.uid());
do $$declare t text;begin
 foreach t in array array['wholesale_v2_policies','wholesale_product_controls','wholesale_variant_costs','wholesale_price_events']loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy admin_read on public.%I for select to authenticated using((select public.is_admin()))',t);
 end loop;
end$$;

create function public.wholesale_validate_policy_v1(c jsonb)returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare k text;m jsonb;fee numeric;target numeric;minimum numeric;begin
 if jsonb_typeof(c)<>'object' or not(c?&array['minAmountArs','minUnits','confirmed','autoUpdate','minimumMarginPercent','targetMarginPercent','paymentFees','riskPercent','fixedUnitArs','transferDiscountPercent','roundArs','costValidityHours','maxPriceChangePercent','categoryMargins','brandMargins','productMargins','quantityMargins','notes'])then raise exception 'Incomplete wholesale policy';end if;
 if jsonb_typeof(c->'minAmountArs')<>'number' or jsonb_typeof(c->'minUnits')<>'number' or jsonb_typeof(c->'roundArs')<>'number' or jsonb_typeof(c->'costValidityHours')<>'number' or jsonb_typeof(c->'maxPriceChangePercent')<>'number' or jsonb_typeof(c->'notes')<>'string' or jsonb_typeof(c->'confirmed')<>'boolean' or jsonb_typeof(c->'autoUpdate')<>'boolean' or (c->>'minAmountArs')::numeric<0 or(c->>'minAmountArs')::numeric>1e12 or(c->>'minUnits')::numeric<1 or(c->>'minUnits')::numeric>10000 or trunc((c->>'minUnits')::numeric)<>(c->>'minUnits')::numeric
 or(c->>'roundArs')::numeric<.01 or(c->>'roundArs')::numeric>1e9 or(c->>'costValidityHours')::numeric<1 or(c->>'costValidityHours')::numeric>720 or(c->>'maxPriceChangePercent')::numeric<0 or(c->>'maxPriceChangePercent')::numeric>100 then raise exception 'Invalid wholesale policy limits';end if;
 foreach k in array array['minimumMarginPercent','targetMarginPercent','riskPercent','transferDiscountPercent']loop
 if c->k<>'null'::jsonb and(jsonb_typeof(c->k)<>'number' or(c->>k)::numeric<0 or(c->>k)::numeric>=100)then raise exception 'Invalid policy percentage';end if;
 end loop;
 if c->'fixedUnitArs'<>'null'::jsonb and(jsonb_typeof(c->'fixedUnitArs')<>'number' or(c->>'fixedUnitArs')::numeric<0 or(c->>'fixedUnitArs')::numeric>1e12)then raise exception 'Invalid additional unit expense';end if;
 if jsonb_typeof(c->'paymentFees')<>'object' or not(c->'paymentFees'?&array['mercado_pago','transferencia'])then raise exception 'Payment fees required';end if;
 foreach k in array array['mercado_pago','transferencia']loop
 if c->'paymentFees'->k<>'null'::jsonb and(jsonb_typeof(c->'paymentFees'->k)<>'number' or(c->'paymentFees'->>k)::numeric<0 or(c->'paymentFees'->>k)::numeric>=100)then raise exception 'Invalid payment fee';end if;
 end loop;
 foreach k in array array['categoryMargins','brandMargins','productMargins']loop
 if jsonb_typeof(c->k)<>'object' or(select count(*) from jsonb_object_keys(c->k))>2000 then raise exception 'Invalid margin overrides';end if;
 for m in select value from jsonb_each(c->k)loop
 if jsonb_typeof(m)<>'object' or not(m?&array['minimum','target']) or jsonb_typeof(m->'minimum')<>'number' or jsonb_typeof(m->'target')<>'number' or(m->>'minimum')::numeric<0 or(m->>'target')::numeric<(m->>'minimum')::numeric or(m->>'target')::numeric>=100 then raise exception 'Invalid margin override';end if;
 end loop;end loop;
 if jsonb_typeof(c->'quantityMargins')<>'array' or jsonb_array_length(c->'quantityMargins')>20 then raise exception 'Invalid quantity margins';end if;
 for m in select value from jsonb_array_elements(c->'quantityMargins')loop
 if jsonb_typeof(m)<>'object' or not(m?&array['minQty','targetMarginPercent']) or(m->>'minQty')::numeric<2 or(m->>'minQty')::numeric>10000 or trunc((m->>'minQty')::numeric)<>(m->>'minQty')::numeric or(m->>'targetMarginPercent')::numeric<0 or(m->>'targetMarginPercent')::numeric>=100 then raise exception 'Invalid quantity margin';end if;
 end loop;
 if(select count(*) from jsonb_array_elements(c->'quantityMargins'))<>(select count(distinct value->>'minQty') from jsonb_array_elements(c->'quantityMargins'))then raise exception 'Duplicate quantity margin';end if;
 if length(c->>'notes')>5000 then raise exception 'Policy notes too long';end if;
 if(c->>'confirmed')::boolean then
 foreach k in array array['minimumMarginPercent','targetMarginPercent','riskPercent','fixedUnitArs','transferDiscountPercent']loop
 if c->k='null'::jsonb then raise exception 'Confirmed policy requires complete financial inputs';end if;end loop;
 if c->'paymentFees'->'mercado_pago'='null'::jsonb or c->'paymentFees'->'transferencia'='null'::jsonb then raise exception 'Confirmed policy requires payment fees';end if;
 minimum:=(c->>'minimumMarginPercent')::numeric;target:=(c->>'targetMarginPercent')::numeric;
 if target<minimum then raise exception 'Target below minimum margin';end if;
 for fee in select value::text::numeric from jsonb_each(c->'paymentFees')loop if fee+target>=100 then raise exception 'Margin plus fee must be below 100';end if;end loop;
 if exists(select 1 from jsonb_array_elements(c->'quantityMargins') t where(t->>'targetMarginPercent')::numeric<minimum)then raise exception 'Quantity margin below minimum';end if;
 end if;
end$$;
create function public.save_wholesale_policy_v1(config_input jsonb)returns uuid language plpgsql security definer set search_path=public,pg_temp as $$declare result uuid;begin
 if not coalesce(public.is_admin(),false)then raise exception 'Forbidden';end if;
 perform wholesale_validate_policy_v1(config_input);
 insert into wholesale_v2_policies(config)values(config_input)returning id into result;
 insert into wholesale_price_events(action,detail)values('policy_saved',jsonb_build_object('policy_id',result));return result;
end$$;
create function public.wholesale_public_policy_v1()returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('minAmountArs',(config->>'minAmountArs')::numeric,'minUnits',(config->>'minUnits')::integer)from wholesale_v2_policies order by created_at desc,id desc limit 1
$$;

create function public.wholesale_quote_basis_impl_v1(product_input uuid,variant_input uuid,quantity_input integer,payment_input text,tiers_input boolean)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare p products;v product_variants;control wholesale_product_controls;r wholesale_v2_policies;cost jsonb;o supplier_offers;sup suppliers;tracking jsonb;
 status text:='review';reason text:='Falta completar la revisión mayorista.';mode text;available boolean;stock_qty integer;retail numeric;registered numeric;
 fee numeric;minimum numeric;target numeric;override jsonb;t jsonb;total_cost numeric;price numeric;floor_price numeric;step numeric;contribution numeric;fx numeric;landed numeric;discount numeric;until_at timestamptz;
 tiers jsonb:='[]';tier_basis jsonb;problem text;begin
 if quantity_input is null or quantity_input<1 or quantity_input>10000 or payment_input is null or payment_input not in('mercado_pago','transferencia')then raise exception 'Invalid wholesale quantity or payment';end if;
 select * into r from wholesale_v2_policies order by created_at desc,id desc limit 1;
 select * into p from products where id=product_input;
 if not found or not p.is_active or p.deleted_at is not null then status:='unavailable';reason:='Producto no disponible.';
 else
  mode:=p.fulfillment_mode;available:=p.supplier_available;stock_qty:=p.stock;retail:=p.retail_price;registered:=p.wholesale_price;
  if variant_input is not null then
   select * into v from product_variants where id=variant_input and product_id=p.id;
   if not found or not v.is_active then status:='unavailable';reason:='Presentación no disponible.';
   else mode:=v.fulfillment_mode;available:=v.supplier_available;stock_qty:=v.stock;retail:=v.retail_price;registered:=v.wholesale_price;
    select to_jsonb(c)into cost from wholesale_variant_costs c where variant_id=v.id and product_id=p.id;
   end if;
  elsif p.has_variants then reason:='Elegí la presentación exacta.';
  else select to_jsonb(c)into cost from product_costs c where product_id=p.id;
  end if;
  if status<>'unavailable' and not(p.has_variants and variant_input is null)then
   select * into control from wholesale_product_controls where product_id=p.id and variant_id is not distinct from variant_input;
   if control.id is null then reason:='Producto pendiente de revisión mayorista.';
   elsif not control.enabled then status:='unavailable';reason:='Venta mayorista deshabilitada.';
   elsif not control.identity_confirmed or not control.eligibility_confirmed or not control.media_authorized or not control.compliance_confirmed or length(btrim(control.evidence))<20 then reason:='Identidad o documentación comercial pendiente.';
   elsif coalesce(length(regexp_replace(p.description,'\s','','g')),0)<40 or not(coalesce(p.image_url,'')~'^(https://|/)' or exists(select 1 from unnest(p.image_urls)i where i~'^(https://|/)'))then reason:='Ficha pendiente de descripción o imagen verificada.';
   elsif r.id is null or coalesce((r.config->>'confirmed')::boolean,false)=false then reason:='Reglas de precio pendientes de confirmar.';
   elsif cost is null or coalesce((cost->>'expenses_confirmed')::boolean,false)=false or nullif(btrim(cost->>'source_document'),'')is null or not(cost?&array['origin_cost','exchange_rate','freight_per_unit','other_landed_cost','variable_cost','payment_fee_percent','minimum_contribution'])
    or exists(select 1 from unnest(array['origin_cost','exchange_rate','freight_per_unit','other_landed_cost','variable_cost','payment_fee_percent','minimum_contribution'])k where cost->k='null'::jsonb)
    or(cost->>'origin_cost')::numeric<=0 or(cost->>'exchange_rate')::numeric<=0 then reason:='Costo completo pendiente de confirmar para esta presentación.';
   elsif(cost->>'verified_at')is null or(cost->>'verified_at')::timestamptz<now()-make_interval(hours=>(r.config->>'costValidityHours')::integer)or(cost->>'verified_at')::timestamptz>now()+interval '5 minutes'then reason:='Costo vencido; requiere revisión.';
   elsif mode<>'supplier' and(stock_qty<quantity_input or (case when variant_input is null then p.stock_verified_at else v.stock_verified_at end)is null)then status:='unavailable';reason:='Sin unidades propias verificadas para esa cantidad.';
   elsif mode='supplier' and not coalesce(available,false)then status:='unavailable';reason:='Disponibilidad del proveedor pendiente de confirmar.';
   else
    perform wholesale_validate_policy_v1(r.config);
    until_at:=(cost->>'verified_at')::timestamptz+make_interval(hours=>(r.config->>'costValidityHours')::integer);
    if mode='supplier'then
     select so.*into o from supplier_offers so join suppliers s on s.id=so.supplier_id where so.product_id=p.id and so.variant_id is not distinct from variant_input
      and so.verification='verified' and so.availability='in_stock' and so.last_error is null and s.is_active and so.origin_cost=(cost->>'origin_cost')::numeric and so.currency=cost->>'currency'
      and so.source_url=cost->>'supplier_url' and so.cost_checked_at between now()-make_interval(hours=>least(s.freshness_hours,(r.config->>'costValidityHours')::integer))and now()+interval '5 minutes'
      and so.availability_checked_at between now()-make_interval(hours=>least(s.freshness_hours,(r.config->>'costValidityHours')::integer))and now()+interval '5 minutes'
      and coalesce(so.evidence->>'availabilityBasis','explicit')='explicit' and coalesce(so.evidence->>'costScope','')<>'supplier_quote_inclusions_unconfirmed'
      order by least(so.cost_checked_at,so.availability_checked_at)desc,so.id limit 1;
     if not found then problem:='La oferta exacta cambió, venció o requiere confirmación.';
     else select *into sup from suppliers where id=o.supplier_id;until_at:=least(until_at,o.cost_checked_at+make_interval(hours=>sup.freshness_hours),o.availability_checked_at+make_interval(hours=>sup.freshness_hours));end if;
    end if;
    if cost->>'currency'='USD'then
     select config into tracking from supplier_tracking_settings where id=true;
     if coalesce((tracking->>'acquisitionArsPerUsd')::numeric,0)<=0 or(case when tracking->>'acquisitionFxMode'='usdt'then nullif(tracking->>'usdtQuotedAt','')::timestamptz else nullif(tracking->>'fxConfirmedOn','')::date::timestamptz end) is null then problem:='Cotización de adquisición pendiente.';
     elsif(case when tracking->>'acquisitionFxMode'='usdt'then(tracking->>'usdtQuotedAt')::timestamptz else(tracking->>'fxConfirmedOn')::date::timestamptz end)<now()-interval '24 hours' or(case when tracking->>'acquisitionFxMode'='usdt'then(tracking->>'usdtQuotedAt')::timestamptz else(tracking->>'fxConfirmedOn')::date::timestamptz end)>now()+interval '5 minutes'then problem:='Cotización de adquisición vencida.';
     else fx:=(tracking->>'acquisitionArsPerUsd')::numeric;until_at:=least(until_at,(case when tracking->>'acquisitionFxMode'='usdt'then(tracking->>'usdtQuotedAt')::timestamptz else(tracking->>'fxConfirmedOn')::date::timestamptz end)+interval '24 hours');end if;
    else fx:=(cost->>'exchange_rate')::numeric;if cost->>'currency'='ARS'and fx<>1 then problem:='Cotización ARS inválida.';end if;end if;
    if problem is null then
     landed:=(cost->>'origin_cost')::numeric*fx+(cost->>'freight_per_unit')::numeric+(cost->>'other_landed_cost')::numeric;
     override:=coalesce(r.config->'productMargins'->p.id::text,r.config->'brandMargins'->coalesce(p.brand,''),r.config->'categoryMargins'->p.category_id::text);
     minimum:=coalesce((override->>'minimum')::numeric,(r.config->>'minimumMarginPercent')::numeric);
     target:=coalesce((override->>'target')::numeric,(r.config->>'targetMarginPercent')::numeric);
     select value into t from jsonb_array_elements(r.config->'quantityMargins')where(value->>'minQty')::integer<=quantity_input order by(value->>'minQty')::integer desc limit 1;
     if t is not null then target:=(t->>'targetMarginPercent')::numeric;end if;
     fee:=greatest((cost->>'payment_fee_percent')::numeric,(r.config->'paymentFees'->>payment_input)::numeric);step:=(r.config->>'roundArs')::numeric;
     total_cost:=landed*(1+(r.config->>'riskPercent')::numeric/100)+(cost->>'variable_cost')::numeric+(r.config->>'fixedUnitArs')::numeric;
     if minimum+fee>=100 or target+fee>=100 or target<minimum then problem:='Regla de margen o comisión incompatible.';
     else
      floor_price:=ceil(greatest(total_cost/(1-(minimum+fee)/100),(total_cost+(cost->>'minimum_contribution')::numeric)/(1-fee/100))/step)*step;
      discount:=case when payment_input='transferencia'then(r.config->>'transferDiscountPercent')::numeric else 0 end;
      price:=coalesce(control.fixed_price,case when control."freeze" then nullif(registered,0)end,ceil(greatest(floor_price,total_cost/(1-(target+fee)/100)*(1-discount/100))/step)*step);
      contribution:=price*(1-fee/100)-total_cost;
      if price is null or price<=0 or price>1e12 or contribution/price*100<minimum or contribution<(cost->>'minimum_contribution')::numeric then problem:='El precio requiere revisión de rentabilidad.';
      elsif retail>0 and price>=retail then problem:='Sin diferencia mayorista viable frente al precio minorista.';
      elsif registered>0 and abs(price/registered-1)*100>(r.config->>'maxPriceChangePercent')::numeric and not(control.approved_policy_id=r.id and control.updated_at>=(cost->>'verified_at')::timestamptz)then problem:='Variación de precio pendiente de revisión.';
      else status:='ready';reason:='Precio mayorista verificado.';end if;
     end if;
    end if;
    if problem is not null then reason:=problem;price:=null;end if;
   end if;
  end if;
 end if;
 if status='ready'and tiers_input then
  for t in select value from jsonb_array_elements(r.config->'quantityMargins')order by(value->>'minQty')::integer loop
   tier_basis:=wholesale_quote_basis_impl_v1(product_input,variant_input,(t->>'minQty')::integer,payment_input,false);
   if tier_basis->>'status'='ready'then tiers:=tiers||jsonb_build_array(jsonb_build_object('minQty',(t->>'minQty')::integer,'unitPrice',(tier_basis->>'unit_price')::numeric));end if;
  end loop;
 end if;
 return jsonb_build_object('status',status,'reason',reason,'product_id',product_input,'variant_id',variant_input,'quantity',quantity_input,'unit_price',case when status='ready'then price else null end,'line_total',case when status='ready'then price*quantity_input else null end,'policy_id',r.id,'valid_until',case when status='ready'then until_at else null end,'tiers',tiers,
  'cost_basis',case when status='ready'then jsonb_build_object('cost',cost,'landed_current',landed,'total_unit_cost',total_cost,'fee_percent',fee,'minimum_margin_percent',minimum,'target_margin_percent',target,'contribution',contribution,'offer_id',o.id,'policy_id',r.id,'minimum_price',floor_price,'acquisition_fx',fx)else null end);
end$$;
create function public.wholesale_quote_basis_v1(product_input uuid,variant_input uuid,quantity_input integer,payment_input text default 'mercado_pago')returns jsonb language sql security invoker set search_path=public,pg_temp as $$select wholesale_quote_basis_impl_v1(product_input,variant_input,quantity_input,payment_input,true)$$;
create function public.wholesale_public_offers_v1(items_input jsonb,payment_input text default 'mercado_pago')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb;b jsonb;result jsonb:='[]';begin
 if jsonb_typeof(items_input)<>'array' or jsonb_array_length(items_input)>1000 then raise exception 'Invalid wholesale items';end if;
 for item in select value from jsonb_array_elements(items_input)loop
 b:=wholesale_quote_basis_v1((item->>'productId')::uuid,nullif(item->>'variantId','')::uuid,coalesce((item->>'quantity')::integer,1),payment_input);
 result:=result||jsonb_build_array(jsonb_build_object('productId',b->'product_id','variantId',b->'variant_id','unitPrice',b->'unit_price','status',b->'status','reason',b->'reason','tiers',b->'tiers','validUntil',b->'valid_until','policyId',b->'policy_id'));
 end loop;return result;end$$;

create function public.save_wholesale_control_v1(product_input uuid,variant_input uuid,control_input jsonb)returns uuid language plpgsql security definer set search_path=public,pg_temp as $$declare result uuid;policy uuid;begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 if jsonb_typeof(control_input)<>'object' or length(coalesce(control_input->>'evidence',''))>10000 then raise exception 'Invalid wholesale control';end if;
 perform 1 from products where id=product_input for update;if not found then raise exception 'Product missing';end if;
 if variant_input is not null and not exists(select 1 from product_variants where id=variant_input and product_id=product_input)then raise exception 'Wrong variant';end if;
 if coalesce((control_input->>'approvePriceChange')::boolean,false)then select id into policy from wholesale_v2_policies order by created_at desc,id desc limit 1;end if;
 select id into result from wholesale_product_controls where product_id=product_input and variant_id is not distinct from variant_input for update;
 if result is null then insert into wholesale_product_controls(product_id,variant_id)values(product_input,variant_input)returning id into result;end if;
 update wholesale_product_controls set enabled=coalesce((control_input->>'enabled')::boolean,false),identity_confirmed=coalesce((control_input->>'identityConfirmed')::boolean,false),eligibility_confirmed=coalesce((control_input->>'eligibilityConfirmed')::boolean,false),media_authorized=coalesce((control_input->>'mediaAuthorized')::boolean,false),compliance_confirmed=coalesce((control_input->>'complianceConfirmed')::boolean,false),
 evidence=coalesce(control_input->>'evidence',''),"freeze"=coalesce((control_input->>'freeze')::boolean,false),fixed_price=nullif(control_input->>'fixedPrice','')::numeric,approved_policy_id=policy,updated_at=now(),actor=auth.uid()where id=result;
 insert into wholesale_price_events(product_id,variant_id,action,detail)values(product_input,variant_input,'control_saved',control_input);return result;end$$;

create function public.refresh_wholesale_prices_v1(limit_input integer default 20)returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare r wholesale_v2_policies;c wholesale_product_controls;b jsonb;old_price numeric;applied integer:=0;checked integer:=0;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 if limit_input is null or limit_input<1 or limit_input>100 then raise exception 'Invalid wholesale batch limit';end if;
 select *into r from wholesale_v2_policies order by created_at desc,id desc limit 1;
 if r.id is null or coalesce((r.config->>'confirmed')::boolean,false)=false or coalesce((r.config->>'autoUpdate')::boolean,false)=false then return jsonb_build_object('enabled',false,'checked',0,'applied',0);end if;
 for c in select *from wholesale_product_controls where enabled and not "freeze" order by last_priced_at nulls first,id limit limit_input for update skip locked loop
 checked:=checked+1;b:=wholesale_quote_basis_v1(c.product_id,c.variant_id,1,'mercado_pago');
 if c.variant_id is null then select wholesale_price into old_price from products where id=c.product_id for update;else select wholesale_price into old_price from product_variants where id=c.variant_id for update;end if;
 if b->>'status'='ready'and old_price is distinct from(b->>'unit_price')::numeric then
 if c.variant_id is null then update products set wholesale_price=(b->>'unit_price')::numeric,updated_at=now()where id=c.product_id;else update product_variants set wholesale_price=(b->>'unit_price')::numeric,updated_at=now()where id=c.variant_id;end if;
 insert into wholesale_price_events(product_id,variant_id,action,detail)values(c.product_id,c.variant_id,'price_updated',jsonb_build_object('before',old_price,'after',b->'unit_price','basis',b));applied:=applied+1;
 else insert into wholesale_price_events(product_id,variant_id,action,detail)values(c.product_id,c.variant_id,'price_reviewed',jsonb_build_object('status',b->'status','reason',b->'reason'));end if;
 update wholesale_product_controls set last_priced_at=now()where id=c.id;
 end loop;return jsonb_build_object('enabled',true,'checked',checked,'applied',applied);end$$;

revoke all on function public.wholesale_validate_policy_v1(jsonb),public.save_wholesale_policy_v1(jsonb),public.wholesale_public_policy_v1(),public.wholesale_quote_basis_impl_v1(uuid,uuid,integer,text,boolean),public.wholesale_quote_basis_v1(uuid,uuid,integer,text),public.wholesale_public_offers_v1(jsonb,text),public.save_wholesale_control_v1(uuid,uuid,jsonb),public.refresh_wholesale_prices_v1(integer)from public,anon,authenticated,service_role;
grant execute on function public.wholesale_public_policy_v1(),public.wholesale_public_offers_v1(jsonb,text)to anon,authenticated,service_role;
grant execute on function public.save_wholesale_policy_v1(jsonb),public.save_wholesale_control_v1(uuid,uuid,jsonb)to authenticated;
grant execute on function public.wholesale_validate_policy_v1(jsonb),public.wholesale_quote_basis_impl_v1(uuid,uuid,integer,text,boolean),public.wholesale_quote_basis_v1(uuid,uuid,integer,text),public.refresh_wholesale_prices_v1(integer)to service_role;
commit;
