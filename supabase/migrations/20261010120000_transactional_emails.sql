-- Durable transactional mail. No historical backfill and no network calls in transactions.
create table public.email_outbox (
 id uuid primary key default gen_random_uuid(),
 event_key text not null unique,
 event_type text not null,
 audience text not null check (audience in ('customer','admin')),
 order_id uuid references public.orders(id) on delete set null,
 snapshot jsonb not null,
 payload jsonb,
 status text not null default 'pending' check (status in ('pending','processing','sent','failed','review','skipped')),
 attempts integer not null default 0,
 available_at timestamptz not null default now(),
 lease_token uuid,
 leased_until timestamptz,
 first_attempt_at timestamptz,
 provider_id text unique,
 delivery_status text,
 delivery_updated_at timestamptz,
 last_error text,
 created_at timestamptz not null default now(),
 sent_at timestamptz
);
create index email_outbox_pending on public.email_outbox(available_at,created_at) where status in ('pending','processing');
alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from public,anon,authenticated;
grant all on public.email_outbox to service_role;
grant select on public.email_outbox to authenticated;
create policy "Admins read email history" on public.email_outbox for select to authenticated using(public.is_admin());

create table public.email_suppressions (
 email text primary key,
 reason text not null,
 created_at timestamptz not null default now()
);
alter table public.email_suppressions enable row level security;
revoke all on public.email_suppressions from public,anon,authenticated;
grant all on public.email_suppressions to service_role;

create or replace function public.queue_transactional_email_v1(key_input text,event_input text,audience_input text,order_input uuid,snapshot_input jsonb)
returns void language sql security definer set search_path=public as $$
 insert into public.email_outbox(event_key,event_type,audience,order_id,snapshot)
 values(key_input,event_input,audience_input,order_input,snapshot_input) on conflict(event_key) do nothing;
$$;

create or replace function public.capture_order_emails_v1() returns trigger language plpgsql security definer set search_path=public as $$
declare snap jsonb; ev text; suffix text;
begin
 -- Explicit projection: never include request hashes, supplier information or payment URLs.
 snap:=jsonb_build_object('customer_email',new.customer_email,'shipping_name',new.shipping_name,
  'shipping_phone',new.shipping_phone,'shipping_address',new.shipping_address,'order_notes',new.order_notes,
  'tracking_code',new.tracking_code,'status',new.status,'payment_method',new.payment_method,
  'subtotal_amount',new.subtotal_amount,'discount_amount',new.discount_amount,'shipping_amount',new.shipping_amount,
  'total_amount',new.total_amount,'shipping_option',new.shipping_option,'reservation_expires_at',new.reservation_expires_at,
  'carrier_tracking_code',new.carrier_tracking_code,
  'items',coalesce((select jsonb_agg(jsonb_build_object('product_title',i.product_title,'quantity',i.quantity,'unit_price',i.unit_price) order by i.id) from public.order_items i where i.order_id=new.id),'[]'::jsonb));
 if tg_op='INSERT' then
  perform public.queue_transactional_email_v1('order/'||new.id||'/created/customer','order_created','customer',new.id,snap);
  perform public.queue_transactional_email_v1('order/'||new.id||'/created/admin','order_created','admin',new.id,snap);
  return null;
 end if;
 if new.status is distinct from old.status then
  ev:=case new.status when 'paid' then 'payment_confirmed' when 'preparing' then 'order_preparing'
   when 'shipped' then 'order_shipped' when 'delivered' then 'order_delivered'
   when 'cancelled' then case when old.reservation_expires_at<now() then 'reservation_expired' else 'order_cancelled' end end;
  if ev is not null then
   perform public.queue_transactional_email_v1('order/'||new.id||'/'||ev||'/customer',ev,'customer',new.id,snap);
   if new.status in ('paid','cancelled') then
    perform public.queue_transactional_email_v1('order/'||new.id||'/'||ev||'/admin',ev,'admin',new.id,snap);
   end if;
  end if;
 end if;
 if new.carrier_tracking_code is distinct from old.carrier_tracking_code and coalesce(new.carrier_tracking_code,'')<>'' and new.status in ('shipped','delivered') and new.status=old.status then
  suffix:=md5(new.carrier_tracking_code);
  perform public.queue_transactional_email_v1('order/'||new.id||'/tracking/'||suffix,'tracking_updated','customer',new.id,snap);
 end if;
 if new.payment_review and not old.payment_review then
  perform public.queue_transactional_email_v1('order/'||new.id||'/payment_review','payment_review','admin',new.id,snap);
 end if;
 return null;
end $$;
-- Deferred execution captures item snapshots after create_retail_order_v2 inserts the lines.
create constraint trigger orders_transactional_emails after insert or update on public.orders
 deferrable initially deferred for each row execute function public.capture_order_emails_v1();

