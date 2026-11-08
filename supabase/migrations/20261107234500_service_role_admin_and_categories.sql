-- Allow service_role and postgres roles in is_admin for administrative CLI and batch publishing
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    current_user in ('postgres', 'supabase_admin')
    or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    );
$function$;

-- Subcategories for electronica & perfumeria
INSERT INTO categories (id, parent_id, name, slug, description, display_order)
VALUES
  (gen_random_uuid(), '9d64c87a-12d6-4501-afbd-f35b5f9e4a90', 'Audio y Parlantes', 'electronica-audio-parlantes', 'Parlantes bluetooth JBL, auriculares inalámbricos y soundbars', 5),
  (gen_random_uuid(), '9d64c87a-12d6-4501-afbd-f35b5f9e4a90', 'Consolas y Gaming', 'electronica-consolas-gaming', 'PlayStation 5, Nintendo Switch, periféricos gamers y accesorios', 6),
  (gen_random_uuid(), '9d64c87a-12d6-4501-afbd-f35b5f9e4a90', 'Smart TVs y Monitores', 'electronica-tvs-monitores', 'Smart TVs 4K, monitores gamers Samsung, LG y soportes', 7),
  (gen_random_uuid(), '9d64c87a-12d6-4501-afbd-f35b5f9e4a90', 'Drones y Cámaras', 'electronica-drones-camaras', 'Drones DJI, estabilizadores gimbal, cámaras deportivas y de acción', 8),
  (gen_random_uuid(), '9d64c87a-12d6-4501-afbd-f35b5f9e4a90', 'Componentes y Accesorios', 'electronica-componentes-accesorios', 'Procesadores, placas madre, fuentes, almacenamiento y periféricos', 9),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000005', 'Perfumes importados femeninos', 'perfumes-importados-mujer', 'Fragancias importadas de primeras marcas de diseñador para mujer', 3),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000005', 'Perfumes importados masculinos', 'perfumes-importados-hombre', 'Fragancias importadas de primeras marcas de diseñador para hombre', 4),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000005', 'Perfumes unisex y de autor', 'perfumes-unisex-autor', 'Perfumes de autor, nicho y unisex de alta concentración', 5)
ON CONFLICT (slug) DO NOTHING;
