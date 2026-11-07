begin;

alter table public.supplier_tracker_sources
  add column catalog_root boolean not null default false,
  add column catalog_parent_id uuid references public.supplier_tracker_sources(id),
  add constraint tracker_catalog_no_auto_drafts check (not auto_import or (not catalog_root and catalog_parent_id is null));
create unique index tracker_catalog_root_supplier on public.supplier_tracker_sources(supplier_id) where catalog_root;
alter table public.supplier_tracker_tasks
  add column catalog_expected_total integer check(catalog_expected_total >= 0),
  add column catalog_excluded_ids text[] not null default '{}';
create index tracker_membership_run on public.supplier_tracker_memberships(last_run_id,source_id,item_id);
create index tracker_run_supplier_active on public.supplier_tracker_runs(supplier_id) where state in ('queued','running');
create index tracker_run_tasks_category on public.supplier_tracker_tasks(run_id,source_id,state) where kind='discover';
create index tracker_repeated_page_run on public.supplier_tracker_events(run_id) where kind='repeated_page';

-- Adopt the public category rows already registered. Existing jobs and data stay intact.
insert into public.supplier_tracker_sources(supplier_id,url,label,kind,catalog_root,priority)
select id, case official_key
  when 'atacado-connect' then 'https://atacadoconnect.com/sitemap.xml'
  when 'atacado-usa' then 'https://atacadousa.com.py/'
  when 'star-company' then 'https://www.starcompany-py.com/'
  when 'total' then 'https://www.totalherramientasoficial.com.py/' end,
  'Catálogo elegible', 'category',true,80
from public.suppliers
where is_active and automation_authorized and archived_at is null and four_supplier_key_v1(website)=official_key
on conflict(supplier_id,url) do update set catalog_root=true,auto_import=false;

create or replace function public.tracker_start_source_v1(source_input uuid) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare s supplier_tracker_sources; run_id_value uuid; item_id_value uuid; supplier_value uuid;
begin
  if coalesce(current_setting('role',true),'')<>'service_role' and not coalesce(is_admin(),false) then raise exception 'Forbidden'; end if;
  select supplier_id into supplier_value from supplier_tracker_sources where id=source_input;
  perform 1 from suppliers where id=supplier_value for update;
  select * into s from supplier_tracker_sources where id=source_input for update;
  if not found or not s.enabled or not supplier_tracking_allowed_v1(s.supplier_id) then raise exception 'Source disabled'; end if;
  perform tracker_validate_url_v1(s.supplier_id,s.url);
  select id into run_id_value from supplier_tracker_runs where source_id=s.id and state in ('queued','running');
  if found then return run_id_value; end if;
  if s.catalog_root or s.catalog_parent_id is not null then
    select r.id into run_id_value from supplier_tracker_runs r join supplier_tracker_sources a on a.id=r.source_id
      where r.supplier_id=s.supplier_id and r.state in ('queued','running')
      and (a.catalog_root or (s.catalog_root and a.catalog_parent_id=s.id)) order by r.started_at limit 1;
    if found then
      if not s.catalog_root then
        update supplier_tracker_tasks set priority=least(priority,70)
          where run_id=run_id_value and source_id=s.id and kind='discover' and state in ('queued','retry');
      end if;
      return run_id_value;
    end if;
  end if;
  insert into supplier_tracker_runs(source_id,supplier_id) values(s.id,s.supplier_id) returning id into run_id_value;
  if s.kind='category' then
    insert into supplier_tracker_tasks(supplier_id,source_id,run_id,kind,url,priority)
      values(s.supplier_id,s.id,run_id_value,'discover',s.url,s.priority);
  else
    select id into item_id_value from supplier_tracker_items where supplier_id=s.supplier_id and url=s.url;
    if not found then
      insert into supplier_tracker_items(supplier_id,external_id,url,title)
        values(s.supplier_id,'url:'||s.url,s.url,'Pendiente de leer ficha')
        on conflict(supplier_id,external_id) do update set tracking_enabled=true returning id into item_id_value;
    end if;
    insert into supplier_tracker_tasks(supplier_id,source_id,item_id,kind,url,priority)
      values(s.supplier_id,s.id,item_id_value,'monitor',s.url,s.priority)
      on conflict(item_id) where kind='monitor' do update set state='queued',next_run_at=now()
      where supplier_tracker_tasks.state<>'running';
    update supplier_tracker_runs set state='done',finished_at=now() where id=run_id_value;
  end if;
  update supplier_tracker_sources set next_run_at=now()+make_interval(secs=>s.discovery_seconds) where id=s.id;
  return run_id_value;
