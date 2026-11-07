begin;
-- Mirror the HTTP boundary for direct privileged RPC callers. Decode ASCII
-- percent escapes repeatedly, while retaining legitimate UTF-8 product paths.
create or replace function public.tracker_validate_url_v1(supplier_input uuid,url_input text)returns void language plpgsql stable security definer set search_path=public,pg_temp as $$
declare s suppliers;path_value text;escape_value text;decoded integer;passes integer:=0;begin
 select *into s from suppliers where id=supplier_input;
 if not found or not s.is_active or s.archived_at is not null or four_supplier_key_v1(s.website)is null or four_supplier_key_v1(url_input)is distinct from four_supplier_key_v1(s.website)
 or url_input is null or length(url_input)>2000 or url_input~'[\x00-\x20]'then raise exception 'URL or supplier not authorized';end if;
 path_value:=coalesce(substring(url_input from '^https://[^/]+(/[^?#]*)'),'/');
 loop
  if path_value~*'%(2f|5c|3f|23|0[0-9a-f]|1[0-9a-f]|7f)'then raise exception 'Ambiguous encoded path';end if;
  escape_value:=substring(path_value from '%[0-7][0-9A-Fa-f]');exit when escape_value is null;
  decoded:=get_byte(decode(substring(escape_value from 2),'hex'),0);
  path_value:=replace(path_value,escape_value,chr(decoded));passes:=passes+1;
  if passes>256 then raise exception 'Excessive encoded path';end if;
 end loop;
 if path_value~*'^/(api|admin|login|acesso|orcamento|carrinho|set-country)(/|$)'or path_value~'(^|/)\.{1,2}(/|$)'or position(chr(92)in path_value)>0 then raise exception 'Private or ambiguous supplier path';end if;
end$$;
-- One predicate shared by both queue generations. Manual review is not a worker.
create or replace function public.supplier_tracking_allowed_v1(supplier_input uuid,product_input uuid default null,variant_input uuid default null,url_input text default null)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from suppliers s where s.id=supplier_input and s.is_active and s.automation_authorized and s.monitor_enabled and s.archived_at is null and four_supplier_key_v1(s.website)is not null)
 and not exists(select 1 from products p where p.id=product_input and (p.deleted_at is not null or p.supplier_archived_at is not null))
 and not exists(select 1 from product_variants v where v.id=variant_input and v.supplier_archived_at is not null)
 and not exists(select 1 from supplier_tracker_items i where i.supplier_id=supplier_input
  and ((product_input is not null and i.product_id=product_input and i.variant_id is not distinct from variant_input)or i.url=url_input or i.evidence->>'nativeUrl'=url_input)
  and (not i.tracking_enabled or i.excluded))
 and not exists(select 1 from supplier_tracker_items i where i.supplier_id=supplier_input and(i.url=url_input or i.evidence->>'nativeUrl'=url_input or(product_input is not null and i.product_id=product_input and i.variant_id is not distinct from variant_input))
  and exists(select 1 from supplier_tracker_memberships m join supplier_tracker_sources s on s.id=m.source_id where m.item_id=i.id and not s.enabled)
  and not exists(select 1 from supplier_tracker_memberships m join supplier_tracker_sources s on s.id=m.source_id where m.item_id=i.id and s.enabled)
  and not exists(select 1 from supplier_tracker_sources s where s.supplier_id=i.supplier_id and s.kind='product'and s.url=i.url and s.enabled))
 and not exists(select 1 from supplier_tracker_sources s where s.supplier_id=supplier_input and s.kind='product'and s.url=url_input and not s.enabled
  and not exists(select 1 from supplier_tracker_items i join supplier_tracker_memberships m on m.item_id=i.id join supplier_tracker_sources a on a.id=m.source_id where i.supplier_id=supplier_input and i.url=url_input and a.enabled));
$$;
revoke all on function supplier_tracking_allowed_v1(uuid,uuid,uuid,text)from public,anon,authenticated;
grant execute on function supplier_tracking_allowed_v1(uuid,uuid,uuid,text)to service_role;

