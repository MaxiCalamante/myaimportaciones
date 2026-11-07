begin;
-- Reuse the existing one-use ticket transport. Enable the cron only with the compatible worker.
alter table supplier_cloud_ticks drop constraint supplier_cloud_ticks_job_check;
alter table supplier_cloud_ticks add constraint supplier_cloud_ticks_job_check check(job in('sync','details','market','plan','catalog'));
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.enqueue_supplier_cloud_tick_v1(text)'::regprocedure);
 if position('''sync'',''details'',''market'',''plan'''in definition)=0 then raise exception 'Cloud enqueue contract changed';end if;
 execute replace(definition,'''sync'',''details'',''market'',''plan''','''sync'',''details'',''market'',''plan'',''catalog''');
end$$;
create function public.tracker_request_tick_v1()returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;perform enqueue_supplier_cloud_tick_v1('catalog');end$$;
create function public.tracker_history_v1(item_input uuid default null,kind_input text default null,cursor_input jsonb default null)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 return coalesce((select jsonb_agg(to_jsonb(t))from(select *from supplier_tracker_events e where(item_input is null or e.item_id=item_input)and(kind_input is null or e.kind=kind_input)
 and(cursor_input is null or(e.created_at,e.id)<((cursor_input->>'at')::timestamptz,(cursor_input->>'id')::uuid))order by e.created_at desc,e.id desc limit 60)t),'[]');
end$$;
create function public.tracker_item_interval_v1(item_input uuid,seconds_input integer)returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 update supplier_tracker_items set monitor_seconds=seconds_input where id=item_input;
 update supplier_tracker_tasks set next_run_at=least(next_run_at,now()+make_interval(secs=>seconds_input))where item_id=item_input and state in('queued','retry');
 insert into supplier_tracker_events(supplier_id,item_id,kind,after_value)select supplier_id,id,'interval',jsonb_build_object('seconds',seconds_input)from supplier_tracker_items where id=item_input;
end$$;
create function public.tracker_commit_observation_v1(task_input uuid,token_input uuid,observation_input jsonb,expected_input jsonb default null)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare t supplier_tracker_tasks;i supplier_tracker_items;p products;v product_variants;offer uuid;pricing jsonb;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 select *into t from supplier_tracker_tasks where id=task_input for update;
 if not found or t.kind<>'monitor'or t.state<>'running'or t.lease_token is distinct from token_input or t.leased_until<now()then raise exception 'Stale lease';end if;
 select *into i from supplier_tracker_items where id=t.item_id for update;
 if i.excluded or not i.tracking_enabled or(t.source_id is not null and not exists(select 1 from supplier_tracker_sources where id=t.source_id and enabled))then raise exception 'Tracking paused';end if;
 perform tracker_validate_url_v1(t.supplier_id,t.url);
 if observation_input->>'supplier_id'is distinct from t.supplier_id::text or(observation_input->>'external_id'is distinct from i.external_id and i.external_id not like 'url:%')then raise exception 'Observation source identity mismatch';end if;
 if observation_input->>'product_id'is not null then
  select *into p from products where id=(observation_input->>'product_id')::uuid for share;
  if expected_input->'product'is null or not(to_jsonb(p)@>(expected_input->'product'))then raise exception 'Product identity changed after extraction';end if;
  if observation_input->>'variant_id'is not null then select *into v from product_variants where id=(observation_input->>'variant_id')::uuid for share;
   if expected_input->'variant'is null or not(to_jsonb(v)@>(expected_input->'variant'))then raise exception 'Variant identity changed after extraction';end if;
  end if;
 end if;
 offer:=record_supplier_observation_v1(observation_input);
 perform tracker_link_offer_v1(i.id,offer);pricing:=tracker_reprice_offer_v1(offer);
 return jsonb_build_object('offerId',offer,'pricing',pricing);
end$$;
-- Prefer a documented source for future procurement. Existing frozen orders are never reallocated.
do $$declare definition text;marker text;begin
 definition:=pg_get_functiondef('public.supplier_checkout_basis_v1(uuid,uuid,numeric,numeric)'::regprocedure);
 marker:='select * into s from suppliers where id=o.supplier_id;';
 if position(marker in definition)=0 then raise exception 'Supply checkout contract changed';end if;
 execute replace(definition,marker,marker||' if exists(select 1 from product_supplier_preferences pref where pref.product_id=product_input and pref.variant_id is not distinct from variant_input and pref.offer_id<>o.id)then raise exception ''Preferred supplier requires updated exact cost evidence'';end if;');
end$$;
revoke all on function tracker_request_tick_v1(),tracker_history_v1(uuid,text,jsonb),tracker_item_interval_v1(uuid,integer),tracker_commit_observation_v1(uuid,uuid,jsonb,jsonb)from public,anon,authenticated,service_role;
grant execute on function tracker_request_tick_v1(),tracker_history_v1(uuid,text,jsonb),tracker_item_interval_v1(uuid,integer)to authenticated;
grant execute on function tracker_commit_observation_v1(uuid,uuid,jsonb,jsonb)to service_role;
create function public.tracker_auto_candidates_v1(source_input uuid)returns setof supplier_tracker_items language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 return query select i.*from supplier_tracker_items i join supplier_tracker_memberships m on m.item_id=i.id join supplier_tracker_sources s on s.id=m.source_id
 where s.id=source_input and s.auto_import and s.enabled and s.import_category_id is not null and not i.excluded and i.tracking_enabled and i.product_id is null
 and not exists(select 1 from catalog_import_items ci where ci.offer_id=i.offer_id)order by i.first_seen_at,i.id limit 5;
end$$;
revoke all on function tracker_auto_candidates_v1(uuid)from public,anon,authenticated;grant execute on function tracker_auto_candidates_v1(uuid)to service_role;
do $$declare definition text;marker text;begin
 definition:=pg_get_functiondef('public.tracker_queue_drafts_v1(uuid,uuid[],jsonb)'::regprocedure);
 marker:='cfg:=jsonb_build_object';
 if position(marker in definition)=0 then raise exception 'Draft queue contract changed';end if;
 execute replace(definition,marker,'if exists(select 1 from supplier_tracker_items i join catalog_import_items ci on ci.offer_id=i.offer_id where i.id=any(item_ids_input))then raise exception ''Draft already queued'';end if; '||marker);
end$$;
-- Named jobs are idempotent in pg_cron; no Windows task or reusable HTTP credential.
select cron.schedule('mya-supplier-catalog','* * * * *',$job$select public.enqueue_supplier_cloud_tick_v1('catalog');$job$);
commit;
