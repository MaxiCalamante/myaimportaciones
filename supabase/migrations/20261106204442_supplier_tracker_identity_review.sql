begin;
do $$declare definition text;marker text;begin
 definition:=pg_get_functiondef('public.tracker_record_monitor_v1(uuid,uuid,jsonb)'::regprocedure);
 marker:='status=case when price is null';
 if position(marker in definition)=0 then raise exception 'Monitor status contract changed';end if;
 definition:=replace(definition,marker,'status=case when nullif(result_input->>''commercialReview'','''')is not null then ''review''when price is null');
 marker:='return jsonb_build_object(''itemId'',i.id';
 if position(marker in definition)=0 then raise exception 'Monitor result contract changed';end if;
 definition:=replace(definition,marker,'if nullif(result_input->>''commercialReview'','''')is not null then
 insert into supplier_tracker_events(supplier_id,item_id,task_id,kind,after_value)values(t.supplier_id,i.id,t.id,''identity_review'',jsonb_build_object(''reason'',result_input->>''commercialReview'',''url'',i.url));end if;
 '||marker);
 execute definition;
end$$;
commit;