create or replace function public.refresh_supplier_availability_v1(product_input uuid)returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare eligible integer;known integer;available integer;v record;status_value text;result boolean:=false;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 if not exists(select 1 from supplier_tracking_settings where id and config->>'enabled'='true'and config->>'autoStock'='true')then return false;end if;
 for v in select null::uuid id union all select id from product_variants where product_id=product_input loop
  select count(*),count(*)filter(where o.verification='verified'and o.last_error is null and o.availability_checked_at between now()-make_interval(hours=>s.freshness_hours)and now()+interval '5 minutes'and o.availability in('in_stock','out_of_stock')),
   count(*)filter(where o.verification='verified'and o.last_error is null and o.availability_checked_at between now()-make_interval(hours=>s.freshness_hours)and now()+interval '5 minutes'and o.availability='in_stock')
  into eligible,known,available from supplier_offers o join suppliers s on s.id=o.supplier_id where o.product_id=product_input and o.variant_id is not distinct from v.id and o.archived_at is null
   and supplier_tracking_allowed_v1(s.id,product_input,v.id,o.source_url);
  status_value:=case when available>0 then 'in_stock'when eligible>0 and known=eligible then 'out_of_stock'else 'unknown'end;
  if v.id is null and not exists(select 1 from product_variants where product_id=product_input and is_active)then
   update products set supplier_available=available>0,supplier_last_checked_at=now(),supplier_stock_status=status_value,updated_at=now()where id=product_input and fulfillment_mode='supplier';
  elsif v.id is not null then update product_variants set supplier_available=available>0,updated_at=now()where id=v.id and fulfillment_mode='supplier';end if;
  result:=result or found;
 end loop;return result;
end$$;
revoke all on function refresh_supplier_availability_v1(uuid)from public,anon,authenticated;grant execute on function refresh_supplier_availability_v1(uuid)to service_role;

do $$
declare definition text;
begin
  if to_regprocedure('public.catalog_supplier_offer_valid_v1(uuid,timestamptz)') is not null then
    definition := pg_get_functiondef('public.refresh_supplier_availability_v1(uuid)'::regprocedure);
    execute replace(definition, 'and supplier_tracking_allowed_v1(s.id,product_input,v.id,o.source_url)',
      'and supplier_tracking_allowed_v1(s.id,product_input,v.id,o.source_url) and catalog_supplier_offer_valid_v1(o.id)');
  end if;
end;
$$;

-- Keep the historical claim implementation and its request-priority contract.
do $$declare definition text;marker text;begin
 definition:=pg_get_functiondef('public.claim_supplier_jobs_v1(integer)'::regprocedure);
 marker:='where s.is_active and s.automation_authorized and j.state';
 if position('supplier_tracking_allowed_v1'in definition)=0 then
  if position(marker in definition)=0 then raise exception 'Legacy claim contract changed';end if;
  execute replace(definition,marker,'where supplier_tracking_allowed_v1(s.id,j.product_id,j.variant_id,j.source_url) and j.state');
 end if;
 -- Fence workers that were already in flight when a pause or exclusion was saved.
 definition:=pg_get_functiondef('public.record_supplier_observation_v1(jsonb)'::regprocedure);
 marker:='sid:=(p->>''supplier_id'')::uuid;';
 if position('Tracking paused or source disabled'in definition)=0 then
  if position(marker in definition)=0 then raise exception 'Observation contract changed';end if;
  execute replace(definition,marker,marker||' if p->>''method''=''product_page''and not supplier_tracking_allowed_v1(sid,nullif(p->>''product_id'','''')::uuid,nullif(p->>''variant_id'','''')::uuid,p->>''source_url'')then raise exception ''Tracking paused or source disabled'';end if;');
 end if;
end$$;

