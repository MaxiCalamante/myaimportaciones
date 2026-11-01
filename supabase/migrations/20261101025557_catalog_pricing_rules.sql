-- Selling fees and margins are independent from versioned import_cost_policies.
-- Deliberately empty: the administrator must configure and confirm actual expenses.
begin;

create table public.catalog_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  actor uuid default auth.uid()
);
create index catalog_pricing_rules_created_at on public.catalog_pricing_rules(created_at desc, id desc);

alter table public.catalog_pricing_rules enable row level security;
revoke all on public.catalog_pricing_rules from public, anon, authenticated;
grant select, insert on public.catalog_pricing_rules to authenticated;
grant all on public.catalog_pricing_rules to service_role;

create policy admin_private_read on public.catalog_pricing_rules
  for select to authenticated using ((select public.is_admin()));
create policy admin_insert on public.catalog_pricing_rules
  for insert to authenticated with check ((select public.is_admin()) and actor = (select auth.uid()));

comment on table public.catalog_pricing_rules is 'Private commercial rule versions; administrators append a new snapshot for every change. No seeded rates.';
commit;
