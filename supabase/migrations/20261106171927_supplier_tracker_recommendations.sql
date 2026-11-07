begin;
-- Product-source registration uses a distinct variable from the unique-index column.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.tracker_start_source_v1(uuid)'::regprocedure);
 definition:=replace(replace(replace(definition,'item_id uuid;','resolved_item uuid;'),'into item_id','into resolved_item'),'values(s.supplier_id,s.id,item_id,','values(s.supplier_id,s.id,resolved_item,');
 execute definition;
end$$;
create function public.tracker_alternatives_v1(product_input uuid,variant_input uuid default null)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o record;u record;b jsonb;cost numeric;contribution numeric;wholesale_contribution numeric;reason text;eligible boolean;rows jsonb:='[]';recommended uuid;begin
 if not coalesce(is_admin(),false)then raise exception 'Forbidden';end if;
 for o in select so.*,s.name supplier_name,s.freshness_hours,s.tracker_priority from supplier_offers so join suppliers s on s.id=so.supplier_id
 where so.product_id=product_input and so.variant_id is not distinct from variant_input and so.verification='verified'and s.is_active and s.archived_at is null order by s.tracker_priority,so.id loop
  cost:=null;contribution:=null;wholesale_contribution:=null;reason:=null;eligible:=false;
  if o.last_error is not null or o.availability<>'in_stock'or o.cost_checked_at is null or o.availability_checked_at is null
   or least(o.cost_checked_at,o.availability_checked_at)<now()-make_interval(hours=>o.freshness_hours)or greatest(o.cost_checked_at,o.availability_checked_at)>now()+interval '5 minutes' then reason:='Disponibilidad o costo sin comprobar, vencido o con error';
  elsif o.evidence->>'costScope'='supplier_quote_inclusions_unconfirmed'then reason:='Falta confirmar cargos incluidos por el proveedor';
  elsif to_regclass('public.product_usd_prices')is null then reason:='Falta base comercial USD documentada';
  else
   begin
    execute 'select retail_usd,wholesale_usd,cost_basis from public.product_usd_prices where product_id=$1 and variant_id is not distinct from $2'into u using product_input,variant_input;
    b:=u.cost_basis;
    if b is null or b->>'supplierUrl'is distinct from o.source_url or b->>'currency'is distinct from o.currency then raise exception 'Falta costo total documentado para esta fuente exacta';end if;
    b:=b||jsonb_build_object('origin',o.origin_cost);
    execute 'select public.store_cost_usd_v1($1)'into cost using b;
    contribution:=u.retail_usd*(1-(b->>'feePercent')::numeric/100)-cost-(b->>'variableArs')::numeric/(b->>'acquisitionArs')::numeric;
    if u.wholesale_usd is not null then wholesale_contribution:=u.wholesale_usd*(1-(b->>'feePercent')::numeric/100)-cost-(b->>'variableArs')::numeric/(b->>'acquisitionArs')::numeric;end if;
    if contribution is null or contribution<=0 or contribution<(b->>'minimumContribution')::numeric/(b->>'acquisitionArs')::numeric
      or(wholesale_contribution is not null and(wholesale_contribution<=0 or wholesale_contribution<(b->>'minimumContribution')::numeric/(b->>'acquisitionArs')::numeric))then raise exception 'La contribución por canal no alcanza el mínimo documentado';end if;
    eligible:=true;
   exception when others then reason:=sqlerrm;end;
  end if;
  rows:=rows||jsonb_build_array(jsonb_build_object('offerId',o.id,'supplierName',o.supplier_name,'url',o.source_url,'origin',o.origin_cost,'currency',o.currency,'availability',o.availability,
   'checkedAt',least(o.cost_checked_at,o.availability_checked_at),'totalUsd',cost,'contributionUsd',contribution,'eligible',eligible,'reason',reason,'priority',o.tracker_priority));
 end loop;
 select(value->>'offerId')::uuid into recommended from jsonb_array_elements(rows)where(value->>'eligible')::boolean order by(value->>'totalUsd')::numeric,(value->>'checkedAt')::timestamptz desc,(value->>'priority')::integer limit 1;
 return jsonb_build_object('offers',rows,'recommended',recommended,'preferred',(select offer_id from product_supplier_preferences where product_id=product_input and variant_id is not distinct from variant_input));
end$$;
revoke all on function tracker_alternatives_v1(uuid,uuid)from public,anon,service_role;grant execute on function tracker_alternatives_v1(uuid,uuid)to authenticated;
commit;
