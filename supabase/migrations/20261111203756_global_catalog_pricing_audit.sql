begin;
-- Preserve deliberately excluded wholesale channels (manual NULL) and real
-- manual prices. Only an explicitly automatic missing channel may be generated.
-- Keep the existing engine, evidence checks, enabled payments and change limits.
do $$declare definition text;old_value text;begin
 definition:=pg_get_functiondef('public.store_refresh_supplier_usd_v1(uuid)'::regprocedure);
 old_value:='wholesale:=case when u.wholesale_source=''manual''or not reprice then u.wholesale_usd else wholesale end;';
 if position(old_value in definition)=0 then raise exception 'Wholesale refresh contract changed';end if;
 definition:=replace(definition,old_value,'wholesale:=case when u.wholesale_source=''manual''or(u.wholesale_usd is not null and not reprice)then u.wholesale_usd else wholesale end;');
 execute definition;
end$$;

create table public.store_catalog_audit_runs (
 id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),
 applied_at timestamptz,archive_missing boolean not null default false,
 policy_snapshot jsonb not null,settings_snapshot jsonb not null,apply_policy_snapshot jsonb,
 summary jsonb not null default '{}'
);
create table public.store_catalog_audit_items (
 id uuid primary key default gen_random_uuid(),run_id uuid not null references public.store_catalog_audit_runs(id),
 product_id uuid not null,variant_id uuid,
 before_state jsonb not null,source_hash text not null,proposal jsonb,
 eligible boolean not null default false,archivable boolean not null default false,
 status text not null check(status in('corrected','unchanged','pending','archived')),
 reason text,after_state jsonb,apply_result jsonb,applied_at timestamptz
);
create unique index store_catalog_audit_identity on public.store_catalog_audit_items(run_id,product_id,(coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid)));
alter table public.store_catalog_audit_runs enable row level security;
alter table public.store_catalog_audit_items enable row level security;
revoke all on public.store_catalog_audit_runs,public.store_catalog_audit_items from public,anon,authenticated,service_role;
grant select on public.store_catalog_audit_runs,public.store_catalog_audit_items to service_role;

-- Full private recoverable rows, including inactive/soft-deleted identities. No
-- foreign key to catalogue identities: later deletion cannot erase this backup.
create function public.store_catalog_audit_snapshot_v1(product_input uuid,variant_input uuid) returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object(
 'product',(select to_jsonb(p)from products p where id=product_input),
 'variant',(select to_jsonb(v)from product_variants v where id=variant_input and product_id=product_input),
 'variants',coalesce((select jsonb_agg(to_jsonb(v)order by id)from product_variants v where product_id=product_input),'[]'),
 'usd',(select to_jsonb(u)from product_usd_prices u where product_id=product_input and variant_id is not distinct from variant_input),
 'profile',(select to_jsonb(p)from store_profitability_profiles p where product_id=product_input and variant_id is not distinct from variant_input),
 'productCosts',(select to_jsonb(c)from product_costs c where product_id=product_input),
 'offers',coalesce((select jsonb_agg(to_jsonb(o)order by id)from supplier_offers o where product_id=product_input),'[]'),
 'suppliers',coalesce((select jsonb_agg(to_jsonb(s)order by id)from suppliers s where id in(select supplier_id from supplier_offers where product_id=product_input)),'[]'))
$$;
create function public.store_catalog_audit_report_v1(run_input uuid)returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('runId',run_input,'products',(select jsonb_build_object('total',count(*),'corrected',count(*)filter(where status='corrected'),'unchanged',count(*)filter(where status='unchanged'),'pending',count(*)filter(where status='pending'),'archived',count(*)filter(where status='archived'),'eligible',count(*)filter(where eligible),'newlyArchived',count(*)filter(where status='archived'and applied_at is not null and before_state->'product'->>'supplier_archived_at'is null and before_state->'product'->>'deleted_at'is null))from store_catalog_audit_items where run_id=run_input and variant_id is null),
 'variants',(select jsonb_build_object('total',count(*),'corrected',count(*)filter(where status='corrected'),'unchanged',count(*)filter(where status='unchanged'),'pending',count(*)filter(where status='pending'),'archived',count(*)filter(where status='archived'))from store_catalog_audit_items where run_id=run_input and variant_id is not null),
 'policyEnforcement',(select policy_snapshot->>'enforcement'from store_catalog_audit_runs where id=run_input),
 'applyPolicyEnforcement',(select apply_policy_snapshot->>'enforcement'from store_catalog_audit_runs where id=run_input),
 'ordersTouched',0,'stockTouched',0)
$$;

create function public.store_audit_catalog_v1(mode_input text default 'simulate',run_input uuid default null,archive_missing_input boolean default false)returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare run_row store_catalog_audit_runs;identity_row record;item store_catalog_audit_items;
 before_value jsonb;after_value jsonb;result jsonb;reason_value text;state_value text;
 offer_value uuid;eligible_value boolean;archive_value boolean;archived_value boolean;changed_value boolean;
 policy_value jsonb;settings_value jsonb;report jsonb;
