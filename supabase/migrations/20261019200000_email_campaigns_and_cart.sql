-- MYA only. Promotional consent is separate from order/account notifications.
create table public.email_preferences (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 email text not null,
 promotions boolean not null default false,
 cart_reminders boolean not null default false,
 revision bigint not null default 1,
 unsubscribe_token text not null unique default (replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')),
 updated_at timestamptz not null default now()
);
create table public.email_consent_events (
 id bigint generated always as identity primary key,
 profile_id uuid references public.profiles(id) on delete set null,
 promotions boolean not null, cart_reminders boolean not null,
 source text not null check(source in ('account','unsubscribe')),
 created_at timestamptz not null default now()
);
create table public.email_campaigns (
 id uuid primary key default gen_random_uuid(),
 subject text not null check(length(subject) between 3 and 150),
 heading text not null check(length(heading) between 3 and 150),
 message text not null check(length(message) between 10 and 5000),
 action_path text not null default '/catalogo' check(action_path ~ '^/[a-zA-Z0-9/?=&%_.-]*$' and action_path !~ '^//' and length(action_path)<=500),
 status text not null default 'draft' check(status in ('draft','queued','queued_all','cancelled')),
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), launched_at timestamptz,
 cursor_profile uuid, queued_count integer not null default 0
);
-- Contains product references only. Never trusted for pricing, availability or payment.
create table public.email_saved_carts (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 items jsonb not null default '[]', revision uuid not null default gen_random_uuid(),
 updated_at timestamptz not null default now(), last_reminded_at timestamptz
);
create index email_cart_due on public.email_saved_carts(updated_at) where items <> '[]'::jsonb;
alter table public.email_preferences enable row level security;
alter table public.email_consent_events enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_saved_carts enable row level security;
revoke all on public.email_preferences,public.email_consent_events,public.email_campaigns,public.email_saved_carts from public,anon,authenticated;
grant all on public.email_preferences,public.email_consent_events,public.email_campaigns,public.email_saved_carts to service_role;
grant usage,select on sequence public.email_consent_events_id_seq to service_role;
grant select on public.email_preferences,public.email_campaigns,public.email_saved_carts to authenticated;
create policy "Own email preferences" on public.email_preferences for select to authenticated using(profile_id=auth.uid());
create policy "Own saved reminder cart" on public.email_saved_carts for select to authenticated using(profile_id=auth.uid());
create policy "Admin campaigns" on public.email_campaigns for select to authenticated using(public.is_admin());

create function public.set_email_preferences_v1(promotions_input boolean,cart_input boolean)
returns void language plpgsql security definer set search_path=public as $$
declare address text;
begin
 select lower(email) into address from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if address is null or promotions_input is null or cart_input is null then raise exception 'Authenticated confirmed account required'; end if;
 insert into email_preferences(profile_id,email,promotions,cart_reminders)
 values(auth.uid(),address,promotions_input,cart_input)
 on conflict(profile_id) do update set email=excluded.email,promotions=excluded.promotions,cart_reminders=excluded.cart_reminders,
 revision=email_preferences.revision+1,updated_at=now();
 insert into email_consent_events(profile_id,promotions,cart_reminders,source) values(auth.uid(),promotions_input,cart_input,'account');
 if not cart_input then delete from email_saved_carts where profile_id=auth.uid(); end if;
end $$;

create function public.unsubscribe_email_v1(token_input text)
returns boolean language plpgsql security definer set search_path=public as $$
declare uid uuid;
begin
 if length(token_input)<>64 then return false; end if;
 update email_preferences set promotions=false,cart_reminders=false,revision=revision+1,updated_at=now()
 where unsubscribe_token=token_input and (promotions or cart_reminders) returning profile_id into uid;
 if uid is not null then
  insert into email_consent_events(profile_id,promotions,cart_reminders,source) values(uid,false,false,'unsubscribe');
  delete from email_saved_carts where profile_id=uid;
 end if;
 return exists(select 1 from email_preferences where unsubscribe_token=token_input);
end $$;

create function public.save_email_cart_v1(items_input jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare canonical jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from email_preferences p join auth.users u on u.id=p.profile_id where p.profile_id=auth.uid() and p.cart_reminders and p.email=lower(u.email) and u.email_confirmed_at is not null) then return; end if;
 if jsonb_typeof(items_input)<>'array' or jsonb_array_length(items_input)>50 then raise exception 'Invalid cart'; end if;
 if exists(select 1 from jsonb_array_elements(items_input) x where coalesce(x->>'id','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' or coalesce(x->>'quantity','') !~ '^[0-9]{1,3}$' or (x->>'quantity')::int not between 1 and 100 or (x->>'variant_id' is not null and x->>'variant_id' !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$')) then raise exception 'Invalid cart lines'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',x->>'id','variant_id',x->>'variant_id','quantity',(x->>'quantity')::int) order by x->>'id',x->>'variant_id'),'[]') into canonical from jsonb_array_elements(items_input) x;
 insert into email_saved_carts(profile_id,items) values(auth.uid(),canonical)
 on conflict(profile_id) do update set items=excluded.items,revision=gen_random_uuid(),updated_at=now() where email_saved_carts.items is distinct from excluded.items;
end $$;

