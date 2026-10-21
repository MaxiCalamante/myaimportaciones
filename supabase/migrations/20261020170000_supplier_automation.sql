-- Owner requested public-catalog monitoring, 1600 ARS/USD and transport paid by a third party.
begin;
alter table supplier_offers add column evidence jsonb not null default '{}';
alter table suppliers drop constraint if exists suppliers_query_mode_check;
alter table suppliers add constraint suppliers_query_mode_check check(query_mode in ('manual','csv','product_page','public_browser'));
create table public.supplier_tracking_settings (
 id boolean primary key default true check(id),
 config jsonb not null,
 updated_at timestamptz not null default now(),actor uuid default auth.uid()
);
insert into supplier_tracking_settings(config) values ('{"enabled":true,"autoStock":true,"autoPrices":true,"acquisitionArsPerUsd":1600,"fxConfirmedOn":"2026-10-20","shippingPaidByMya":false,"shippingArs":0,"targetMarginPercent":20,"marketDiscountPercent":10,"roundArs":100,"maxPriceChangePercent":20,"freshnessHours":24,"marketFreshnessHours":48,"fxValidityHours":72,"notes":"Dueño confirmó USD/ARS 1600 el 20/10/2026. Transporte a Tandil a cargo de tercero. Margen estimado sobre costos de adquisición y gastos registrados. Volumen mixto no confirmado; conservar cálculo conservador."}');
insert into import_cost_policies(config)
 select config||jsonb_build_object('carrierArsPerUsd',1600,'carrierFxDate','2026-10-20','notes',coalesce(config->>'notes','')||' Dueño ratificó USD/ARS 1600 el 20/10/2026; transporte nacional no lo paga MYA. Interpretación de volumen mixto sigue sin confirmar.') from import_cost_policies order by created_at desc limit 1;

create table public.supplier_sync_queue (
 id uuid primary key default gen_random_uuid(),supplier_id uuid not null references suppliers(id),
 product_id uuid references products(id),variant_id uuid references product_variants(id),offer_id uuid references supplier_offers(id),
 source_url text not null check(source_url like 'https://%'),
 state text not null default 'ready' check(state in ('ready','running','retry','blocked')),
 attempts integer not null default 0,next_run_at timestamptz not null default now(),leased_until timestamptz,last_error text,
 last_success_at timestamptz,updated_at timestamptz not null default now()
);
create unique index supplier_queue_identity on supplier_sync_queue(supplier_id,source_url,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index supplier_queue_due on supplier_sync_queue(next_run_at) where state<>'blocked';
create table public.supplier_sync_runs (
 id uuid primary key default gen_random_uuid(),worker text not null,started_at timestamptz not null default now(),completed_at timestamptz,
 status text not null default 'running' check(status in ('running','success','partial','error')),report jsonb not null default '{}'
);
create table public.supplier_source_health (
 supplier_id uuid primary key references suppliers(id),last_attempt_at timestamptz,last_success_at timestamptz,
 status text not null default 'not_checked',message text,products_seen integer not null default 0,updated_at timestamptz not null default now()
);
insert into supplier_source_health(supplier_id) select id from suppliers where official_key is not null;
create table public.supplier_search_requests (
 id uuid primary key default gen_random_uuid(),query text not null check(length(trim(query)) between 2 and 80),
 state text not null default 'queued' check(state in ('queued','running','done','partial','error')),
 created_at timestamptz not null default now(),completed_at timestamptz,report jsonb not null default '{}',actor uuid default auth.uid()
);
create table public.supplier_market_references (
 id uuid primary key default gen_random_uuid(),product_id uuid not null references products(id),variant_id uuid references product_variants(id),
 source_url text not null check(source_url like 'https://%'),price_ars numeric check(price_ars>0),
 title text,identity_verified boolean not null default false,checked_at timestamptz,last_attempt_at timestamptz,last_error text,
 unique(product_id,source_url)
);
insert into supplier_market_references(product_id,source_url,price_ars,checked_at,identity_verified)
 select product_id,ml_url,ml_price,ml_checked_at,true from product_costs where ml_url like 'https://%' and ml_price>0;
create table public.supplier_price_decisions (
 id uuid primary key default gen_random_uuid(),product_id uuid not null references products(id),offer_id uuid references supplier_offers(id),reference_id uuid references supplier_market_references(id),
 old_price numeric,new_price numeric,landed_ars numeric,status text not null check(status in ('applied','proposal','blocked','unchanged')),
 reason text not null,basis jsonb not null default '{}',created_at timestamptz not null default now()
);
create index supplier_price_decisions_product on supplier_price_decisions(product_id,created_at desc);
do $$ declare t text; begin
 foreach t in array array['supplier_tracking_settings','supplier_sync_queue','supplier_sync_runs','supplier_source_health','supplier_search_requests','supplier_market_references','supplier_price_decisions'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('create policy private_admin_read on public.%I for select to authenticated using((select public.is_admin()))',t);
 end loop;
end $$;
grant update(config,updated_at,actor) on supplier_tracking_settings to authenticated;
create policy private_admin_update on supplier_tracking_settings for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
grant insert on supplier_search_requests,supplier_market_references to authenticated;
create policy private_admin_insert on supplier_search_requests for insert to authenticated with check((select public.is_admin()));
create policy private_admin_insert on supplier_market_references for insert to authenticated with check((select public.is_admin()));
grant update(price_ars,title,identity_verified,checked_at,last_error) on supplier_market_references to authenticated;
create policy private_admin_update on supplier_market_references for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));