begin
 if coalesce(current_setting('role',true),'')<>'service_role'then raise exception 'Forbidden';end if;
 if mode_input not in('simulate','apply')then raise exception 'Invalid catalogue audit mode';end if;
 perform pg_advisory_xact_lock(hashtext('store_audit_catalog_v1'));
 -- Hold catalogue membership stable for exhaustive coverage, including inserts.
 lock table products,product_variants in share mode;
 select to_jsonb(p)into policy_value from store_profitability_policy p where id for share;
 select to_jsonb(s)into settings_value from store_money_settings s where id for share;
 if mode_input='simulate'then
  if run_input is not null then raise exception 'New simulation requires a new run';end if;
  insert into store_catalog_audit_runs(archive_missing,policy_snapshot,settings_snapshot)values(archive_missing_input,policy_value,settings_value)returning *into run_row;
  -- UNION ALL is deliberately unbounded: REST pagination cannot truncate this.
  for identity_row in select id product_id,null::uuid variant_id from products union all select product_id,id from product_variants loop
   perform 1 from products where id=identity_row.product_id for update;
   perform 1 from product_variants where product_id=identity_row.product_id for update;
   perform 1 from supplier_offers where product_id=identity_row.product_id for share;
   perform 1 from store_profitability_profiles where product_id=identity_row.product_id for update;
   perform 1 from product_usd_prices where product_id=identity_row.product_id for update;
   before_value:=store_catalog_audit_snapshot_v1(identity_row.product_id,identity_row.variant_id);
   archived_value:=before_value->'product'->>'deleted_at'is not null or before_value->'product'->>'supplier_archived_at'is not null or before_value->'variant'->>'supplier_archived_at'is not null
    or before_value->'product'->>'commercial_status'='ARCHIVED' or before_value->'variant'->>'commercial_status'='ARCHIVED';
   result:=null;reason_value:=null;eligible_value:=false;archive_value:=false;state_value:='pending';
   if archived_value then state_value:='archived';reason_value:='Already archived; retained recoverably';
   else
    -- Owner-directed scope archival includes historical/unknown-domain URLs.
    -- An approved-domain URL without a reviewed link still requires review.
    archive_value:=four_supplier_key_v1(nullif(trim(coalesce(before_value->'product'->>'source_url','')),''))is null
     and not exists(select 1 from supplier_offers o join suppliers s on s.id=o.supplier_id where o.product_id=identity_row.product_id and four_supplier_key_v1(s.website)is not null and four_supplier_key_v1(o.source_url)=four_supplier_key_v1(s.website))
     and not exists(select 1 from product_variants v where v.product_id=identity_row.product_id and four_supplier_key_v1(nullif(trim(coalesce(to_jsonb(v)->>'source_url','')),''))is not null);
    offer_value:=nullif(before_value->'profile'->>'source_offer_id','')::uuid;
    if offer_value is null then reason_value:='Exact verified supplier cost profile missing';
    elsif not exists(select 1 from supplier_offers o where o.id=offer_value and o.product_id=identity_row.product_id and o.variant_id is not distinct from identity_row.variant_id)then reason_value:='Cost profile offer identity differs from this exact product and variant';
    else
     -- The same engine runs under a rollback-only subtransaction. This also
     -- removes review/audit writes when production enforcement is enabled.
     begin
      result:=store_refresh_supplier_usd_v1(offer_value);
      raise exception using errcode='ZC001',message='Rollback catalogue simulation';
     exception when sqlstate 'ZC001'then null;end;
     eligible_value:=result->>'status'in('proposal','applied')and result->'proposal'->>'manualSafe'='true';
     reason_value:=coalesce(result->>'reason',case when not eligible_value then 'Profitability proposal requires review'end);
     if eligible_value then
      changed_value:=(before_value->'usd'->>'retail_usd')::numeric is distinct from(result->'proposal'->>'retailUsd')::numeric
       or(before_value->'usd'->>'wholesale_usd')::numeric is distinct from(result->'proposal'->>'wholesaleUsd')::numeric;
      if not changed_value then state_value:='unchanged';else reason_value:='Validated proposal; not yet applied';end if;
     end if;
    end if;
   end if;
   insert into store_catalog_audit_items(run_id,product_id,variant_id,before_state,source_hash,proposal,eligible,archivable,status,reason)
   values(run_row.id,identity_row.product_id,identity_row.variant_id,before_value,md5(before_value::text),result,coalesce(eligible_value,false),archive_value,state_value,reason_value);
  end loop;
 else
  select *into run_row from store_catalog_audit_runs where id=run_input for update;
  if not found then raise exception 'Catalogue simulation missing';end if;
  if run_row.applied_at is not null then return run_row.summary;end if;
  if (select count(*)from store_catalog_audit_items where run_id=run_row.id)<>(select count(*)from products)+(select count(*)from product_variants)
   or exists(select 1 from products p where not exists(select 1 from store_catalog_audit_items a where a.run_id=run_row.id and a.product_id=p.id and a.variant_id is null))
   or exists(select 1 from product_variants v where not exists(select 1 from store_catalog_audit_items a where a.run_id=run_row.id and a.product_id=v.product_id and a.variant_id=v.id))then raise exception 'Catalogue membership changed; simulate again';end if;
  -- The existing service-only enforcement setter is a deliberate separate
  -- action. Allow preview -> enforce without discarding a reviewed simulation,
  -- but reject any change to commercial policy/version or money settings.
  if(policy_value-'enforcement'-'updated_at')is distinct from(run_row.policy_snapshot-'enforcement'-'updated_at')
   or settings_value is distinct from run_row.settings_snapshot
   or not(policy_value->>'enforcement'=run_row.policy_snapshot->>'enforcement'
    or(run_row.policy_snapshot->>'enforcement'='preview'and policy_value->>'enforcement'='enforce'))then raise exception 'Pricing policy or settings changed; simulate again';end if;
  if policy_value->>'enforcement'<>'enforce'then raise exception 'Pricing policy must already enforce before apply; this function never enables it';end if;
  for item in select *from store_catalog_audit_items where run_id=run_row.id order by product_id,variant_id nulls first for update loop
   if item.status='archived'then continue;end if;
   if item.variant_id is not null and exists(select 1 from store_catalog_audit_items a where a.run_id=run_row.id and a.product_id=item.product_id and a.variant_id is null and a.status='archived'and a.applied_at is not null)then
    update store_catalog_audit_items set status='archived',reason='Parent archived recoverably in this run',after_state=store_catalog_audit_snapshot_v1(item.product_id,item.variant_id),applied_at=now()where id=item.id;
    continue;
   end if;
   perform 1 from products where id=item.product_id for update;
   perform 1 from product_variants where product_id=item.product_id for update;
   perform 1 from supplier_offers where product_id=item.product_id for share;
   perform 1 from store_profitability_profiles where product_id=item.product_id for update;
   perform 1 from product_usd_prices where product_id=item.product_id for update;
   before_value:=store_catalog_audit_snapshot_v1(item.product_id,item.variant_id);
   result:=null;state_value:='pending';reason_value:=null;
   begin
   if md5(before_value::text)is distinct from item.source_hash then reason_value:='Source, product, profile or price changed; simulate again';
   elsif item.archivable and run_row.archive_missing then
    if item.variant_id is null then
     update products set is_active=false,commercial_status='ARCHIVED',deleted_at=now(),supplier_archived_at=now(),supplier_archive_reason='Auditoría global: sin fuente autorizada ni URL de origen'where id=item.product_id;
     update product_variants set is_active=false,commercial_status='ARCHIVED',supplier_archived_at=coalesce(supplier_archived_at,now())where product_id=item.product_id;
    else update product_variants set is_active=false,commercial_status='ARCHIVED',supplier_archived_at=now()where id=item.variant_id;end if;
    state_value:='archived';reason_value:='Archived recoverably: no authorized supplier offer or approved origin URL';
   elsif not item.eligible then reason_value:=item.reason;
   else
    result:=store_refresh_supplier_usd_v1((item.before_state->'profile'->>'source_offer_id')::uuid);
    if result->>'status'='applied'then
     after_value:=store_catalog_audit_snapshot_v1(item.product_id,item.variant_id);
     if before_value->'usd'->'retail_usd'is distinct from after_value->'usd'->'retail_usd'or before_value->'usd'->'wholesale_usd'is distinct from after_value->'usd'->'wholesale_usd'then state_value:='corrected';else state_value:='unchanged';end if;
    else reason_value:=coalesce(result->>'reason','Verified refresh did not apply');end if;
   end if;
   exception when others then state_value:='pending';reason_value:=sqlerrm;end;
   update store_catalog_audit_items set status=state_value,reason=reason_value,apply_result=result,after_state=store_catalog_audit_snapshot_v1(item.product_id,item.variant_id),applied_at=now()where id=item.id;
  end loop;
  update store_catalog_audit_runs set applied_at=now(),apply_policy_snapshot=policy_value where id=run_row.id;
 end if;
 report:=store_catalog_audit_report_v1(run_row.id);
 update store_catalog_audit_runs set summary=report where id=run_row.id;
 return report;
end$$;
revoke all on function public.store_catalog_audit_snapshot_v1(uuid,uuid),public.store_catalog_audit_report_v1(uuid),public.store_audit_catalog_v1(text,uuid,boolean)from public,anon,authenticated,service_role;
grant execute on function public.store_audit_catalog_v1(text,uuid,boolean)to service_role;
commit;
