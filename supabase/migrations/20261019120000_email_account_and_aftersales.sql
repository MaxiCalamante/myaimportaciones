-- Extend the existing outbox; capture only future committed events.
create or replace function public.capture_account_welcome_email_v1() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.email_confirmed_at is null or coalesce(new.email,'')='' then return null; end if;
 if tg_op='UPDATE' and old.email_confirmed_at is not null then return null; end if;
 perform public.queue_transactional_email_v1('account/'||new.id||'/welcome','account_welcome','customer',null,
  jsonb_build_object('profile_id',new.id,'customer_email',lower(new.email),'shipping_name',new.raw_user_meta_data->>'full_name'));
 return null;
end $$;
create constraint trigger account_welcome_email after insert or update on auth.users
 deferrable initially deferred for each row execute function public.capture_account_welcome_email_v1();

create or replace function public.capture_wholesale_email_v1() returns trigger
language plpgsql security definer set search_path=public as $$
declare ev text;
begin
 if new.is_approved_wholesale is not distinct from old.is_approved_wholesale or coalesce(new.email,'')='' then return new; end if;
 ev:=case when new.is_approved_wholesale then 'wholesale_approved' else 'wholesale_revoked' end;
 -- One key for each actual transition, including later re-approval.
 perform public.queue_transactional_email_v1('account/'||new.id||'/'||ev||'/'||gen_random_uuid(),ev,'customer',null,
  jsonb_build_object('profile_id',new.id,'customer_email',lower(new.email),'shipping_name',new.full_name));
 return new;
end $$;
create trigger wholesale_email after update on public.profiles for each row execute function public.capture_wholesale_email_v1();

create or replace function public.capture_withdrawal_update_email_v1() returns trigger
language plpgsql security definer set search_path=public as $$
declare ev text;
begin
 if new.status is not distinct from old.status or new.status not in ('contacted','resolved') then return new; end if;
 ev:='withdrawal_'||new.status;
 perform public.queue_transactional_email_v1('withdrawal/'||new.id||'/'||ev,ev,'customer',null,
  jsonb_build_object('customer_email',lower(new.email),'tracking_code',new.order_code,'reference',new.reference));
 return new;
end $$;
create trigger withdrawal_update_email after update on public.withdrawal_requests for each row execute function public.capture_withdrawal_update_email_v1();
revoke all on function public.capture_account_welcome_email_v1(),public.capture_wholesale_email_v1(),public.capture_withdrawal_update_email_v1() from public,anon,authenticated;
