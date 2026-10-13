-- Eliminación de la categoría vacía histórica 'smartphones-tecnologia'
-- La oferta tecnológica se centralizó bajo la categoría raíz 'electronica'
-- y su subcategoría 'electronica-smartphones'.

DO $$
BEGIN
  -- Reasignar por seguridad cualquier producto que pudiese apuntar a la categoría antigua
  UPDATE public.products 
  SET category_id = 'cfa5bcfb-99e3-48cf-ab99-3e8c728dfb27' -- electronica-smartphones
  WHERE category_id = '10000000-0000-0000-0000-000000000002';

  -- Reasignar cualquier subcategoría huérfana a Electrónica
  UPDATE public.categories 
  SET parent_id = '9d64c87a-12d6-4501-afbd-f35b5f9e4a90' -- electronica
  WHERE parent_id = '10000000-0000-0000-0000-000000000002';

  -- Eliminar la categoría
  DELETE FROM public.categories 
  WHERE id = '10000000-0000-0000-0000-000000000002';

  -- Ordenar las 4 categorías principales de forma armónica (1, 2, 3, 4)
  UPDATE public.categories 
  SET display_order = 2 
  WHERE id = '9d64c87a-12d6-4501-afbd-f35b5f9e4a90';
END $$;
