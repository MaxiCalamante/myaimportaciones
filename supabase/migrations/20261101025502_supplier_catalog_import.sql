begin;

-- Private durable previews. Only the bounded RPC may turn one into catalog writes.
create table public.catalog_import_jobs (
 id uuid primary key default gen_random_uuid(), request_key uuid not null unique,
 state text not null default 'preview' check(state in ('preview','queued','paused','completed','cancelled')),
 config jsonb not null check(jsonb_typeof(config)='object'),
 created_at timestamptz not null default now(), actor uuid default auth.uid()
);
create table public.catalog_import_items (
 id uuid primary key default gen_random_uuid(),job_id uuid not null references public.catalog_import_jobs(id),
 offer_id uuid not null references public.supplier_offers(id),position integer not null check(position>=0),
 state text not null default 'pending' check(state in ('pending','imported','linked','review','failed')),
 payload jsonb not null check(jsonb_typeof(payload)='object'),product_id uuid references public.products(id),
 error text,attempts integer not null default 0 check(attempts>=0),unique(job_id,offer_id),unique(job_id,position)
);
create index catalog_import_items_pending on public.catalog_import_items(job_id,position) where state='pending';
create index catalog_import_items_identity on public.catalog_import_items((payload->>'identity_key')) where state='imported';
create table public.catalog_product_reviews (
 product_id uuid primary key references public.products(id),
 state text not null default 'draft' check(state in ('draft','review','approved','paused','blocked')),
 identity_confirmed boolean not null default false,costs_confirmed boolean not null default false,
 media_authorized boolean not null default false,compliance_confirmed boolean not null default false,
 evidence text not null default '',updated_at timestamptz not null default now()
);
create table public.catalog_import_events (
 id uuid primary key default gen_random_uuid(),job_id uuid references public.catalog_import_jobs(id),
 item_id uuid references public.catalog_import_items(id),product_id uuid references public.products(id),
 action text not null,detail jsonb not null default '{}',created_at timestamptz not null default now(),actor uuid default auth.uid()
);
do $$declare t text;begin
 foreach t in array array['catalog_import_jobs','catalog_import_items','catalog_product_reviews','catalog_import_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select on public.%I to authenticated,service_role',t);
  execute format('create policy admin_private_read on public.%I for select to authenticated using((select public.is_admin()))',t);
 end loop;
end $$;

create function public.create_catalog_import_job_v1(request_input uuid,config_input jsonb,rows_input jsonb) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.catalog_import_jobs; normalized_config jsonb; row_input jsonb; ord bigint; total integer;
begin
 if not coalesce(public.is_admin(),false) then raise exception 'Forbidden';end if;
 if request_input is null or jsonb_typeof(config_input) is distinct from 'object' or jsonb_typeof(rows_input) is distinct from 'array' then raise exception 'Invalid preview';end if;
 total:=jsonb_array_length(rows_input);
 if total not between 1 and 5000 then raise exception 'Preview must contain 1 to 5000 offers';end if;
 if exists(select 1 from jsonb_array_elements(rows_input) r where jsonb_typeof(r) is distinct from 'object' or jsonb_typeof(r->'payload') is distinct from 'object' or nullif(r->>'offer_id','') is null)
 or (select count(distinct r->>'offer_id') from jsonb_array_elements(rows_input) r)<>total then raise exception 'Invalid or duplicate preview offers';end if;
 normalized_config:=config_input||'{"automatic_publication":false}'::jsonb;
 perform pg_advisory_xact_lock(hashtextextended('catalog-request:'||request_input::text,0));
 select * into j from public.catalog_import_jobs where request_key=request_input;
 if found then
  if j.config is distinct from normalized_config or (select jsonb_agg(jsonb_build_object('offer_id',i.offer_id,'payload',i.payload) order by i.position) from public.catalog_import_items i where job_id=j.id) is distinct from rows_input then
   raise exception 'Idempotency mismatch';
  end if;
  return j.id;
 end if;
 insert into public.catalog_import_jobs(request_key,config) values(request_input,normalized_config) returning * into j;
 for row_input,ord in select value,ordinality from jsonb_array_elements(rows_input) with ordinality loop
  insert into public.catalog_import_items(job_id,offer_id,position,payload) values(j.id,(row_input->>'offer_id')::uuid,ord-1,row_input->'payload');
 end loop;
 insert into public.catalog_import_events(job_id,action,detail) values(j.id,'preview',jsonb_build_object('rows',total));
 return j.id;
