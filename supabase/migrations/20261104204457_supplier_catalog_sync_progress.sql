create table public.supplier_catalog_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create unique index supplier_catalog_sync_one_open
  on public.supplier_catalog_sync_runs ((true)) where finished_at is null;

create table public.supplier_catalog_sync_products (
  run_id uuid not null references public.supplier_catalog_sync_runs on delete cascade,
  product_id uuid not null,
  position integer not null,
  title text not null,
  scope text not null check (scope in ('own','supplier')),
  missing_variants boolean not null default false,
  primary key (run_id, product_id),
  unique (run_id, position)
);

create table public.supplier_catalog_sync_checks (
  run_id uuid not null,
  product_id uuid not null,
  job_id uuid not null,
  status text not null default 'pending' check (status in ('pending','available','unavailable','error','skipped')),
  finished_at timestamptz,
  message text,
  primary key (run_id, job_id),
  foreign key (run_id, product_id) references public.supplier_catalog_sync_products on delete cascade
);
create index supplier_catalog_sync_pending_checks on public.supplier_catalog_sync_checks (job_id, run_id)
  where status = 'pending';

alter table public.supplier_catalog_sync_runs enable row level security;
alter table public.supplier_catalog_sync_products enable row level security;
alter table public.supplier_catalog_sync_checks enable row level security;
revoke all on public.supplier_catalog_sync_runs, public.supplier_catalog_sync_products, public.supplier_catalog_sync_checks
  from public, anon, authenticated;

create view public.supplier_catalog_sync_eligible_v1 as
select q.id, q.product_id, q.variant_id
from public.supplier_sync_queue q
join public.suppliers s on s.id = q.supplier_id
join public.supplier_offers o on o.id = q.offer_id
join public.products p on p.id = q.product_id
left join public.product_variants v on v.id = q.variant_id and v.product_id = p.id
where p.deleted_at is null and s.is_active and s.automation_authorized and s.query_mode = 'product_page'
  and o.supplier_id = q.supplier_id and o.source_url = q.source_url
  and o.product_id = q.product_id and o.variant_id is not distinct from q.variant_id
  and o.verification = 'verified' and o.variant_key not like 'listing:%'
  and (q.state in ('ready','running') or (q.state = 'retry' and q.next_run_at <= now()))
  and ((q.variant_id is null and not coalesce(p.has_variants,false) and p.fulfillment_mode = 'supplier')
    or (v.is_active and v.fulfillment_mode = 'supplier'));
revoke all on public.supplier_catalog_sync_eligible_v1 from public, anon, authenticated;

create function public.finish_supplier_catalog_sync_v1() returns void
language sql set search_path = public, pg_temp as $$
  update public.supplier_catalog_sync_runs r set finished_at = clock_timestamp()
  where r.finished_at is null and not exists (
    select 1 from public.supplier_catalog_sync_checks c where c.run_id = r.id and c.status = 'pending'
  );
$$;

create function public.record_supplier_catalog_sync_v1() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare outcome text; detail text;
begin
  if old.state <> 'running' then return new; end if;
  if new.last_success_at is not null and new.last_success_at is distinct from old.last_success_at
    and new.state = 'ready' and new.last_error is null then
    select case availability when 'in_stock' then 'available' when 'out_of_stock' then 'unavailable' end
      into outcome from public.supplier_offers where id = new.offer_id;
    if outcome is null then
      outcome := 'error';
      detail := 'La consulta no dejó disponibilidad verificable.';
    end if;
  elsif new.state in ('retry','blocked') and new.attempts > old.attempts then
    outcome := 'error';
    detail := left(new.last_error, 300);
  else
    return new;
  end if;

  update public.supplier_catalog_sync_checks c
  set status = outcome, message = detail, finished_at = clock_timestamp()
  from public.supplier_catalog_sync_runs r
  where c.job_id = new.id and c.run_id = r.id and r.finished_at is null and c.status = 'pending';
  if found then perform public.finish_supplier_catalog_sync_v1(); end if;
  return new;
end;
$$;

create trigger record_supplier_catalog_sync
after update of last_success_at, attempts on public.supplier_sync_queue
for each row execute function public.record_supplier_catalog_sync_v1();

create function public.reconcile_supplier_catalog_sync_v1() returns void
language sql set search_path = public, pg_temp as $$
  update public.supplier_catalog_sync_checks c set status = 'skipped', finished_at = clock_timestamp(),
    message = 'La ficha ya no está habilitada para consulta.'
  from public.supplier_catalog_sync_runs r
  where r.id = c.run_id and r.finished_at is null and c.status = 'pending'
    and not exists (select 1 from public.supplier_catalog_sync_eligible_v1 e where e.id = c.job_id);
  select public.finish_supplier_catalog_sync_v1();
$$;

