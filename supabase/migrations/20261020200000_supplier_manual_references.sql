begin;
-- A human-verified reference must retain its verification until expiry even if the website blocks bots.
alter table supplier_market_references add column refresh_mode text not null default 'automatic' check(refresh_mode in ('automatic','manual'));
grant update(refresh_mode) on supplier_market_references to authenticated;
commit;
