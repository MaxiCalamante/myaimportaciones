begin;

-- Import files, comments, entropy and audit records are never public tables.
create table public.giveaway_campaign (
  id smallint primary key check(id=1),
  revision bigint not null default 0,
  config jsonb not null default '{"title":"SORTEO DÍA DE LA MADRE","prize":"Travel Kit SKIN1004 Centella","permalink":"https://www.instagram.com/p/DeIpHXtkYyf/","scheduledFor":null,"published":false}',
  dataset_id uuid,
  snapshot jsonb,
  active_round uuid,
  updated_at timestamptz not null default now()
);
create table public.giveaway_rounds (
  id uuid primary key,
  dataset_id uuid not null,
  countdown_at timestamptz not null,
  spin_at timestamptz not null,
  reveal_at timestamptz not null,
  audit jsonb not null,
  created_at timestamptz not null default now(),
  check(spin_at=countdown_at+interval '5 seconds'),
  check(reveal_at=spin_at+interval '10.5 seconds')
);
alter table public.giveaway_campaign add constraint giveaway_active_round_fk foreign key(active_round) references public.giveaway_rounds(id);
create table public.giveaway_admin_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid not null,
  action text not null,
  dataset_id uuid,
  round_id uuid,
  reason text
);
alter table public.giveaway_campaign enable row level security;
alter table public.giveaway_rounds enable row level security;
alter table public.giveaway_admin_events enable row level security;
revoke all on public.giveaway_campaign, public.giveaway_rounds, public.giveaway_admin_events from public,anon,authenticated;
grant select on public.giveaway_campaign, public.giveaway_rounds, public.giveaway_admin_events to authenticated;
grant all on public.giveaway_campaign, public.giveaway_rounds, public.giveaway_admin_events to service_role;
grant usage,select on sequence public.giveaway_admin_events_id_seq to service_role;
create policy giveaway_campaign_admin_read on public.giveaway_campaign for select to authenticated using(public.is_admin());
create policy giveaway_rounds_admin_read on public.giveaway_rounds for select to authenticated using(public.is_admin());
create policy giveaway_events_admin_read on public.giveaway_admin_events for select to authenticated using(public.is_admin());
insert into public.giveaway_campaign(id) values(1);

create function public.giveaway_save_v1(revision_input bigint,config_input jsonb,dataset_input uuid,snapshot_input jsonb,reason_input text,actor_input uuid)
returns bigint language plpgsql security definer set search_path=public as $$
declare c public.giveaway_campaign; r public.giveaway_rounds;
begin
  select * into c from public.giveaway_campaign where id=1 for update;
  if c.revision<>revision_input then raise exception 'giveaway_conflict'; end if;
  if actor_input is null then raise exception 'giveaway_actor_required'; end if;
  if c.active_round is not null then
    select * into r from public.giveaway_rounds where id=c.active_round;
    if statement_timestamp()<r.reveal_at then raise exception 'giveaway_locked'; end if;
    if length(trim(coalesce(reason_input,'')))<5 then raise exception 'giveaway_reason_required'; end if;
  end if;
  if jsonb_typeof(snapshot_input->'review'->'valid') is distinct from 'array' or jsonb_typeof(snapshot_input->'comments') is distinct from 'array'
    or jsonb_array_length(snapshot_input->'comments')>50000 or dataset_input is null
    or coalesce(config_input->>'published','') not in ('true','false') then raise exception 'giveaway_invalid'; end if;
  update public.giveaway_campaign set config=config_input,dataset_id=dataset_input,snapshot=snapshot_input,active_round=null,revision=revision+1,updated_at=now() where id=1;
  insert into public.giveaway_admin_events(actor,action,dataset_id,round_id,reason) values(actor_input,'import',dataset_input,c.active_round,nullif(trim(reason_input),''));
  return c.revision+1;
end $$;

