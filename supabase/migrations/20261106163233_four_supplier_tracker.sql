begin;
-- Additive schema. Archival is a separate, audited, explicit transaction after backup.
alter table suppliers add column archived_at timestamptz;
alter table suppliers add column archive_reason text;
alter table suppliers add column monitor_enabled boolean not null default true;
alter table suppliers add column monitor_seconds integer not null default 21600 check(monitor_seconds between 900 and 2592000);
alter table suppliers add column tracker_priority integer not null default 100 check(tracker_priority between 1 and 1000);
alter table suppliers add column tracker_blocked_until timestamptz;
alter table suppliers add column tracker_failures integer not null default 0;
alter table products add column supplier_archived_at timestamptz;
alter table products add column supplier_archive_reason text;
alter table product_variants add column supplier_archived_at timestamptz;
alter table supplier_offers add column archived_at timestamptz;

create function public.four_supplier_key_v1(url_input text)returns text language sql immutable set search_path=public,pg_temp as $$
 select case when url_input~'^https://(www\.)?atacadoconnect\.com(/|$)'then 'atacado-connect'
 when url_input~'^https://(www\.)?atacadousa\.com\.py(/|$)'then 'atacado-usa'
 when url_input~'^https://(www\.)?starcompany-py\.com(/|$)'then 'star-company'
 when url_input~'^https://(www\.)?totalherramientasoficial\.com\.py(/|$)'then 'total' end
$$;
create function public.tracker_validate_url_v1(supplier_input uuid,url_input text)returns void language plpgsql stable security definer set search_path=public,pg_temp as $$
declare s suppliers;begin
 select *into s from suppliers where id=supplier_input;
 if not found or not s.is_active or s.archived_at is not null or four_supplier_key_v1(s.website)is null or four_supplier_key_v1(url_input)is distinct from four_supplier_key_v1(s.website)
 or length(url_input)>2000 or url_input~'[\x00-\x20]'or url_input~*'^https://[^/]+/(api|admin|login|acesso|orcamento|carrinho)(/|$)'then raise exception 'URL or supplier not authorized';end if;
end$$;
create function public.tracker_same_category_v1(root_input text,target_input text)returns boolean language sql immutable set search_path=public,pg_temp as $$
 select split_part(root_input,'?',1)=split_part(target_input,'?',1)
 and not exists(select 1 from unnest(string_to_array(split_part(root_input,'?',2),'&'))token where token<>''and position('&'||token||'&'in '&'||split_part(target_input,'?',2)||'&')=0)
 and not exists(select 1 from unnest(string_to_array(split_part(target_input,'?',2),'&'))token where token<>''and split_part(token,'=',1)not in('p','page','pagina','offset','start')and position('&'||token||'&'in '&'||split_part(root_input,'?',2)||'&')=0)
$$;

create table public.supplier_tracker_sources(
 id uuid primary key default gen_random_uuid(),supplier_id uuid not null references suppliers,
 url text not null,label text not null default '',kind text not null check(kind in('category','product')),
 enabled boolean not null default true,discovery_seconds integer not null default 86400 check(discovery_seconds between 900 and 2592000),
 monitor_seconds integer check(monitor_seconds between 900 and 2592000),max_pages integer not null default 5000 check(max_pages between 1 and 20000),
 max_items integer not null default 100000 check(max_items between 1 and 200000),priority integer not null default 100 check(priority between 1 and 1000),
 exclusions jsonb not null default '[]'check(jsonb_typeof(exclusions)='array'),auto_import boolean not null default false,
 import_category_id uuid references categories,media_authorized boolean not null default false,
 normalization jsonb not null default '{}',next_run_at timestamptz not null default now(),last_success_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),actor uuid default auth.uid(),unique(supplier_id,url)
);
create table public.supplier_tracker_runs(
 id uuid primary key default gen_random_uuid(),source_id uuid not null references supplier_tracker_sources,
 supplier_id uuid not null references suppliers,state text not null default 'queued'check(state in('queued','running','done','partial','paused','error')),
 started_at timestamptz not null default now(),finished_at timestamptz,pages integer not null default 0,items integer not null default 0,
 new_items integer not null default 0,error text,report jsonb not null default '{}'
);
create unique index tracker_one_active_run on supplier_tracker_runs(source_id)where state in('queued','running');
create table public.supplier_tracker_page_hashes(run_id uuid not null references supplier_tracker_runs,hash text not null,url text not null,primary key(run_id,hash));
create table public.supplier_tracker_items(
 id uuid primary key default gen_random_uuid(),supplier_id uuid not null references suppliers,external_id text not null,
 url text not null,title text not null,brand text not null default '',model text not null default '',sku text not null default '',gtin text,
 variant_key text not null default 'source',image_url text,description text not null default '',raw_price text not null default '',
 origin_cost numeric check(origin_cost>0),currency text check(currency in('USD','ARS','PYG','BRL')),normalized_usd numeric check(normalized_usd>0),
 normalization jsonb,availability text not null default 'unknown'check(availability in('in_stock','out_of_stock','unknown')),quantity integer check(quantity>=0),
 tracking_enabled boolean not null default true,excluded boolean not null default false,monitor_seconds integer check(monitor_seconds between 900 and 2592000),
 status text not null default 'discovered'check(status in('discovered','tracked','review','issue','retired','excluded','paused')),
 first_seen_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),last_checked_at timestamptz,last_success_at timestamptz,cost_checked_at timestamptz,availability_checked_at timestamptz,
 missing_count integer not null default 0,first_missing_at timestamptz,last_missing_at timestamptz,last_error text,
 offer_id uuid references supplier_offers,product_id uuid references products,variant_id uuid references product_variants,
 evidence jsonb not null default '{}',unique(supplier_id,external_id)
);
create table public.supplier_tracker_memberships(
 source_id uuid not null references supplier_tracker_sources,item_id uuid not null references supplier_tracker_items,
 first_run_id uuid not null references supplier_tracker_runs,last_run_id uuid not null references supplier_tracker_runs,last_seen_at timestamptz not null default now(),
 primary key(source_id,item_id)
);
create unique index tracker_item_url on supplier_tracker_items(supplier_id,url);
create table public.supplier_tracker_tasks(
 id uuid primary key default gen_random_uuid(),supplier_id uuid not null references suppliers,source_id uuid references supplier_tracker_sources,
 run_id uuid references supplier_tracker_runs,item_id uuid references supplier_tracker_items,kind text not null check(kind in('discover','monitor')),
 url text not null,priority integer not null default 100,state text not null default 'queued'check(state in('queued','running','done','retry','blocked','paused')),
 attempts integer not null default 0,next_run_at timestamptz not null default now(),started_at timestamptz,finished_at timestamptz,
 leased_until timestamptz,lease_token uuid,last_error text,run_token uuid,
 check((kind='discover'and run_id is not null)or(kind='monitor'and item_id is not null))
);
create unique index tracker_discovery_page on supplier_tracker_tasks(run_id,url)where kind='discover';
create unique index tracker_monitor_item on supplier_tracker_tasks(item_id)where kind='monitor';
create index tracker_tasks_due on supplier_tracker_tasks(priority,next_run_at)where state in('queued','retry','running');
create table public.supplier_tracker_events(
 id uuid primary key default gen_random_uuid(),supplier_id uuid not null references suppliers,item_id uuid references supplier_tracker_items,
 task_id uuid references supplier_tracker_tasks,run_id uuid references supplier_tracker_runs,kind text not null,
 before_value jsonb,after_value jsonb,difference numeric,percent numeric,created_at timestamptz not null default now(),actor uuid default auth.uid()
);
create index tracker_item_history on supplier_tracker_events(item_id,created_at desc);
create table public.supplier_scope_audit(id uuid primary key default gen_random_uuid(),backup_hash text not null,detail jsonb not null,created_at timestamptz not null default now());
create table public.product_supplier_preferences(
 id uuid primary key default gen_random_uuid(),product_id uuid not null references products,variant_id uuid references product_variants,
 offer_id uuid not null references supplier_offers,reason text not null,actor uuid default auth.uid(),updated_at timestamptz not null default now(),unique nulls not distinct(product_id,variant_id)
);
do $$declare t text;begin
 foreach t in array array['supplier_tracker_sources','supplier_tracker_runs','supplier_tracker_page_hashes','supplier_tracker_items','supplier_tracker_memberships','supplier_tracker_tasks','supplier_tracker_events','supplier_scope_audit','product_supplier_preferences']loop
 execute format('alter table %I enable row level security',t);execute format('revoke all on %I from public,anon,authenticated,service_role',t);
 execute format('grant select on %I to authenticated,service_role',t);execute format('create policy admin_read on %I for select to authenticated using((select is_admin()))',t);
 end loop;
