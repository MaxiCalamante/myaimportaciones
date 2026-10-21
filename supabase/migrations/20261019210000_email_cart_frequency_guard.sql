-- Keep the weekly cap across unsubscribe/reconsent and saved-cart deletion.
create index email_cart_profile_history on public.email_outbox((snapshot->>'profile_id'),created_at) where event_type='cart_reminder';

create or replace function public.prepare_email_automations_v1()
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
   and not exists(select 1 from email_outbox e where e.event_type='cart_reminder' and e.snapshot->>'profile_id'=sc.profile_id::text and coalesce(e.sent_at,e.first_attempt_at,e.created_at)>now()-interval '7 days')
   and not exists(select 1 from orders o where (o.profile_id=sc.profile_id or lower(o.customer_email)=ep.email) and o.created_at>=sc.updated_at)
  order by sc.updated_at,sc.profile_id for update of sc skip locked limit 20 loop
  perform queue_transactional_email_v1('cart/'||cart.profile_id||'/'||cart.revision,'cart_reminder','customer',null,
   jsonb_build_object('profile_id',cart.profile_id,'customer_email',cart.email,'consent_revision',cart.consent_revision,
    'cart_revision',cart.revision,'unsubscribe_token',cart.unsubscribe_token));
  update email_saved_carts set last_reminded_at=now() where profile_id=cart.profile_id;
 end loop;
end $$;


create or replace function public.can_send_optional_email_v1(snapshot_input jsonb,event_input text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from email_preferences ep join auth.users u on u.id=ep.profile_id
 where ep.profile_id=(snapshot_input->>'profile_id')::uuid and ep.email=lower(u.email)
  and u.email_confirmed_at is not null and ep.email=lower(snapshot_input->>'customer_email')
  and ep.revision=(snapshot_input->>'consent_revision')::bigint
  and (event_input<>'cart_reminder' or not exists(select 1 from email_outbox e where e.event_type='cart_reminder' and e.snapshot->>'profile_id'=ep.profile_id::text and e.snapshot->>'cart_revision' is distinct from snapshot_input->>'cart_revision' and coalesce(e.sent_at,e.first_attempt_at,e.created_at)>now()-interval '7 days' and (e.provider_id is not null or e.status='review')))
  and ((event_input='campaign' and ep.promotions and exists(select 1 from email_campaigns c where c.id=(snapshot_input->>'campaign_id')::uuid and c.status in ('queued','queued_all') and c.launched_at>now()-interval '7 days'))
   or (event_input='cart_reminder' and ep.cart_reminders and exists(select 1 from email_saved_carts sc
    where sc.profile_id=ep.profile_id and sc.revision=(snapshot_input->>'cart_revision')::uuid
     and sc.items<>'[]'::jsonb and sc.updated_at between now()-interval '48 hours' and now()-interval '24 hours'
     and not exists(select 1 from orders o where (o.profile_id=sc.profile_id or lower(o.customer_email)=ep.email) and o.created_at>=sc.updated_at)))))
$$;