end $$;

create function public.tracker_finalize_catalog_run_v1(run_input uuid) returns void
language plpgsql set search_path=public,pg_temp as $$
declare r supplier_tracker_runs; root supplier_tracker_sources; result jsonb; final_state text;
  unique_items integer; prior_items integer; blocked integer; repeated integer;
begin
  select * into r from supplier_tracker_runs where id=run_input for update;
  if not found or r.state not in ('running','queued','partial') or r.report ? 'categories' then return; end if;
  select * into root from supplier_tracker_sources where id=r.source_id;
  if not (root.catalog_root or root.catalog_parent_id is not null) or
    exists(select 1 from supplier_tracker_tasks where run_id=r.id and state in ('queued','retry','running')) then return; end if;
    select count(distinct item_id) into unique_items from supplier_tracker_memberships where last_run_id=r.id;
    select count(*) into blocked from supplier_tracker_tasks where run_id=r.id and state in ('blocked','paused');
    select count(*) into repeated from supplier_tracker_events where run_id=r.id and kind='repeated_page';
    select items into prior_items from supplier_tracker_runs where source_id=r.source_id and state='done'
      order by finished_at desc limit 1;
    select coalesce(jsonb_agg(to_jsonb(c) order by c.label),'[]') into result from (
      select a.id,a.label,count(*) filter(where p.state='done') pages,max(p.catalog_expected_total) expected,
        (select count(*) from supplier_tracker_memberships m where m.source_id=a.id and m.last_run_id=r.id) items,
        (select count(distinct excluded_id) from supplier_tracker_tasks e cross join lateral unnest(e.catalog_excluded_ids) excluded_id
          where e.run_id=r.id and e.source_id=a.id) excluded,
        count(*) filter(where p.state in ('blocked','paused')) errors,
        (select old.items from supplier_tracker_runs previous cross join lateral
          jsonb_to_recordset(previous.report->'categories') as old(id uuid,items integer)
          where previous.source_id=r.source_id and previous.state='done' and old.id=a.id
          order by previous.finished_at desc limit 1) previous_items
      from supplier_tracker_tasks p join supplier_tracker_sources a on a.id=p.source_id
      where p.run_id=r.id and not a.catalog_root group by a.id
    ) c;
    update supplier_tracker_runs set items=unique_items,finished_at=now(),
      state=case when blocked>0 or repeated>0 or jsonb_array_length(result)=0 or
        exists(select 1 from supplier_tracker_runs previous cross join lateral
          jsonb_to_recordset(previous.report->'categories') as old(id uuid,items integer)
          where previous.id=(select id from supplier_tracker_runs where source_id=r.source_id and state='done' order by finished_at desc limit 1)
            and old.items>=20 and not exists(select 1 from jsonb_to_recordset(result) c(id uuid) where c.id=old.id)) or
        (prior_items>=20 and unique_items<prior_items*0.6) or
        exists(select 1 from jsonb_to_recordset(result) c(expected integer,items integer,excluded integer,previous_items integer)
          where c.expected>c.items+c.excluded or (c.previous_items>=20 and c.items<c.previous_items*0.6))
        then 'partial' else 'done' end,
      report=jsonb_build_object('categories',result,'blockedPages',blocked,'repeatedPages',repeated,
        'previousItems',prior_items,'coverage','public_pagination','excluded',
        (select count(distinct excluded_id) from supplier_tracker_tasks e cross join lateral unnest(e.catalog_excluded_ids) excluded_id where e.run_id=r.id))
      where id=r.id returning state into final_state;
    if final_state='done' then update supplier_tracker_sources set last_success_at=now() where id=r.source_id; end if;
