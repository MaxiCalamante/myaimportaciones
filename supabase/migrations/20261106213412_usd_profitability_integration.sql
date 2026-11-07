begin;
-- Retire alternative automatic ARS writers at the common transaction boundary.
-- Availability, physical stock, historical orders and unchanged amounts pass.
create or replace function public.store_fence_legacy_prices_v2()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if coalesce(current_setting('role',true),'')='service_role'and(new.retail_price is distinct from old.retail_price or new.wholesale_price is distinct from old.wholesale_price)then
  raise exception 'Legacy automatic prices require USD profitability review';
 end if;return new;
end$$;
drop trigger if exists profitability_legacy_service_guard on products;
create trigger profitability_legacy_service_guard before update of retail_price,wholesale_price on products for each row execute function store_fence_legacy_prices_v2();
drop trigger if exists profitability_legacy_service_guard on product_variants;
create trigger profitability_legacy_service_guard before update of retail_price,wholesale_price on product_variants for each row execute function store_fence_legacy_prices_v2();
revoke all on function store_fence_legacy_prices_v2()from public,anon,authenticated,service_role;
-- Admin-only configuration. Saving a proposal never enables checkout enforcement.
create or replace function public.store_profitability_workspace_v2()returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 return jsonb_build_object('policy',(select to_jsonb(p)from store_profitability_policy p where id),'profiles',coalesce((select jsonb_agg(to_jsonb(p))from store_profitability_profiles p),'[]'));
end$$;
create or replace function public.save_store_profitability_policy_v2(p jsonb,note_input text)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare old_value jsonb;begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 if length(trim(note_input))<10 or note_input is null then raise exception 'Documented reason required';end if;
 select to_jsonb(s)into old_value from store_profitability_policy s where id for update;
 update store_profitability_policy set retail_target=(p->>'retailTarget')::numeric,wholesale_target=(p->>'wholesaleTarget')::numeric,
 minimum_margin=(p->>'minimumMargin')::numeric,usd_step=(p->>'usdStep')::numeric,cost_max_age_seconds=(p->>'costMaxAgeSeconds')::integer,
 methods=p->'methods',version=version+1,updated_at=now(),actor=auth.uid()where id;
 insert into store_money_audit(action,detail)values('profitability_policy_proposal',jsonb_build_object('before',old_value,'proposal',p,'reason',note_input,'actor',auth.uid()));
end$$;
create or replace function public.save_store_profitability_profile_v2(product_input uuid,variant_input uuid,basis_input jsonb,revision_input integer,note_input text)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare old_value store_profitability_profiles;linked supplier_offers;begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 if note_input is null or length(trim(note_input))<10 then raise exception 'Documented reason required';end if;
 perform 1 from products where id=product_input for update;if not found then raise exception 'Product missing';end if;
 if variant_input is not null and not exists(select 1 from product_variants where id=variant_input and product_id=product_input)then raise exception 'Variant identity mismatch';end if;
 select *into old_value from store_profitability_profiles where product_id=product_input and variant_id is not distinct from variant_input for update;
 if coalesce(old_value.revision,0)<>revision_input then raise exception 'Cost changed concurrently';end if;
 perform store_acquisition_cost_v2(basis_input);
 if nullif(basis_input->>'offerId','')is not null then
  select *into linked from supplier_offers where id=(basis_input->>'offerId')::uuid;
  if linked.id is null or linked.product_id is distinct from product_input or linked.variant_id is distinct from variant_input
   or linked.source_url is distinct from basis_input->>'supplierUrl'or linked.currency is distinct from basis_input->>'currency'
   or linked.origin_cost is distinct from(basis_input->>'origin')::numeric then raise exception 'Cost offer must match exact product and variant';end if;
 end if;
 insert into store_profitability_profiles(product_id,variant_id,basis,source_offer_id,revision,actor)values(product_input,variant_input,basis_input,nullif(basis_input->>'offerId','')::uuid,revision_input+1,auth.uid())
 on conflict(product_id,(coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid)))do update set basis=excluded.basis,source_offer_id=excluded.source_offer_id,revision=excluded.revision,updated_at=now(),actor=auth.uid();
 insert into store_money_audit(action,detail)values('profitability_cost_review',jsonb_build_object('before',to_jsonb(old_value),'basis',basis_input,'productId',product_input,'variantId',variant_input,'reason',note_input,'actor',auth.uid()));
