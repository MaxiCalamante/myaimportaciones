begin;
create table supplier_discovery_jobs(
 id uuid primary key default gen_random_uuid(),supplier_id uuid not null references suppliers(id),
 kind text not null check(kind in ('search','detail')),query text not null default '',source_url text not null default '',
 product_ids uuid[] not null default '{}',state text not null default 'ready' check(state in ('ready','running','retry','blocked')),
 next_run_at timestamptz not null default now(),leased_until timestamptz,attempts integer not null default 0,
 last_attempt_at timestamptz,last_success_at timestamptz,last_error text,report jsonb not null default '{}',
 unique(supplier_id,kind,query,source_url),check(length(query)<=80),check(source_url='' or source_url like 'https://%')
);
create index supplier_discovery_due on supplier_discovery_jobs(next_run_at) where state<>'blocked';
create table supplier_link_decisions(
 id uuid primary key default gen_random_uuid(),offer_id uuid not null references supplier_offers(id),
 product_id uuid references products(id),variant_id uuid references product_variants(id),
 status text not null check(status in ('linked','review')),method text,reason text not null,evidence jsonb not null default '{}',
 created_at timestamptz not null default now(),actor uuid default auth.uid()
);
create index supplier_link_decisions_offer on supplier_link_decisions(offer_id,created_at desc);
do $$declare t text;begin
 foreach t in array array['supplier_discovery_jobs','supplier_link_decisions']loop
  execute format('alter table %I enable row level security',t);
  execute format('revoke all on %I from public,anon,authenticated',t);
  execute format('grant select on %I to authenticated',t);
  execute format('grant all on %I to service_role',t);
  execute format('create policy admin_private_read on %I for select to authenticated using((select is_admin()))',t);
 end loop;
end $$;
create function claim_supplier_discovery_v1(limit_input integer default 18)returns setof supplier_discovery_jobs
language plpgsql security definer set search_path=public as $$
begin
 if coalesce(current_setting('role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
 if limit_input not between 1 and 100 then raise exception 'Invalid limit'; end if;
 return query update supplier_discovery_jobs j set state='running',leased_until=now()+interval '10 minutes',last_attempt_at=now()
 where j.id in(select d.id from supplier_discovery_jobs d join suppliers s on s.id=d.supplier_id
 where s.is_active and s.automation_authorized and d.state<>'blocked' and d.next_run_at<=now() and(d.leased_until is null or d.leased_until<now())
 order by d.next_run_at,d.id for update of d skip locked limit limit_input) returning j.*;
end $$;
revoke all on function claim_supplier_discovery_v1(integer)from public,anon,authenticated;
grant execute on function claim_supplier_discovery_v1(integer)to service_role;

create function link_supplier_offer_v1(link_input jsonb)returns text language plpgsql security definer set search_path=public as $$
declare o supplier_offers;p products;v product_variants;before_offer jsonb;is_service boolean;method text;target_variant uuid;
begin
 is_service:=coalesce(current_setting('role',true),'')='service_role';
 if not is_service and not public.is_admin() then raise exception 'Forbidden'; end if;
 method:=link_input->>'method';
 if method is null or method not in ('gtin','manufacturer_model','exact_identity','admin_review') then raise exception 'Invalid match method'; end if;
 if method='admin_review' and (is_service or link_input->>'confirmed' is distinct from 'true')then raise exception 'Admin confirmation required';end if;
 select * into o from supplier_offers where id=(link_input->>'offerId')::uuid for update;
 select * into p from products where id=(link_input->>'productId')::uuid for update;
 target_variant:=nullif(link_input->>'variantId','')::uuid;
 if o.id is null or p.id is null then raise exception 'Missing offer or product';end if;
 if target_variant is not null then select * into v from product_variants where id=target_variant and product_id=p.id for update;if not found then raise exception 'Wrong variant';end if;
 elsif exists(select 1 from product_variants where product_id=p.id)then raise exception 'Exact variant required';end if;
 if jsonb_build_object('title',p.title,'brand',p.brand,'model',p.model) is distinct from link_input->'productSnapshot' then raise exception 'Product identity changed';end if;
 if target_variant is not null and jsonb_build_object('title',v.title,'options',v.options) is distinct from link_input->'variantSnapshot' then raise exception 'Variant identity changed';end if;
 if coalesce(o.evidence->>'sourceTitle',o.title) is distinct from link_input->>'sourceTitle' then raise exception 'Supplier identity changed';end if;
 if exists(select 1 from suppliers where id=o.supplier_id and official_key='atacado-connect')
 and coalesce(o.evidence->>'sourceTitle',o.title)~*'\miphone\M'
 and(coalesce(o.evidence->>'sourceTitle',o.title)||' '||o.variant_key)!~*'(nuevo sellado|new sealed|novo lacrado|new_sealed)'then raise exception 'Sealed-new condition required';end if;
 if o.product_id is not null and (o.product_id is distinct from p.id or o.variant_id is distinct from target_variant)then raise exception 'Already linked to another identity';end if;
 if o.product_id=p.id and o.variant_id is not distinct from target_variant and o.verification='verified'then return 'unchanged';end if;
 before_offer:=to_jsonb(o);
 update supplier_offers set product_id=p.id,variant_id=target_variant,verification='verified',updated_at=now(),
 evidence=evidence||jsonb_build_object('linkedBy',method,'linkedAt',now(),'match',link_input->'evidence') where id=o.id;
 insert into supplier_link_decisions(offer_id,product_id,variant_id,status,method,reason,evidence)
 values(o.id,p.id,target_variant,'linked',method,left(coalesce(link_input->>'reason','Identidad exacta verificada'),1000),link_input);
 insert into supplier_observations(offer_id,kind,payload,observed_at)values(o.id,'manual',jsonb_build_object('action','internal_identity_link','before',before_offer,'link',link_input),now());
 return 'linked';
end $$;
revoke all on function link_supplier_offer_v1(jsonb)from public,anon;
grant execute on function link_supplier_offer_v1(jsonb)to authenticated,service_role;

-- Browser listing identities are refreshed by discovery, not by an incompatible primary-page variant parser.
create or replace function queue_verified_supplier_offer_v1() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.verification<>'verified' or new.product_id is null or new.variant_key like 'listing:%'then return new;end if;
 if tg_op='UPDATE'and(old.product_id,old.variant_id,old.verification,old.source_url)is not distinct from(new.product_id,new.variant_id,new.verification,new.source_url)then return new;end if;
 if exists(select 1 from suppliers where id=new.supplier_id and query_mode='product_page'and is_active)then
  insert into supplier_sync_queue(supplier_id,product_id,variant_id,offer_id,source_url)values(new.supplier_id,new.product_id,new.variant_id,new.id,new.source_url)on conflict do nothing;
  update supplier_sync_queue set offer_id=new.id where supplier_id=new.supplier_id and source_url=new.source_url and product_id=new.product_id and variant_id is not distinct from new.variant_id and offer_id is null;
 end if;return new;
end $$;
commit;
