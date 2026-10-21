-- Enrich future transactional snapshots only; never replay historical orders.
create or replace function public.capture_order_emails_v1() returns trigger language plpgsql security definer set search_path=public as $$
declare snap jsonb; ev text; suffix text;
begin
 -- Explicit projection: never include request hashes, supplier information or payment URLs.
 snap:=jsonb_build_object('order_id',new.id,'buyer_name',(select full_name from profiles where id=new.profile_id),'buyer_email',(select email from profiles where id=new.profile_id),'customer_email',new.customer_email,'shipping_name',new.shipping_name,
  'shipping_phone',new.shipping_phone,'shipping_address',new.shipping_address,'order_notes',new.order_notes,
  'tracking_code',new.tracking_code,'status',new.status,'payment_method',new.payment_method,
  'subtotal_amount',new.subtotal_amount,'discount_amount',new.discount_amount,'shipping_amount',new.shipping_amount,
  'total_amount',new.total_amount,'shipping_option',new.shipping_option,'reservation_expires_at',new.reservation_expires_at,
  'carrier_tracking_code',new.carrier_tracking_code,
  'items',coalesce((select jsonb_agg(jsonb_build_object('product_title',i.product_title,'quantity',i.quantity,'unit_price',i.unit_price,'variant_title',i.variant_title,'variant_sku',i.variant_sku) order by i.id) from public.order_items i where i.order_id=new.id),'[]'::jsonb));
 if tg_op='INSERT' then
  perform public.queue_transactional_email_v1('order/'||new.id||'/created/customer','order_created','customer',new.id,snap);
  perform public.queue_transactional_email_v1('order/'||new.id||'/created/admin','order_created','admin',new.id,snap);
  return null;
 end if;
 if new.status is distinct from old.status then
  ev:=case new.status when 'paid' then 'payment_confirmed' when 'preparing' then 'order_preparing'
   when 'shipped' then 'order_shipped' when 'delivered' then 'order_delivered'
   when 'cancelled' then case when old.reservation_expires_at<now() then 'reservation_expired' else 'order_cancelled' end end;
  if ev is not null then
   perform public.queue_transactional_email_v1('order/'||new.id||'/'||ev||'/customer',ev,'customer',new.id,snap);
   if new.status in ('paid','cancelled') then
    perform public.queue_transactional_email_v1('order/'||new.id||'/'||ev||'/admin',ev,'admin',new.id,snap);
   end if;
  end if;
 end if;
 if new.carrier_tracking_code is distinct from old.carrier_tracking_code and coalesce(new.carrier_tracking_code,'')<>'' and new.status in ('shipped','delivered') and new.status=old.status then
  suffix:=md5(new.carrier_tracking_code);
  perform public.queue_transactional_email_v1('order/'||new.id||'/tracking/'||suffix,'tracking_updated','customer',new.id,snap);
 end if;
 if new.payment_review and not old.payment_review then
  perform public.queue_transactional_email_v1('order/'||new.id||'/payment_review','payment_review','admin',new.id,snap);
 end if;
 return null;
end $$;