create or replace function public.capture_withdrawal_emails_v1() returns trigger language plpgsql security definer set search_path=public as $$
declare snap jsonb;
begin
 snap:=jsonb_build_object('customer_email',new.email,'tracking_code',new.order_code,'reference',new.reference,'reason',new.reason);
 perform public.queue_transactional_email_v1('withdrawal/'||new.id||'/customer','withdrawal_received','customer',null,snap);
 perform public.queue_transactional_email_v1('withdrawal/'||new.id||'/admin','withdrawal_received','admin',null,snap);
 return new;
end $$;
create trigger withdrawals_transactional_emails after insert on public.withdrawal_requests for each row execute function public.capture_withdrawal_emails_v1();

create or replace function public.claim_transactional_emails_v1(limit_input integer default 8,order_input uuid default null)
returns setof public.email_outbox language plpgsql security definer set search_path=public as $$
begin
 -- Resend remembers keys for 24h. Do not retry an uncertain send outside that window.
 update public.email_outbox set status='review',last_error='Resultado incierto: verificar en Resend antes de reenviar.',lease_token=null,leased_until=null
 where status in ('pending','processing') and first_attempt_at<now()-interval '23 hours' and provider_id is null;
 return query with candidates as (
  select id from public.email_outbox where
   ((status='pending' and available_at<=now()) or (status='processing' and leased_until<now()))
   and (order_input is null or order_id=order_input)
   order by created_at,id for update skip locked limit greatest(1,least(limit_input,8))
 ) update public.email_outbox e set status='processing',lease_token=gen_random_uuid(),leased_until=now()+interval '3 minutes'
 from candidates c where e.id=c.id returning e.*;
end $$;

-- Signed provider webhooks can arrive before the send response is saved.
create table public.email_provider_events (
 id text primary key,
 provider_id text not null,
 event_type text not null,
 occurred_at timestamptz not null,
 received_at timestamptz not null default now()
);
alter table public.email_provider_events enable row level security;
revoke all on public.email_provider_events from public,anon,authenticated;
grant all on public.email_provider_events to service_role;

create or replace function public.apply_email_provider_events_v1() returns void language sql security definer set search_path=public as $$
 with latest as (
  select distinct on (provider_id) provider_id,event_type,occurred_at from public.email_provider_events
  order by provider_id,
   case event_type when 'email.complained' then 7 when 'email.bounced' then 6 when 'email.suppressed' then 5 when 'email.delivered' then 4 when 'email.failed' then 3 when 'email.delivery_delayed' then 2 else 1 end desc,
   occurred_at desc,id desc
 ) update public.email_outbox e set delivery_status=l.event_type,delivery_updated_at=l.occurred_at
 from latest l where e.provider_id=l.provider_id and (e.delivery_status is distinct from l.event_type or e.delivery_updated_at is distinct from l.occurred_at);
$$;
revoke all on function public.apply_email_provider_events_v1() from public,anon,authenticated;
grant execute on function public.apply_email_provider_events_v1() to service_role;

-- Keep provider validation/reconciliation unchanged, recording failed attempts atomically.
create or replace function public.reconcile_retail_payment_with_emails_v1(order_id_input uuid,payment_id_input text,amount_input numeric,status_input text)
returns void language plpgsql security definer set search_path=public as $$
declare o public.orders; snap jsonb;
begin
 perform public.reconcile_retail_payment_v2(order_id_input,payment_id_input,amount_input,status_input);
 if status_input not in ('rejected','cancelled') then return; end if;
 select * into o from public.orders where id=order_id_input;
 if o.status<>'pending' or o.payment_review or o.reservation_released or o.reservation_expires_at<now() then return; end if;
 snap:=jsonb_build_object('customer_email',o.customer_email,'shipping_name',o.shipping_name,
  'tracking_code',o.tracking_code,'status',o.status,'payment_method',o.payment_method,
  'total_amount',o.total_amount,'shipping_option',o.shipping_option,'reservation_expires_at',o.reservation_expires_at);
 perform public.queue_transactional_email_v1('payment/'||o.id||'/'||payment_id_input||'/failed','payment_failed','customer',o.id,snap);
end $$;
revoke all on function public.reconcile_retail_payment_with_emails_v1(uuid,text,numeric,text) from public,anon,authenticated;
grant execute on function public.reconcile_retail_payment_with_emails_v1(uuid,text,numeric,text) to service_role;

revoke all on function public.queue_transactional_email_v1(text,text,text,uuid,jsonb),public.capture_order_emails_v1(),public.capture_withdrawal_emails_v1(),public.claim_transactional_emails_v1(integer,uuid) from public,anon,authenticated;
grant execute on function public.queue_transactional_email_v1(text,text,text,uuid,jsonb),public.claim_transactional_emails_v1(integer,uuid) to service_role;
