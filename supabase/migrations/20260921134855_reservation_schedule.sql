-- Run after retail_integrity, during the coordinated deployment.
-- Uses Supabase's database scheduler, without an external HTTP cron or secret.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.schedule(
  'mya-expire-retail-reservations',
  '*/5 * * * *',
  $$select public.expire_retail_reservations_v2();$$
);