end $$;

create function public.control_catalog_import_job_v1(job_input uuid,action_input text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.catalog_import_jobs;
begin
 if not coalesce(public.is_admin(),false) then raise exception 'Forbidden';end if;
 select * into j from public.catalog_import_jobs where id=job_input for update;
 if not found then raise exception 'Job not found';end if;
 if action_input is null or action_input not in ('confirm','pause','resume','cancel','retry_failed') then raise exception 'Invalid action';end if;
 if j.state='cancelled' then
  if action_input='cancel' then return;end if;
  raise exception 'Job cancelled';
 end if;
 if action_input='confirm' then
  if j.state not in ('preview','queued') then raise exception 'Job already confirmed';end if;
  update public.catalog_import_jobs set state='queued' where id=j.id;
 elsif action_input='pause' then
  if j.state not in ('queued','paused') then raise exception 'Only queued jobs can be paused';end if;
  update public.catalog_import_jobs set state='paused' where id=j.id;
 elsif action_input='resume' then
  if j.state not in ('paused','queued') then raise exception 'Only paused jobs can be resumed';end if;
  update public.catalog_import_jobs set state='queued' where id=j.id;
 elsif action_input='cancel' then
  update public.catalog_import_jobs set state='cancelled' where id=j.id;
 else
  if j.state='preview' then raise exception 'Confirm preview first';end if;
  update public.catalog_import_items set state='pending',error=null where job_id=j.id and state='failed';
  update public.catalog_import_jobs set state=case when j.state='paused' then 'paused' else 'queued' end where id=j.id;
 end if;
 insert into public.catalog_import_events(job_id,action,detail) values(j.id,action_input,jsonb_build_object('before',j.state));
end $$;

-- Full tokens are supplied by the existing exact-identity matcher. No title similarity is used for deduplication.
create function public.process_catalog_import_job_v1(job_input uuid,limit_input integer default 20) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.catalog_import_jobs;i public.catalog_import_items;o public.supplier_offers;p jsonb;c jsonb;
 target uuid;target_variant uuid;identity text;processed integer:=0;result_state text;problem text;counts jsonb;source_keys text[];
 current_rule uuid;current_policy uuid;current_tracking jsonb;link_result text;
begin
 if coalesce(current_setting('role',true),'')<>'service_role' and not coalesce(public.is_admin(),false) then raise exception 'Forbidden';end if;
 if limit_input is null or limit_input not between 1 and 20 then raise exception 'Invalid limit: maximum 20';end if;
 -- A global catalog lock also serializes identical identities in different jobs and normalized slug checks.
 perform pg_advisory_xact_lock(hashtextextended('supplier-catalog-import-v1',0));
 select * into j from public.catalog_import_jobs where id=job_input for update;
 if not found then raise exception 'Job not found';end if;
 source_keys:=array['id','supplier_id','external_id','variant_key','title','brand','model','gtin','source_url','origin_cost','currency','availability','verification','cost_checked_at','availability_checked_at','last_error','product_id','variant_id'];
 if j.state='queued' then
  for i in select * from public.catalog_import_items where job_id=j.id and state='pending' order by position limit limit_input for update loop
   processed:=processed+1;target:=null;target_variant:=null;problem:=null;result_state:='review';
   -- PL/pgSQL exception blocks are savepoints: failed costs/links roll the entire row back.
   begin
    select * into o from public.supplier_offers where id=i.offer_id for update;
    if not found then raise exception 'Source offer missing';end if;
    if o.product_id is not null then target:=o.product_id;target_variant:=o.variant_id;result_state:='linked';
    elsif jsonb_typeof(i.payload->'offer') is distinct from 'object' or not (i.payload->'offer' ?& source_keys)
       or not (to_jsonb(o) @> (i.payload->'offer')) then problem:='Source changed after preview; create a new preview';
    elsif i.payload->>'action' in ('review','skip') then problem:=coalesce(nullif(i.payload->>'reason',''),'Explicit identity review required');
    elsif i.payload->>'action'='link' then
     if (i.payload->'target'->>'productId') is distinct from (i.payload->'link'->>'productId')
        or (i.payload->'target'->'productSnapshot') is distinct from (i.payload->'link'->'productSnapshot')
        or nullif(i.payload->'target'->>'variantId','') is distinct from nullif(i.payload->'link'->>'variantId','')
        or (i.payload->'target'->'variantSnapshot') is distinct from (i.payload->'link'->'variantSnapshot')
        or (i.payload->'link'->>'offerId') is distinct from o.id::text then raise exception 'Link target snapshot mismatch';end if;
     -- The existing RPC rechecks exact product/variant identity and explicit review confirmation.
     link_result:=public.link_supplier_offer_v1(i.payload->'link');
     target:=(i.payload->'target'->>'productId')::uuid;target_variant:=nullif(i.payload->'target'->>'variantId','')::uuid;result_state:='linked';
     -- Linking alone must not certify an unverified source's cost/availability.
     if o.verification<>'verified' then update public.supplier_offers set verification=o.verification where id=o.id;end if;
    elsif i.payload->>'action'='new' then
     p:=i.payload->'product';c:=i.payload->'cost';identity:=i.payload->>'identity_key';
     if jsonb_typeof(p) is distinct from 'object' or nullif(btrim(identity),'') is null or length(identity)>2000
       or identity is distinct from lower(regexp_replace(btrim(identity),'\s+',' ','g')) then raise exception 'Full canonical identity required';end if;
     if nullif(btrim(p->>'title'),'') is null or nullif(btrim(p->>'slug'),'') is null or (p->>'retail_price')::numeric is null or (p->>'retail_price')::numeric<0 then raise exception 'Invalid draft product';end if;
     if c is not null and c<>'null'::jsonb then
      select id into current_policy from public.import_cost_policies order by created_at desc,id desc limit 1;
      select id into current_rule from public.catalog_pricing_rules order by created_at desc,id desc limit 1;
      select config into current_tracking from public.supplier_tracking_settings where id=true;
      if (j.config ? 'import_policy_id' and j.config->>'import_policy_id' is distinct from current_policy::text)
       or (j.config ? 'pricing_rule_id' and j.config->>'pricing_rule_id' is distinct from current_rule::text)
       or (j.config ? 'tracking_config' and j.config->'tracking_config' is distinct from current_tracking) then
       problem:='Commercial policy changed after preview; create a new preview';
      end if;
     end if;
     if problem is null then
      select x.product_id into target from public.catalog_import_items x join public.products existing on existing.id=x.product_id
       where x.state='imported' and x.payload->>'identity_key'=identity order by x.job_id,x.position limit 1;
      if target is not null then
       if exists(select 1 from public.product_variants where product_id=target) then target:=null;problem:='Exact variant now required; create a new preview';
       else result_state:='linked';end if;
      elsif exists(select 1 from public.products existing where
        lower(regexp_replace(btrim(existing.title),'[^[:alnum:]]+',' ','g'))=lower(regexp_replace(btrim(p->>'title'),'[^[:alnum:]]+',' ','g'))
        or lower(btrim(existing.slug))=lower(btrim(p->>'slug'))) then
       problem:='Existing title or slug requires explicit identity review';
      else
       target:=(p->>'id')::uuid;
       if target is null then raise exception 'Draft product id required';end if;
       insert into public.products(id,title,slug,category_id,description,retail_price,brand,model,is_active,stock,fulfillment_mode,supplier_available,image_url,image_urls,is_featured)
        values(target,btrim(p->>'title'),btrim(p->>'slug'),(p->>'category_id')::uuid,coalesce(p->>'description',''),(p->>'retail_price')::numeric,nullif(p->>'brand',''),nullif(p->>'model',''),false,0,'supplier',false,null,'{}',false);
       insert into public.catalog_product_reviews(product_id) values(target);
       if c is not null and c<>'null'::jsonb then
        insert into public.product_costs(product_id,origin_cost,currency,exchange_rate,freight_per_unit,other_landed_cost,variable_cost,payment_fee_percent,minimum_contribution,expenses_confirmed,verified_at,source_document,supplier_url)
         values(target,(c->>'origin_cost')::numeric,c->>'currency',(c->>'exchange_rate')::numeric,(c->>'freight_per_unit')::numeric,(c->>'other_landed_cost')::numeric,(c->>'variable_cost')::numeric,(c->>'payment_fee_percent')::numeric,(c->>'minimum_contribution')::numeric,false,(c->>'verified_at')::timestamptz,c->>'source_document',o.source_url);
       end if;
       result_state:='imported';
      end if;
      if target is not null and problem is null then
       update public.supplier_offers set product_id=target,variant_id=null,verification='pending',updated_at=now(),
        evidence=evidence||jsonb_build_object('catalogImportJob',j.id,'catalogIdentityKey',identity) where id=o.id;
       insert into public.supplier_observations(offer_id,kind,payload,observed_at) values(o.id,'manual',jsonb_build_object('action','catalog_draft_link','job_id',j.id,'product_id',target),now());
      end if;
     end if;
    else raise exception 'Invalid import action';end if;
    update public.catalog_import_items set state=result_state,product_id=target,error=problem,attempts=attempts+1 where id=i.id;
    insert into public.catalog_import_events(job_id,item_id,product_id,action,detail) values(j.id,i.id,target,result_state,jsonb_build_object('reason',problem,'variant_id',target_variant));
   exception when others then
    update public.catalog_import_items set state='failed',error=left(sqlerrm,1000),attempts=attempts+1 where id=i.id;
    insert into public.catalog_import_events(job_id,item_id,action,detail) values(j.id,i.id,'failed',jsonb_build_object('error',left(sqlerrm,1000)));
   end;
  end loop;
  if not exists(select 1 from public.catalog_import_items where job_id=j.id and state='pending') then
   update public.catalog_import_jobs set state='completed' where id=j.id;
  end if;
 end if;
 select jsonb_build_object('pending',count(*) filter(where state='pending'),'imported',count(*) filter(where state='imported'),'linked',count(*) filter(where state='linked'),'review',count(*) filter(where state='review'),'failed',count(*) filter(where state='failed'))
  into counts from public.catalog_import_items where job_id=j.id;
 return jsonb_build_object('job_id',j.id,'state',(select state from public.catalog_import_jobs where id=j.id),'processed',processed,'counts',counts);
end $$;

-- Activation is a separate explicit administrative operation. All existing products keep their behavior.
create function public.guard_catalog_product_publication_v1() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.catalog_product_reviews;c public.product_costs;rule_config jsonb;policy_config jsonb;minimum_margin numeric;contribution numeric;
begin
 if not new.is_active then return new;end if;
 select * into r from public.catalog_product_reviews where product_id=new.id;
 if not found then return new;end if;
 if r.state<>'approved' or not(r.identity_confirmed and r.costs_confirmed and r.media_authorized and r.compliance_confirmed) or length(btrim(r.evidence))<20 then raise exception 'Documentary review and all confirmations required';end if;
 if length(regexp_replace(coalesce(new.description,''),'\s','','g'))<40 or new.retail_price is null or new.retail_price<=0
   or not (coalesce(new.image_url,'') like 'https://%' or exists(select 1 from unnest(new.image_urls) image where image like 'https://%')) then raise exception 'Meaningful description, authorized image and positive price required';end if;
 select config into rule_config from public.catalog_pricing_rules order by created_at desc,id desc limit 1;
 minimum_margin:=coalesce((rule_config->'categoryMargins'->new.category_id::text->>'minimum')::numeric,(rule_config->>'minimumMarginPercent')::numeric);
 if minimum_margin is null or minimum_margin<0 or minimum_margin>=100 then raise exception 'Explicit current minimum margin policy required';end if;
 select config into policy_config from public.import_cost_policies order by created_at desc,id desc limit 1;
 if policy_config->>'confirmed' is distinct from 'true' then raise exception 'Confirmed current import policy required';end if;
 select * into c from public.product_costs where product_id=new.id;
 if not found or not c.expenses_confirmed or c.origin_cost<=0 or c.exchange_rate<=0 or c.verified_at is null
   or c.verified_at<now()-interval '24 hours' or c.verified_at>now()+interval '5 minutes' or nullif(btrim(c.source_document),'') is null then raise exception 'Complete fresh documented product costs required';end if;
 contribution:=new.retail_price*(1-c.payment_fee_percent/100)-c.landed_cost-c.variable_cost;
 if contribution<=0 or contribution<c.minimum_contribution or contribution/new.retail_price*100<minimum_margin then raise exception 'Insufficient contribution or margin';end if;
 if not exists(select 1 from public.supplier_offers o join public.suppliers s on s.id=o.supplier_id where o.product_id=new.id and o.variant_id is null
  and s.is_active and o.verification='verified' and o.availability='in_stock' and o.last_error is null and o.origin_cost>0 and o.currency is not null
  and o.cost_checked_at between now()-make_interval(hours=>least(24,s.freshness_hours)) and now()+interval '5 minutes'
  and o.availability_checked_at between now()-make_interval(hours=>least(24,s.freshness_hours)) and now()+interval '5 minutes') then raise exception 'Fresh verified available supplier offer required';end if;
 return new;
end $$;
create trigger guard_catalog_product_publication before insert or update of is_active on public.products for each row execute function public.guard_catalog_product_publication_v1();

create function public.review_catalog_product_v1(product_input uuid,review_input jsonb,action_input text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.catalog_product_reviews;before_review jsonb;
begin
 if not coalesce(public.is_admin(),false) then raise exception 'Forbidden';end if;
 if action_input is null or action_input not in ('save','publish','pause') or jsonb_typeof(review_input) is distinct from 'object' then raise exception 'Invalid review action';end if;
 perform 1 from public.products where id=product_input for update;
 if not found then raise exception 'Product not found';end if;
 select * into r from public.catalog_product_reviews where product_id=product_input for update;
 if not found then raise exception 'Product is not catalog-managed';end if;
 before_review:=to_jsonb(r);
 update public.catalog_product_reviews set
  identity_confirmed=coalesce((review_input->>'identity_confirmed')::boolean,r.identity_confirmed),costs_confirmed=coalesce((review_input->>'costs_confirmed')::boolean,r.costs_confirmed),
  media_authorized=coalesce((review_input->>'media_authorized')::boolean,r.media_authorized),compliance_confirmed=coalesce((review_input->>'compliance_confirmed')::boolean,r.compliance_confirmed),
  evidence=left(coalesce(review_input->>'evidence',r.evidence),10000),state=case action_input when 'publish' then 'approved' when 'pause' then 'paused' else 'review' end,updated_at=now()
 where product_id=product_input;
 update public.products set is_active=(action_input='publish'),updated_at=now() where id=product_input;
 insert into public.catalog_import_events(product_id,action,detail) values(product_input,'review_'||action_input,jsonb_build_object('before',before_review,'review',review_input));
end $$;

create function public.catalog_import_job_counts_v1(job_inputs uuid[]) returns table(job_id uuid,state text,total bigint)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if coalesce(current_setting('role',true),'')<>'service_role' and not coalesce(public.is_admin(),false) then raise exception 'Forbidden';end if;
 if job_inputs is null or cardinality(job_inputs)>20 then raise exception 'Invalid job count: maximum 20';end if;
 return query select i.job_id,i.state,count(*) from public.catalog_import_items i where i.job_id=any(job_inputs) group by i.job_id,i.state;
end $$;
revoke all on function public.catalog_import_job_counts_v1(uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.catalog_import_job_counts_v1(uuid[]) to authenticated,service_role;

revoke all on function public.create_catalog_import_job_v1(uuid,jsonb,jsonb),public.control_catalog_import_job_v1(uuid,text),public.process_catalog_import_job_v1(uuid,integer),public.review_catalog_product_v1(uuid,jsonb,text),public.guard_catalog_product_publication_v1() from public,anon,authenticated,service_role;
grant execute on function public.create_catalog_import_job_v1(uuid,jsonb,jsonb),public.control_catalog_import_job_v1(uuid,text),public.review_catalog_product_v1(uuid,jsonb,text) to authenticated;
grant execute on function public.process_catalog_import_job_v1(uuid,integer) to authenticated,service_role;
commit;