end$$;

create function public.tracker_start_source_v1(source_input uuid)returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare s supplier_tracker_sources;r uuid;item_id uuid;begin
 if coalesce(current_setting('role',true),'')<>'service_role'and not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 select *into s from supplier_tracker_sources where id=source_input for update;
 if not found or not s.enabled then raise exception 'Source disabled';end if;
 perform tracker_validate_url_v1(s.supplier_id,s.url);
 select id into r from supplier_tracker_runs where source_id=s.id and state in('queued','running');if found then return r;end if;
 insert into supplier_tracker_runs(source_id,supplier_id)values(s.id,s.supplier_id)returning id into r;
 if s.kind='category'then insert into supplier_tracker_tasks(supplier_id,source_id,run_id,kind,url,priority)values(s.supplier_id,s.id,r,'discover',s.url,s.priority);
 else
  -- Product URLs are registered directly; the monitor resolves its true provider identity.
  select id into item_id from supplier_tracker_items where supplier_id=s.supplier_id and url=s.url;
  if not found then insert into supplier_tracker_items(supplier_id,external_id,url,title)values(s.supplier_id,'url:'||s.url,s.url,'Pendiente de leer ficha')on conflict(supplier_id,external_id)do update set tracking_enabled=true returning id into item_id;end if;
  insert into supplier_tracker_tasks(supplier_id,source_id,item_id,kind,url,priority)values(s.supplier_id,s.id,item_id,'monitor',s.url,s.priority)on conflict(item_id)where kind='monitor'do update set state='queued',next_run_at=now();
  update supplier_tracker_runs set state='done',finished_at=now()where source_id=s.id and state='queued';
 end if;
 update supplier_tracker_sources set next_run_at=now()+make_interval(secs=>s.discovery_seconds)where id=s.id;return r;