-- Only the explicitly trusted server worker may use the existing evidence transaction without a user session.
do $$ declare definition text; begin
 definition:=pg_get_functiondef('public.record_supplier_observation_v1(jsonb)'::regprocedure);
 definition:=replace(definition,'if not public.is_admin() then raise exception ''Forbidden''; end if;',
  'if not public.is_admin() and coalesce(current_setting(''role'',true),'''')<>''service_role'' then raise exception ''Forbidden''; end if;');
 definition:=replace(definition,'oid:=o.id;','oid:=o.id; update supplier_offers set evidence=coalesce(p->''evidence'',evidence) where id=oid;');
 execute definition;
end $$;
grant execute on function public.record_supplier_observation_v1(jsonb) to service_role;

create function public.claim_supplier_jobs_v1(limit_input integer default 20) returns setof supplier_sync_queue language plpgsql security definer set search_path=public as $$
begin
 if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
 if limit_input not between 1 and 100 then raise exception 'Invalid limit'; end if;
 return query update supplier_sync_queue q set state='running',leased_until=now()+interval '15 minutes',updated_at=now()
 where q.id in (select j.id from supplier_sync_queue j join suppliers s on s.id=j.supplier_id
  where s.is_active and s.automation_authorized and j.state<>'blocked' and j.next_run_at<=now() and (j.leased_until is null or j.leased_until<now())
  order by j.next_run_at,j.id for update of j skip locked limit limit_input) returning q.*;
end $$;
revoke all on function claim_supplier_jobs_v1(integer) from public,anon,authenticated;
grant execute on function claim_supplier_jobs_v1(integer) to service_role;

create function public.refresh_supplier_availability_v1(product_input uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare eligible integer;known integer;available integer;v record;result boolean:=false;
begin
 if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
 for v in select null::uuid as id union all select id from product_variants where product_id=product_input loop
  select count(*),count(*) filter(where verification='verified' and last_error is null and availability_checked_at>now()-interval '24 hours' and availability in ('in_stock','out_of_stock')),
   count(*) filter(where verification='verified' and last_error is null and availability_checked_at>now()-interval '24 hours' and availability='in_stock')
   into eligible,known,available from supplier_offers where product_id=product_input and variant_id is not distinct from v.id;
  if available>0 or (eligible>0 and known=eligible) then
   if v.id is null and not exists(select 1 from product_variants where product_id=product_input) then
    update products set supplier_available=(available>0),supplier_last_checked_at=now(),supplier_stock_status=case when available>0 then 'in_stock' else 'out_of_stock' end,updated_at=now() where id=product_input and fulfillment_mode='supplier' and supplier_available is distinct from (available>0);
   elsif v.id is not null then
    update product_variants set supplier_available=(available>0),updated_at=now() where id=v.id and fulfillment_mode='supplier' and supplier_available is distinct from (available>0);
   end if;
   result:=true;
  end if;
 end loop;
 return result;
end $$;
revoke all on function refresh_supplier_availability_v1(uuid) from public,anon,authenticated;
grant execute on function refresh_supplier_availability_v1(uuid) to service_role;

create function public.apply_supplier_price_v1(product_input uuid,offer_input uuid,reference_input uuid,expected_input numeric,price_input numeric,landed_input numeric,basis_input jsonb) returns text language plpgsql security definer set search_path=public as $$
declare p public.products;o public.supplier_offers;r public.supplier_market_references;cfg jsonb;reason text;status text:='blocked';
begin
 if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
 select config into cfg from supplier_tracking_settings where id=true;
 select * into p from products where id=product_input for update;
 select * into o from supplier_offers where id=offer_input;
 select * into r from supplier_market_references where id=reference_input;
 if p.id is null then raise exception 'Product missing'; end if;
 if exists(select 1 from supplier_price_decisions d where d.product_id=p.id and d.status='applied' and d.created_at>now()-interval '1 hour') then return 'cooldown'; end if;
 if not coalesce((cfg->>'autoPrices')::boolean,false) then reason:='Actualización automática deshabilitada';
 elsif not p.is_active or exists(select 1 from product_variants where product_id=p.id) then reason:='Producto no publicado o requiere variante exacta';
 elsif o.product_id is distinct from p.id or o.variant_id is not null or o.verification<>'verified' or o.availability<>'in_stock' or o.last_error is not null or o.cost_checked_at is null or o.cost_checked_at<now()-interval '24 hours' or o.availability_checked_at is null or o.availability_checked_at<now()-interval '24 hours' then reason:='Oferta sin evidencia vigente suficiente';
 elsif r.product_id is distinct from p.id or r.variant_id is not null or not r.identity_verified or r.last_error is not null or r.checked_at is null or r.checked_at<now()-interval '48 hours' then reason:='Comparable exacto sin verificación vigente';
 elsif (cfg->>'fxConfirmedOn')::date<current_date-3 then reason:='Cotización de adquisición requiere ratificación';
 elsif p.retail_price<>expected_input then reason:='Precio cambió durante el cálculo';
 elsif price_input is null or landed_input is null or landed_input<=0 or price_input<=0 or price_input>1e10 then reason:='Cálculo inválido';
 elsif price_input<>floor(r.price_ars*(1-(cfg->>'marketDiscountPercent')::numeric/100)/(cfg->>'roundArs')::numeric)*(cfg->>'roundArs')::numeric then reason:='Precio no coincide con política del comparable';
 elsif price_input<landed_input/(1-(cfg->>'targetMarginPercent')::numeric/100) then reason:='Comparable no permite margen mínimo configurado';
 elsif abs(price_input-p.retail_price)>p.retail_price*(cfg->>'maxPriceChangePercent')::numeric/100 then status:='proposal';reason:='Cambio supera el límite automático; revisar diferencia';
 elsif price_input=p.retail_price then status:='unchanged';reason:='Precio alineado con referencia';
 else status:='applied';reason:='Comparable exacto vigente y margen dentro de límites';update products set retail_price=price_input,updated_at=now() where id=p.id;
 end if;
 insert into supplier_price_decisions(product_id,offer_id,reference_id,old_price,new_price,landed_ars,status,reason,basis)
 values(p.id,o.id,r.id,p.retail_price,price_input,landed_input,status,reason,coalesce(basis_input,'{}'));
 return status;
end $$;
revoke all on function apply_supplier_price_v1(uuid,uuid,uuid,numeric,numeric,numeric,jsonb) from public,anon,authenticated;
grant execute on function apply_supplier_price_v1(uuid,uuid,uuid,numeric,numeric,numeric,jsonb) to service_role;

-- Queue existing curated source relationships; products with variants require an explicit offer.
insert into supplier_sync_queue(supplier_id,product_id,source_url,offer_id)
 select s.id,p.id,p.source_url,o.id from products p join suppliers s on regexp_replace(p.source_url,'^https://(www\.)?([^/]+).*','\2')=regexp_replace(s.website,'^https://(www\.)?([^/]+).*','\2')
 left join supplier_offers o on o.product_id=p.id and o.source_url=p.source_url and o.variant_id is null
 where p.source_url is not null and not exists(select 1 from product_variants where product_id=p.id) on conflict do nothing;
commit;