-- A repeated payload is evidence, not proof that all navigation has been visited.
do $$declare definition text;start_at integer;end_at integer;marker text;begin
 definition:=pg_get_functiondef('public.tracker_record_page_v1(uuid,uuid,jsonb)'::regprocedure);
 marker:='if exists(select 1 from supplier_tracker_page_hashes';
 start_at:=position(marker in definition);
 if start_at>0 then
  end_at:=position('insert into supplier_tracker_page_hashes'in substring(definition from start_at));
  if end_at=0 then raise exception 'Page fingerprint contract changed';end if;
  definition:=substring(definition from 1 for start_at-1)||'if exists(select 1 from supplier_tracker_page_hashes where run_id=r.id and hash=page_input->>''contentHash'')then
   insert into supplier_tracker_events(supplier_id,task_id,run_id,kind,after_value)values(t.supplier_id,t.id,r.id,''repeated_page'',jsonb_build_object(''url'',t.url,''hash'',page_input->>''contentHash''));end if;
   '||substring(definition from start_at+end_at-1);
  definition:=replace(definition,'values(r.id,page_input->>''contentHash'',t.url);','values(r.id,page_input->>''contentHash'',t.url)on conflict(run_id,hash)do nothing;');
  execute definition;
 end if;
 -- Respect safety-limit edits on an existing category.
 definition:=pg_get_functiondef('public.tracker_save_source_v1(jsonb)'::regprocedure);
 if position('max_pages=excluded.max_pages'in definition)=0 then execute replace(definition,'label=excluded.label,','label=excluded.label,max_pages=excluded.max_pages,max_items=excluded.max_items,');end if;
end$$;

-- Recheck the shared pause policy at claim and at both private/commercial commits.
do $$declare definition text;name text;begin
 foreach name in array array['tracker_record_page_v1(uuid,uuid,jsonb)','tracker_record_monitor_v1(uuid,uuid,jsonb)']loop
  definition:=pg_get_functiondef(('public.'||name)::regprocedure);
  if position('Provider monitoring paused'in definition)=0 then execute replace(definition,'perform tracker_validate_url_v1(t.supplier_id,t.url);','perform tracker_validate_url_v1(t.supplier_id,t.url);if not supplier_tracking_allowed_v1(t.supplier_id)then raise exception ''Provider monitoring paused'';end if;');end if;
 end loop;
 definition:=pg_get_functiondef('public.tracker_claim_tasks_v1(integer)'::regprocedure);
 definition:=replace(definition,'(t.source_id is null or s.enabled)','((t.kind=''monitor''and supplier_tracking_allowed_v1(t.supplier_id,i.product_id,i.variant_id,t.url))or(t.kind=''discover''and s.enabled))');execute definition;
 definition:=pg_get_functiondef('public.tracker_commit_observation_v1(uuid,uuid,jsonb,jsonb)'::regprocedure);
 definition:=replace(definition,'(t.source_id is not null and not exists(select 1 from supplier_tracker_sources where id=t.source_id and enabled))',' not supplier_tracking_allowed_v1(t.supplier_id,i.product_id,i.variant_id,t.url)');execute definition;
end$$;

-- Source enablement is checked by both acquisition checkout and monitor writes.
do $$declare definition text;marker text;begin
 definition:=pg_get_functiondef('public.supplier_checkout_basis_v1(uuid,uuid,numeric,numeric)'::regprocedure);
 marker:='select * into s from suppliers where id=o.supplier_id;';
 if position('Supplier monitoring or source paused'in definition)=0 then
  if position(marker in definition)=0 then raise exception 'Supply checkout contract changed';end if;
  execute replace(definition,marker,marker||' if not supplier_tracking_allowed_v1(s.id,product_input,variant_input,o.source_url)then raise exception ''Supplier monitoring or source paused'';end if;');
 end if;
end$$;
-- Known advisory findings; preserve bodies, signatures, privileges and volatility.
do $$declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public'and p.proname in('set_updated_at','get_order_by_tracking')loop
  execute format('alter function %s set search_path=public,pg_temp',f.signature);
 end loop;
end$$;
commit;