end$$;
create or replace function public.save_store_offer_profitability_v2(offer_input uuid,basis_input jsonb,revision_input integer,note_input text)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare o supplier_offers;current_revision integer;begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 if note_input is null or length(trim(note_input))<10 then raise exception 'Documented reason required';end if;
 select *into o from supplier_offers where id=offer_input;
 if o.id is null or o.product_id is null then raise exception 'Exact linked supplier identity required';end if;
 perform 1 from products where id=o.product_id for update;
 select revision into current_revision from store_profitability_offer_costs where offer_id=offer_input for update;
 if coalesce(current_revision,0)is distinct from revision_input then raise exception 'Offer cost changed concurrently';end if;
 if basis_input->>'supplierUrl'is distinct from o.source_url or basis_input->>'currency'is distinct from o.currency
  or(basis_input->>'origin')::numeric is distinct from o.origin_cost then raise exception 'Exact offer evidence differs';end if;
 perform store_acquisition_cost_v2(basis_input);
 insert into store_profitability_offer_costs(offer_id,basis,revision,actor)values(offer_input,basis_input,revision_input+1,auth.uid())
 on conflict(offer_id)do update set basis=excluded.basis,revision=excluded.revision,updated_at=now(),actor=auth.uid();
 insert into store_money_audit(action,detail)values('profitability_offer_cost_review',jsonb_build_object('offerId',offer_input,'basis',basis_input,'reason',note_input));
end$$;

-- Reuse the existing comparison UI. Incomplete alternatives remain visible with
-- a reason; no listing price, zero fee or positive-only contribution qualifies.
do $$begin if to_regclass('public.product_supplier_preferences')is not null then execute $sql$
create or replace function public.tracker_alternatives_v1(product_input uuid,variant_input uuid default null)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $body$
declare o record;b jsonb;u product_usd_prices;r store_exchange_rates;cost numeric;contribution numeric;reason text;eligible boolean;rows jsonb:='[]';recommended uuid;payment text;channel text;result jsonb;tracking boolean;
begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 select *into u from product_usd_prices where product_id=product_input and variant_id is not distinct from variant_input;
 select *into r from store_exchange_rates where expires_at>now()and settings_version=(select version from store_money_settings where id)order by fetched_at desc,id desc limit 1;
 for o in select so.*,s.name supplier_name,s.freshness_hours from supplier_offers so join suppliers s on s.id=so.supplier_id
  where so.product_id=product_input and so.variant_id is not distinct from variant_input and s.is_active loop
  cost:=null;contribution:=null;reason:=null;eligible:=false;
  begin
   if to_regprocedure('public.supplier_tracking_allowed_v1(uuid,uuid,uuid,text)')is not null then execute 'select supplier_tracking_allowed_v1($1,$2,$3,$4)'into tracking using o.supplier_id,product_input,variant_input,o.source_url;if not tracking then raise exception 'Supplier or source paused';end if;end if;
   if to_jsonb(o)->>'archived_at'is not null or o.evidence->>'costScope'='supplier_quote_inclusions_unconfirmed'then raise exception 'Supplier offer archived or charges unconfirmed';end if;
   if o.verification is distinct from 'verified'or o.availability is distinct from 'in_stock'or o.last_error is not null
    or o.cost_checked_at is null or o.availability_checked_at is null or least(o.cost_checked_at,o.availability_checked_at)<now()-make_interval(hours=>o.freshness_hours)
    or greatest(o.cost_checked_at,o.availability_checked_at)>now()+interval '5 minutes'or r.id is null or u.id is null then raise exception 'Exact availability, cost and public FX required';end if;
   select basis into b from store_profitability_offer_costs where offer_id=o.id;
   if b is null then select basis into b from store_profitability_profiles where product_id=product_input and variant_id is not distinct from variant_input and source_offer_id=o.id;end if;
   if b is null or b->>'supplierUrl'is distinct from o.source_url or b->>'currency'is distinct from o.currency
    or(b->>'origin')::numeric is distinct from o.origin_cost then raise exception 'Reviewed landed cost for this exact supplier required';end if;
   cost:=store_acquisition_cost_v2(b);
   foreach payment in array array['transferencia','mercado_pago']loop foreach channel in array array['retail','wholesale']loop
    if channel='wholesale'and u.wholesale_usd is null then continue;end if;
    result:=store_profitability_v2(jsonb_build_object('channel',channel,'paymentMethod',payment,'accountingBasis',b->>'accountingBasis','vatPercent',b->'vatPercent','accountingConfirmed',b->'accountingConfirmed','publicArsPerUsd',r.rate,
     'lines',jsonb_build_array(jsonb_build_object('quantity',1,'unitUsd',case when channel='retail'then u.retail_usd else u.wholesale_usd end,'cost',b))));
    cost:=(result->>'acquisitionAndSaleCostUsd')::numeric;contribution:=least(contribution,(result->>'contributionUsd')::numeric);
    if result->>'allowed'is distinct from 'true'then raise exception 'Effective margin below 10 percent for an enabled channel or payment';end if;
   end loop;end loop;eligible:=true;
  exception when others then reason:=sqlerrm;end;
  rows:=rows||jsonb_build_array(jsonb_build_object('offerId',o.id,'supplierName',o.supplier_name,'url',o.source_url,'origin',o.origin_cost,'currency',o.currency,'availability',o.availability,'checkedAt',least(o.cost_checked_at,o.availability_checked_at),'totalUsd',cost,'contributionUsd',contribution,'eligible',eligible,'reason',reason));
 end loop;
 select(value->>'offerId')::uuid into recommended from jsonb_array_elements(rows)where(value->>'eligible')::boolean order by(value->>'totalUsd')::numeric,(value->>'checkedAt')::timestamptz desc limit 1;
 return jsonb_build_object('offers',rows,'recommended',recommended,'preferred',(select offer_id from product_supplier_preferences where product_id=product_input and variant_id is not distinct from variant_input));
