create function public.strip_legacy_supplier_specification_v1()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if jsonb_typeof(new.specifications) = 'object' then
    new.specifications := new.specifications - array(
      select key from jsonb_object_keys(new.specifications) as keys(key)
      where lower(btrim(key)) = 'proveedor'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.strip_legacy_supplier_specification_v1() from public, anon, authenticated;

create trigger strip_legacy_supplier_specification
before insert or update of specifications on public.products
for each row execute function public.strip_legacy_supplier_specification_v1();

update public.products
set specifications = specifications - 'Proveedor'
where jsonb_typeof(specifications) = 'object' and specifications ? 'Proveedor';
