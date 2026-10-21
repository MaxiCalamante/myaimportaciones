-- Additive private workspace. Does not change storefront prices, inventory or checkout.
begin;
alter table public.suppliers add column official_key text unique;
alter table public.suppliers add column capabilities jsonb not null default '{}';
alter table public.suppliers add column query_mode text not null default 'manual' check(query_mode in ('manual','csv','product_page'));
alter table public.suppliers add column automation_authorized boolean not null default false;
alter table public.suppliers add column freshness_hours integer not null default 24 check(freshness_hours between 1 and 720);
alter table public.suppliers add column last_query_at timestamptz;

-- Reuse existing contacts; never overwrite their phone, notes or commercial history.
do $$ declare s record; existing uuid; begin
 for s in select * from (values
  ('star-company','Star Company','https://www.starcompany-py.com/','product_page','PrestaShop; ficha principal. API oficial no verificada.'),
  ('vencell','Vencell Alberdi','https://vencellalberdi.com/','csv','Catálogo dinámico; anuncia lista descargable y monedas Gs/USD/ARS. Exportación y permisos pendientes.'),
  ('neo-import','Neo Import','https://neoimport.net/','csv','Catálogo dinámico; USD/ARS. No duplicar pase o envío incluido en sus cotizaciones.'),
  ('madrid-center','Madrid Center Importados','https://madridcenterimportados.com/home','manual','Home sin catálogo legible en auditoría. Pedir exportación autorizada.'),
  ('atacado-usa','Atacado USA','https://atacadousa.com.py/','product_page','Adaptador PrestaShop existente; auditar ficha y variante antes de automatizar.'),
  ('total','Total Herramientas Oficial','https://www.totalherramientasoficial.com.py/','product_page','JSON-LD por SKU; costo sólo mediante cotización validada. Total/Wadfow.'),
  ('atlantico','Atlántico Shop','https://www.atlanticoshop.com.py/','manual','Consulta no fiable durante auditoría; no inferir disponibilidad.'),
  ('atacado-connect','Atacado Connect','https://atacadoconnect.com/','csv','Catálogo con identificadores y USD/BRL; API autorizada no verificada. iPhone sólo nuevo sellado; excluir CPO/OUTLET.'),
  ('mobile-zone','Mobile Zone','https://www.mobilezone.com.py/','manual','Catálogo no legible en consulta inicial; permisos y exportación pendientes.')
 ) as v(key,name,url,mode,details) loop
  select id into existing from public.suppliers where official_key=s.key or lower(regexp_replace(coalesce(website,''),'^https://(www\.)?([^/]+).*','\2'))=lower(regexp_replace(s.url,'^https://(www\.)?([^/]+).*','\2')) order by created_at limit 1;
  if existing is null then
   insert into public.suppliers(name,website,official_key,query_mode,capabilities) values(s.name,s.url,s.key,s.mode,jsonb_build_object('reviewed_on','2026-10-20','details',s.details,'api_verified',false));
  else
   update public.suppliers set official_key=s.key,query_mode=s.mode,capabilities=jsonb_build_object('reviewed_on','2026-10-20','details',s.details,'api_verified',false) where id=existing;
  end if;
 end loop;
end $$;