end$body$;$sql$;execute 'revoke all on function tracker_alternatives_v1(uuid,uuid)from public,anon,service_role';execute 'grant execute on function tracker_alternatives_v1(uuid,uuid)to authenticated';end if;end$$;

-- Reconstruct from private profiles and trusted server prices, never browser cost/fee inputs.
create or replace function public.store_validate_profitability_v2(payload_input jsonb,rate_input uuid,snapshot_input jsonb default null)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare policy store_profitability_policy;r store_exchange_rates;l jsonb;profile store_profitability_profiles;o supplier_offers;s suppliers;
 lines jsonb:='[]';versions jsonb:='{}';result jsonb;answer jsonb;b jsonb;discount numeric;paid numeric;key_value text;
 subtotal numeric;accounting text;vat text;shipping_cost numeric:=0;fulfillment text;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 select *into policy from store_profitability_policy where id for share;
 begin
  select *into r from store_exchange_rates where id=rate_input;
  if r.id is null or(snapshot_input is null and r.expires_at<now())then raise exception 'Exchange rate expired or missing';end if;
  if snapshot_input is not null and(snapshot_input->>'policyVersion')::integer is distinct from policy.version then raise exception 'Payment or margin policy changed; quote again';end if;
  subtotal:=(payload_input->>'subtotal')::numeric;
  if subtotal is null or subtotal<=0 then raise exception 'Invalid checkout subtotal';end if;
  if jsonb_typeof(payload_input->'items')is distinct from 'array'or jsonb_array_length(payload_input->'items')not between 1 and 50 then raise exception 'Invalid checkout items';end if;
  for l in select value from jsonb_array_elements(payload_input->'items')loop
   key_value:=(l->>'id')||':'||coalesce(l->>'variant_id','');
   select *into profile from store_profitability_profiles where product_id=(l->>'id')::uuid and variant_id is not distinct from nullif(l->>'variant_id','')::uuid for share;
   if not found then raise exception 'Exact verified cost profile missing';end if;
   b:=profile.basis;
   if nullif(l->>'variant_id','')is null then select fulfillment_mode into fulfillment from products where id=profile.product_id;
   else select fulfillment_mode into fulfillment from product_variants where id=profile.variant_id and product_id=profile.product_id;end if;
   if fulfillment='supplier'and profile.source_offer_id is null then raise exception 'Exact supplying offer required for supplier fulfillment';end if;
   versions:=versions||jsonb_build_object(key_value,jsonb_build_object('revision',profile.revision,'hash',md5(b::text)));
   if snapshot_input is not null and snapshot_input->'costVersions'->key_value is distinct from versions->key_value then raise exception 'Cost changed since quote; review again';end if;
   if accounting is not null and accounting is distinct from b->>'accountingBasis'then raise exception 'Mixed accounting bases require review';end if;
   accounting:=b->>'accountingBasis';vat:=b->>'vatPercent';
   if profile.source_offer_id is not null then
    select *into o from supplier_offers where id=profile.source_offer_id for share;
    select *into s from suppliers where id=o.supplier_id for share;
    if s.id is null or not s.is_active or o.product_id is distinct from profile.product_id or o.variant_id is distinct from profile.variant_id
     or o.source_url is distinct from b->>'supplierUrl'or o.verification is distinct from 'verified'or o.availability is distinct from 'in_stock'or o.last_error is not null
     or o.cost_checked_at is null or o.availability_checked_at is null or o.cost_checked_at<now()-make_interval(hours=>s.freshness_hours)
     or o.availability_checked_at<now()-make_interval(hours=>s.freshness_hours)or o.cost_checked_at>now()+interval '5 minutes'or o.availability_checked_at>now()+interval '5 minutes'
     or o.origin_cost is distinct from(b->>'origin')::numeric or o.currency is distinct from b->>'currency'
    then raise exception 'Supplier identity, availability or cost changed';end if;
   end if;
   -- An explicitly allocated discount is required. A global discount must never
   -- accidentally affect excluded products or a separately payable shipment.
   discount:=(payload_input->'discountAllocations'->>key_value)::numeric;
   if discount is null then
    if coalesce((payload_input->>'discount')::numeric,0)<>0 then raise exception 'Explicit discount allocations required';end if;discount:=0;
   end if;
   paid:=(l->>'price')::numeric*(l->>'quantity')::integer-discount;
   if discount<0 or paid<=0 then raise exception 'Invalid effective line price';end if;
   lines:=lines||jsonb_build_array(jsonb_build_object('key',key_value,'quantity',l->'quantity','unitUsd',null,'paidArs',paid,'cost',b));
  end loop;
  if(select sum(value::numeric)from jsonb_each_text(coalesce(payload_input->'discountAllocations','{}')))is distinct from coalesce((payload_input->>'discount')::numeric,0)
   and coalesce((payload_input->>'discount')::numeric,0)<>0 then raise exception 'Discount allocation total differs';end if;
  if coalesce((payload_input->>'shipping')::numeric,0)>0 then
   if payload_input->>'shippingCostConfirmed'is distinct from 'true'or(payload_input->>'shippingCostUsd')is null then raise exception 'Shipping direct cost not confirmed';end if;
   shipping_cost:=(payload_input->>'shippingCostUsd')::numeric;
  end if;
  result:=store_profitability_v2(jsonb_build_object('channel',case when exists(select 1 from jsonb_array_elements(payload_input->'items')x where x->>'channel'='wholesale')then 'wholesale'else 'retail'end,
   'paymentMethod',payload_input->>'payment','accountingBasis',accounting,'vatPercent',vat,'accountingConfirmed',true,'publicArsPerUsd',r.rate,'arsStep',.01,
   'fixedSaleUsd',shipping_cost,'shippingCollectedArs',coalesce((payload_input->>'shipping')::numeric,0),'lines',lines));
  if result->>'allowed'is distinct from 'true'then raise exception 'Effective contribution below 10 percent floor';end if;
  answer:=jsonb_build_object('state','validated','allowed',true,'policyVersion',policy.version,'costVersions',versions,'result',result);
 exception when others then
  if policy.enforcement='enforce'then raise;end if;
  answer:=jsonb_build_object('state','review','allowed',false,'reason',sqlerrm,'policyVersion',policy.version,'costVersions',versions);
 end;
 return answer||jsonb_build_object('enforcement',policy.enforcement);
