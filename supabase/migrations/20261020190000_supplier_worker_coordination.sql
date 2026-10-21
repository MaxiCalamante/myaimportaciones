begin;
create table supplier_source_slots(supplier_id uuid primary key references suppliers(id),next_at timestamptz not null);
alter table supplier_source_slots enable row level security;
revoke all on supplier_source_slots from public,anon,authenticated;
grant all on supplier_source_slots to service_role;
create function reserve_supplier_source_slot_v1(supplier_input uuid,delay_input integer default 10000) returns integer
language plpgsql security definer set search_path=public as $$
declare slot timestamptz;
begin
 if coalesce(current_setting('role',true),'')<>'service_role' and not public.is_admin() then raise exception 'Forbidden'; end if;
 if delay_input not between 10000 and 120000 then raise exception 'Invalid cadence'; end if;
 insert into supplier_source_slots(supplier_id,next_at) values(supplier_input,clock_timestamp()+delay_input*interval '1 millisecond')
 on conflict(supplier_id) do update set next_at=greatest(supplier_source_slots.next_at,clock_timestamp())+delay_input*interval '1 millisecond'
 returning next_at-delay_input*interval '1 millisecond' into slot;
 return greatest(0,ceil(extract(epoch from slot-clock_timestamp())*1000)::integer);
end $$;
revoke all on function reserve_supplier_source_slot_v1(uuid,integer) from public,anon;
grant execute on function reserve_supplier_source_slot_v1(uuid,integer) to service_role,authenticated;
create function queue_verified_supplier_offer_v1() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.verification<>'verified' or new.product_id is null then return new; end if;
 if tg_op='UPDATE' and (old.product_id,old.variant_id,old.verification,old.source_url) is not distinct from (new.product_id,new.variant_id,new.verification,new.source_url) then return new; end if;
 if exists(select 1 from suppliers where id=new.supplier_id and query_mode='product_page' and is_active) then
  insert into supplier_sync_queue(supplier_id,product_id,variant_id,offer_id,source_url)
  values(new.supplier_id,new.product_id,new.variant_id,new.id,new.source_url) on conflict do nothing;
  update supplier_sync_queue set offer_id=new.id where supplier_id=new.supplier_id and source_url=new.source_url
   and product_id=new.product_id and variant_id is not distinct from new.variant_id and offer_id is null;
 end if;
 return new;
end $$;
create trigger queue_verified_supplier_offer after insert or update of product_id,variant_id,verification,source_url on supplier_offers
 for each row execute function queue_verified_supplier_offer_v1();
commit;
