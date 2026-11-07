begin;
do $$declare definition text;marker text;begin
 definition:=pg_get_functiondef('public.tracker_workspace_v1(jsonb)'::regprocedure);
 marker:='tracker_failures from suppliers';
 if position(marker in definition)=0 then raise exception 'Tracker workspace contract changed';end if;
 execute replace(definition,marker,'tracker_failures,greatest((select max(i.last_success_at)from supplier_tracker_items i where i.supplier_id=suppliers.id),(select max(s.last_success_at)from supplier_tracker_sources s where s.supplier_id=suppliers.id))last_success_at from suppliers');
 definition:=pg_get_functiondef('public.tracker_record_monitor_v1(uuid,uuid,jsonb)'::regprocedure);
 definition:=replace(definition,'missing_count>=2 and first_missing_at<=now()-interval ''24 hours''','missing_count>=2 and first_missing_at<=now()-interval ''24 hours''and(last_missing_at is null or last_missing_at<=now()-interval ''1 hour'')');
 definition:=replace(definition,'i.missing_count>=2 and i.first_missing_at<=now()-interval ''24 hours''','i.missing_count>=2 and i.first_missing_at<=now()-interval ''24 hours''and(i.last_missing_at is null or i.last_missing_at<=now()-interval ''1 hour'')');
 marker:='select coalesce(i.monitor_seconds,s.monitor_seconds,p.monitor_seconds)';
 if position(marker in definition)=0 then raise exception 'Monitor evidence contract changed';end if;
 definition:=replace(definition,marker,'if result_input->>''kind''=''ok''and result_input->>''availability''in(''in_stock'',''out_of_stock'')and result_input->>''availability''is distinct from i.availability and event_kind not in(''out_of_stock'',''back_in_stock'')then
 insert into supplier_tracker_events(supplier_id,item_id,task_id,kind,before_value,after_value)values(t.supplier_id,i.id,t.id,case when result_input->>''availability''=''out_of_stock''then ''out_of_stock''else ''back_in_stock''end,before_row,(select to_jsonb(v)from supplier_tracker_items v where id=i.id));end if;
 if result_input->>''kind''=''ok''and(result_input->>''quantity'')::integer is distinct from i.quantity then
 insert into supplier_tracker_events(supplier_id,item_id,task_id,kind,before_value,after_value)values(t.supplier_id,i.id,t.id,''quantity'',before_row,(select to_jsonb(v)from supplier_tracker_items v where id=i.id));end if;
 '||marker);
 execute definition;
end$$;
commit;
