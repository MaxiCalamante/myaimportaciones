begin;
set local role anon;
do $$ begin
 if jsonb_array_length(public.public_carousel_slides())<>3 then raise exception 'Public slides mismatch'; end if;
 begin perform slides from public.storefront_carousel; raise exception 'Anon read allowed'; exception when insufficient_privilege then null; end;
 begin perform source_url from public.products; raise exception 'Private columns exposed'; exception when insufficient_privilege then null; end;
 begin perform id from public.suppliers; raise exception 'Suppliers exposed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.storefront_carousel) then raise exception 'Customer read allowed'; end if;
 if exists(select 1 from public.suppliers) then raise exception 'Customer suppliers read allowed'; end if;
 begin perform public.admin_catalog_page(); raise exception 'Customer private RPC allowed'; exception when raise_exception then if sqlerrm<>'Forbidden' then raise; end if; end;
 begin perform public.update_product_supplier_sync_v1(null,true,'test',null); raise exception 'Customer sync allowed'; exception when raise_exception then if sqlerrm<>'Forbidden' then raise; end if; end;
 update public.storefront_carousel set revision=revision+1; if found then raise exception 'Customer update allowed'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='admin' limit 1),true);
set local role authenticated;
do $$ declare previous integer; begin
 if not public.is_admin() then raise exception 'Admin role unavailable'; end if;
 perform public.admin_catalog_page();
 select revision into strict previous from public.storefront_carousel where id=1;
 update public.storefront_carousel set revision=previous+1 where id=1 and revision=previous;
 if not found then raise exception 'Admin persistence failed'; end if;
 update public.storefront_carousel set revision=previous+2 where id=1 and revision=previous;
 if found then raise exception 'Stale revision accepted'; end if;
 update public.storefront_carousel set slides=jsonb_set(slides,'{0,active}','false') where id=1;
 if jsonb_array_length(public.public_carousel_slides())<>2 then raise exception 'Paused slide exposed'; end if;
 insert into public.suppliers(name) values('Validación transaccional: revertida');
end $$;
reset role;
select true as anon_public_only, true as customer_denied, true as admin_persistence_and_revision_checked, true as paused_excluded, true as supplier_write_checked, 'ROLLBACK: no persisted test changes' as cleanup;
rollback;
