begin;
-- One-use, purpose-limited tickets, never a service key or reusable cron secret in pg_net.
create table public.supplier_cloud_ticks (
 id uuid primary key default gen_random_uuid(),
 token_hash text unique not null,
 job text not null check(job in ('sync','details','market','plan')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '2 minutes',
 consumed_at timestamptz,
 request_id bigint
);
create table public.supplier_cloud_leases (
 job text primary key,
 leased_until timestamptz not null
);
alter table public.supplier_cloud_ticks enable row level security;
alter table public.supplier_cloud_leases enable row level security;
revoke all on public.supplier_cloud_ticks,public.supplier_cloud_leases from public,anon,authenticated;
grant all on public.supplier_cloud_ticks,public.supplier_cloud_leases to service_role;

create function public.enqueue_supplier_cloud_tick_v1(job_input text) returns bigint
language plpgsql security definer set search_path=public,extensions as $$
declare ticket text; tick_id uuid; queued_request_id bigint;
begin
 if job_input not in ('sync','details','market','plan') or job_input is null then raise exception 'Invalid cloud job';end if;
 if not coalesce((select (config->>'enabled')::boolean from public.supplier_tracking_settings where id=true),false) then return null;end if;
 delete from public.supplier_cloud_ticks where created_at<now()-interval '7 days';
 ticket:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.supplier_cloud_ticks(token_hash,job) values(encode(extensions.digest(ticket,'sha256'),'hex'),job_input) returning id into tick_id;
 select net.http_post(
  url:='https://gqcdurxndbeeugjfworx.supabase.co/functions/v1/supplier-tracking',
  headers:=jsonb_build_object('Content-Type','application/json'),
  body:=jsonb_build_object('ticket',ticket),timeout_milliseconds:=10000
 ) into queued_request_id;
 update public.supplier_cloud_ticks set request_id=queued_request_id where id=tick_id;
 return queued_request_id;
end $$;
revoke all on function public.enqueue_supplier_cloud_tick_v1(text) from public,anon,authenticated,service_role;

create function public.consume_supplier_cloud_tick_v1(ticket_input text) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
declare job_name text; claimed text;
begin
 if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden';end if;
 if ticket_input is null or ticket_input !~ '^[0-9a-f]{64}$' then return null;end if;
 update public.supplier_cloud_ticks set consumed_at=now()
 where token_hash=encode(extensions.digest(ticket_input,'sha256'),'hex') and consumed_at is null and expires_at>now()
 returning job into job_name;
 if job_name is null then return null;end if;
 insert into public.supplier_cloud_leases(job,leased_until) values(job_name,now()+interval '140 seconds')
 on conflict(job) do update set leased_until=excluded.leased_until
 where supplier_cloud_leases.leased_until<now() returning job into claimed;
 return jsonb_build_object('job',job_name,'run',claimed is not null);
end $$;
revoke all on function public.consume_supplier_cloud_tick_v1(text) from public,anon,authenticated;
grant execute on function public.consume_supplier_cloud_tick_v1(text) to service_role;

create function public.claim_supplier_cloud_details_v1(limit_input integer default 6) returns setof public.supplier_discovery_jobs
language plpgsql security definer set search_path=public as $$
begin
 if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden';end if;
 if limit_input not between 1 and 12 or limit_input is null then raise exception 'Invalid limit';end if;
 return query update supplier_discovery_jobs j set state='running',leased_until=now()+interval '10 minutes',last_attempt_at=now()
 where j.id in(select d.id from supplier_discovery_jobs d join suppliers s on s.id=d.supplier_id
 where d.kind='detail' and s.query_mode='product_page' and s.is_active and s.automation_authorized
 and d.state<>'blocked' and d.next_run_at<=now() and(d.leased_until is null or d.leased_until<now())
 order by d.next_run_at,d.id for update of d skip locked limit limit_input) returning j.*;
end $$;
revoke all on function public.claim_supplier_cloud_details_v1(integer) from public,anon,authenticated;
grant execute on function public.claim_supplier_cloud_details_v1(integer) to service_role;
commit;