end$$;

-- Replace the legacy automatic formula with the same engine used by previews and
-- checkout. Preview never mutates a commercial amount, including a manual amount.
create or replace function public.store_refresh_supplier_usd_v1(offer_input uuid)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o supplier_offers;u product_usd_prices;profile store_profitability_profiles;policy store_profitability_policy;r store_exchange_rates;
 b jsonb;channel text;payment text;calculation jsonb;results jsonb:='{}';retail numeric:=0;wholesale numeric:=0;cost numeric;price numeric;
 snapshot jsonb;safe boolean:=true;allowed_source boolean;retail_effective numeric;wholesale_effective numeric;floor_value numeric:=0;total_cost numeric;reprice boolean;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 select *into o from supplier_offers where id=offer_input;if not found then return jsonb_build_object('status','missing');end if;
 perform 1 from products where id=o.product_id for update;
 select *into o from supplier_offers where id=offer_input for share;
 select *into u from product_usd_prices where product_id=o.product_id and variant_id is not distinct from o.variant_id for update;
 select *into profile from store_profitability_profiles where product_id=o.product_id and variant_id is not distinct from o.variant_id for update;
 select *into policy from store_profitability_policy where id for share;
 begin
  if u.id is null or profile.id is null then raise exception 'Exact verified USD cost profile required';end if;
  if to_regprocedure('public.catalog_supplier_offer_valid_v1(uuid,timestamptz)') is not null then
   if not catalog_supplier_offer_valid_v1(o.id, now()) then raise exception 'Supplier identity is outside the approved catalogue'; end if;
  end if;
  b:=profile.basis;
  if profile.source_offer_id is distinct from o.id or b->>'currency'is distinct from o.currency or b->>'supplierUrl'is distinct from o.source_url then raise exception 'Supplier change requires exact landed-cost review';end if;
  if o.verification is distinct from 'verified'or o.availability is distinct from 'in_stock'or o.last_error is not null
   or o.origin_cost is null or o.origin_cost<=0 or o.cost_checked_at is null or o.availability_checked_at is null
   or o.cost_checked_at not between now()-interval '24 hours'and now()+interval '5 minutes'
   or o.availability_checked_at not between now()-interval '24 hours'and now()+interval '5 minutes'
   or not exists(select 1 from suppliers where id=o.supplier_id and is_active)
   or coalesce(o.evidence->>'costScope','')='supplier_quote_inclusions_unconfirmed'then raise exception 'Supplier evidence unknown, incomplete or stale';end if;
  if to_regprocedure('public.supplier_tracking_allowed_v1(uuid,uuid,uuid,text)')is not null then
   execute 'select supplier_tracking_allowed_v1($1,$2,$3,$4)'into allowed_source using o.supplier_id,o.product_id,o.variant_id,o.source_url;
   if not allowed_source then raise exception 'Supplier or source paused';end if;
  end if;
  select *into r from store_exchange_rates where settings_version=(select version from store_money_settings where id)and expires_at>now()order by fetched_at desc,id desc limit 1;
  if r.id is null then raise exception 'Current public FX required for ARS validation';end if;
  b:=b||jsonb_build_object('origin',o.origin_cost::text,'checkedAt',o.cost_checked_at);
  reprice:=u.profitability_snapshot->>'costBasisHash'is distinct from md5((b-'checkedAt')::text)
   or(u.profitability_snapshot->>'policyVersion')::integer is distinct from policy.version;
  cost:=store_acquisition_cost_v2(b);
  foreach channel in array array['retail','wholesale']loop
   foreach payment in array array['transferencia','mercado_pago']loop
    calculation:=store_profitability_v2(jsonb_build_object('channel',channel,'paymentMethod',payment,'accountingBasis',b->>'accountingBasis','vatPercent',b->'vatPercent','accountingConfirmed',b->'accountingConfirmed','publicArsPerUsd',r.rate,'arsStep',(select round_ars from store_money_settings where id),
     'lines',jsonb_build_array(jsonb_build_object('key',u.id,'quantity',1,'unitUsd',case when channel='retail'then u.retail_usd else u.wholesale_usd end,'cost',b))));
    results:=results||jsonb_build_object(channel||':'||payment,calculation);
    if channel='retail'then retail:=greatest(retail,(calculation->>'automaticTotalUsd')::numeric);
     if u.retail_source='manual'and calculation->>'allowed'is distinct from 'true'then safe:=false;end if;
    else wholesale:=greatest(wholesale,(calculation->>'automaticTotalUsd')::numeric);
     if u.wholesale_source='manual'and u.wholesale_usd is not null and calculation->>'allowed'is distinct from 'true'then safe:=false;end if;
    end if;
   end loop;
  end loop;
  retail:=case when u.retail_source='manual'or not reprice then u.retail_usd else retail end;
  wholesale:=case when u.wholesale_source='manual'or not reprice then u.wholesale_usd else wholesale end;
  foreach channel in array array['retail','wholesale']loop
   foreach payment in array array['transferencia','mercado_pago']loop
    price:=case when channel='retail'then retail else wholesale end;
    calculation:=store_profitability_v2(jsonb_build_object('channel',channel,'paymentMethod',payment,'accountingBasis',b->>'accountingBasis','vatPercent',b->'vatPercent','accountingConfirmed',b->'accountingConfirmed','publicArsPerUsd',r.rate,'arsStep',(select round_ars from store_money_settings where id),
     'lines',jsonb_build_array(jsonb_build_object('key',u.id,'quantity',1,'unitUsd',price,'cost',b))));
    results:=results||jsonb_build_object(channel||':'||payment,calculation);
    floor_value:=greatest(floor_value,(calculation->>'minimumTotalUsd')::numeric);total_cost:=(calculation->>'acquisitionAndSaleCostUsd')::numeric;
    if channel='retail'then retail_effective:=least(retail_effective,(calculation->>'effectiveMargin')::numeric);
    else wholesale_effective:=least(wholesale_effective,(calculation->>'effectiveMargin')::numeric);end if;
    if price is not null and calculation->>'allowed'is distinct from 'true'then safe:=false;end if;
   end loop;
  end loop;
  snapshot:=jsonb_build_object('results',results,'retailUsd',retail::text,'wholesaleUsd',wholesale::text,'acquisitionUsd',cost::text,'totalCostUsd',total_cost::text,'manualSafe',safe,'offerId',o.id,'policyVersion',policy.version,'costBasisHash',md5((b-'checkedAt')::text));
  if policy.enforcement='preview'then return jsonb_build_object('status','proposal','proposal',snapshot);end if;
  -- New evidence remains private even when a manual price fails. It is not
  -- converted into a safe price by retaining an obsolete cost revision.
  update store_profitability_profiles set basis=b,revision=revision+1,updated_at=now()where id=profile.id;
  if not safe then
   update product_usd_prices set state='review',profitability_snapshot=snapshot,revision=revision+1 where id=u.id;
   insert into store_money_audit(action,detail)values('profitability_manual_alert',snapshot);
   return jsonb_build_object('status','review','reason','Stored price below floor; review costs or public FX','proposal',snapshot);
  end if;
  if abs(retail/u.retail_usd-1)*100>(select max_change from store_money_settings where id)
   or(u.wholesale_usd>0 and abs(wholesale/u.wholesale_usd-1)*100>(select max_change from store_money_settings where id))then
   update product_usd_prices set state='review',profitability_snapshot=snapshot,revision=revision+1 where id=u.id;
   return jsonb_build_object('status','review','reason','Commercial change limit exceeded','proposal',snapshot);
  end if;
  update product_usd_prices set retail_usd=retail,wholesale_usd=wholesale,total_cost_usd=total_cost,acquisition_cost_usd=cost,minimum_commercial_usd=floor_value,
   effective_retail_margin=retail_effective,effective_wholesale_margin=wholesale_effective,cost_status='COSTO_VERIFICADO',cost_source=b->>'document',
   costs_updated_at=o.cost_checked_at,updated_at=now(),revision=revision+1,profitability_snapshot=snapshot,state='active'where id=u.id;
  insert into store_money_audit(action,detail)values('profitability_supplier_update',jsonb_build_object('before',to_jsonb(u),'after',snapshot));
  return jsonb_build_object('status','applied','proposal',snapshot);
 exception when others then
  insert into store_money_audit(action,detail)values('profitability_supplier_review',jsonb_build_object('offerId',o.id,'reason',sqlerrm));
  return jsonb_build_object('status','review','reason',sqlerrm);
 end;