create table public.supplier_offers (
 id uuid primary key default gen_random_uuid(), supplier_id uuid not null references public.suppliers(id),
 product_id uuid references public.products(id), variant_id uuid references public.product_variants(id),
 external_id text not null check(length(external_id) between 1 and 200),
 variant_key text not null check(length(variant_key) between 1 and 500),
 title text not null check(length(title) between 1 and 500), brand text not null default '', model text not null default '', gtin text,
 source_url text not null check(source_url like 'https://%'),
 origin_cost numeric check(origin_cost>0), currency text check(currency in ('USD','ARS','PYG')),
 availability text not null default 'unknown' check(availability in ('in_stock','out_of_stock','unknown')),
 verification text not null default 'pending' check(verification in ('pending','verified')),
 cost_checked_at timestamptz, availability_checked_at timestamptz, last_success_at timestamptz,
 last_attempt_at timestamptz, last_error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(supplier_id,external_id,variant_key), check(variant_id is null or product_id is not null),
 check(origin_cost is null or currency is not null)
);
create index supplier_offers_product on public.supplier_offers(product_id);
create table public.supplier_observations (
 id uuid primary key default gen_random_uuid(), offer_id uuid not null references public.supplier_offers(id),
 kind text not null check(kind in ('manual','csv','product_page','error','not_found')),
 payload jsonb not null, observed_at timestamptz not null, recorded_at timestamptz not null default now(), actor uuid default auth.uid()
);
create table public.supplier_proposals (
 id uuid primary key default gen_random_uuid(), offer_id uuid not null references public.supplier_offers(id),
 kind text not null check(kind in ('new_candidate','cost','availability','identity','missing_page')),
 before_value jsonb, after_value jsonb not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_at timestamptz, reviewed_by uuid,
 created_at timestamptz not null default now()
);
create table public.import_cost_policies (
 id uuid primary key default gen_random_uuid(), config jsonb not null check(jsonb_typeof(config)='object'),
 created_at timestamptz not null default now(), actor uuid default auth.uid()
);
insert into public.import_cost_policies(config) values ('{
 "effectiveFrom":"2026-10-16","confirmed":true,"notes":"Informado por el pasador el 16/10/2026. Umbral inicialmente interpretado por envío, pendiente de confirmación. No acredita tributos, seguro, nacionalización ni transporte nacional.",
 "generalPercent":20,"volumePercent":15,"thresholdUsd":1000,"volumeConfirmed":false,"mixedConfirmed":false,
 "thresholdBase":"shipment","reducedBase":"all_eligible","carrierArsPerUsd":1600,"carrierFxDate":"2026-10-16",
 "iphoneUsd":25,"tvUsd":{"32":35,"43":50,"50":60,"60":75,"70":85,"80":100,"100":125},"productUsd":{}
 }');
create table public.import_simulations (
 id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 1 and 200),
 policy_id uuid not null references public.import_cost_policies(id), input jsonb not null, result jsonb not null,
 created_at timestamptz not null default now(), actor uuid default auth.uid()
);
create table public.import_purchases (
 id uuid primary key default gen_random_uuid(), simulation_id uuid not null unique references public.import_simulations(id),
 approved_at timestamptz not null default now(), actor uuid default auth.uid(),
 notes text not null check(length(notes) between 1 and 2000)
);
create table public.supplier_config_history (
 id uuid primary key default gen_random_uuid(),supplier_id uuid not null references public.suppliers(id),
 before_value jsonb not null,after_value jsonb not null,created_at timestamptz not null default now(),actor uuid default auth.uid()
);
create function public.audit_supplier_config_v1() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if (old.query_mode,old.automation_authorized,old.freshness_hours,old.website,old.is_active) is distinct from (new.query_mode,new.automation_authorized,new.freshness_hours,new.website,new.is_active) then
  insert into supplier_config_history(supplier_id,before_value,after_value) values(new.id,to_jsonb(old),to_jsonb(new));
 end if;
 return new;
end $$;
create trigger audit_supplier_config after update on public.suppliers for each row execute function public.audit_supplier_config_v1();

-- Append-only histories and immutable simulation snapshots. No customer or public access.
do $$ declare t text; begin
 foreach t in array array['supplier_offers','supplier_observations','supplier_proposals','supplier_config_history','import_cost_policies','import_simulations','import_purchases'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('create policy admin_private_read on public.%I for select to authenticated using ((select public.is_admin()))',t);
 end loop;
end $$;
grant insert on public.import_cost_policies,public.import_simulations,public.import_purchases to authenticated;
create policy admin_insert on public.import_cost_policies for insert to authenticated with check((select public.is_admin()));
create policy admin_insert on public.import_simulations for insert to authenticated with check((select public.is_admin()));
create policy admin_insert on public.import_purchases for insert to authenticated with check((select public.is_admin()));
grant update(status,reviewed_at,reviewed_by) on public.supplier_proposals to authenticated;
create policy admin_review on public.supplier_proposals for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));

