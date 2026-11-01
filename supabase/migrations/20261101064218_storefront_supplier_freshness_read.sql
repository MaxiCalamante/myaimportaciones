-- Public freshness metadata only. Costs, supplier sources and customer data stay private.
grant select(supplier_last_checked_at) on public.products to anon,authenticated;
