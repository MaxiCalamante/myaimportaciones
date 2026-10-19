-- Apply only after the deployed /api/cron/emails route and private env are ready.
-- First store the SAME Vercel CRON_SECRET in Vault as mya_email_cron_secret.
-- Never put that value in this source file, the cron command or deployment logs.
begin;
create extension if not exists pg_net with schema extensions;
do $$
begin
 if not exists (select 1 from vault.secrets where name='mya_email_cron_secret') then
  raise exception 'Configure mya_email_cron_secret in Supabase Vault before scheduling emails.';
 end if;
end $$;
select cron.schedule('mya-process-transactional-emails','*/5 * * * *',
 $job$select net.http_get(
  url := 'https://myaimportaciones.com/api/cron/emails',
  headers := jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='mya_email_cron_secret' limit 1)),
  timeout_milliseconds := 60000
 );$job$);
commit;