create function public.start_supplier_catalog_sync_v1() returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare sync_id uuid;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Forbidden'; end if;
  if not coalesce((select config->>'enabled' = 'true' from public.supplier_tracking_settings where id),false)
    then raise exception 'El seguimiento de proveedores está desactivado.'; end if;
  perform pg_advisory_xact_lock(87241631);
  perform public.reconcile_supplier_catalog_sync_v1();
  select id into sync_id from public.supplier_catalog_sync_runs where finished_at is null;
  if found then return sync_id; end if;
  delete from public.supplier_catalog_sync_runs where finished_at < now() - interval '30 days';
  insert into public.supplier_catalog_sync_runs default values returning id into sync_id;

  insert into public.supplier_catalog_sync_products(run_id, product_id, position, title, scope, missing_variants)
  select sync_id, p.id, row_number() over(order by p.title,p.id), p.title,
    case when p.fulfillment_mode = 'supplier' or exists (
      select 1 from public.product_variants v where v.product_id = p.id and v.is_active and v.fulfillment_mode = 'supplier'
    ) then 'supplier' else 'own' end,
    exists (
      select 1 from public.product_variants v where v.product_id = p.id and v.is_active and v.fulfillment_mode = 'supplier'
      and not exists (select 1 from public.supplier_catalog_sync_eligible_v1 e where e.variant_id = v.id)
    )
  from public.products p where p.deleted_at is null;

  insert into public.supplier_catalog_sync_checks(run_id,product_id,job_id)
  select sync_id,e.product_id,e.id from public.supplier_catalog_sync_eligible_v1 e
  join public.supplier_catalog_sync_products p on p.run_id = sync_id and p.product_id = e.product_id;

  if found then
    perform public.enqueue_supplier_cloud_tick_v1('sync');
  else
    perform public.finish_supplier_catalog_sync_v1();
  end if;
  return sync_id;
end;
$$;

create function public.read_supplier_catalog_sync_v1(page_input integer default 1) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare latest public.supplier_catalog_sync_runs; result jsonb;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Forbidden'; end if;
  if page_input is null or page_input < 1 or page_input > 10000 then raise exception 'Invalid page'; end if;
  select * into latest from public.supplier_catalog_sync_runs order by started_at desc,id desc limit 1;
  if not found then return null; end if;

  with rows as materialized (
    select p.position,p.title,
      case
        when count(c.job_id) filter (where c.status = 'pending') > 0 then
          case when bool_or(q.state = 'running' and q.leased_until > now()) then 'running' else 'pending' end
        when p.scope = 'own' then 'own'
        when count(c.job_id) = 0 or bool_and(c.status = 'skipped') then 'review'
        when p.missing_variants or bool_or(c.status in ('error','skipped')) then 'issue'
        else 'checked'
      end as status,
      max(c.finished_at) as finished_at,
      count(c.job_id) as sources,
      count(c.job_id) filter (where c.status in ('available','unavailable')) as verified,
      count(c.job_id) filter (where c.status = 'available') as available,
      max(c.message) as message,
      p.missing_variants
    from public.supplier_catalog_sync_products p
    left join public.supplier_catalog_sync_checks c on c.run_id = p.run_id and c.product_id = p.product_id
    left join public.supplier_sync_queue q on q.id = c.job_id and c.status = 'pending'
    where p.run_id = latest.id
    group by p.position,p.title,p.scope,p.missing_variants
  )
  select jsonb_build_object(
    'id',latest.id,'startedAt',latest.started_at,'finishedAt',latest.finished_at,
    'enabled',coalesce((select config->>'enabled' = 'true' from public.supplier_tracking_settings where id),false),
    'total',count(*),'processed',count(*) filter (where status not in ('pending','running')),
    'checked',count(*) filter (where status = 'checked'),'issues',count(*) filter (where status = 'issue'),
    'own',count(*) filter (where status = 'own'),'review',count(*) filter (where status = 'review'),
    'queries',coalesce(sum(verified),0),
    'recent',coalesce((select jsonb_agg(to_jsonb(r) order by r.finished_at desc,r.position)
      from (select * from rows where finished_at is not null and status not in ('pending','running')
        order by finished_at desc,position limit 6) r),'[]'::jsonb),
    'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.position)
      from (select * from rows order by position limit 25 offset (page_input-1)*25) r),'[]'::jsonb)
  ) into result from rows;
  return result;
end;
$$;

revoke all on function public.finish_supplier_catalog_sync_v1(), public.reconcile_supplier_catalog_sync_v1(),
  public.record_supplier_catalog_sync_v1(), public.start_supplier_catalog_sync_v1(), public.read_supplier_catalog_sync_v1(integer)
  from public, anon, authenticated;
grant execute on function public.start_supplier_catalog_sync_v1(), public.read_supplier_catalog_sync_v1(integer) to authenticated;

create or replace function public.claim_supplier_jobs_v1(limit_input integer default 20)
returns setof public.supplier_sync_queue
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if coalesce(current_setting('role', true), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if limit_input is null or limit_input not between 1 and 100 then raise exception 'Invalid limit'; end if;
  perform public.reconcile_supplier_catalog_sync_v1();

  return query
  with requested as materialized (
    select c.job_id
    from public.supplier_catalog_sync_checks c
    join public.supplier_catalog_sync_runs r on r.id = c.run_id
    where r.finished_at is null and c.status = 'pending'
  ), due as (
    select j.id, (requested.job_id is not null) as priority
    from public.supplier_sync_queue j
    join public.suppliers s on s.id = j.supplier_id
    left join requested on requested.job_id = j.id
    where s.is_active and s.automation_authorized and j.state <> 'blocked'
      and (j.next_run_at <= now() or requested.job_id is not null)
      and (j.leased_until is null or j.leased_until < now())
    order by priority desc,j.next_run_at,j.id
    limit limit_input
    for update of j skip locked
  ), claimed as (
    update public.supplier_sync_queue q
    set state = 'running', leased_until = now() + interval '15 minutes', updated_at = now()
    from due where q.id = due.id
    returning q.*
  )
  select c.* from claimed c join due d on d.id = c.id order by d.priority desc,c.next_run_at,c.id;
end;
$$;
revoke all on function public.claim_supplier_jobs_v1(integer) from public, anon, authenticated;
grant execute on function public.claim_supplier_jobs_v1(integer) to service_role;
