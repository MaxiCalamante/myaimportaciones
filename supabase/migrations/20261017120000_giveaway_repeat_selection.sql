begin;
-- Selection settings and review evidence stay behind the existing admin RLS.
alter table public.giveaway_campaign add column selection jsonb not null default '{"designatedUsername":null,"requirementsReviewed":false,"excludePreviousWinners":true,"excludedUsernames":[]}';

create function public.giveaway_clear_selection_v1() returns trigger language plpgsql set search_path=public as $$
begin
  if new.dataset_id is distinct from old.dataset_id or new.snapshot is distinct from old.snapshot then
    new.selection='{"designatedUsername":null,"requirementsReviewed":false,"excludePreviousWinners":true,"excludedUsernames":[]}'::jsonb;
  end if;
  return new;
end $$;
create trigger giveaway_clear_selection before update on public.giveaway_campaign for each row execute function public.giveaway_clear_selection_v1();
revoke all on function public.giveaway_clear_selection_v1() from public,anon,authenticated;

create function public.giveaway_selection_v1(revision_input bigint,selection_input jsonb,actor_input uuid)
returns bigint language plpgsql security definer set search_path=public as $$
declare c public.giveaway_campaign; r public.giveaway_rounds;
begin
  select * into c from public.giveaway_campaign where id=1 for update;
  if actor_input is null then raise exception 'giveaway_actor_required'; end if;
  if c.revision<>revision_input then raise exception 'giveaway_conflict'; end if;
  if c.active_round is not null then
    select * into r from public.giveaway_rounds where id=c.active_round;
    if statement_timestamp()<r.reveal_at then raise exception 'giveaway_locked'; end if;
  end if;
  if c.snapshot is null or jsonb_typeof(selection_input) is distinct from 'object'
    or not (selection_input ?& array['designatedUsername','requirementsReviewed','excludePreviousWinners','excludedUsernames'])
    or jsonb_typeof(selection_input->'excludedUsernames') is distinct from 'array'
    or jsonb_typeof(selection_input->'excludePreviousWinners') is distinct from 'boolean'
    or jsonb_typeof(selection_input->'requirementsReviewed') is distinct from 'boolean'
    or jsonb_typeof(selection_input->'designatedUsername') not in ('null','string') then raise exception 'giveaway_invalid'; end if;
  if selection_input->>'designatedUsername' is not null and
    (selection_input->>'requirementsReviewed'<>'true' or not exists(select 1 from jsonb_array_elements(c.snapshot->'review'->'valid') v where v->>'username'=selection_input->>'designatedUsername')
     or selection_input->'excludedUsernames' ? (selection_input->>'designatedUsername')) then raise exception 'giveaway_invalid'; end if;
  if exists(select 1 from jsonb_array_elements(selection_input->'excludedUsernames') u where jsonb_typeof(u)<>'string' or not exists(select 1 from jsonb_array_elements(c.snapshot->'comments') v where v->>'username'=u#>>'{}')) then raise exception 'giveaway_invalid'; end if;
  update public.giveaway_campaign set selection=selection_input,revision=revision+1,updated_at=now() where id=1;
  insert into public.giveaway_admin_events(actor,action,dataset_id,round_id,reason)
    values(actor_input,'selection',c.dataset_id,c.active_round,selection_input::text);
  return c.revision+1;
end $$;
revoke all on function public.giveaway_selection_v1(bigint,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.giveaway_selection_v1(bigint,jsonb,uuid) to service_role;

-- Legacy records have no selection policy. New policies must match the locked admin configuration.
create function public.giveaway_selection_matches_v1(settings jsonb,selection jsonb) returns boolean
language sql immutable set search_path=public as $$
  select coalesce(case when selection is null then settings='{"designatedUsername":null,"requirementsReviewed":false,"excludePreviousWinners":true,"excludedUsernames":[]}'::jsonb
    else (selection-'method'-'repeat')=settings and selection->>'method'=case when settings->>'designatedUsername' is null then 'random' else 'designated' end end,false)
$$;
revoke all on function public.giveaway_selection_matches_v1(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.giveaway_selection_matches_v1(jsonb,jsonb) to service_role;

create or replace function public.giveaway_start_v1(revision_input bigint,audit_input jsonb,mode_input text,expected_round uuid,actor_input uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare c public.giveaway_campaign; r public.giveaway_rounds; new_id uuid; countdown timestamptz;
begin
  select * into c from public.giveaway_campaign where id=1 for update;
  if actor_input is null then raise exception 'giveaway_actor_required'; end if;
  if mode_input not in ('initial','redraw','repeat') then raise exception 'giveaway_invalid'; end if;
  if mode_input in ('redraw','repeat') and expected_round is null then raise exception 'giveaway_invalid'; end if;
  if c.active_round is not null then
    select * into r from public.giveaway_rounds where id=c.active_round;
    -- A retry or second click always returns the already-persisted selection.
    if mode_input='initial' and (audit_input->>'id')::uuid=c.dataset_id then return r.id; end if;
    if mode_input in ('redraw','repeat') and c.active_round<>expected_round then
      if r.audit->'draws'->-2->>'id'=expected_round::text then return r.id; end if;
      raise exception 'giveaway_conflict';
    end if;
    if mode_input='repeat' and statement_timestamp()<r.reveal_at then raise exception 'giveaway_locked'; end if;
    if mode_input='repeat' and length(trim(coalesce(audit_input->'draws'->-1->>'reason','')))<5 then raise exception 'giveaway_reason_required'; end if;
    if mode_input='redraw' and (statement_timestamp()<r.reveal_at or r.audit->>'status'<>'disqualified') then raise exception 'giveaway_disqualification_required'; end if;
  elsif mode_input in ('redraw','repeat') then raise exception 'giveaway_invalid'; end if;
  if c.revision<>revision_input then raise exception 'giveaway_conflict'; end if;
  if c.config->>'published'<>'true' or c.snapshot is null or jsonb_array_length(c.snapshot->'review'->'valid')=0 then raise exception 'giveaway_empty'; end if;
  if audit_input->'snapshot' is distinct from c.snapshot or (audit_input->>'id')::uuid<>c.dataset_id or audit_input->>'status'<>'pending' then raise exception 'giveaway_invalid'; end if;
  if mode_input in ('redraw','repeat') then
    if jsonb_array_length(audit_input->'draws')<>jsonb_array_length(r.audit->'draws')+1
       or (audit_input->'draws')- (jsonb_array_length(audit_input->'draws')-1) is distinct from r.audit->'draws'
       or audit_input->'events' is distinct from r.audit->'events' then raise exception 'giveaway_invalid'; end if;
  elsif jsonb_array_length(audit_input->'draws')<>1 then raise exception 'giveaway_invalid'; end if;
  if not giveaway_selection_matches_v1(c.selection,audit_input->'draws'->-1->'selection') then raise exception 'giveaway_invalid'; end if;
  if mode_input='repeat' and audit_input->'draws'->-1->'selection'->>'repeat' is distinct from 'true' then raise exception 'giveaway_invalid'; end if;
  if mode_input<>'repeat' and audit_input->'draws'->-1->'selection'->>'repeat'='true' then raise exception 'giveaway_invalid'; end if;
  if not exists(select 1 from jsonb_array_elements(c.snapshot->'review'->'valid') v
    where v->>'username'=audit_input->'draws'->-1->'winner'->>'username'
      and not (c.selection->'excludedUsernames' ? (v->>'username'))
      and not exists(select 1 from jsonb_array_elements(coalesce(r.audit->'draws','[]'::jsonb)) d
        where d->'winner'->>'username'=v->>'username' and
          ((c.selection->>'excludePreviousWinners')::boolean or exists(
            select 1 from jsonb_array_elements(coalesce(r.audit->'events','[]'::jsonb)) e where e->>'drawId'=d->>'id' and e->>'type'='disqualification')))
  ) then raise exception 'giveaway_invalid'; end if;
  if c.selection->>'designatedUsername' is not null and c.selection->>'designatedUsername' is distinct from audit_input->'draws'->-1->'winner'->>'username' then raise exception 'giveaway_invalid'; end if;
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

create or replace function public.public_giveaway_v1() returns jsonb language plpgsql stable security definer set search_path=public as $$
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
        where not (coalesce(current_draw->'selection'->'excludedUsernames','[]'::jsonb) ? (v.value->>'username')) and not exists(select 1 from jsonb_array_elements(r.audit->'draws') with ordinality d(value,ordinality)
          where d.ordinality<jsonb_array_length(r.audit->'draws') and d.value->'winner'->>'username'=v.value->>'username' and (coalesce((current_draw->'selection'->>'excludePreviousWinners')::boolean,true) or exists(select 1 from jsonb_array_elements(r.audit->'events') e where e->>'drawId'=d.value->>'id' and e->>'type'='disqualification')))
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

commit;
