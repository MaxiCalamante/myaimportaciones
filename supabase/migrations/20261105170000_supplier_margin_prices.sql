-- Manual PC operator: same private database, fixed documented margin baseline.
create table public.supplier_margin_price_bases (
 product_id uuid primary key references public.products(id), offer_id uuid not null references public.supplier_offers(id),
 base jsonb not null, last_retail numeric not null, last_wholesale numeric not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.supplier_margin_price_events (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id),
 offer_id uuid not null references public.supplier_offers(id), old_retail numeric, old_wholesale numeric,
 new_retail numeric, new_wholesale numeric, evidence jsonb not null, created_at timestamptz not null default now()
);
alter table public.supplier_margin_price_bases enable row level security;
alter table public.supplier_margin_price_events enable row level security;
revoke all on public.supplier_margin_price_bases, public.supplier_margin_price_events from public,anon,authenticated;
grant select on public.supplier_margin_price_bases, public.supplier_margin_price_events to service_role;
create function public.apply_supplier_margin_price_v1(p jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare pr products%rowtype; ofr supplier_offers%rowtype; cs product_costs%rowtype;
 b supplier_margin_price_bases%rowtype; cfg jsonb; current_policy uuid; policy_config jsonb; nr numeric; nw numeric; oldr numeric; oldw numeric;
begin
 if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
 select * into pr from products where id=(p->>'productId')::uuid for update;
 select * into ofr from supplier_offers where id=(p->>'offerId')::uuid for update;
 select * into cs from product_costs where product_id=pr.id for share;
 select config into cfg from supplier_tracking_settings where id=true for share;
 select id,config into current_policy,policy_config from import_cost_policies order by created_at desc limit 1 for share;
 select * into b from supplier_margin_price_bases where product_id=pr.id for update;
 if cfg->>'localMarginPrices' is distinct from 'true' or cfg->>'enabled' is distinct from 'true' then return jsonb_build_object('status','disabled','reason','Ajuste automático deshabilitado.'); end if;
 if pr.id is null or pr.deleted_at is not null or not pr.is_active or pr.has_variants or pr.fulfillment_mode<>'supplier' or exists(select 1 from product_variants where product_id=pr.id) then return jsonb_build_object('status','blocked','reason','Producto o variante fuera del alcance de esta base.'); end if;
 if ofr.id is null or ofr.product_id is distinct from pr.id or ofr.variant_id is not null or ofr.verification<>'verified' or ofr.currency<>'USD' or ofr.availability<>'in_stock' or ofr.last_error is not null
 or ofr.cost_checked_at is null or ofr.availability_checked_at is null or ofr.cost_checked_at<now()-interval '15 minutes' or ofr.availability_checked_at<now()-interval '15 minutes' or ofr.cost_checked_at>now()+interval '1 minute' or ofr.availability_checked_at>now()+interval '1 minute'
 or ofr.source_url is distinct from cs.supplier_url or cs.expenses_confirmed is distinct from true or cs.currency<>'USD' or cs.origin_cost<=0
 or ofr.evidence->>'costScope'='supplier_quote_inclusions_unconfirmed' then return jsonb_build_object('status','blocked','reason','La fuente o el costo exacto ya no cumplen los requisitos.'); end if;
 if pr.title is distinct from p->'identity'->>'title' or pr.brand is distinct from p->'identity'->>'brand' or to_jsonb(cs) is distinct from p->'cost' or cfg is distinct from p->'config' or current_policy is distinct from (p->>'policyId')::uuid or policy_config is distinct from p->'policyConfig'
 or ofr.source_url is distinct from p->'offer'->>'source_url' or ofr.origin_cost is distinct from (p->'offer'->>'origin_cost')::numeric
 or ofr.cost_checked_at is distinct from (p->'offer'->>'cost_checked_at')::timestamptz or ofr.availability_checked_at is distinct from (p->'offer'->>'availability_checked_at')::timestamptz
 or coalesce(ofr.evidence->>'sourceTitle',ofr.title) is distinct from p->'offer'->>'sourceTitle' then return jsonb_build_object('status','blocked','reason','Los datos cambiaron durante la revisión.'); end if;
 if b.product_id is null then
  if to_jsonb(cs) is distinct from p->'base'->'cost' or pr.retail_price is distinct from (p->'base'->>'retail')::numeric or coalesce(pr.wholesale_price,0) is distinct from (p->'base'->>'wholesale')::numeric or current_policy is distinct from (p->'base'->>'policyId')::uuid or policy_config is distinct from p->'base'->'policyConfig' then return jsonb_build_object('status','blocked','reason','La base inicial cambió.'); end if;
 else
  if b.offer_id<>ofr.id or b.base is distinct from p->'base' or b.base->'policyConfig' is distinct from policy_config or b.base->'cost' is distinct from to_jsonb(cs) or pr.retail_price is distinct from b.last_retail or coalesce(pr.wholesale_price,0) is distinct from b.last_wholesale then return jsonb_build_object('status','blocked','reason','El precio fue editado o la base cambió; revisar antes de continuar.'); end if;
 end if;
 nr=(p->'quote'->>'retail')::numeric; nw=(p->'quote'->>'wholesale')::numeric;
 if nr is null or nw is null or nr<=0 or nw<0 or nr>1e10 or nw>1e10 or (p->'quote'->>'landed')::numeric<=0 then raise exception 'Invalid projection'; end if;
 if abs(nr-pr.retail_price)/nullif(pr.retail_price,0)*100>coalesce((cfg->>'maxPriceChangePercent')::numeric,20)
 or (pr.wholesale_price>0 and abs(nw-pr.wholesale_price)/pr.wholesale_price*100>coalesce((cfg->>'maxPriceChangePercent')::numeric,20)) then return jsonb_build_object('status','review','reason','El cambio supera el límite automático; revisar precios en el panel web.'); end if;
 if b.product_id is null then insert into supplier_margin_price_bases(product_id,offer_id,base,last_retail,last_wholesale) values(pr.id,ofr.id,p->'base',pr.retail_price,coalesce(pr.wholesale_price,0)); end if;
 if nr=pr.retail_price and nw=coalesce(pr.wholesale_price,0) then return jsonb_build_object('status','unchanged','reason','Los precios ya conservan el margen de la base.','retail',nr,'wholesale',nw); end if;
 oldr=pr.retail_price; oldw=pr.wholesale_price;
 update products set retail_price=nr,wholesale_price=nw,updated_at=now() where id=pr.id;
 update supplier_margin_price_bases set last_retail=nr,last_wholesale=nw,updated_at=now() where product_id=pr.id;
 insert into supplier_margin_price_events(product_id,offer_id,old_retail,old_wholesale,new_retail,new_wholesale,evidence) values(pr.id,ofr.id,oldr,oldw,nr,nw,p);
 return jsonb_build_object('status','applied','reason','Precios minorista y mayorista sincronizados conservando el margen.','retail',nr,'wholesale',nw);
end $$;
revoke all on function public.apply_supplier_margin_price_v1(jsonb) from public,anon,authenticated;
grant execute on function public.apply_supplier_margin_price_v1(jsonb) to service_role;