create function public.launch_email_campaign_v1(campaign_input uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Admin required'; end if;
 update email_campaigns set status='queued',launched_at=now() where id=campaign_input and status='draft';
end $$;

-- Bounded, repeatable preparation. Network delivery always uses the existing outbox leases.
create function public.prepare_email_automations_v1()
returns void language plpgsql security definer set search_path=public as $$
declare c email_campaigns; p record; cart record; last_id uuid; batch_count int;
begin
 delete from email_saved_carts where profile_id in (select profile_id from email_saved_carts where updated_at<now()-interval '30 days' order by updated_at limit 100);
 for c in select * from email_campaigns where status='queued' order by launched_at,id for update skip locked limit 1 loop
  if c.launched_at<now()-interval '7 days' then update email_campaigns set status='cancelled' where id=c.id; continue; end if;
  if (select count(*) from email_outbox where event_type in ('campaign','cart_reminder') and status in ('pending','processing'))>=20 then continue; end if;
  batch_count:=0;
  for p in select ep.*,u.email as current_email from email_preferences ep join auth.users u on u.id=ep.profile_id
   where ep.promotions and ep.email=lower(u.email) and u.email_confirmed_at is not null
    and ep.updated_at<=c.launched_at and (c.cursor_profile is null or ep.profile_id>c.cursor_profile)
   order by ep.profile_id limit 50 loop
   perform queue_transactional_email_v1('campaign/'||c.id||'/'||p.profile_id,'campaign','customer',null,
    jsonb_build_object('profile_id',p.profile_id,'customer_email',p.email,'consent_revision',p.revision,'campaign_id',c.id,
      'subject',c.subject,'heading',c.heading,'message',c.message,'action_path',c.action_path,'unsubscribe_token',p.unsubscribe_token));
   last_id:=p.profile_id; batch_count:=batch_count+1;
  end loop;
  update email_campaigns set cursor_profile=coalesce(last_id,c.cursor_profile),queued_count=queued_count+batch_count,
   status=case when batch_count<50 then 'queued_all' else 'queued' end where id=c.id;
 end loop;
 for cart in select sc.*,ep.email,ep.revision as consent_revision,ep.unsubscribe_token
  from email_saved_carts sc join email_preferences ep using(profile_id) join auth.users u on u.id=sc.profile_id
  where ep.cart_reminders and ep.email=lower(u.email) and u.email_confirmed_at is not null
   and sc.items<>'[]'::jsonb and sc.updated_at between now()-interval '48 hours' and now()-interval '24 hours'
   and (sc.last_reminded_at is null or sc.last_reminded_at<now()-interval '7 days')
   and not exists(select 1 from orders o where (o.profile_id=sc.profile_id or lower(o.customer_email)=ep.email) and o.created_at>=sc.updated_at)
  order by sc.updated_at,sc.profile_id for update of sc skip locked limit 20 loop
  perform queue_transactional_email_v1('cart/'||cart.profile_id||'/'||cart.revision,'cart_reminder','customer',null,
   jsonb_build_object('profile_id',cart.profile_id,'customer_email',cart.email,'consent_revision',cart.consent_revision,
    'cart_revision',cart.revision,'unsubscribe_token',cart.unsubscribe_token));
  update email_saved_carts set last_reminded_at=now() where profile_id=cart.profile_id;
 end loop;
end $$;

-- Recheck consent, current verified email, campaign cancellation and purchase/cart changes on EVERY retry.
create function public.can_send_optional_email_v1(snapshot_input jsonb,event_input text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from email_preferences ep join auth.users u on u.id=ep.profile_id
 where ep.profile_id=(snapshot_input->>'profile_id')::uuid and ep.email=lower(u.email)
  and u.email_confirmed_at is not null and ep.email=lower(snapshot_input->>'customer_email')
  and ep.revision=(snapshot_input->>'consent_revision')::bigint
  and ((event_input='campaign' and ep.promotions and exists(select 1 from email_campaigns c where c.id=(snapshot_input->>'campaign_id')::uuid and c.status in ('queued','queued_all') and c.launched_at>now()-interval '7 days'))
   or (event_input='cart_reminder' and ep.cart_reminders and exists(select 1 from email_saved_carts sc
    where sc.profile_id=ep.profile_id and sc.revision=(snapshot_input->>'cart_revision')::uuid
     and sc.items<>'[]'::jsonb and sc.updated_at between now()-interval '48 hours' and now()-interval '24 hours'
     and not exists(select 1 from orders o where (o.profile_id=sc.profile_id or lower(o.customer_email)=ep.email) and o.created_at>=sc.updated_at)))))
$$;
revoke all on function public.set_email_preferences_v1(boolean,boolean),public.save_email_cart_v1(jsonb),public.unsubscribe_email_v1(text),public.launch_email_campaign_v1(uuid),public.prepare_email_automations_v1(),public.can_send_optional_email_v1(jsonb,text) from public,anon,authenticated;
grant execute on function public.set_email_preferences_v1(boolean,boolean),public.save_email_cart_v1(jsonb),public.launch_email_campaign_v1(uuid) to authenticated;
grant execute on function public.unsubscribe_email_v1(text),public.prepare_email_automations_v1(),public.can_send_optional_email_v1(jsonb,text) to service_role;

-- Orders and account/security messages always get priority over optional campaigns.
create or replace function public.claim_transactional_emails_v1(limit_input integer default 8,order_input uuid default null)
returns setof public.email_outbox language plpgsql security definer set search_path=public as $$
begin
 update public.email_outbox set status='review',last_error='Resultado incierto: verificar en Resend antes de reenviar.',lease_token=null,leased_until=null
 where status in ('pending','processing') and first_attempt_at<now()-interval '23 hours' and provider_id is null;
 return query with candidates as (
  select id from public.email_outbox where
   ((status='pending' and available_at<=now()) or (status='processing' and leased_until<now()))
   and (order_input is null or order_id=order_input)
   order by case when event_type in ('campaign','cart_reminder') then 1 else 0 end,created_at,id for update skip locked limit greatest(1,least(limit_input,8))
 ) update public.email_outbox e set status='processing',lease_token=gen_random_uuid(),leased_until=now()+interval '3 minutes'
 from candidates c where e.id=c.id returning e.*;
end $$;