end $$;
revoke all on function public.tracker_finalize_catalog_run_v1(uuid) from public,anon,authenticated,service_role;

create or replace function public.tracker_schedule_sources_v1() returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare s record; pending_run uuid; scheduled integer:=0;
begin
  if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
  for pending_run in
    select r.id from supplier_tracker_runs r join supplier_tracker_sources a on a.id=r.source_id
    where (a.catalog_root or a.catalog_parent_id is not null) and r.state in ('running','queued','partial')
      and not (r.report ? 'categories')
      and not exists(select 1 from supplier_tracker_tasks t where t.run_id=r.id and t.state in ('queued','retry','running'))
    order by r.started_at limit 20
  loop
    perform tracker_finalize_catalog_run_v1(pending_run);
  end loop;
  for s in
    select a.id from supplier_tracker_sources a join suppliers p on p.id=a.supplier_id
    where a.kind='category' and a.enabled and a.catalog_parent_id is null and a.next_run_at<=now()
      and p.is_active and p.automation_authorized and p.monitor_enabled and p.archived_at is null
      and four_supplier_key_v1(p.website)=p.official_key
      and not exists(select 1 from supplier_tracker_runs r where r.source_id=a.id and r.state in ('queued','running'))
    order by p.id,a.catalog_root desc,a.priority,a.id limit 20
  loop
    perform tracker_start_source_v1(s.id);
    scheduled:=scheduled+1;
  end loop;
  return scheduled;
end $$;

create function public.tracker_start_catalog_v1(supplier_input uuid default null,source_input uuid default null)
returns uuid[] language plpgsql security definer set search_path=public,pg_temp as $$
declare s record; runs uuid[]:='{}';
begin
  if not coalesce(is_admin(),false) then raise exception 'Forbidden'; end if;
  for s in
    select a.id from supplier_tracker_sources a join suppliers p on p.id=a.supplier_id
    where a.enabled and p.is_active and p.automation_authorized and p.monitor_enabled and p.archived_at is null
      and (supplier_input is null or a.supplier_id=supplier_input)
      and (case when source_input is null then a.catalog_root else a.id=source_input and a.kind='category' end)
    order by p.id,a.id
  loop
    runs:=array_append(runs,tracker_start_source_v1(s.id));
  end loop;
  if cardinality(runs)=0 then raise exception 'No enabled source'; end if;
  return runs;
end $$;

