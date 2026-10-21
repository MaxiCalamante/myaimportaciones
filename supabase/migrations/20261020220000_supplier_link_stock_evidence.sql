begin;
-- Old catalogue cards could be orderable without proving stock. Verifying identity cannot promote that signal.
do $$declare definition text;marker text:='verification=''verified'',updated_at=now(),';begin
 definition:=pg_get_functiondef('public.link_supplier_offer_v1(jsonb)'::regprocedure);
 if position(marker in definition)=0 then raise exception 'Link function marker missing';end if;
 definition:=replace(definition,marker,
 'verification=''verified'',updated_at=now(),availability=case when coalesce(evidence->>''availabilityBasis'',''explicit'')=''explicit'' then availability else ''unknown'' end,availability_checked_at=case when coalesce(evidence->>''availabilityBasis'',''explicit'')=''explicit'' then availability_checked_at else null end,');
 execute definition;
end $$;
commit;