create function public.giveaway_start_v1(revision_input bigint,audit_input jsonb,mode_input text,expected_round uuid,actor_input uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare c public.giveaway_campaign; r public.giveaway_rounds; new_id uuid; countdown timestamptz;
begin
  select * into c from public.giveaway_campaign where id=1 for update;
  if actor_input is null then raise exception 'giveaway_actor_required'; end if;
  if mode_input not in ('initial','redraw') then raise exception 'giveaway_invalid'; end if;
  if mode_input='redraw' and expected_round is null then raise exception 'giveaway_invalid'; end if;
  if c.active_round is not null then
    select * into r from public.giveaway_rounds where id=c.active_round;
    -- A retry or second click always returns the already-persisted selection.
    if mode_input='initial' and (audit_input->>'id')::uuid=c.dataset_id then return r.id; end if;
    if mode_input='redraw' and c.active_round<>expected_round then
      if r.audit->'draws'->-2->>'id'=expected_round::text then return r.id; end if;
      raise exception 'giveaway_conflict';
    end if;
    if mode_input='redraw' and (statement_timestamp()<r.reveal_at or r.audit->>'status'<>'disqualified') then raise exception 'giveaway_disqualification_required'; end if;
  elsif mode_input='redraw' then raise exception 'giveaway_invalid'; end if;
  if c.revision<>revision_input then raise exception 'giveaway_conflict'; end if;
  if c.config->>'published'<>'true' or c.snapshot is null or jsonb_array_length(c.snapshot->'review'->'valid')=0 then raise exception 'giveaway_empty'; end if;
  if audit_input->'snapshot' is distinct from c.snapshot or (audit_input->>'id')::uuid<>c.dataset_id or audit_input->>'status'<>'pending' then raise exception 'giveaway_invalid'; end if;
  if mode_input='redraw' then
    if jsonb_array_length(audit_input->'draws')<>jsonb_array_length(r.audit->'draws')+1
       or (audit_input->'draws')- (jsonb_array_length(audit_input->'draws')-1) is distinct from r.audit->'draws'
       or audit_input->'events' is distinct from r.audit->'events' then raise exception 'giveaway_invalid'; end if;
  elsif jsonb_array_length(audit_input->'draws')<>1 then raise exception 'giveaway_invalid'; end if;
  new_id=(audit_input->'draws'->-1->>'id')::uuid;
  -- Four seconds let connected viewers fetch the shared five-second countdown.
  countdown=statement_timestamp()+interval '4 seconds';
  insert into public.giveaway_rounds(id,dataset_id,countdown_at,spin_at,reveal_at,audit)
    values(new_id,c.dataset_id,countdown,countdown+interval '5 seconds',countdown+interval '15.5 seconds',audit_input);
  update public.giveaway_campaign set active_round=new_id,revision=revision+1,updated_at=now() where id=1;
  insert into public.giveaway_admin_events(actor,action,dataset_id,round_id,reason)
    values(actor_input,mode_input,c.dataset_id,new_id,audit_input->'draws'->-1->>'reason');
  return new_id;
end $$;

create function public.giveaway_review_v1(revision_input bigint,round_input uuid,audit_input jsonb,action_input text,actor_input uuid)
returns bigint language plpgsql security definer set search_path=public as $$
declare c public.giveaway_campaign; r public.giveaway_rounds; e jsonb;
begin
  select * into c from public.giveaway_campaign where id=1 for update;
  if c.revision<>revision_input or c.active_round is distinct from round_input then raise exception 'giveaway_conflict'; end if;
  if actor_input is null then raise exception 'giveaway_actor_required'; end if;
  select * into r from public.giveaway_rounds where id=round_input for update;
  if statement_timestamp()<r.reveal_at then raise exception 'giveaway_locked'; end if;
  if action_input not in ('confirm','disqualify','avatar') then raise exception 'giveaway_invalid'; end if;
  if r.audit->>'status'<>'pending' and action_input<>'avatar' then raise exception 'giveaway_reviewed'; end if;
  if audit_input->'snapshot' is distinct from r.audit->'snapshot' or audit_input->'draws' is distinct from r.audit->'draws'
    or jsonb_array_length(audit_input->'events')<>jsonb_array_length(r.audit->'events')+1 then raise exception 'giveaway_invalid'; end if;
  e=audit_input->'events'->-1;
  if e->>'drawId'<>round_input::text then raise exception 'giveaway_invalid'; end if;
  if action_input='confirm' and (audit_input->>'status'<>'confirmed' or e->>'type'<>'review' or e->'checks' is distinct from '{"follows":true,"likes":true,"story":true}'::jsonb) then raise exception 'giveaway_invalid'; end if;
  if action_input='disqualify' and (audit_input->>'status'<>'disqualified' or e->>'type'<>'disqualification' or length(trim(coalesce(e->>'reason','')))<5) then raise exception 'giveaway_reason_required'; end if;
  if action_input='avatar' and (audit_input->>'status'<>r.audit->>'status' or e->>'type'<>'avatar') then raise exception 'giveaway_invalid'; end if;
  update public.giveaway_rounds set audit=audit_input where id=round_input;
  update public.giveaway_campaign set revision=revision+1,updated_at=now() where id=1;
  insert into public.giveaway_admin_events(actor,action,dataset_id,round_id,reason) values(actor_input,action_input,c.dataset_id,round_input,e->>'reason');
  return c.revision+1;
end $$;

-- Only the server service key may mutate state. Browser admin JWTs cannot supply a fabricated winner to an RPC.
revoke all on function public.giveaway_save_v1(bigint,jsonb,uuid,jsonb,text,uuid),public.giveaway_start_v1(bigint,jsonb,text,uuid,uuid),public.giveaway_review_v1(bigint,uuid,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.giveaway_save_v1(bigint,jsonb,uuid,jsonb,text,uuid),public.giveaway_start_v1(bigint,jsonb,text,uuid,uuid),public.giveaway_review_v1(bigint,uuid,jsonb,text,uuid) to service_role;

create function public.public_giveaway_v1() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c public.giveaway_campaign; r public.giveaway_rounds; result jsonb; reveal boolean=false; current_draw jsonb; reel jsonb='[]'::jsonb;
begin
  select * into c from public.giveaway_campaign where id=1;
  result=jsonb_build_object('version',1,'serverNow',statement_timestamp(),'revision',c.revision,'available',coalesce(c.config->>'published','false')='true',
    'config',jsonb_build_object('title',c.config->>'title','prize',c.config->>'prize','permalink',c.config->>'permalink','scheduledFor',c.config->'scheduledFor'),
    'participantCount',case when c.config->>'published'='true' then coalesce(jsonb_array_length(c.snapshot->'review'->'valid'),0) else 0 end,
    'source',case when c.config->>'published'='true' then c.snapshot->'source'->>'kind' else null end,
    'snapshotHash',null,'round',null,'reel','[]'::jsonb,'winner',null,'winnerStatus',null,'winnerAvatar',null,'disqualificationReason',null);
  if c.config->>'published'<>'true' or c.active_round is null then return result; end if;
  select * into r from public.giveaway_rounds where id=c.active_round;
  reveal=statement_timestamp()>=r.reveal_at;
  current_draw=r.audit->'draws'->-1;
  if statement_timestamp()>=r.countdown_at and not reveal then
    select coalesce(jsonb_agg(jsonb_build_object('username',p.value->>'username','displayName',p.value->>'displayName') order by p.ordinality),'[]'::jsonb) into reel
      from (select v.value,v.ordinality from jsonb_array_elements(r.audit->'snapshot'->'review'->'valid') with ordinality v(value,ordinality)
        where not exists(select 1 from jsonb_array_elements(r.audit->'draws') with ordinality d(value,ordinality)
          where d.ordinality<jsonb_array_length(r.audit->'draws') and d.value->'winner'->>'username'=v.value->>'username')
        order by v.ordinality limit 72) p;
  end if;
  result=result||jsonb_build_object('participantCount',(current_draw->>'size')::int,'snapshotHash',r.audit->>'snapshotHash','round',jsonb_build_object('id',r.id,'countdownAt',r.countdown_at,'spinAt',r.spin_at,'revealAt',r.reveal_at,'attempt',jsonb_array_length(r.audit->'draws')),'reel',reel);
  if reveal then
    -- Explicit projection: no dates, comment identifiers, source file or audit/entropy in the public response.
    result=result||jsonb_build_object('winner',jsonb_build_object('id','public-winner','username',current_draw->'winner'->>'username','text',current_draw->'winner'->>'text','displayName',current_draw->'winner'->>'displayName','timestamp',null),
      'winnerStatus',r.audit->>'status','winnerAvatar',r.audit->'avatars'->(r.id::text)->>'dataUrl',
      'disqualificationReason',case when r.audit->>'status'='disqualified' then 'El organizador registró una descalificación. Se anunciará un reemplazo.' else null end);
  end if;
  return result;
end $$;
revoke all on function public.public_giveaway_v1() from public;
grant execute on function public.public_giveaway_v1() to anon,authenticated,service_role;

create function public.giveaway_admin_history_v1() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'giveaway_admin_required'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'at',r.created_at,'attempts',jsonb_array_length(r.audit->'draws'),
    'status',r.audit->>'status','source',r.audit->'snapshot'->'source'->>'kind',
    'winner',case when statement_timestamp()>=r.reveal_at then r.audit->'draws'->-1->'winner'->>'username' else null end,
    'revealed',statement_timestamp()>=r.reveal_at) order by r.created_at desc)
    from (select * from public.giveaway_rounds order by created_at desc limit 100) r),'[]'::jsonb);
end $$;
revoke all on function public.giveaway_admin_history_v1() from public,anon;
grant execute on function public.giveaway_admin_history_v1() to authenticated;
commit;