end$$;

-- Supersede the historical "preserve margin" worker at its transaction boundary.
-- It cannot continue adjusting ARS with another formula after this policy exists.
do $$begin
 if to_regprocedure('public.apply_supplier_margin_price_v1(jsonb)')is not null then
  execute $sql$create or replace function public.apply_supplier_margin_price_v1(p jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $body$
   begin if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
   return store_refresh_supplier_usd_v1((p->>'offerId')::uuid);end$body$;$sql$;
 end if;
end$$;

-- Manual values may be retained for review, but an unverified cost cannot be
-- marked as a definitive automatic price by the editor either.
create or replace function public.store_review_product_prices_v2(product_input uuid,variant_input uuid,prices_input jsonb,payment_input text default null)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare profile store_profitability_profiles;o supplier_offers;s suppliers;r store_exchange_rates;channel text;payment text;payments text[];
 result jsonb;results jsonb:='{}';safe boolean:=true;reason text;unit numeric;tracking boolean;begin
 if coalesce(current_setting('role',true),'')<>'service_role'and not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 begin
  select *into profile from store_profitability_profiles where product_id=product_input and variant_id is not distinct from variant_input;
  if profile.id is null then raise exception 'Exact verified cost profile missing';end if;
  if profile.source_offer_id is not null then
   select *into o from supplier_offers where id=profile.source_offer_id;select *into s from suppliers where id=o.supplier_id;
   if o.id is null or not coalesce(s.is_active,false)or o.product_id is distinct from product_input or o.variant_id is distinct from variant_input
    or o.origin_cost is distinct from(profile.basis->>'origin')::numeric or o.currency is distinct from profile.basis->>'currency'or o.source_url is distinct from profile.basis->>'supplierUrl'
    or o.verification is distinct from 'verified'or o.availability is distinct from 'in_stock'or o.last_error is not null
    or not coalesce(o.cost_checked_at between now()-make_interval(hours=>s.freshness_hours)and now()+interval '5 minutes',false)
    or not coalesce(o.availability_checked_at between now()-make_interval(hours=>s.freshness_hours)and now()+interval '5 minutes',false)then raise exception 'Supplier cost or availability changed; review profile';end if;
   if to_regprocedure('public.supplier_tracking_allowed_v1(uuid,uuid,uuid,text)')is not null then execute 'select supplier_tracking_allowed_v1($1,$2,$3,$4)'into tracking using o.supplier_id,product_input,variant_input,o.source_url;if not tracking then raise exception 'Supplier or source paused';end if;end if;
  elsif (case when variant_input is null then(select fulfillment_mode from products where id=product_input)else(select fulfillment_mode from product_variants where id=variant_input)end)='supplier'then raise exception 'Supplying offer required';end if;
  select *into r from store_exchange_rates where expires_at>now()and settings_version=(select version from store_money_settings where id)order by fetched_at desc,id desc limit 1;
  if r.id is null then raise exception 'Current public FX required';end if;
  if payment_input is not null and payment_input not in('transferencia','mercado_pago')then raise exception 'Invalid payment method';end if;
  payments:=case when payment_input is null then array['transferencia','mercado_pago']else array[payment_input]end;
  foreach channel in array array['retail','wholesale']loop
   unit:=nullif(prices_input->>(channel||'Usd'),'')::numeric;
   if channel='wholesale'and unit is null and prices_input->>'wholesaleSource'is distinct from 'automatic'then continue;end if;
   foreach payment in array payments loop
    result:=store_profitability_v2(jsonb_build_object('channel',channel,'paymentMethod',payment,'accountingBasis',profile.basis->>'accountingBasis','vatPercent',profile.basis->'vatPercent','accountingConfirmed',profile.basis->'accountingConfirmed','publicArsPerUsd',r.rate,'arsStep',(select round_ars from store_money_settings where id),
     'lines',jsonb_build_array(jsonb_build_object('quantity',1,'unitUsd',unit,'cost',profile.basis))));
    results:=results||jsonb_build_object(channel||':'||payment,result);
    if result->>'allowed'is distinct from 'true'or(prices_input->>(channel||'Source')='automatic'and(result->>'effectiveMargin')::numeric<(result->>'targetMargin')::numeric)then safe:=false;reason:='Price below required contribution';end if;
   end loop;
  end loop;
 exception when others then safe:=false;reason:=sqlerrm;end;
 return jsonb_build_object('state',case when safe then 'validated'else 'review'end,'allowed',safe,'reason',reason,'results',results);
end$$;
do $$declare definition text;marker text;begin
 definition:=pg_get_functiondef('public.save_product_usd_v1(uuid,uuid,jsonb,text)'::regprocedure);
 marker:='insert into product_usd_prices(product_id,variant_id,retail_usd';
 if position('store_review_product_prices_v2'in definition)=0 then
  if position(marker in definition)=0 then raise exception 'USD editor contract changed';end if;
  definition:=replace(definition,'declare old_row product_usd_prices;','declare old_row product_usd_prices;profit_review jsonb;');
  definition:=replace(definition,marker,'profit_review:=store_review_product_prices_v2(product_input,variant_input,prices_input,null);if(prices_input->>''retailSource''=''automatic''or prices_input->>''wholesaleSource''=''automatic'')and profit_review->>''allowed''is distinct from ''true''then raise exception ''Automatic price requires verified profitability: %'',profit_review->>''reason'';end if;'||marker);
  marker:='insert into store_money_audit(action,detail)values(''product_usd'',';
  if position(marker in definition)=0 then raise exception 'USD editor audit contract changed';end if;
  definition:=replace(definition,marker,'update product_usd_prices set state=case when profit_review->>''allowed''=''true''then ''active''else ''review''end,profitability_snapshot=profit_review where product_id=product_input and variant_id is not distinct from variant_input;'||marker);execute definition;
 end if;
end$$;

-- The old per-unit, payment-agnostic floor remains only for legacy profiles.
-- V2 profiles are checked once the complete paid basket and method are known.
do $$declare definition text;marker text;begin
 definition:=pg_get_functiondef('public.store_usd_floor_v1(uuid,uuid,numeric)'::regprocedure);
 marker:='select *into p from product_usd_prices where product_id=product_input';
 if position('store_profitability_profiles'in definition)=0 then
  if position(marker in definition)=0 then raise exception 'Legacy floor contract changed';end if;
  execute replace(definition,marker,'if exists(select 1 from store_profitability_profiles where product_id=product_input and variant_id is not distinct from variant_input)then return;end if;'||marker);
 end if;
end$$;

-- Also guard direct RPC reservations. No already accepted order is recalculated.
do $$declare definition text;marker text;begin
 definition:=pg_get_functiondef('public.create_store_order_v1(uuid,text,jsonb)'::regprocedure);
 marker:='if exists(select 1 from jsonb_array_elements(q.payload->''items'')x where x->>''channel''=''wholesale'')then';
 if position('store_validate_profitability_v2'in definition)=0 then
  if position(marker in definition)=0 then raise exception 'Order reservation contract changed';end if;
  execute replace(definition,marker,'perform store_validate_profitability_v2(q.payload,q.rate_id,q.profitability_snapshot);'||marker);
 end if;
end$$;
revoke all on function store_review_product_prices_v2(uuid,uuid,jsonb,text),store_profitability_workspace_v2(),save_store_profitability_policy_v2(jsonb,text),save_store_profitability_profile_v2(uuid,uuid,jsonb,integer,text),save_store_offer_profitability_v2(uuid,jsonb,integer,text),store_validate_profitability_v2(jsonb,uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function store_review_product_prices_v2(uuid,uuid,jsonb,text)to authenticated;
grant execute on function store_profitability_workspace_v2(),save_store_profitability_policy_v2(jsonb,text),save_store_profitability_profile_v2(uuid,uuid,jsonb,integer,text),save_store_offer_profitability_v2(uuid,jsonb,integer,text)to authenticated;
grant execute on function store_validate_profitability_v2(jsonb,uuid,jsonb)to service_role;
commit;
