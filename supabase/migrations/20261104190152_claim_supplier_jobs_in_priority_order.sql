create or replace function public.claim_supplier_jobs_v1(limit_input integer default 20)
returns setof public.supplier_sync_queue
language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(current_setting('role', true), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if limit_input is null or limit_input not between 1 and 100 then
    raise exception 'Invalid limit';
  end if;

  return query
  with due as (
    select j.id
    from public.supplier_sync_queue j
    join public.suppliers s on s.id = j.supplier_id
    where s.is_active and s.automation_authorized and j.state <> 'blocked'
      and j.next_run_at <= now() and (j.leased_until is null or j.leased_until < now())
    order by j.next_run_at, j.id
    limit limit_input
    for update of j skip locked
  ), claimed as (
    update public.supplier_sync_queue q
    set state = 'running', leased_until = now() + interval '15 minutes', updated_at = now()
    from due
    where q.id = due.id
    returning q.*
  )
  select c.* from claimed c order by c.next_run_at, c.id;
end;
$$;
