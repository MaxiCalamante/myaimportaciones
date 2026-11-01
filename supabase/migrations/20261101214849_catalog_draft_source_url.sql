-- Persist the source on future catalog drafts. Existing products, prices and inventory are untouched.
-- The offer remains pending: identity review still gates stock, tracking and publication.
begin;
create or replace function public.process_catalog_import_job_v1(job_input uuid,limit_input integer default 20) returns jsonb
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
       insert into public.products(id,title,slug,category_id,description,retail_price,brand,model,source_url,is_active,stock,fulfillment_mode,supplier_available,image_url,image_urls,is_featured)
        values(target,btrim(p->>'title'),btrim(p->>'slug'),(p->>'category_id')::uuid,coalesce(p->>'description',''),(p->>'retail_price')::numeric,nullif(p->>'brand',''),nullif(p->>'model',''),o.source_url,false,0,'supplier',false,null,'{}',false);
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
commit;