-- A catalog run shares the existing task leases. Every category has its own
-- membership and page counters, while a run holds the entire supplier frontier.
create function public.tracker_record_catalog_page_v1(task_input uuid,token_input uuid,page_input jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  t supplier_tracker_tasks; s supplier_tracker_sources; r supplier_tracker_runs; root supplier_tracker_sources;
  i supplier_tracker_items; entry jsonb; target text; child uuid; monitor_url text; created integer:=0; previous_repeats integer:=0;
begin
  if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
  select * into t from supplier_tracker_tasks where id=task_input for update;
  if not found or t.kind<>'discover' or t.state<>'running' or t.lease_token is distinct from token_input
    or t.leased_until<=now() then raise exception 'Stale lease'; end if;
  select * into r from supplier_tracker_runs where id=t.run_id for update;
  select * into s from supplier_tracker_sources where id=t.source_id;
  select * into root from supplier_tracker_sources where id=r.source_id;
  if not s.enabled or not root.enabled or r.state not in ('queued','running') or
    not supplier_tracking_allowed_v1(t.supplier_id) or
    not (s.catalog_root or s.catalog_parent_id is not null) then raise exception 'Source paused or outside catalog'; end if;
  perform tracker_validate_url_v1(t.supplier_id,t.url);
  if not tracker_same_category_v1(s.url,t.url) then raise exception 'Page outside category'; end if;

  if not s.catalog_root then
    if exists(select 1 from supplier_tracker_page_hashes where run_id=r.id and hash=page_input->>'contentHash') then
      select count(*) into previous_repeats from supplier_tracker_events where run_id=r.id and kind='repeated_page'
        and after_value->>'hash'=page_input->>'contentHash';
    end if;
    for entry in select value from jsonb_array_elements(page_input->'products') loop
      target:=entry->>'url';
      perform tracker_validate_url_v1(t.supplier_id,target);
      if nullif(btrim(entry->>'externalId'),'') is null or nullif(btrim(entry->>'title'),'') is null then
        raise exception 'Missing source identity';
      end if;
      if exists(select 1 from jsonb_array_elements_text(s.exclusions) x where target=x or starts_with(target,x||'/')) then continue; end if;
      select * into i from supplier_tracker_items where supplier_id=t.supplier_id and
        (external_id=entry->>'externalId' or url=target)
        order by (external_id=entry->>'externalId') desc limit 1 for update;
      if i.id is null then
        insert into supplier_tracker_items(supplier_id,external_id,url,title,brand,sku,image_url,description,raw_price,
          origin_cost,currency,normalized_usd,normalization,cost_checked_at,monitor_seconds,evidence)
        values(t.supplier_id,entry->>'externalId',target,entry->>'title',coalesce(entry->>'brand',''),coalesce(entry->>'sku',''),
          entry->>'imageUrl',coalesce(entry->>'description',''),coalesce(entry->>'rawPrice',''),(entry->>'cost')::numeric,
          entry->>'currency',(entry->>'normalizedUsd')::numeric,entry->'normalization',
          case when (entry->>'cost')::numeric>0 then now() end,604800,
          jsonb_build_object('listing',true,'nativeUrl',entry->'nativeUrl','listingData',entry,'mediaAuthorized',s.media_authorized))
        returning * into i;
        insert into supplier_tracker_events(supplier_id,item_id,task_id,run_id,kind,after_value)
          values(t.supplier_id,i.id,t.id,r.id,'new',jsonb_build_object('externalId',i.external_id,'url',i.url));
        created:=created+1;
      elsif i.external_id=entry->>'externalId' or i.external_id like 'url:%' then
        update supplier_tracker_items set last_seen_at=now(),
          external_id=case when external_id like 'url:%' then entry->>'externalId' else external_id end,
          evidence=evidence||jsonb_build_object('listingData',entry),
          origin_cost=case when last_success_at is null and entry->>'currency' is not null and (entry->>'cost')::numeric>0 then (entry->>'cost')::numeric else origin_cost end,
          currency=case when last_success_at is null and entry->>'currency' is not null and (entry->>'cost')::numeric>0 then entry->>'currency' else currency end,
          normalized_usd=case when last_success_at is null and entry->>'currency' is not null and (entry->>'cost')::numeric>0 then (entry->>'normalizedUsd')::numeric else normalized_usd end,
          cost_checked_at=case when last_success_at is null and entry->>'currency' is not null and (entry->>'cost')::numeric>0 then now() else cost_checked_at end
        where id=i.id returning * into i;
      else
        raise exception 'Existing source URL has a different identifier';
      end if;
      insert into supplier_tracker_memberships(source_id,item_id,first_run_id,last_run_id)
        values(s.id,i.id,r.id,r.id)
        on conflict(source_id,item_id) do update set last_run_id=r.id,last_seen_at=now();
      monitor_url:=coalesce(nullif(entry->>'nativeUrl',''),target);
      perform tracker_validate_url_v1(t.supplier_id,monitor_url);
      if i.tracking_enabled and not i.excluded then
        insert into supplier_tracker_tasks(supplier_id,source_id,item_id,kind,url,priority,next_run_at)
          values(t.supplier_id,s.id,i.id,'monitor',monitor_url,case when i.product_id is null then 300 else 30 end,now())
          on conflict(item_id) where kind='monitor' do update set url=excluded.url,state='queued',attempts=0,
            lease_token=null,leased_until=null,next_run_at=now()
          where i.product_id is null and supplier_tracker_tasks.state not in ('running','paused')
            and supplier_tracker_tasks.url is distinct from excluded.url;
      end if;
    end loop;
    for target in select jsonb_array_elements_text(page_input->'pages') loop
      perform tracker_validate_url_v1(t.supplier_id,target);
      if not tracker_same_category_v1(s.url,target) then raise exception 'Page outside selected category'; end if;
      -- A few duplicated pages may lead to different products. Repeated identical
      -- responses beyond that stop extending this branch and leave a partial run.
      if previous_repeats>=2 then continue; end if;
      insert into supplier_tracker_tasks(supplier_id,source_id,run_id,kind,url,priority)
        values(t.supplier_id,s.id,r.id,'discover',target,100)
        on conflict(run_id,url) where kind='discover' do nothing;
    end loop;
  end if;

  if root.catalog_root then
    for entry in select value from jsonb_array_elements(page_input->'categories') loop
      target:=entry->>'url';
      perform tracker_validate_url_v1(t.supplier_id,target);
      if target=root.url then continue; end if;
      insert into supplier_tracker_sources(supplier_id,url,label,kind,catalog_parent_id)
        values(t.supplier_id,target,left(entry->>'title',200),'category',root.id)
        on conflict(supplier_id,url) do update set catalog_parent_id=excluded.catalog_parent_id,auto_import=false
        where not supplier_tracker_sources.catalog_root and supplier_tracker_sources.kind='category';
      select id into child from supplier_tracker_sources where supplier_id=t.supplier_id and url=target and enabled
        and catalog_parent_id=root.id;
      if child is not null then
        insert into supplier_tracker_tasks(supplier_id,source_id,run_id,kind,url,priority)
          values(t.supplier_id,child,r.id,'discover',target,90)
          on conflict(run_id,url) where kind='discover' do nothing;
      end if;
    end loop;
  end if;

  if not s.catalog_root and jsonb_array_length(page_input->'products')>0 then
    insert into supplier_tracker_page_hashes(run_id,hash,url)
      values(r.id,page_input->>'contentHash',t.url) on conflict do nothing;
    if not found and exists (
      select 1 from supplier_tracker_page_hashes h join supplier_tracker_tasks p on p.run_id=h.run_id and p.url=h.url
      where h.run_id=r.id and h.hash=page_input->>'contentHash' and p.source_id=s.id
    ) then
      insert into supplier_tracker_events(supplier_id,task_id,run_id,kind,after_value)
        values(t.supplier_id,t.id,r.id,'repeated_page',jsonb_build_object('url',t.url,'hash',page_input->>'contentHash',
          'stoppedExpansion',previous_repeats>=2));
    end if;
  end if;
  update supplier_tracker_tasks set state='done',finished_at=now(),leased_until=null,lease_token=null,last_error=null,
    catalog_expected_total=(page_input->>'expectedTotal')::integer,
    catalog_excluded_ids=array(select jsonb_array_elements_text(page_input->'excludedIds')) where id=t.id;
  update supplier_tracker_runs set pages=pages+(not s.catalog_root)::integer,new_items=new_items+created where id=r.id;
  update suppliers set tracker_failures=0,tracker_blocked_until=null where id=t.supplier_id;

  perform tracker_finalize_catalog_run_v1(r.id);
  return jsonb_build_object('runId',r.id,'new',created);
end $$;

revoke all on function public.tracker_record_catalog_page_v1(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.tracker_record_catalog_page_v1(uuid,uuid,jsonb) to service_role;
revoke all on function public.tracker_start_catalog_v1(uuid,uuid) from public,anon,service_role;
grant execute on function public.tracker_start_catalog_v1(uuid,uuid) to authenticated;

commit;