-- One atomic transaction per reviewed observation; errors do not erase verified values.
create function public.record_supplier_observation_v1(p jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare o public.supplier_offers; previous public.supplier_offers; oid uuid; stamp timestamptz; sid uuid; state text; method text;
begin
 if not public.is_admin() then raise exception 'Forbidden'; end if;
 p:=jsonb_set(p,'{variant_key}',to_jsonb(lower(regexp_replace(trim(p->>'variant_key'),'\s+',' ','g'))));
 sid:=(p->>'supplier_id')::uuid; method:=p->>'method'; stamp:=(p->>'observed_at')::timestamptz;
 if method is null or method not in ('manual','csv','product_page','error','not_found') or stamp is null or stamp>now()+interval '5 minutes' or stamp<now()-interval '10 years' then raise exception 'Invalid observation'; end if;
 perform 1 from public.suppliers where id=sid and is_active; if not found then raise exception 'Inactive supplier'; end if;
 -- Serialize duplicates of the same exact supplier identity, including concurrent inserts.
 perform pg_advisory_xact_lock(hashtextextended(sid::text||coalesce(p->>'external_id','')||coalesce(p->>'variant_key',''),0));
 select * into previous from public.supplier_offers where supplier_id=sid and external_id=p->>'external_id' and variant_key=p->>'variant_key' for update;
 if method in ('error','not_found') then
  if previous.id is null then raise exception 'Offer missing'; end if;
  update public.supplier_offers set last_attempt_at=now(),last_error=left(coalesce(p->>'message','Error de consulta'),1000),updated_at=now() where id=previous.id;
  insert into public.supplier_observations(offer_id,kind,payload,observed_at) values(previous.id,method,p,stamp);
  if method='not_found' then insert into public.supplier_proposals(offer_id,kind,before_value,after_value) values(previous.id,'missing_page',to_jsonb(previous),p); end if;
  return previous.id;
 end if;
 if previous.last_success_at>stamp then raise exception 'Observation older than current evidence'; end if;
 state:=p->>'availability';
 if state is null or state not in ('in_stock','out_of_stock','unknown') or (p->>'origin_cost')::numeric<=0 or p->>'currency' not in ('USD','ARS','PYG') or p->>'verification' not in ('pending','verified') then raise exception 'Invalid offer'; end if;
 if nullif(p->>'variant_id','') is not null and not exists(select 1 from public.product_variants where id=(p->>'variant_id')::uuid and product_id=(p->>'product_id')::uuid) then raise exception 'Variant does not belong to product'; end if;
 if nullif(p->>'variant_id','') is null and exists(select 1 from public.product_variants where product_id=nullif(p->>'product_id','')::uuid) then raise exception 'Select the exact product variant'; end if;
 if previous.id is not null and (previous.product_id is distinct from nullif(p->>'product_id','')::uuid or previous.variant_id is distinct from nullif(p->>'variant_id','')::uuid) then raise exception 'Identity relinking requires a separate review'; end if;
 insert into public.supplier_offers(supplier_id,product_id,variant_id,external_id,variant_key,title,brand,model,gtin,source_url,origin_cost,currency,availability,verification,cost_checked_at,availability_checked_at,last_success_at,last_attempt_at)
 values(sid,nullif(p->>'product_id','')::uuid,nullif(p->>'variant_id','')::uuid,p->>'external_id',p->>'variant_key',p->>'title',coalesce(p->>'brand',''),coalesce(p->>'model',''),nullif(p->>'gtin',''),p->>'source_url',(p->>'origin_cost')::numeric,p->>'currency',state,p->>'verification',case when p->>'origin_cost' is not null then stamp end,case when state<>'unknown' then stamp end,stamp,now())
 on conflict(supplier_id,external_id,variant_key) do update set title=excluded.title,brand=excluded.brand,model=excluded.model,gtin=excluded.gtin,source_url=excluded.source_url,
 origin_cost=coalesce(excluded.origin_cost,supplier_offers.origin_cost),currency=case when excluded.origin_cost is not null then excluded.currency else supplier_offers.currency end,
 availability=case when excluded.availability='unknown' then supplier_offers.availability else excluded.availability end,
 verification=excluded.verification,cost_checked_at=coalesce(excluded.cost_checked_at,supplier_offers.cost_checked_at),availability_checked_at=coalesce(excluded.availability_checked_at,supplier_offers.availability_checked_at),last_success_at=stamp,last_attempt_at=now(),last_error=null,updated_at=now()
 returning * into o;
 oid:=o.id;
 insert into public.supplier_observations(offer_id,kind,payload,observed_at) values(oid,method,p,stamp);
 if previous.id is null then insert into public.supplier_proposals(offer_id,kind,after_value) values(oid,'new_candidate',to_jsonb(o));
 else
  if (previous.origin_cost,previous.currency) is distinct from (o.origin_cost,o.currency) then insert into public.supplier_proposals(offer_id,kind,before_value,after_value) values(oid,'cost',to_jsonb(previous),to_jsonb(o)); end if;
  if previous.availability<>o.availability then insert into public.supplier_proposals(offer_id,kind,before_value,after_value) values(oid,'availability',to_jsonb(previous),to_jsonb(o)); end if;
  if (previous.title,previous.brand,previous.model,previous.gtin) is distinct from (o.title,o.brand,o.model,o.gtin) then
   update public.supplier_offers set verification='pending' where id=oid;
   insert into public.supplier_proposals(offer_id,kind,before_value,after_value) values(oid,'identity',to_jsonb(previous),to_jsonb(o));
  end if;
 end if;
 return oid;
end $$;
revoke all on function public.record_supplier_observation_v1(jsonb) from public,anon;
grant execute on function public.record_supplier_observation_v1(jsonb) to authenticated;
create function public.import_supplier_observations_v1(rows_input jsonb) returns integer language plpgsql security definer set search_path=public as $$
declare row_input jsonb; total integer:=0;
begin
 if not public.is_admin() then raise exception 'Forbidden'; end if;
 if jsonb_typeof(rows_input)<>'array' or jsonb_array_length(rows_input) not between 1 and 200 then raise exception 'Invalid batch'; end if;
 for row_input in select value from jsonb_array_elements(rows_input) loop
  perform public.record_supplier_observation_v1(row_input); total:=total+1;
 end loop;
 return total;
end $$;
revoke all on function public.import_supplier_observations_v1(jsonb) from public,anon;
grant execute on function public.import_supplier_observations_v1(jsonb) to authenticated;
create function public.claim_supplier_query_v1(offer_input uuid) returns void language plpgsql security definer set search_path=public as $$
declare sid uuid; supplier public.suppliers;
begin
 if not public.is_admin() then raise exception 'Forbidden'; end if;
 select supplier_id into sid from supplier_offers where id=offer_input;
 select * into supplier from suppliers where id=sid for update;
 if not found or not supplier.is_active or not supplier.automation_authorized or supplier.query_mode<>'product_page' then raise exception 'Supplier query not authorized'; end if;
 if supplier.last_query_at>now()-interval '60 seconds' then raise exception 'Esperá un minuto entre consultas al mismo proveedor'; end if;
 update suppliers set last_query_at=now() where id=sid;
 update supplier_offers set last_attempt_at=now() where id=offer_input;
end $$;
revoke all on function public.claim_supplier_query_v1(uuid) from public,anon;
grant execute on function public.claim_supplier_query_v1(uuid) to authenticated;
commit;
