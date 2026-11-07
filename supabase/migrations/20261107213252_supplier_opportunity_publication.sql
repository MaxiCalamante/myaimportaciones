begin;

create function public.tracker_queue_catalog_item_v1(item_input uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare i supplier_tracker_items; target text;
begin
  if not coalesce(is_admin(),false) then raise exception 'Forbidden'; end if;
  select * into i from supplier_tracker_items where id=item_input;
  if not found or not i.tracking_enabled or i.excluded then raise exception 'Item unavailable'; end if;
  target:=coalesce(nullif(i.evidence->>'nativeUrl',''),i.url);
  perform tracker_validate_url_v1(i.supplier_id,target);
  if not supplier_tracking_allowed_v1(i.supplier_id,i.product_id,i.variant_id,target) then raise exception 'Source paused'; end if;
  insert into supplier_tracker_tasks(supplier_id,item_id,kind,url,priority,next_run_at)
    values(i.supplier_id,i.id,'monitor',target,10,now())
    on conflict(item_id) where kind='monitor' do update set state='queued',next_run_at=now(),attempts=0,
      lease_token=null,leased_until=null,priority=10
    where supplier_tracker_tasks.state<>'running' or supplier_tracker_tasks.leased_until<=now();
end $$;

create function public.tracker_claim_catalog_item_v1(item_input uuid) returns setof supplier_tracker_tasks
language plpgsql security definer set search_path=public,pg_temp as $$
declare i supplier_tracker_items; s suppliers; t supplier_tracker_tasks; target text;
begin
  if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
  select * into i from supplier_tracker_items where id=item_input;
  if not found then return; end if;
  select * into s from suppliers where id=i.supplier_id for update skip locked;
  if not found or s.tracker_blocked_until>now() or
    exists(select 1 from supplier_tracker_tasks where supplier_id=s.id and state='running' and leased_until>now()) then return; end if;
  select * into t from supplier_tracker_tasks where item_id=i.id and kind='monitor' for update skip locked;
  if not found then return; end if;
  target:=t.url;
  perform tracker_validate_url_v1(s.id,target);
  if not supplier_tracking_allowed_v1(s.id,i.product_id,i.variant_id,target) then return; end if;
  insert into supplier_source_slots(supplier_id,next_at) values(s.id,now()) on conflict do nothing;
  update supplier_source_slots set next_at=now()+interval '10 seconds' where supplier_id=s.id and next_at<=now();
  if not found then return; end if;
  return query update supplier_tracker_tasks set state='running',started_at=now(),attempts=attempts+1,
    lease_token=gen_random_uuid(),leased_until=now()+interval '2 minutes',run_token=gen_random_uuid()
    where id=t.id returning *;
end $$;
revoke all on function public.tracker_queue_catalog_item_v1(uuid) from public,anon,service_role;
grant execute on function public.tracker_queue_catalog_item_v1(uuid) to authenticated;
revoke all on function public.tracker_claim_catalog_item_v1(uuid) from public,anon,authenticated;
grant execute on function public.tracker_claim_catalog_item_v1(uuid) to service_role;

-- Keep manually requested checks urgent for one lease. Published references
-- are monitored ahead of listing expansion and pending detail reads.
do $$
declare definition text; marker text;
begin
  definition:=pg_get_functiondef('public.tracker_record_monitor_v1(uuid,uuid,jsonb)'::regprocedure);
  marker:='attempts=0,next_run_at=now()+make_interval';
  if position(marker in definition)=0 then raise exception 'Monitor retry contract changed'; end if;
  execute replace(definition,marker,
    'attempts=0,priority=case when i.product_id is not null then case when priority=10 then 30 else least(priority,30) end when priority=10 then 300 else priority end,next_run_at=now()+make_interval');
end $$;

create table public.supplier_catalog_publication_reviews(
  item_id uuid primary key references public.supplier_tracker_items(id),
  published_product_id uuid unique references public.products(id) on delete set null,
  published_offer_id uuid references public.supplier_offers(id) on delete set null,
  input jsonb not null,
  preview jsonb,
  revision uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  actor uuid default auth.uid()
);
alter table public.supplier_catalog_publication_reviews enable row level security;
revoke all on public.supplier_catalog_publication_reviews from public,anon,authenticated,service_role;
grant select on public.supplier_catalog_publication_reviews to authenticated,service_role;
create policy catalog_admin_read on public.supplier_catalog_publication_reviews for select to authenticated using ((select is_admin()));
create index tracker_items_supplier_latest on public.supplier_tracker_items(supplier_id,first_seen_at desc,id);
create index tracker_items_product_id on public.supplier_tracker_items(product_id) where product_id is not null;
create index tracker_items_gtin on public.supplier_tracker_items(gtin) where gtin is not null;
create index tracker_items_brand_model on public.supplier_tracker_items(brand,model) where not excluded;
create index tracker_items_supplier_cost on public.supplier_tracker_items(supplier_id,currency,origin_cost,id) where origin_cost is not null;
create index tracker_items_search on public.supplier_tracker_items using gin (
  to_tsvector('simple',title||' '||brand||' '||sku||' '||model||' '||external_id)
);

create function public.tracker_publication_prices_v1(b jsonb) returns jsonb
language plpgsql stable set search_path=public,pg_temp as $$
declare
  settings store_money_settings; fx store_exchange_rates; channel text; payment text;
  calculation jsonb; template jsonb; rows jsonb:='{}'; retail numeric:=0; wholesale numeric:=0;
  price numeric; cost numeric; acquisition numeric; fees numeric:=0; rmargin numeric; wmargin numeric; min_price numeric:=0;
begin
  select * into settings from store_money_settings where id;
  select * into fx from store_exchange_rates where settings_version=settings.version and expires_at>now()
    order by fetched_at desc,id desc limit 1;
  if fx.id is null then raise exception 'Falta cotización vigente de venta MYA'; end if;
  acquisition:=store_acquisition_cost_v2(b);
  template:=jsonb_build_object('accountingBasis',b->>'accountingBasis','vatPercent',b->'vatPercent',
    'accountingConfirmed',b->'accountingConfirmed','publicArsPerUsd',fx.rate,'arsStep',settings.round_ars);
  foreach channel in array array['retail','wholesale'] loop
    foreach payment in array array['transferencia','mercado_pago'] loop
      calculation:=store_profitability_v2(template||jsonb_build_object('channel',channel,'paymentMethod',payment,
        'lines',jsonb_build_array(jsonb_build_object('quantity',1,'cost',b))));
      price:=round((calculation->>'automaticUnitUsd')::numeric,6);
      if price is null then raise exception 'No se pudo calcular el objetivo del canal % con %',channel,payment; end if;
      if channel='retail' then retail:=greatest(retail,price); else wholesale:=greatest(wholesale,price); end if;
    end loop;
  end loop;
  foreach channel in array array['retail','wholesale'] loop
    foreach payment in array array['transferencia','mercado_pago'] loop
      price:=case channel when 'retail' then retail else wholesale end;
      calculation:=store_profitability_v2(template||jsonb_build_object('channel',channel,'paymentMethod',payment,
        'lines',jsonb_build_array(jsonb_build_object('quantity',1,'cost',b,'unitUsd',price))));
      if calculation->>'allowed' is distinct from 'true' or
        (calculation->>'effectiveMargin')::numeric<(calculation->>'targetMargin')::numeric then
        raise exception 'La tarifa real de % impide alcanzar el objetivo de %',payment,channel;
      end if;
      rows:=rows||jsonb_build_object(channel||':'||payment,calculation);
      cost:=(calculation->>'acquisitionAndSaleCostUsd')::numeric;
      min_price:=greatest(min_price,(calculation->>'minimumTotalUsd')::numeric);
      if channel='retail' then
        fees:=greatest(fees,(calculation->>'feesUsd')::numeric);
        rmargin:=least(rmargin,(calculation->>'effectiveMargin')::numeric);
      else wmargin:=least(wmargin,(calculation->>'effectiveMargin')::numeric); end if;
    end loop;
  end loop;
  return jsonb_build_object('retailUsd',retail,'wholesaleUsd',wholesale,
    'retailArs',round(retail*fx.rate/settings.round_ars)*settings.round_ars,
    'wholesaleArs',round(wholesale*fx.rate/settings.round_ars)*settings.round_ars,
    'acquisitionUsd',acquisition,'totalCostUsd',cost,'retailFeeUsd',fees,'retailMargin',rmargin,'wholesaleMargin',wmargin,
    'minimumUsd',min_price,'rateId',fx.id,'rate',fx.rate,'results',rows,'policyVersion',(calculation->>'policyVersion')::integer);
end $$;

create function public.tracker_check_publication_v1(i supplier_tracker_items, p jsonb) returns jsonb
language plpgsql stable set search_path=public,pg_temp as $$
declare d jsonb:=i.evidence->'lastResult'; b jsonb:=p->'basis'; amount numeric; target text; reasons text[]:='{}'; prices jsonb; key text;
begin
  select official_key into key from suppliers where id=i.supplier_id;
  target:=d->>'url';
  if not i.tracking_enabled or i.excluded or not supplier_tracking_allowed_v1(i.supplier_id,i.product_id,i.variant_id,coalesce(target,i.url)) then
    reasons:=array_append(reasons,'La referencia o su proveedor están pausados.');
  end if;
  if not exists(select 1 from supplier_tracker_memberships m join supplier_tracker_sources s on s.id=m.source_id
    where m.item_id=i.id and s.supplier_id=i.supplier_id and s.catalog_parent_id is not null and s.enabled) then
    reasons:=array_append(reasons,'Falta acreditar que la referencia pertenece al catálogo elegible.');
  end if;
  if d is null or i.last_error is not null or nullif(d->>'commercialReview','') is not null or
    i.last_success_at<now()-interval '24 hours' or i.external_id is distinct from d->>'externalId' or
    i.variant_key is distinct from d->>'variantKey' or i.variant_key='source' then
    reasons:=array_append(reasons,'Falta verificar la ficha y su presentación exacta.');
  end if;
  if d->>'availability' is distinct from 'in_stock' then reasons:=array_append(reasons,'Disponibilidad a confirmar en origen.'); end if;
  if nullif(d->>'listingConflict','') is not null and length(btrim(coalesce(p->>'sourceConflictEvidence','')))<20 then
    reasons:=array_append(reasons,'La tarjeta y la ficha no coinciden. Documentá la presentación confirmada por el proveedor.');
  end if;
  if key='atacado-connect' and i.title~*'\miphone\M' and i.title!~*'\m(lacrado|sellado|sealed)\M' and
    length(btrim(coalesce(p->>'conditionEvidence','')))<10 then
    reasons:=array_append(reasons,'Documentá que el iPhone es nuevo y sellado.');
  end if;
  amount:=(d->>'cost')::numeric;
  if coalesce(amount,0)<=0 or d->>'currency' is null then reasons:=array_append(reasons,'Falta precio y moneda explícitos en la ficha.'); end if;
  if length(btrim(coalesce(p->>'title',''))) not between 4 and 200 then reasons:=array_append(reasons,'Ingresá un título completo de hasta 200 caracteres.'); end if;
  if length(regexp_replace(coalesce(p->>'description',''),'\s','','g'))<40 or length(p->>'description')>15000 then
    reasons:=array_append(reasons,'Agregá una descripción comprobada en español.');
  end if;
  if not exists(select 1 from categories where id::text=p->>'categoryId') then reasons:=array_append(reasons,'Seleccioná categoría o subcategoría de MYA.'); end if;
  if coalesce(d->>'imageUrl','')='' then reasons:=array_append(reasons,'La ficha requiere una imagen exacta comprobable.'); end if;
  if p->>'mediaAuthorized' is distinct from 'true' then reasons:=array_append(reasons,'Confirmá el permiso de uso de las imágenes.'); end if;
  if p->>'identityConfirmed' is distinct from 'true' or p->>'complianceConfirmed' is distinct from 'true' or
    length(btrim(coalesce(p->>'evidence','')))<20 then
    reasons:=array_append(reasons,'Confirmá identidad, requisitos comerciales y el respaldo de la revisión.');
  end if;
  if jsonb_typeof(b) is distinct from 'object' then
    reasons:=array_append(reasons,'Falta la base documentada de adquisición, pasador, tributos y gastos imputables.');
  elsif amount is distinct from (b->>'origin')::numeric or d->>'currency' is distinct from b->>'currency' or target is distinct from b->>'supplierUrl' then
    reasons:=array_append(reasons,'El importe, moneda o URL de la base de costos difieren de la ficha verificada.');
  elsif key='total' and coalesce(d->>'taxBasis','unknown')<>'included' and
    (length(coalesce(b->>'originTaxDocument',''))<10 or not exists(
      select 1 from jsonb_array_elements(b->'components') c where c->>'kind'='origin_tax' and c->>'group'='acquisition')) then
    reasons:=array_append(reasons,'Total requiere evidencia del IVA de origen y su importe atribuible, incluso si es cero.');
  elsif target is not null then
    b:=b||jsonb_build_object('checkedAt',i.last_success_at);
    begin
      prices:=tracker_publication_prices_v1(b);
    exception when others then reasons:=array_append(reasons,'Costos o comisiones: '||sqlerrm);
    end;
  end if;
  return jsonb_build_object('reasons',reasons,'prices',prices,'basis',b,'source',target,
    'identity',jsonb_build_array(i.external_id,i.variant_key,d->>'title',d->>'brand',d->>'model',d->>'sku',d->>'gtin',
      d->>'currency',amount,d->>'availability',d->>'taxBasis',d->'images',d->>'imageUrl',d->'specifications',d->>'listingConflict'));
end $$;

create function public.tracker_preview_publication_v1(item_input uuid, input_value jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare i supplier_tracker_items; saved supplier_catalog_publication_reviews; preview jsonb;
begin
  if not coalesce(is_admin(),false) then raise exception 'Forbidden'; end if;
  if jsonb_typeof(input_value) is distinct from 'object' or octet_length(input_value::text)>50000 then raise exception 'Revisión inválida'; end if;
  select * into i from supplier_tracker_items where id=item_input for update;
  if not found then raise exception 'Referencia inexistente'; end if;
  preview:=tracker_check_publication_v1(i,input_value)-'basis';
  insert into supplier_catalog_publication_reviews(item_id,input,preview)
    values(i.id,input_value,preview)
    on conflict(item_id) do update set input=excluded.input,preview=excluded.preview,revision=gen_random_uuid(),updated_at=now(),actor=auth.uid()
    returning * into saved;
  return preview||jsonb_build_object('revision',saved.revision);
end $$;

create function public.tracker_publish_opportunity_v1(item_input uuid, revision_input uuid, slug_input text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  i supplier_tracker_items; review supplier_catalog_publication_reviews; existing products; created products;
  linked supplier_offers; variant_row product_variants; d jsonb; b jsonb; check_result jsonb; prices jsonb; target text;
  product_value uuid:=gen_random_uuid(); offer_value uuid; images text[]; specs jsonb; slug_value text; fallback_fx numeric;
  landed_ars numeric; variable_ars numeric; fee_pct numeric;
begin
  if not coalesce(is_admin(),false) then raise exception 'Forbidden'; end if;
  -- Serialize publication identity checks across all four origins.
  perform pg_advisory_xact_lock(hashtextextended('MYA supplier catalog publication',0));
  select * into i from supplier_tracker_items where id=item_input for update;
  if not found then raise exception 'Referencia inexistente'; end if;
  select * into existing from products where id=i.product_id;
  if found then return jsonb_build_object('id',existing.id,'slug',existing.slug,'active',existing.is_active,'existing',true); end if;
  select * into review from supplier_catalog_publication_reviews where item_id=i.id for update;
  if not found or review.revision is distinct from revision_input then raise exception 'La revisión cambió. Volvé a generar la vista previa.'; end if;
  if i.last_success_at is null or i.last_success_at<now()-interval '5 minutes' then raise exception 'Actualizá la ficha de origen antes de confirmar.'; end if;
  check_result:=tracker_check_publication_v1(i,review.input);
  if jsonb_array_length(check_result->'reasons')>0 then raise exception '%',check_result->'reasons'->>0; end if;
  prices:=check_result->'prices'; b:=check_result->'basis'; target:=check_result->>'source'; d:=i.evidence->'lastResult';
  if check_result->'identity' is distinct from review.preview->'identity' or
    prices-'results' is distinct from (review.preview->'prices')-'results' then
    raise exception 'Cambió la ficha, el costo o la cotización. Volvé a generar la vista previa.';
  end if;
  perform tracker_validate_url_v1(i.supplier_id,target);
  select * into linked from supplier_offers where supplier_id=i.supplier_id and external_id=i.external_id and variant_key=i.variant_key for update;
  if linked.product_id is not null then
    select * into existing from products where id=linked.product_id;
    return jsonb_build_object('id',existing.id,'slug',existing.slug,'active',existing.is_active,'existing',true);
  end if;
  if linked.archived_at is not null then raise exception 'La oferta está archivada y requiere revisión.'; end if;
  if exists(select 1 from supplier_offers o where o.product_id is not null and o.archived_at is null and
    ((o.supplier_id=i.supplier_id and (o.external_id=i.external_id or o.source_url=target)) or
     (nullif(i.gtin,'') is not null and o.gtin=i.gtin and o.verification='verified'))) or
    exists(select 1 from products p where p.deleted_at is null and
      (p.source_url in (target,i.url) or
       lower(regexp_replace(p.title,'[^[:alnum:]]+',' ','g'))=
       lower(regexp_replace(review.input->>'title','[^[:alnum:]]+',' ','g')))) then
    raise exception 'Existe una ficha posiblemente equivalente. Revisá el vínculo exacto en Proveedores.';
  end if;
  if slug_input is null or length(slug_input)>160 or slug_input !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Slug inválido'; end if;
  slug_value:=slug_input;
  if exists(select 1 from products where slug=slug_value) then slug_value:=left(slug_input,135)||'-'||left(i.id::text,8); end if;
  images:=array(select x from jsonb_array_elements_text(coalesce(d->'images','[]')) with ordinality a(x,n) order by n limit 4);
  if cardinality(images)=0 then images:=array[d->>'imageUrl']; end if;
  if exists(select 1 from unnest(images) u where
    u !~ '^https://(www\.)?(atacadousa\.com\.py|starcompany-py\.com|totalherramientasoficial\.com\.py|atacadoconnect\.com|cdn\.atacadoconnect\.com)/'
    or length(u)>2000) then raise exception 'Dominio de imagen no admitido'; end if;
  specs:=coalesce(d->'specifications','{}');
  if nullif(i.gtin,'') is not null then specs:=specs||jsonb_build_object('GTIN',i.gtin); end if;
  insert into products(id,title,slug,category_id,description,brand,model,sku,source_url,specifications,image_url,image_urls,
    retail_price,wholesale_price,is_active,is_featured,has_variants,stock,fulfillment_mode,supplier_available,supplier_stock_status,supplier_last_checked_at)
  values(product_value,btrim(review.input->>'title'),slug_value,(review.input->>'categoryId')::uuid,btrim(review.input->>'description'),
    nullif(d->>'brand',''),nullif(d->>'model',''),nullif(d->>'sku',''),target,specs,images[1],images,
    (prices->>'retailArs')::numeric,(prices->>'wholesaleArs')::numeric,false,false,false,0,'supplier',true,'in_stock',i.last_success_at);
  insert into supplier_offers(supplier_id,product_id,external_id,variant_key,title,brand,model,gtin,source_url,origin_cost,currency,
    availability,verification,cost_checked_at,availability_checked_at,last_success_at,last_attempt_at,evidence)
  values(i.supplier_id,product_value,i.external_id,i.variant_key,d->>'title',coalesce(d->>'brand',''),coalesce(d->>'model',''),
    i.gtin,target,(d->>'cost')::numeric,d->>'currency','in_stock','verified',i.last_success_at,i.last_success_at,i.last_success_at,i.last_success_at,
    jsonb_build_object('sourceTitle',d->>'title','availabilityBasis','explicit','costScope','primary_detail',
      'originTaxBasis',coalesce(d->>'taxBasis','unknown'),'originTaxApprovedCost',(d->>'cost')::numeric,
      'originListingConflict',d->>'listingConflict','trackerItemId',i.id,'publicationReview',review.revision))
  on conflict(supplier_id,external_id,variant_key) do update set product_id=excluded.product_id,source_url=excluded.source_url,
    title=excluded.title,brand=excluded.brand,model=excluded.model,gtin=excluded.gtin,origin_cost=excluded.origin_cost,currency=excluded.currency,
    availability=excluded.availability,verification=excluded.verification,cost_checked_at=excluded.cost_checked_at,
    availability_checked_at=excluded.availability_checked_at,last_success_at=excluded.last_success_at,last_attempt_at=excluded.last_attempt_at,
    last_error=null,evidence=(supplier_offers.evidence-'identityReview')||excluded.evidence,updated_at=now()
    where supplier_offers.product_id is null and supplier_offers.archived_at is null
    returning id into offer_value;
  if offer_value is null then raise exception 'La oferta cambió durante la confirmación'; end if;
  insert into supplier_link_decisions(offer_id,product_id,status,method,reason,evidence)
    values(offer_value,product_value,'linked','admin_review',review.input->>'evidence',
      jsonb_build_object('sourceTitle',d->>'title','conditionEvidence',review.input->>'conditionEvidence',
        'sourceConflictEvidence',review.input->>'sourceConflictEvidence'));
  if not catalog_supplier_offer_valid_v1(offer_value,now()) then raise exception 'No quedó verificada la identidad pública del producto'; end if;
  insert into supplier_observations(offer_id,kind,payload,observed_at)
    values(offer_value,'product_page',d,i.last_success_at);

  b:=b||jsonb_build_object('offerId',offer_value);
  perform save_store_profitability_profile_v2(product_value,null,b,0,'Publicación asistida con evidencia revisada');
  perform save_store_offer_profitability_v2(offer_value,b,0,'Publicación asistida con evidencia revisada');
  -- Maintain the existing ARS checkout contract alongside the precise USD
  -- profile. Fixed and percentage fees stay explicit in the modern snapshot.
  fallback_fx:=case b->>'settlementBasis' when 'ars_cash' then (b->>'acquisitionArsPerUsd')::numeric else (prices->>'rate')::numeric end;
  landed_ars:=(prices->>'acquisitionUsd')::numeric*fallback_fx;
  variable_ars:=greatest(0,(prices->>'totalCostUsd')::numeric*(prices->>'rate')::numeric-landed_ars);
  fee_pct:=ceil((prices->>'retailFeeUsd')::numeric*(prices->>'rate')::numeric/(prices->>'retailArs')::numeric*1000000)/10000;
  insert into product_costs(product_id,origin_cost,currency,exchange_rate,freight_per_unit,other_landed_cost,variable_cost,
    payment_fee_percent,minimum_contribution,expenses_confirmed,verified_at,source_document,supplier_url)
  values(product_value,(d->>'cost')::numeric,d->>'currency',fallback_fx/(b->>'unitsPerUsd')::numeric,0,
    greatest(0,landed_ars-(d->>'cost')::numeric*fallback_fx/(b->>'unitsPerUsd')::numeric),variable_ars,fee_pct,0,true,
    i.last_success_at,b->>'document',target);
  insert into product_usd_prices(product_id,retail_usd,wholesale_usd,retail_source,wholesale_source,state,total_cost_usd,
    acquisition_cost_usd,effective_retail_margin,effective_wholesale_margin,minimum_commercial_usd,cost_status,cost_source,
    costs_updated_at,profitability_snapshot,migration_rate_id)
  values(product_value,(prices->>'retailUsd')::numeric,(prices->>'wholesaleUsd')::numeric,'automatic','automatic','active',
    (prices->>'totalCostUsd')::numeric,(prices->>'acquisitionUsd')::numeric,(prices->>'retailMargin')::numeric,
    (prices->>'wholesaleMargin')::numeric,(prices->>'minimumUsd')::numeric,'COSTO_VERIFICADO',b->>'document',i.last_success_at,
    prices||jsonb_build_object('costBasisHash',md5((b-'checkedAt')::text),'offerId',offer_value),(prices->>'rateId')::uuid);
  insert into catalog_product_reviews(product_id) values(product_value);
  perform review_catalog_product_v1(product_value,jsonb_build_object('identity_confirmed',true,'costs_confirmed',true,
    'media_authorized',true,'compliance_confirmed',true,'evidence',review.input->>'evidence'),'publish');
  if not catalog_public_supplier_scope_v1(product_value,null) then raise exception 'La ficha no pasó la comprobación del catálogo público'; end if;
  update supplier_tracker_items set product_id=product_value,offer_id=offer_value,monitor_seconds=1800 where id=i.id;
  update supplier_catalog_publication_reviews set published_product_id=product_value,published_offer_id=offer_value where item_id=i.id;
  update supplier_tracker_tasks set priority=30,next_run_at=least(next_run_at,now()+interval '30 minutes')
    where id in (select id from supplier_tracker_tasks where item_id=i.id and kind='monitor' and state='queued' for update skip locked);
  insert into supplier_tracker_events(supplier_id,item_id,kind,after_value)
    values(i.supplier_id,i.id,'published',jsonb_build_object('productId',product_value,'offerId',offer_value,'previewRevision',review.revision));
  select * into created from products where id=product_value;
  return jsonb_build_object('id',product_value,'slug',created.slug,'active',created.is_active,'existing',false);
end $$;

revoke all on function public.tracker_publication_prices_v1(jsonb),public.tracker_check_publication_v1(supplier_tracker_items,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.tracker_preview_publication_v1(uuid,jsonb),public.tracker_publish_opportunity_v1(uuid,uuid,text) from public,anon,service_role;
grant execute on function public.tracker_preview_publication_v1(uuid,jsonb),public.tracker_publish_opportunity_v1(uuid,uuid,text) to authenticated;

-- Filter and page at the database. Source URLs, price and readiness stay private.
create function public.tracker_opportunities_v1(f jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb; source_value uuid:=nullif(f->>'sourceId','')::uuid;
  supplier_value uuid:=nullif(f->>'supplierId','')::uuid; state_value text:=coalesce(f->>'status','');
  order_value text:=coalesce(f->>'sort','new'); currency_value text:=coalesce(f->>'currency','');
  search_value text:=btrim(left(coalesce(f->>'q',''),120)); page_value integer:=greatest(1,least(100000,coalesce((f->>'page')::integer,1)));
  min_origin numeric:=nullif(f->>'minOrigin','')::numeric; max_origin numeric:=nullif(f->>'maxOrigin','')::numeric;
  min_cost numeric:=nullif(f->>'minCost','')::numeric; min_margin numeric:=nullif(f->>'minMargin','')::numeric;
  checked_from timestamptz:=nullif(f->>'checkedFrom','')::date::timestamp at time zone 'America/Argentina/Buenos_Aires';
begin
  if not coalesce(is_admin(),false) then raise exception 'Forbidden'; end if;
  with items as materialized (
    select i.id,i.title,i.brand,i.sku,i.model,i.image_url,i.url,i.origin_cost,i.currency,i.last_seen_at,i.last_success_at,i.first_seen_at,
      i.last_error,i.status source_status,i.product_id,i.variant_id,i.offer_id,s.name supplier,s.id supplier_id,
      case when i.last_success_at>=now()-make_interval(hours=>s.freshness_hours) and i.last_error is null
        then coalesce(i.evidence->'lastResult'->>'availability','unknown') else 'unknown' end availability,
      case when pr.preview->'prices' is not null and jsonb_array_length(pr.preview->'reasons')=0 and i.last_error is null
        and (pr.preview->'identity'->>8)::numeric=i.origin_cost and pr.preview->'identity'->>7=i.currency
        and i.last_success_at>=now()-interval '24 hours' and i.evidence->'lastResult'->>'availability'='in_stock'
        and (pr.preview->'prices'->>'policyVersion')::integer=(select version from store_profitability_policy where id)
        and exists(select 1 from store_exchange_rates x where x.id=(pr.preview->'prices'->>'rateId')::uuid and x.expires_at>now())
        then pr.preview->'prices' end candidate_prices,
      p.is_active and p.deleted_at is null and p.supplier_archived_at is null active,p.slug,
      p.retail_price displayed_retail_ars,p.wholesale_price displayed_wholesale_ars,
      u.retail_usd,u.wholesale_usd,u.total_cost_usd,u.effective_retail_margin,u.effective_wholesale_margin
    from supplier_tracker_items i join suppliers s on s.id=i.supplier_id
    left join products p on p.id=i.product_id
    left join product_usd_prices u on u.product_id=i.product_id and u.variant_id is not distinct from i.variant_id
    left join supplier_catalog_publication_reviews pr on pr.item_id=i.id
    where s.is_active and s.automation_authorized and s.archived_at is null
      and not i.excluded and (supplier_value is null or i.supplier_id=supplier_value)
      and (source_value is null or exists(select 1 from supplier_tracker_memberships m where m.item_id=i.id and m.source_id=source_value))
      and (currency_value='' or i.currency=currency_value)
      and (checked_from is null or i.last_success_at>=checked_from)
      and (min_origin is null or i.origin_cost>=min_origin) and (max_origin is null or i.origin_cost<=max_origin)
      and (search_value='' or to_tsvector('simple',i.title||' '||i.brand||' '||i.sku||' '||i.model||' '||i.external_id)
        @@ to_tsquery('simple',array_to_string(array(select quote_literal(v)||':*' from regexp_split_to_table(lower(search_value),'[^[:alnum:]]+') v where v<>''),' & ')))
  ), filtered as materialized (
    select a.*,
      case when active then 'published' when source_status in ('issue','retired') then 'error'
        when availability='out_of_stock' then 'out_of_stock'
        when last_success_at<now()-interval '24 hours' then 'stale'
        when candidate_prices is not null then 'ready'
        when last_success_at is not null or product_id is not null then 'review' else 'discovered' end state,
      coalesce(total_cost_usd,(candidate_prices->>'totalCostUsd')::numeric) cost_usd,
      coalesce(effective_retail_margin,(candidate_prices->>'retailMargin')::numeric) margin,
      coalesce(retail_usd,(candidate_prices->>'retailUsd')::numeric) displayed_retail_usd,
      coalesce(wholesale_usd,(candidate_prices->>'wholesaleUsd')::numeric) displayed_wholesale_usd
    from items a
  ), matching as materialized (
    select * from filtered where
      (state_value='' or state_value=state or state_value=availability or
        (state_value='new' and first_seen_at>=now()-interval '24 hours'))
      and (min_cost is null or cost_usd>=min_cost) and (min_margin is null or margin>=min_margin)
  )
  select jsonb_build_object('total',(select count(*) from matching),'page',page_value,'size',24,
    'items',coalesce((select jsonb_agg(to_jsonb(x)-'candidate_prices') from (
      select * from matching order by
        case when order_value='price' then currency end,
        case when order_value='price' then origin_cost end nulls last,
        case when order_value='margin' then (availability='in_stock')::integer end desc,
        case when order_value='margin' and availability='in_stock' then margin end desc nulls last,
        case when order_value='checked' then last_success_at end desc nulls last,
        first_seen_at desc,id offset (page_value-1)*24 limit 24
    ) x),'[]')) into result;
  return result;
end $$;

create function public.tracker_catalog_summary_v1(supplier_input uuid default null) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare answer jsonb;
begin
  if not coalesce(is_admin(),false) then raise exception 'Forbidden'; end if;
  select jsonb_build_object(
    'suppliers',coalesce((select jsonb_agg(to_jsonb(s) order by s.name) from (
      select p.id,p.name,p.official_key,root.last_success_at,root.next_run_at,root.enabled
      from suppliers p join supplier_tracker_sources root on root.supplier_id=p.id and root.catalog_root
      where p.is_active and p.archived_at is null
    ) s),'[]'),
    'sources',coalesce((select jsonb_agg(to_jsonb(s) order by s.label) from (
      select a.id,a.supplier_id,a.label,a.url,a.enabled,count(m.item_id) items
      from supplier_tracker_sources a left join supplier_tracker_memberships m on m.source_id=a.id
      where a.kind='category' and not a.catalog_root and (supplier_input is null or a.supplier_id=supplier_input)
      group by a.id
    ) s),'[]'),
    'runs',coalesce((select jsonb_agg(to_jsonb(r) order by r.started_at desc) from (
      select r.id,r.supplier_id,s.label,r.state,r.started_at,r.finished_at,r.pages,r.new_items,r.error,
        r.report-'categories' report,
        case when r.report ? 'categories' then r.items else (select count(distinct m.item_id) from supplier_tracker_memberships m where m.last_run_id=r.id) end items,
        (select count(distinct t.source_id) from supplier_tracker_tasks t join supplier_tracker_sources src on src.id=t.source_id where t.run_id=r.id and not src.catalog_root) detected,
        (select count(*) from (select t.source_id from supplier_tracker_tasks t join supplier_tracker_sources src on src.id=t.source_id where t.run_id=r.id and not src.catalog_root
          group by t.source_id having bool_and(t.state='done')) c) completed,
        (select count(*) from supplier_tracker_tasks t where t.run_id=r.id and t.state in ('queued','retry','running')) pending,
        (select count(*) from supplier_tracker_tasks t where t.run_id=r.id and t.state in ('blocked','retry')) errors,
        (select t.last_error from supplier_tracker_tasks t where t.run_id=r.id and t.last_error is not null
          order by t.finished_at desc nulls last limit 1) last_error
      from supplier_tracker_runs r join supplier_tracker_sources s on s.id=r.source_id
      where (s.catalog_root or s.catalog_parent_id is not null) and (supplier_input is null or r.supplier_id=supplier_input)
      order by r.started_at desc limit 12
    ) r),'[]'),
    'counts',coalesce((select jsonb_agg(to_jsonb(c)) from (
      select i.supplier_id,count(*) total,count(*) filter(where i.origin_cost>0) with_price,
        count(*) filter(where i.availability_checked_at>=now()-make_interval(hours=>s.freshness_hours) and i.last_error is null
          and i.evidence->'lastResult'->>'availability' in ('in_stock','out_of_stock')) with_stock_evidence,
        count(*) filter(where i.last_error is not null) item_errors,
        count(*) filter(where i.product_id is not null) linked
      from supplier_tracker_items i join suppliers s on s.id=i.supplier_id
      where s.is_active and s.archived_at is null and not i.excluded and (supplier_input is null or i.supplier_id=supplier_input)
      group by i.supplier_id
    ) c),'[]')) into answer;
  return answer;
end $$;

revoke all on function public.tracker_opportunities_v1(jsonb),public.tracker_catalog_summary_v1(uuid) from public,anon,service_role;
grant execute on function public.tracker_opportunities_v1(jsonb),public.tracker_catalog_summary_v1(uuid) to authenticated;

create function public.tracker_catalog_run_categories_v1(run_input uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare r supplier_tracker_runs; result jsonb;
begin
  if not coalesce(is_admin(),false) then raise exception 'Forbidden'; end if;
  select * into r from supplier_tracker_runs where id=run_input;
  select coalesce(jsonb_agg(to_jsonb(c) order by c.label),'[]') into result from (
    select a.id,a.label,count(*) filter(where p.state='done') pages,max(p.catalog_expected_total) expected,
      coalesce((select (x->>'items')::integer from jsonb_array_elements(r.report->'categories') x where x->>'id'=a.id::text),
        (select count(*) from supplier_tracker_memberships m where m.source_id=a.id and m.last_run_id=r.id)) items,
      (select count(distinct excluded_id) from supplier_tracker_tasks e cross join lateral unnest(e.catalog_excluded_ids) excluded_id
        where e.run_id=r.id and e.source_id=a.id) excluded,
      count(*) filter(where p.state in ('blocked','retry','paused')) errors,
      count(*) filter(where p.state in ('queued','retry','running')) pending,
      (select old.items from supplier_tracker_runs previous cross join lateral
        jsonb_to_recordset(previous.report->'categories') as old(id uuid,items integer)
        where previous.source_id=r.source_id and previous.state='done' and previous.finished_at<r.started_at and old.id=a.id
        order by previous.finished_at desc limit 1) previous_items,
      (select t.last_error from supplier_tracker_tasks t where t.run_id=r.id and t.source_id=a.id and t.last_error is not null
        order by t.finished_at desc nulls last limit 1) last_error
    from supplier_tracker_tasks p join supplier_tracker_sources a on a.id=p.source_id
    where p.run_id=r.id and not a.catalog_root group by a.id
  ) c;
  return result;
end $$;
revoke all on function public.tracker_catalog_run_categories_v1(uuid) from public,anon,service_role;
grant execute on function public.tracker_catalog_run_categories_v1(uuid) to authenticated;

-- Apply the purchase gate only to products created by the assisted flow.
-- Historical/manual products keep the current settings and checkout behavior.
create function public.tracker_catalog_purchase_v1(payload jsonb,rate_input uuid,snapshot_input jsonb) returns void
language plpgsql stable set search_path=public,pg_temp as $$
declare row_value record; fx store_exchange_rates; i supplier_tracker_items; p store_profitability_profiles; o supplier_offers;
  d jsonb; line jsonb; b jsonb; result jsonb; paid numeric; quantity_value integer; allocation_key text; revision jsonb;
begin
  for row_value in
    select review.item_id,line_value.value line,review.published_product_id product_id,
      nullif(line_value.value->>'variant_id','')::uuid variant_id
    from jsonb_array_elements(payload->'items') line_value
    join supplier_catalog_publication_reviews review on review.published_product_id=nullif(line_value.value->>'id','')::uuid
  loop
    line:=row_value.line;
    if coalesce((payload->>'shipping')::numeric,0)>0 and
      (payload->>'shippingCostConfirmed' is distinct from 'true' or nullif(payload->>'shippingCostUsd','') is null) then
      raise exception 'Costo directo del envío a confirmar';
    end if;
    select * into i from supplier_tracker_items where id=row_value.item_id;
    select * into p from store_profitability_profiles where product_id=row_value.product_id and variant_id is not distinct from row_value.variant_id;
    select * into o from supplier_offers where id=p.source_offer_id;
    if o.id is distinct from i.offer_id then
      select * into i from supplier_tracker_items where offer_id=o.id and product_id=p.product_id and variant_id is not distinct from p.variant_id;
    end if;
    d:=i.evidence->'lastResult';
    b:=p.basis;
    if p.id is null or i.id is null or not i.tracking_enabled or i.excluded or i.last_error is not null or
      d->>'availability' is distinct from 'in_stock' or nullif(d->>'commercialReview','') is not null or
      i.last_success_at is null or i.last_success_at<now()-interval '30 minutes' or
      not catalog_supplier_offer_valid_v1(o.id,now()) or not supplier_tracking_allowed_v1(i.supplier_id,i.product_id,i.variant_id,o.source_url) or
      (d->>'cost')::numeric is distinct from o.origin_cost or d->>'currency' is distinct from o.currency or
      o.origin_cost is distinct from (b->>'origin')::numeric or o.currency is distinct from b->>'currency' or o.source_url is distinct from b->>'supplierUrl' or
      (four_supplier_key_v1(o.source_url)='total' and coalesce(d->>'taxBasis','unknown')<>'included' and
        (length(coalesce(b->>'originTaxDocument',''))<10 or not exists(
          select 1 from jsonb_array_elements(b->'components') c where c->>'kind'='origin_tax' and c->>'group'='acquisition'))) then
      raise exception 'Disponibilidad o costo de origen a confirmar';
    end if;
    quantity_value:=(line->>'quantity')::integer;
    if quantity_value>coalesce((d->>'quantity')::integer,1) then raise exception 'Cantidad disponible a confirmar en origen'; end if;
    if fx.id is null then select * into fx from store_exchange_rates where id=rate_input; end if;
    if fx.id is null then raise exception 'Cotización de venta a confirmar'; end if;
    allocation_key:=p.product_id::text||':'||coalesce(p.variant_id::text,'');
    revision:=snapshot_input->'costVersions'->allocation_key;
    if revision is not null and revision is distinct from jsonb_build_object('revision',p.revision,'hash',md5(b::text)) then
      raise exception 'El costo cambió desde la cotización';
    end if;
    paid:=(line->>'price')::numeric*quantity_value-coalesce((payload->'discountAllocations'->>allocation_key)::numeric,0);
    result:=store_profitability_v2(jsonb_build_object(
      'channel',coalesce(line->>'channel','retail'),'paymentMethod',payload->>'payment','accountingBasis',b->>'accountingBasis',
      'vatPercent',b->'vatPercent','accountingConfirmed',b->'accountingConfirmed','publicArsPerUsd',fx.rate,
      'lines',jsonb_build_array(jsonb_build_object('quantity',quantity_value,'paidArs',paid,'cost',b))));
    if result->>'allowed' is distinct from 'true' then raise exception 'Contribución efectiva inferior al mínimo'; end if;
  end loop;
end $$;
revoke all on function public.tracker_catalog_purchase_v1(jsonb,uuid,jsonb) from public,anon,authenticated,service_role;

do $$
declare definition text; marker text:='select *into policy from store_profitability_policy where id for share;';
begin
  definition:=pg_get_functiondef('public.store_validate_profitability_v2(jsonb,uuid,jsonb)'::regprocedure);
  if position(marker in definition)=0 then raise exception 'Checkout profitability contract changed'; end if;
  execute replace(definition,marker,marker||' perform tracker_catalog_purchase_v1(payload_input,rate_input,snapshot_input);');
end $$;

create function public.tracker_checkout_items_v1(items_input jsonb)
returns table(id uuid,supplier_id uuid) language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
  if jsonb_typeof(items_input) is distinct from 'array' or jsonb_array_length(items_input) not between 1 and 50 then
    raise exception 'Invalid checkout items';
  end if;
  return query
  select i.id,i.supplier_id from jsonb_array_elements(items_input) x
  join store_profitability_profiles p on p.product_id=(x->>'productId')::uuid
    and p.variant_id is not distinct from nullif(x->>'variantId','')::uuid
  join supplier_tracker_items i on i.offer_id=p.source_offer_id
  join products product on product.id=i.product_id and product.is_active and product.deleted_at is null and product.supplier_archived_at is null
  where i.tracking_enabled and not i.excluded and (i.last_success_at is null or i.last_success_at<now()-interval '5 minutes')
    and exists(select 1 from supplier_catalog_publication_reviews r where r.published_product_id=p.product_id)
  order by i.last_success_at asc nulls first;
end $$;
revoke all on function public.tracker_checkout_items_v1(jsonb) from public,anon,authenticated;
grant execute on function public.tracker_checkout_items_v1(jsonb) to service_role;

-- Project an applied USD revision back into the existing ARS checkout cost
-- record in the same transaction. Preview leaves commercial amounts intact.
create function public.tracker_sync_catalog_checkout_cost_v1(offer_input uuid, repricing jsonb) returns void
language plpgsql set search_path=public,pg_temp as $$
declare o supplier_offers; b jsonb; details jsonb:=repricing->'proposal'; fx numeric;
  purchase_rate numeric; acquisition numeric; total numeric; fees numeric; paid numeric;
begin
  if repricing->>'status' is distinct from 'applied' then return; end if;
  select * into o from supplier_offers where id=offer_input;
  if not (o.evidence ? 'publicationReview') or o.variant_id is not null then return; end if;
  select basis into b from store_profitability_profiles where product_id=o.product_id and variant_id is null and source_offer_id=o.id;
  if b is null then raise exception 'Assisted publication cost profile missing'; end if;
  select rate into fx from store_exchange_rates where settings_version=(select version from store_money_settings where id)
    and expires_at>now() order by fetched_at desc,id desc limit 1;
  purchase_rate:=case b->>'settlementBasis' when 'ars_cash' then (b->>'acquisitionArsPerUsd')::numeric else fx end;
  acquisition:=(details->>'acquisitionUsd')::numeric*purchase_rate;
  total:=(details->>'totalCostUsd')::numeric*fx;
  paid:=(details->'results'->'retail:transferencia'->>'effectivePaidArs')::numeric;
  fees:=greatest((details->'results'->'retail:transferencia'->>'feesUsd')::numeric,
    (details->'results'->'retail:mercado_pago'->>'feesUsd')::numeric)*fx;
  update product_costs set origin_cost=o.origin_cost,currency=o.currency,exchange_rate=purchase_rate/(b->>'unitsPerUsd')::numeric,
    freight_per_unit=0,other_landed_cost=greatest(0,acquisition-o.origin_cost*purchase_rate/(b->>'unitsPerUsd')::numeric),
    variable_cost=greatest(0,total-acquisition),payment_fee_percent=ceil(fees/paid*1000000)/10000,
    verified_at=o.cost_checked_at,source_document=b->>'document',supplier_url=o.source_url
    where product_id=o.product_id and expenses_confirmed;
  if not found then raise exception 'Assisted publication legacy cost record missing'; end if;
end $$;
revoke all on function public.tracker_sync_catalog_checkout_cost_v1(uuid,jsonb) from public,anon,authenticated,service_role;

do $$
declare definition text; marker text;
begin
  definition:=pg_get_functiondef('public.record_supplier_observation_v1(jsonb)'::regprocedure);
  marker:='update supplier_offers set evidence=coalesce(p->''evidence'',evidence) where id=oid;';
  if position(marker in definition)=0 then raise exception 'Supplier evidence write contract changed'; end if;
  execute replace(definition,marker,$body$
   update supplier_offers set evidence=case when p->'evidence' is null then evidence
     else ((p->'evidence')-array['publicationReview','originTaxBasis','originTaxApprovedCost','originListingConflict'])||
       coalesce((select jsonb_object_agg(key,value) from jsonb_each(evidence)
         where key in ('publicationReview','originTaxBasis','originTaxApprovedCost','originListingConflict')),'{}') end
     where id=oid;
  $body$);
  definition:=pg_get_functiondef('public.tracker_reprice_offer_v1(uuid)'::regprocedure);
  marker:='if result->>''status''=''applied''then';
  if position(marker in definition)=0 then raise exception 'Tracker reprice contract changed'; end if;
  execute replace(definition,marker,marker||' perform tracker_sync_catalog_checkout_cost_v1(offer_input,result);');

  definition:=pg_get_functiondef('public.tracker_record_monitor_v1(uuid,uuid,jsonb)'::regprocedure);
  marker:='return jsonb_build_object(''itemId'',i.id';
  if position(marker in definition)=0 then raise exception 'Tracker monitor contract changed'; end if;
  execute replace(definition,marker,$body$
   if result_input->>'kind'='ok' and i.product_id is not null and i.variant_id is null and exists(
     select 1 from supplier_offers o join store_profitability_profiles p on p.source_offer_id=o.id
     where o.id=i.offer_id and o.evidence ? 'publicationReview' and p.product_id=i.product_id and p.variant_id is null
   ) then
     update products set supplier_available=coalesce(result_input->>'availability'='in_stock' and
        nullif(result_input->>'commercialReview','') is null,false),
       supplier_stock_status=case when nullif(result_input->>'commercialReview','') is not null then 'unknown'
         else coalesce(result_input->>'availability','unknown') end,
       supplier_last_checked_at=now(),updated_at=now()
       where id=i.product_id and fulfillment_mode='supplier';
   end if;
   $body$||marker);
end $$;

commit;