end$$;
create function public.tracker_save_source_v1(config_input jsonb)returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare s uuid;url_value text:=config_input->>'url';supplier uuid:=(config_input->>'supplierId')::uuid;begin
 if not coalesce(is_admin(),false)and(coalesce(current_setting('role',true),'')<>'service_role'or coalesce((config_input->>'autoImport')::boolean,false))then raise exception 'Forbidden';end if;
 perform tracker_validate_url_v1(supplier,url_value);
 if jsonb_typeof(config_input->'exclusions')is distinct from 'array'or jsonb_array_length(config_input->'exclusions')>1000 then raise exception 'Invalid exclusions';end if;
 perform tracker_validate_url_v1(supplier,x#>>'{}')from jsonb_array_elements(config_input->'exclusions')x;
 insert into supplier_tracker_sources(supplier_id,url,label,kind,discovery_seconds,monitor_seconds,max_pages,max_items,exclusions,auto_import,import_category_id,media_authorized,normalization)
 values(supplier,url_value,left(coalesce(config_input->>'label',''),200),config_input->>'kind',(config_input->>'discoverySeconds')::integer,(config_input->>'monitorSeconds')::integer,
 coalesce((config_input->>'maxPages')::integer,5000),coalesce((config_input->>'maxItems')::integer,100000),config_input->'exclusions',coalesce((config_input->>'autoImport')::boolean,false),nullif(config_input->>'categoryId','')::uuid,coalesce((config_input->>'mediaAuthorized')::boolean,false),coalesce(config_input->'normalization','{}'))
 on conflict(supplier_id,url)do update set label=excluded.label,discovery_seconds=excluded.discovery_seconds,monitor_seconds=excluded.monitor_seconds,exclusions=excluded.exclusions,
 auto_import=excluded.auto_import,import_category_id=excluded.import_category_id,media_authorized=excluded.media_authorized,normalization=excluded.normalization,updated_at=now()returning id into s;
 insert into supplier_tracker_events(supplier_id,kind,after_value)values(supplier,'source_saved',config_input);return s;
end$$;
create function public.tracker_control_v1(kind_input text,id_input uuid,action_input text)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare item supplier_tracker_items;begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 if kind_input='source'then
  if action_input not in('pause','resume')then raise exception 'Invalid source action';end if;
  update supplier_tracker_sources set enabled=action_input<>'pause',updated_at=now()where id=id_input;
  if action_input='pause'then update supplier_tracker_runs set state='paused',finished_at=now()where source_id=id_input and state in('queued','running');update supplier_tracker_tasks set state='paused',lease_token=null,leased_until=null where source_id=id_input and state<>'done';end if;
  if action_input='resume'then update supplier_tracker_tasks set state='queued',next_run_at=now()where source_id=id_input and kind='monitor'and state='paused';end if;
 elsif kind_input='item'then
  select *into item from supplier_tracker_items where id=id_input for update;if not found then raise exception 'Item missing';end if;
  if action_input not in('pause','track','exclude','sync')then raise exception 'Invalid action';end if;
  update supplier_tracker_items set tracking_enabled=action_input in('track','sync'),excluded=action_input='exclude',status=case when action_input='exclude'then 'excluded'when action_input='pause'then 'paused'else 'tracked'end where id=id_input;
  if action_input in('pause','exclude')then update supplier_tracker_tasks set state='paused',lease_token=null,leased_until=null where item_id=id_input;
  else
   perform tracker_validate_url_v1(item.supplier_id,item.url);
   insert into supplier_tracker_tasks(supplier_id,item_id,kind,url)values(item.supplier_id,item.id,'monitor',item.url)on conflict(item_id)where kind='monitor'do update set state='queued',next_run_at=now(),attempts=0,lease_token=null,leased_until=null;
  end if;
  insert into supplier_tracker_events(supplier_id,item_id,kind,after_value)values(item.supplier_id,item.id,'control',jsonb_build_object('action',action_input));
 else raise exception 'Invalid control';end if;
end$$;

create function public.tracker_claim_tasks_v1(limit_input integer default 4)returns setof supplier_tracker_tasks language plpgsql security definer set search_path=public,pg_temp as $$
declare supplier suppliers;task supplier_tracker_tasks;claimed integer:=0;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 if limit_input not between 1 and 4 then raise exception 'Invalid batch';end if;
 for supplier in select *from suppliers where is_active and automation_authorized and monitor_enabled and archived_at is null and four_supplier_key_v1(website)is not null
 and(tracker_blocked_until is null or tracker_blocked_until<=now())order by tracker_priority,id for update skip locked loop
  exit when claimed>=limit_input;
  if exists(select 1 from supplier_tracker_tasks where supplier_id=supplier.id and state='running'and leased_until>now())then continue;end if;
  insert into supplier_source_slots(supplier_id,next_at)values(supplier.id,now())on conflict do nothing;
  perform 1 from supplier_source_slots where supplier_id=supplier.id and next_at<=now()for update skip locked;if not found then continue;end if;
  select t.*into task from supplier_tracker_tasks t left join supplier_tracker_sources s on s.id=t.source_id left join supplier_tracker_runs r on r.id=t.run_id left join supplier_tracker_items i on i.id=t.item_id
  where t.supplier_id=supplier.id and t.state in('queued','retry','running')and t.next_run_at<=now()and(t.leased_until is null or t.leased_until<now())
   and(t.source_id is null or s.enabled)and(t.run_id is null or r.state in('queued','running'))and(t.item_id is null or(i.tracking_enabled and not i.excluded))
  order by t.priority,t.next_run_at,t.id for update of t skip locked limit 1;
  if not found then continue;end if;
  update supplier_source_slots set next_at=now()+interval '10 seconds'where supplier_id=supplier.id;
  update supplier_tracker_tasks set state='running',started_at=now(),attempts=attempts+1,lease_token=gen_random_uuid(),leased_until=now()+interval '2 minutes',run_token=gen_random_uuid()where id=task.id returning *into task;
  update supplier_tracker_runs set state='running'where id=task.run_id;
  claimed:=claimed+1;return next task;
 end loop;
end$$;

create function public.tracker_record_page_v1(task_input uuid,token_input uuid,page_input jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare t supplier_tracker_tasks;s supplier_tracker_sources;r supplier_tracker_runs;entry jsonb;i supplier_tracker_items;created integer:=0;seen integer:=0;page_url text;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 select *into t from supplier_tracker_tasks where id=task_input for update;
 if not found or t.kind<>'discover'or t.state<>'running'or t.lease_token is distinct from token_input or t.leased_until<now()then raise exception 'Stale lease';end if;
 select *into s from supplier_tracker_sources where id=t.source_id for update;select *into r from supplier_tracker_runs where id=t.run_id for update;
 perform tracker_validate_url_v1(t.supplier_id,t.url);
 if not s.enabled or r.state not in('queued','running')then raise exception 'Source paused';end if;
 if jsonb_typeof(page_input->'products')is distinct from 'array'or jsonb_array_length(page_input->'products')>2000 or jsonb_typeof(page_input->'pages')is distinct from 'array'or jsonb_array_length(page_input->'pages')>2000 then raise exception 'Invalid page';end if;
 if page_input->>'contentHash'!~'^[a-f0-9]{64}$'then raise exception 'Page fingerprint required';end if;
 if exists(select 1 from supplier_tracker_page_hashes where run_id=r.id and hash=page_input->>'contentHash')then
  update supplier_tracker_tasks set state='done',last_error='Repeated page content; cycle detected',lease_token=null,leased_until=null,finished_at=now()where id=t.id;
  update supplier_tracker_runs set report=report||'{"cycleDetected":true}'::jsonb where id=r.id;
  if not exists(select 1 from supplier_tracker_tasks where run_id=r.id and state in('queued','retry','running'))then update supplier_tracker_runs set state='partial',finished_at=now()where id=r.id;end if;
  return jsonb_build_object('cycle',true);
 end if;
 insert into supplier_tracker_page_hashes(run_id,hash,url)values(r.id,page_input->>'contentHash',t.url);
 for entry in select value from jsonb_array_elements(page_input->'products')loop
  perform tracker_validate_url_v1(t.supplier_id,entry->>'url');
  if exists(select 1 from jsonb_array_elements_text(s.exclusions)x where entry->>'url'=x or entry->>'url'like x||'/%')then continue;end if;
  if nullif(btrim(entry->>'externalId'),'')is null or nullif(btrim(entry->>'title'),'')is null then raise exception 'Missing source identity';end if;
  select *into i from supplier_tracker_items where supplier_id=t.supplier_id and(external_id=entry->>'externalId'or url=entry->>'url')order by case when external_id=entry->>'externalId'then 0 else 1 end limit 1 for update;
  if i.id is null then
   if (select count(*)from supplier_tracker_memberships where source_id=s.id)>=s.max_items then raise exception 'Item safety limit reached; increase after review';end if;
   insert into supplier_tracker_items(supplier_id,external_id,url,title,brand,sku,image_url,description,raw_price,origin_cost,currency,normalized_usd,normalization,cost_checked_at,evidence)
   values(t.supplier_id,entry->>'externalId',entry->>'url',entry->>'title',coalesce(entry->>'brand',''),coalesce(entry->>'sku',''),entry->>'imageUrl',coalesce(entry->>'description',''),coalesce(entry->>'rawPrice',''),
   (entry->>'cost')::numeric,entry->>'currency',(entry->>'normalizedUsd')::numeric,entry->'normalization',case when(entry->>'cost')::numeric>0 then now()end,jsonb_build_object('listing',true,'nativeUrl',entry->'nativeUrl','warnings',entry->'warnings','mediaAuthorized',s.media_authorized))returning *into i;
   insert into supplier_tracker_events(supplier_id,item_id,task_id,run_id,kind,after_value)values(t.supplier_id,i.id,t.id,r.id,'new',to_jsonb(i));created:=created+1;
  else update supplier_tracker_items set last_seen_at=now(),external_id=case when external_id like 'url:%'then entry->>'externalId'else external_id end where id=i.id;end if;
  insert into supplier_tracker_memberships(source_id,item_id,first_run_id,last_run_id)values(s.id,i.id,r.id,r.id)on conflict(source_id,item_id)do update set last_run_id=r.id,last_seen_at=now();
  perform tracker_validate_url_v1(t.supplier_id,coalesce(nullif(entry->>'nativeUrl',''),i.url));
  insert into supplier_tracker_tasks(supplier_id,source_id,item_id,kind,url,priority,next_run_at)values(t.supplier_id,s.id,i.id,'monitor',coalesce(nullif(entry->>'nativeUrl',''),i.url),s.priority+100,now()+make_interval(secs=>coalesce(i.monitor_seconds,s.monitor_seconds,21600)))on conflict(item_id)where kind='monitor'do update set state=case when i.status='retired'then 'queued'else supplier_tracker_tasks.state end,next_run_at=case when i.status='retired'then now()else supplier_tracker_tasks.next_run_at end;
  seen:=seen+1;
 end loop;
 for page_url in select jsonb_array_elements_text(page_input->'pages')loop
  perform tracker_validate_url_v1(t.supplier_id,page_url);
  if not tracker_same_category_v1(s.url,page_url)then raise exception 'Page outside selected category';end if;
  if not exists(select 1 from supplier_tracker_tasks where run_id=r.id and url=page_url)then
   if(select count(*)from supplier_tracker_tasks where run_id=r.id)>=s.max_pages then update supplier_tracker_runs set report=report||'{"limitReached":true}'::jsonb where id=r.id;continue;end if;
   insert into supplier_tracker_tasks(supplier_id,source_id,run_id,kind,url,priority)values(t.supplier_id,s.id,r.id,'discover',page_url,s.priority)on conflict(run_id,url)where kind='discover'do nothing;
  end if;
 end loop;
 update supplier_tracker_tasks set state='done',finished_at=now(),leased_until=null,lease_token=null,last_error=null where id=t.id;
 update supplier_tracker_runs set pages=pages+1,items=items+seen,new_items=new_items+created where id=r.id;
 if not exists(select 1 from supplier_tracker_tasks where run_id=r.id and state in('queued','retry','running'))then
  update supplier_tracker_runs set state=case when exists(select 1 from supplier_tracker_tasks where run_id=r.id and state='blocked')or coalesce((report->>'limitReached')::boolean,false)or coalesce((report->>'cycleDetected')::boolean,false)then 'partial'else 'done'end,finished_at=now()where id=r.id;
  update supplier_tracker_sources set last_success_at=case when not exists(select 1 from supplier_tracker_runs where id=r.id and state='partial')then now()else last_success_at end where id=s.id;
 end if;
 update suppliers set tracker_failures=0,tracker_blocked_until=null where id=t.supplier_id;
 return jsonb_build_object('seen',seen,'new',created,'runId',r.id);
end$$;

create function public.tracker_record_monitor_v1(task_input uuid,token_input uuid,result_input jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare t supplier_tracker_tasks;i supplier_tracker_items;before_row jsonb;event_kind text;price numeric;currency_value text;status_value text;interval_value integer;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 select *into t from supplier_tracker_tasks where id=task_input for update;
 if not found or t.kind<>'monitor'or t.state<>'running'or t.lease_token is distinct from token_input or t.leased_until<now()then raise exception 'Stale lease';end if;
 select *into i from supplier_tracker_items where id=t.item_id for update;
 perform tracker_validate_url_v1(t.supplier_id,t.url);
 if not i.tracking_enabled or i.excluded then raise exception 'Item paused';end if;
 before_row:=to_jsonb(i);event_kind:=result_input->>'kind';
 if event_kind='ok'then
  if result_input->>'externalId' is distinct from i.external_id and i.external_id not like 'url:%'then raise exception 'Source identity changed';end if;
  price:=(result_input->>'cost')::numeric;currency_value:=result_input->>'currency';
  update supplier_tracker_items set external_id=case when i.external_id like 'url:%'then result_input->>'externalId'else external_id end,title=result_input->>'title',brand=coalesce(result_input->>'brand',brand),sku=coalesce(result_input->>'sku',sku),model=coalesce(result_input->>'model',model),gtin=coalesce(result_input->>'gtin',gtin),variant_key=coalesce(result_input->>'variantKey',variant_key),
   image_url=coalesce(result_input->>'imageUrl',image_url),description=coalesce(result_input->>'description',description),raw_price=coalesce(result_input->>'rawPrice',raw_price),
   origin_cost=case when price>0 and currency_value is not null then price else origin_cost end,currency=case when price>0 and currency_value is not null then currency_value else currency end,
   normalized_usd=case when price>0 and currency_value is not null then(result_input->>'normalizedUsd')::numeric else normalized_usd end,normalization=case when price>0 and currency_value is not null then result_input->'normalization'else normalization end,
   cost_checked_at=case when price>0 and currency_value is not null then now()else cost_checked_at end,availability_checked_at=case when result_input->>'availability'in('in_stock','out_of_stock')then now()else availability_checked_at end,
   availability=case when result_input->>'availability' in('in_stock','out_of_stock')then result_input->>'availability'else availability end,quantity=(result_input->>'quantity')::integer,
   status=case when price is null or currency_value is null or result_input->>'availability'='unknown'then 'review'else 'tracked'end,last_checked_at=now(),last_success_at=now(),last_error=null,
   missing_count=0,first_missing_at=null,last_missing_at=null,evidence=evidence||jsonb_build_object('lastResult',result_input,'technicalIssue',null)where id=i.id;
  event_kind:=case when price is not null and i.currency=currency_value and price<i.origin_cost then 'price_down'when price is not null and i.currency=currency_value and price>i.origin_cost then 'price_up'
   when result_input->>'availability'='out_of_stock'and i.availability<>'out_of_stock'then 'out_of_stock'when result_input->>'availability'='in_stock'and i.availability<>'in_stock'then 'back_in_stock'else 'checked'end;
  update suppliers set tracker_failures=0,tracker_blocked_until=null where id=t.supplier_id;
 elsif event_kind='not_found'then
  update supplier_tracker_items set missing_count=case when last_missing_at is null or last_missing_at<=now()-interval '1 hour'then missing_count+1 else missing_count end,
   first_missing_at=coalesce(first_missing_at,now()),last_missing_at=case when last_missing_at is null or last_missing_at<=now()-interval '1 hour'then now()else last_missing_at end,
   last_checked_at=now(),last_error='HTTP 404: publicación a verificar',status=case when missing_count>=2 and first_missing_at<=now()-interval '24 hours'then 'retired'else 'issue'end where id=i.id;
  event_kind:=case when i.missing_count>=2 and i.first_missing_at<=now()-interval '24 hours'then 'retired'else 'missing_check'end;
 else
  update supplier_tracker_items set last_checked_at=now(),last_error=left(result_input->>'error',1000),status='issue'where id=i.id;event_kind:='technical_error';
 end if;
 select status into status_value from supplier_tracker_items where id=i.id;
 insert into supplier_tracker_events(supplier_id,item_id,task_id,kind,before_value,after_value,difference,percent)
 values(t.supplier_id,i.id,t.id,event_kind,before_row,(select to_jsonb(v)from supplier_tracker_items v where id=i.id),case when price is not null and i.currency=currency_value then price-i.origin_cost end,
 case when price is not null and i.origin_cost>0 and i.currency=currency_value then (price/i.origin_cost-1)*100 end);
 select coalesce(i.monitor_seconds,s.monitor_seconds,p.monitor_seconds)into interval_value from suppliers p left join supplier_tracker_sources s on s.id=t.source_id where p.id=t.supplier_id;
 update supplier_tracker_tasks set state=case when status_value='retired'then 'blocked'else 'queued'end,attempts=0,next_run_at=now()+make_interval(secs=>coalesce(interval_value,21600)),finished_at=now(),leased_until=null,lease_token=null,last_error=case when event_kind in('checked','price_down','price_up','out_of_stock','back_in_stock')then null else result_input->>'error'end where id=t.id;
 return jsonb_build_object('itemId',i.id,'status',status_value,'event',event_kind);
end$$;

create function public.tracker_fail_task_v1(task_input uuid,token_input uuid,error_input text,http_input integer default null)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t supplier_tracker_tasks;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 select *into t from supplier_tracker_tasks where id=task_input for update;
 if not found or t.lease_token is distinct from token_input or t.state<>'running'then raise exception 'Stale lease';end if;
 update supplier_tracker_tasks set state=case when attempts>=5 then 'blocked'else 'retry'end,next_run_at=now()+make_interval(secs=>least(86400,(60*power(2,least(t.attempts,10)))::integer)),last_error=left(error_input,1000),finished_at=now(),leased_until=null,lease_token=null where id=t.id;
 update suppliers set tracker_failures=tracker_failures+1,tracker_blocked_until=case when http_input in(403,429)or tracker_failures>=4 then now()+interval '30 minutes'else tracker_blocked_until end where id=t.supplier_id;
 if t.item_id is not null then update supplier_tracker_items set last_checked_at=now(),last_error=left(error_input,1000),status='issue'where id=t.item_id;end if;
 insert into supplier_tracker_events(supplier_id,item_id,task_id,run_id,kind,after_value)values(t.supplier_id,t.item_id,t.id,t.run_id,'technical_error',jsonb_build_object('error',left(error_input,1000),'http',http_input));
 if t.attempts>=5 and t.run_id is not null and not exists(select 1 from supplier_tracker_tasks where run_id=t.run_id and state in('queued','retry','running'))then update supplier_tracker_runs set state='partial',finished_at=now(),error=left(error_input,1000)where id=t.run_id;end if;
end$$;

create function public.tracker_schedule_sources_v1()returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare s supplier_tracker_sources;n integer:=0;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 for s in select a.*from supplier_tracker_sources a join suppliers p on p.id=a.supplier_id where a.kind='category'and a.enabled and a.next_run_at<=now()and p.is_active and p.archived_at is null and four_supplier_key_v1(p.website)is not null order by a.priority,a.id limit 20 for update of a skip locked loop
 perform tracker_start_source_v1(s.id);n:=n+1;end loop;return n;
end$$;

create function public.tracker_link_offer_v1(item_input uuid,offer_input uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare i supplier_tracker_items;o supplier_offers;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 select *into i from supplier_tracker_items where id=item_input for update;select *into o from supplier_offers where id=offer_input;
 if i.id is null or o.id is null or i.supplier_id<>o.supplier_id or(i.external_id<>o.external_id and i.external_id not like 'url:%')then raise exception 'Offer identity mismatch';end if;
 update supplier_tracker_items set offer_id=o.id,product_id=o.product_id,variant_id=o.variant_id where id=i.id;
end$$;
create function public.tracker_reprice_offer_v1(offer_input uuid)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;o supplier_offers;u record;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 select *into o from supplier_offers where id=offer_input;
 if to_regprocedure('public.store_refresh_supplier_usd_v1(uuid)')is null then return jsonb_build_object('status','usd_not_installed');end if;
 begin
  execute 'select public.store_refresh_supplier_usd_v1($1)'into result using offer_input;
  if result->>'status'='applied'then
   execute 'select public.store_usd_floor_v1($1,$2,public.store_price_ars_v1($1,$2,''retail'',null))'using o.product_id,o.variant_id;
   execute 'select wholesale_usd from public.product_usd_prices where product_id=$1 and variant_id is not distinct from $2'into u using o.product_id,o.variant_id;
   if u.wholesale_usd is not null then execute 'select public.store_usd_floor_v1($1,$2,public.store_price_ars_v1($1,$2,''wholesale'',null))'using o.product_id,o.variant_id;end if;
  end if;
 exception when others then
  result:=jsonb_build_object('status','blocked','reason',sqlerrm);
  insert into supplier_tracker_events(supplier_id,item_id,kind,after_value)values(o.supplier_id,(select id from supplier_tracker_items where offer_id=o.id limit 1),'commercial_alert',result||jsonb_build_object('offerId',o.id));
 end;return result;
end$$;
create function public.tracker_save_supplier_v1(supplier_input uuid,enabled_input boolean,seconds_input integer,priority_input integer)returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 if not exists(select 1 from suppliers where id=supplier_input and archived_at is null and four_supplier_key_v1(website)is not null)then raise exception 'Supplier archived';end if;
 update suppliers set monitor_enabled=enabled_input,monitor_seconds=seconds_input,tracker_priority=priority_input where id=supplier_input;
 insert into supplier_tracker_events(supplier_id,kind,after_value)values(supplier_input,'settings',jsonb_build_object('enabled',enabled_input,'seconds',seconds_input,'priority',priority_input));
end$$;
create function public.tracker_prefer_offer_v1(product_input uuid,variant_input uuid,offer_input uuid,reason_input text)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare o supplier_offers;begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 select *into o from supplier_offers where id=offer_input and product_id=product_input and variant_id is not distinct from variant_input and verification='verified';
 if not found or length(btrim(reason_input))<10 then raise exception 'Exact linked offer and reason required';end if;
 perform tracker_validate_url_v1(o.supplier_id,o.source_url);
 insert into product_supplier_preferences(product_id,variant_id,offer_id,reason)values(product_input,variant_input,offer_input,reason_input)
 on conflict(product_id,variant_id)do update set offer_id=excluded.offer_id,reason=excluded.reason,actor=auth.uid(),updated_at=now();
 insert into supplier_tracker_events(supplier_id,kind,after_value)values(o.supplier_id,'preferred_offer',jsonb_build_object('productId',product_input,'variantId',variant_input,'offerId',o.id,'reason',reason_input));
end$$;
create function public.tracker_workspace_v1(filters_input jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare total bigint;items jsonb;page integer:=coalesce((filters_input->>'page')::integer,1);size integer:=coalesce((filters_input->>'size')::integer,30);q text:=coalesce(filters_input->>'q','');supplier uuid:=nullif(filters_input->>'supplierId','')::uuid;source uuid:=nullif(filters_input->>'sourceId','')::uuid;status_value text:=nullif(filters_input->>'status','');history uuid:=nullif(filters_input->>'historyId','')::uuid;begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 if page<1 or size not between 1 and 100 or length(q)>120 then raise exception 'Invalid filters';end if;
 select count(*)into total from supplier_tracker_items i where(supplier is null or i.supplier_id=supplier)and(status_value is null or i.status=status_value)
 and(source is null or exists(select 1 from supplier_tracker_memberships m where m.source_id=source and m.item_id=i.id))and(q=''or position(lower(q)in lower(i.title||' '||i.brand||' '||i.sku))>0);
 select coalesce(jsonb_agg(to_jsonb(t)),'[]')into items from(select i.*from supplier_tracker_items i where(supplier is null or i.supplier_id=supplier)and(status_value is null or i.status=status_value)
 and(source is null or exists(select 1 from supplier_tracker_memberships m where m.source_id=source and m.item_id=i.id))and(q=''or position(lower(q)in lower(i.title||' '||i.brand||' '||i.sku))>0)
 order by i.first_seen_at desc,i.id offset(page-1)*size limit size)t;
 return jsonb_build_object('total',total,'page',page,'size',size,'items',items,
 'suppliers',(select coalesce(jsonb_agg(to_jsonb(t)),'[]')from(select id,name,website,official_key,is_active,archived_at,monitor_enabled,monitor_seconds,tracker_priority,tracker_blocked_until,tracker_failures from suppliers order by archived_at nulls first,name)t),
 'sources',(select coalesce(jsonb_agg(to_jsonb(t)),'[]')from(select *from supplier_tracker_sources order by created_at desc limit 1000)t),
 'runs',(select coalesce(jsonb_agg(to_jsonb(t)),'[]')from(select *from supplier_tracker_runs order by started_at desc limit 30)t),
 'events',(select coalesce(jsonb_agg(to_jsonb(t)),'[]')from(select id,supplier_id,item_id,kind,difference,percent,created_at,after_value from supplier_tracker_events where(history is null or item_id=history)order by created_at desc limit 60)t),
 'categories',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name)),'[]')from categories),
 'counts',(select jsonb_object_agg(status,n)from(select status,count(*)n from supplier_tracker_items group by status)t));
end$$;

-- Automatic import creates only the existing reviewable draft jobs, never a publication.
create function public.tracker_queue_drafts_v1(source_input uuid,item_ids_input uuid[],rows_input jsonb)returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare s supplier_tracker_sources;entry jsonb;job uuid;ord bigint;cfg jsonb;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 select *into s from supplier_tracker_sources where id=source_input for update;
 if not found or not s.enabled or not s.auto_import or s.import_category_id is null then raise exception 'Automatic draft import disabled';end if;
 if cardinality(item_ids_input)not between 1 and 5 or jsonb_typeof(rows_input)is distinct from 'array'or jsonb_array_length(rows_input)<>cardinality(item_ids_input)then raise exception 'Invalid draft batch';end if;
 perform tracker_validate_url_v1(s.supplier_id,s.url);
 if exists(select 1 from unnest(item_ids_input)wanted(item_id) where not exists(select 1 from supplier_tracker_items i join supplier_tracker_memberships m on m.item_id=i.id where i.id=wanted.item_id and m.source_id=s.id and not i.excluded and i.product_id is null and i.offer_id is not null))then raise exception 'Item selection changed';end if;
 cfg:=jsonb_build_object('category_id',s.import_category_id,'automatic_publication',false,'tracker_source_id',s.id,
 'pricing_rule_id',(select id from catalog_pricing_rules order by created_at desc,id desc limit 1),'import_policy_id',(select id from import_cost_policies order by created_at desc limit 1),
 'tracking_config',(select config from supplier_tracking_settings where id=true));
 insert into catalog_import_jobs(request_key,state,config)values(gen_random_uuid(),'queued',cfg)returning id into job;
 for entry,ord in select value,ordinality from jsonb_array_elements(rows_input)with ordinality loop
  if not exists(select 1 from supplier_tracker_items where id=any(item_ids_input)and offer_id=(entry->>'offer_id')::uuid)or entry->'payload'->>'action'not in('new','review','skip')then raise exception 'Draft row identity mismatch';end if;
  if entry->'payload'->>'action'='new'and(entry->'payload'->'product'->>'category_id')is distinct from s.import_category_id::text then raise exception 'Draft category mismatch';end if;
  insert into catalog_import_items(job_id,offer_id,position,payload)values(job,(entry->>'offer_id')::uuid,ord-1,entry->'payload');
 end loop;
 insert into supplier_tracker_events(supplier_id,kind,after_value)values(s.supplier_id,'automatic_draft_job',jsonb_build_object('jobId',job,'items',item_ids_input));return job;
end$$;

create function public.four_supplier_scope_guard_v1()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_table_name='suppliers'then
  if new.is_active and four_supplier_key_v1(new.website)is null then raise exception 'Only the four approved suppliers can be active';end if;
 elsif not exists(select 1 from suppliers where id=new.supplier_id and is_active and archived_at is null and four_supplier_key_v1(website)is not null)then
  if tg_op='INSERT'or new.origin_cost is distinct from old.origin_cost or new.availability is distinct from old.availability or new.cost_checked_at is distinct from old.cost_checked_at or new.availability_checked_at is distinct from old.availability_checked_at then raise exception 'Supplier archived: worker write rejected';end if;
 end if;return new;
end$$;
create trigger only_four_active_suppliers before insert or update on suppliers for each row execute function four_supplier_scope_guard_v1();
create trigger archived_supplier_offer_guard before insert or update on supplier_offers for each row execute function four_supplier_scope_guard_v1();

create function public.apply_four_supplier_scope_v1(expected_ids_input uuid[],backup_hash_input text,expected_variants_input uuid[] default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare ids uuid[];variants_ids uuid[];before_state jsonb;result jsonb;job record;begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 if backup_hash_input!~'^[a-f0-9]{64}$'then raise exception 'Verified backup hash required';end if;
 perform pg_advisory_xact_lock(hashtextextended('four-supplier-scope-20261106',0));
 perform 1 from suppliers order by id for update;perform 1 from products order by id for update;
 if exists(select 1 from supplier_scope_audit where backup_hash=backup_hash_input)then return (select detail->'result'from supplier_scope_audit where backup_hash=backup_hash_input limit 1);end if;
 if(select count(distinct four_supplier_key_v1(website))from suppliers where four_supplier_key_v1(website)is not null)<>4 then raise exception 'Verify all four provider identities';end if;
 select array_agg(p.id order by p.id)into ids from products p where p.fulfillment_mode='supplier'and not exists(select 1 from product_variants v where v.product_id=p.id and v.fulfillment_mode<>'supplier'and v.stock>0)
 and(exists(select 1 from supplier_offers o join suppliers s on s.id=o.supplier_id where o.product_id=p.id and four_supplier_key_v1(s.website)is null)
 or exists(select 1 from suppliers s where four_supplier_key_v1(s.website)is null and split_part(regexp_replace(coalesce(p.source_url,''),'^https://(www\.)?',''), '/',1)=split_part(regexp_replace(s.website,'^https://(www\.)?',''), '/',1)))
 and four_supplier_key_v1(p.source_url)is null and not exists(select 1 from supplier_offers o join suppliers s on s.id=o.supplier_id where o.product_id=p.id and four_supplier_key_v1(s.website)is not null and o.verification='verified');
 if coalesce(ids,'{}')is distinct from coalesce((select array_agg(x order by x)from unnest(expected_ids_input)x),'{}')then raise exception 'Cleanup scope changed: audit and backup again';end if;
 select array_agg(v.id order by v.id)into variants_ids from product_variants v where v.fulfillment_mode='supplier'
 and exists(select 1 from supplier_offers o join suppliers s on s.id=o.supplier_id where o.variant_id=v.id and four_supplier_key_v1(s.website)is null)
 and not exists(select 1 from supplier_offers o join suppliers s on s.id=o.supplier_id where o.variant_id=v.id and four_supplier_key_v1(s.website)is not null and o.verification='verified');
 if coalesce(variants_ids,'{}')is distinct from coalesce((select array_agg(x order by x)from unnest(expected_variants_input)x),'{}')then raise exception 'Variant cleanup scope changed';end if;
 before_state:=jsonb_build_object('suppliers',(select jsonb_agg(to_jsonb(s))from suppliers s),'products',(select jsonb_agg(to_jsonb(p))from products p where id=any(ids)),
 'variants',(select jsonb_agg(to_jsonb(v))from product_variants v where product_id=any(ids)or id=any(variants_ids)));
 update suppliers set is_active=false,automation_authorized=false,monitor_enabled=false,archived_at=coalesce(archived_at,now()),archive_reason='Alcance aprobado: cuatro proveedores, 06/11/2026'where four_supplier_key_v1(website)is null;
 update supplier_offers o set archived_at=coalesce(o.archived_at,now())from suppliers s where s.id=o.supplier_id and s.archived_at is not null;
 update supplier_sync_queue q set state='blocked',leased_until=null,last_error='Proveedor archivado por alcance del dueño'from suppliers s where s.id=q.supplier_id and s.archived_at is not null;
 update supplier_discovery_jobs q set state='blocked',leased_until=null,last_error='Proveedor archivado por alcance del dueño'from suppliers s where s.id=q.supplier_id and s.archived_at is not null;
 update products set is_active=false,supplier_archived_at=coalesce(supplier_archived_at,now()),supplier_archive_reason='Dependencia exclusiva de proveedores archivados',deleted_at=coalesce(deleted_at,now())where id=any(ids);
 update product_variants set is_active=false,supplier_archived_at=coalesce(supplier_archived_at,now())where product_id=any(ids)or id=any(variants_ids);
 for job in select jobid from cron.job where jobname~*'atlantico|madrid|mobile.?zone|neo.?import|vencell|bencel'loop perform cron.unschedule(job.jobid);end loop;
 result:=jsonb_build_object('archivedSuppliers',(select count(*)from suppliers where archived_at is not null),'archivedProducts',cardinality(ids),'productIds',ids,'archivedVariants',cardinality(variants_ids),'variantIds',variants_ids,'ordersTouched',0,'stockTouched',0);
 insert into supplier_scope_audit(backup_hash,detail)values(backup_hash_input,jsonb_build_object('before',before_state,'result',result));return result;
end$$;

do $$declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and(p.proname like 'tracker_%'or p.proname like 'four_supplier_%'or p.proname='apply_four_supplier_scope_v1')loop
 execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);end loop;
end$$;
grant execute on function tracker_start_source_v1(uuid),tracker_save_source_v1(jsonb),tracker_control_v1(text,uuid,text),tracker_save_supplier_v1(uuid,boolean,integer,integer),tracker_prefer_offer_v1(uuid,uuid,uuid,text),tracker_workspace_v1(jsonb)to authenticated;
grant execute on function tracker_save_source_v1(jsonb),tracker_start_source_v1(uuid),tracker_claim_tasks_v1(integer),tracker_record_page_v1(uuid,uuid,jsonb),tracker_record_monitor_v1(uuid,uuid,jsonb),tracker_fail_task_v1(uuid,uuid,text,integer),tracker_schedule_sources_v1(),tracker_link_offer_v1(uuid,uuid),tracker_reprice_offer_v1(uuid),tracker_queue_drafts_v1(uuid,uuid[],jsonb),apply_four_supplier_scope_v1(uuid[],text,uuid[])to service_role;
commit;
