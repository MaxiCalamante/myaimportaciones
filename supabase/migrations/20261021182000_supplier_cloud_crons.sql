begin;
select cron.schedule('mya-supplier-sync','*/5 * * * *',$job$select public.enqueue_supplier_cloud_tick_v1('sync');$job$);
select cron.schedule('mya-supplier-details','2,17,32,47 * * * *',$job$select public.enqueue_supplier_cloud_tick_v1('details');$job$);
select cron.schedule('mya-supplier-market','7 * * * *',$job$select public.enqueue_supplier_cloud_tick_v1('market');$job$);
select cron.schedule('mya-supplier-plan','11 */6 * * *',$job$select public.enqueue_supplier_cloud_tick_v1('plan');$job$);
commit;
