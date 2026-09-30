begin;
create function public.valid_carousel_slides(value jsonb) returns boolean language sql immutable set search_path=public as $$
  select case when jsonb_typeof(value)<>'array' then false else
    jsonb_array_length(value)<=10 and
    (select count(*)=count(distinct s->>'id') from jsonb_array_elements(value) s) and
    not exists(select 1 from jsonb_array_elements(value) s where
      jsonb_typeof(s)<>'object' or not (s ?& array['id','image','eyebrow','title','description','btnText','btnLink','active']) or
      jsonb_typeof(s->'active')<>'boolean' or
      exists(select 1 from jsonb_each(s) f where f.key<>'active' and jsonb_typeof(f.value)<>'string') or
      (s->>'id') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' or
      length(s->>'image')>2000 or length(s->>'eyebrow')>100 or length(s->>'title')>160 or length(s->>'description')>600 or length(s->>'btnText')>60 or length(s->>'btnLink')>2000 or
      ((s->>'active')='true' and (trim(s->>'image')='' or trim(s->>'title')='')) or
      ((trim(s->>'btnText')='') <> (trim(s->>'btnLink')=''))
    ) end;
$$;
create table public.storefront_carousel (
  id smallint primary key default 1 check(id=1),
  slides jsonb not null default '[]'::jsonb check(public.valid_carousel_slides(slides)),
  revision integer not null default 0 check(revision>=0),
  updated_at timestamptz not null default now()
);
alter table public.storefront_carousel enable row level security;
revoke all on public.storefront_carousel from public,anon,authenticated;
grant select,update on public.storefront_carousel to authenticated;
grant all on public.storefront_carousel to service_role;
create policy "Admins read carousel" on public.storefront_carousel for select to authenticated using ((select public.is_admin()));
create policy "Admins edit carousel" on public.storefront_carousel for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
-- Public content only: paused slides never leave this admin table through the public reader.
create function public.public_carousel_slides() returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce((select jsonb_agg(s.value order by s.ordinality) from public.storefront_carousel c,
    jsonb_array_elements(c.slides) with ordinality s(value,ordinality) where c.id=1 and s.value->>'active'='true'), '[]'::jsonb);
$$;
revoke all on function public.public_carousel_slides() from public;
grant execute on function public.public_carousel_slides() to anon,authenticated,service_role;
-- Preserve the three existing slides at activation. No catalog/commercial data is changed.
insert into public.storefront_carousel(id,slides) values(1,'[{"id":"10000000-0000-4000-8000-000000000001","image":"https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1800&q=80","eyebrow":"Total Tools & Wadfow","title":"Herramientas Industriales y Profesionales","description":"Herramientas para tu casa, taller y trabajo. Encontrá tu modelo y consultá disponibilidad y entrega desde Tandil.","btnText":"Ver Herramientas","btnLink":"/catalogo?category=herramientas-equipamiento","active":true},{"id":"10000000-0000-4000-8000-000000000002","image":"https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1800&q=80","eyebrow":"Tendencia Mundial en Skincare","title":"Tu próximo cuidado de la piel","description":"Sérums virales, cremas reparadoras y protectores de SKIN1004, Medicube, Dr. Althea y Celimax importados directamente para vos.","btnText":"Ver K-Beauty","btnLink":"/catalogo?category=cosmetica-coreana","active":true},{"id":"10000000-0000-4000-8000-000000000003","image":"https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1800&q=80","eyebrow":"Envíos Seguros a Todo el País","title":"Comprá con atención cercana","description":"Elegí tus productos y revisá disponibilidad, entrega y condiciones antes de confirmar tu pedido.","btnText":"Ver Catálogo Completo","btnLink":"/catalogo","active":true}]'::jsonb);
commit;
