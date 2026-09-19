-- Clean up previous dummy data

DELETE FROM public.products WHERE slug IN ('arroz-largo-fino-1kg', 'detergente-concentrado-750ml');
DELETE FROM public.categories WHERE slug IN ('almacen', 'bebidas', 'limpieza');

-- Insert official MYA Importaciones Categories
INSERT INTO public.categories (id, name, slug, parent_id, description, image_url, is_wholesale_only, display_order)
VALUES ('10000000-0000-0000-0000-000000000001', 'Cosmética Coreana (K-Beauty)', 'cosmetica-coreana', null, 'Skincare y cosmética coreana 100% original. Sérums, tónicos, cremas virales y protectores de las mejores marcas de Seúl.', '/products/Medicube Collagen Jelly Cream 50 ml.webp', false, 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  parent_id = EXCLUDED.parent_id,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order;
INSERT INTO public.categories (id, name, slug, parent_id, description, image_url, is_wholesale_only, display_order)
VALUES ('10000000-0000-0000-0000-000000000002', 'Smartphones & Tecnología', 'smartphones-tecnologia', null, 'Teléfonos Apple iPhone y dispositivos tecnológicos importados directos de fábrica con garantía y accesorios.', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80', false, 2)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  parent_id = EXCLUDED.parent_id,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order;
INSERT INTO public.categories (id, name, slug, parent_id, description, image_url, is_wholesale_only, display_order)
VALUES ('10000000-0000-0000-0000-000000000003', 'Herramientas & Equipamiento', 'herramientas-equipamiento', null, 'Línea oficial de herramientas industriales Total Tools & Wadfow para talleres, obras y el hogar.', 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=900&q=80', false, 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  parent_id = EXCLUDED.parent_id,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order;
INSERT INTO public.categories (id, name, slug, parent_id, description, image_url, is_wholesale_only, display_order)
VALUES ('10000000-0000-0000-0000-000000000004', 'Cuidado Capilar', 'cuidado-capilar', null, 'Mascarillas de colágeno y tratamientos capilares virales de restauración profunda.', '/products/Karseell Collagen Hair Mask 500ml – Mascarilla Capilar Colágeno.webp', false, 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  parent_id = EXCLUDED.parent_id,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order;
INSERT INTO public.categories (id, name, slug, parent_id, description, image_url, is_wholesale_only, display_order)
VALUES ('10000000-0000-0000-0000-000000000005', 'Sérums & Ampollas', 'serums-ampollas', '10000000-0000-0000-0000-000000000001', 'Concentrados activos faciales de alta penetración.', '/products/SKIN1004 Madagascar Centella Ampoule 55ml – Ampolla Facial Coreana.webp', false, 5)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  parent_id = EXCLUDED.parent_id,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order;
INSERT INTO public.categories (id, name, slug, parent_id, description, image_url, is_wholesale_only, display_order)
VALUES ('10000000-0000-0000-0000-000000000006', 'Cremas & Mascarillas', 'cremas-mascarillas', '10000000-0000-0000-0000-000000000001', 'Tratamientos hidratantes y reparadores con colágeno y PDRN.', '/products/Dr Althea 147 Barrier Cream 50ml – Crema Facial Reparadora Coreana.webp', false, 6)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  parent_id = EXCLUDED.parent_id,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order;
INSERT INTO public.categories (id, name, slug, parent_id, description, image_url, is_wholesale_only, display_order)
VALUES ('10000000-0000-0000-0000-000000000007', 'Limpieza & Exfoliantes', 'limpieza-exfoliantes', '10000000-0000-0000-0000-000000000001', 'Aceites limpiadores, espumas suaves y pads con BHA.', '/products/SKIN1004 Centella Light Cleansing Oil 200ml – Aceite Limpiador Coreano.webp', false, 7)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  parent_id = EXCLUDED.parent_id,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order;
INSERT INTO public.categories (id, name, slug, parent_id, description, image_url, is_wholesale_only, display_order)
VALUES ('10000000-0000-0000-0000-000000000008', 'Kits de Viaje K-Beauty', 'kits-de-viaje-k-beauty', '10000000-0000-0000-0000-000000000001', 'Sets completos de 4 pasos para probar o llevar de viaje.', '/products/SKIN1004 Madagascar Centella Tea-Trica Travel Kit x4 – Skincare Coreano.webp', false, 8)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  parent_id = EXCLUDED.parent_id,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order;

-- Insert official MYA Importaciones Products
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', 'Celimax Heartleaf BHA Peeling Pad 60 Pads', 'celimax-heartleaf-bha-peeling-pad-60-pads', 'Exfoliante suave en discos con BHA y extracto de Heartleaf. Limpia poros y calma rojeces en profundidad.', '/products/Celimax Heartleaf BHA Peeling Pad 60 Pads – Pads Exfoliantes Coreanos.webp', 38500, 28900, 6, 45, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'exfoliante', 'celimax', 'bha']::text[], true, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 'Celimax Retinal Shot Tightening Booster 15ml', 'celimax-retinal-shot-tightening-booster-15ml', 'Booster concentrado con retinal estabilizado para máxima firmeza, elasticidad y reducción de líneas de expresión.', '/products/Celimax Retinal Shot Tightening Booster 15ml – Retinal Coreano.webp', 42900, 32500, 6, 38, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'retinal', 'antiage', 'celimax']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', 'Celimax Retinol Shot Tightening Serum 30ml', 'celimax-retinol-shot-tightening-serum-30ml', 'Sérum anti-edad reafirmante con retinol. Estimula el colágeno y afina la textura cutánea de forma gentil.', '/products/Celimax Retinol Shot Tightening Serum 30ml – Sérum Facial Retinol.webp', 45800, 34900, 6, 40, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'retinol', 'serum', 'celimax']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', 'Dr Althea 147 Barrier Cream 50ml', 'dr-althea-147-barrier-cream-50ml', 'Crema reparadora intensiva de la barrera cutánea. Calma irritaciones, nutre y restaura la piel sensible.', '/products/Dr Althea 147 Barrier Cream 50ml – Crema Facial Reparadora Coreana.webp', 44500, 33500, 6, 52, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'dr-althea', 'reparadora', 'viral', 'top ventas']::text[], true, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006', 'Dr Althea 345 Relief Cream Mask – Pack x4', 'dr-althea-345-relief-cream-mask-pack-x4', 'Pack de 4 mascarillas intensivas calmantes enriquecidas con la fórmula 345 Relief para hidratación inmediata.', '/products/Dr Althea 345 Relief Cream Mask – Mascarillas Faciales Pack x4.webp', 32000, 24000, 6, 60, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'dr-althea', 'mascarilla', 'pack']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', 'Dr. Althea PDRN Reju 5000 Cream 20g', 'dr-althea-pdrn-reju-5000-cream-20g', 'Crema rejuvenecedora con PDRN (ADN de salmón) concentrado al 5000 ppm. Máxima regeneración celular y brillo.', '/products/Dr. Althea PDRN Reju 5000 Cream 20 g.webp', 48900, 36900, 6, 30, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'pdrn', 'dr-althea', 'regenerador']::text[], true, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000006', 'Medicube Collagen Jelly Cream 50ml', 'medicube-collagen-jelly-cream-50ml', 'Crema textura gelatina con colágeno liofilizado. Otorga el codiciado brillo de cristal (glass skin) instantáneo.', '/products/Medicube Collagen Jelly Cream 50 ml.webp', 49500, 37500, 6, 75, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'medicube', 'glass-skin', 'colageno', 'viral']::text[], true, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000005', 'Medicube Exosome Shot 2000 30ml', 'medicube-exosome-shot-2000-30ml', 'Sérum con exosomas purificados para minimizar poros dilatados y emparejar la textura de la piel.', '/products/Medicube Exosome Shot 2000 30ml – Sérum Facial Para Poros y Textura.webp', 54000, 41000, 6, 35, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'medicube', 'exosomas', 'poros']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000006', 'Medicube Hyaluronic Ceramide Jelly Cream 50ml', 'medicube-hyaluronic-ceramide-jelly-cream-50ml', 'Crema hidratante ultra ligera en gel con ácido hialurónico y complejo de ceramidas protectoras.', '/products/Medicube Hyaluronic Ceramide Jelly Cream 50 ml.webp', 47500, 35900, 6, 42, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'medicube', 'hidratacion', 'ceramidas']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000006', 'Medicube Kojic Acid Turmeric Vita Capsule Cream 53g', 'medicube-kojic-acid-turmeric-vita-capsule-cream-53g', 'Crema iluminadora en cápsulas con ácido kójico y cúrcuma. Aclara manchas y unifica el tono de la piel.', '/products/Medicube Kojic Acid Turmeric Vita Capsule Cream 53 g.webp', 51000, 38500, 6, 28, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'medicube', 'antimanchas', 'vitamina-c']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000005', 'Medicube One Day Exosome Shot 2000 30ml', 'medicube-one-day-exosome-shot-2000-30ml', 'Tratamiento diario acelerador celular con micro-agujas naturales y exosomas para renovación rápida.', '/products/Medicube One Day Exosome Shot 2000 30 ml.webp', 52500, 39500, 6, 32, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'medicube', 'serum', 'exosomas']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000005', 'Medicube One Day Exosome Shot 7500 30ml', 'medicube-one-day-exosome-shot-7500-30ml', 'Tratamiento intensivo con máxima concentración de micro-espículas y exosomas 7500. Nivel profesional.', '/products/Medicube One Day Exosome Shot 7500 30 ml.webp', 62000, 47500, 6, 25, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'medicube', 'intensivo', 'premium']::text[], true, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000006', 'Medicube PDRN Pink Collagen Capsule Cream 55g', 'medicube-pdrn-pink-collagen-capsule-cream-55g', 'Crema reafirmante rosa con cápsulas de PDRN y colágeno para luminosidad, firmeza y elasticidad extrema.', '/products/Medicube PDRN Pink Collagen Capsule Cream 55g – Crema Facial Coreana.webp', 56000, 42000, 6, 34, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'medicube', 'pdrn', 'reafirmante']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000007', 'SKIN1004 Centella Light Cleansing Oil 200ml', 'skin1004-centella-light-cleansing-oil-200ml', 'Aceite desmaquillante ultraliviano a base de Centella Asiática de Madagascar. Limpia sin obstruir poros.', '/products/SKIN1004 Centella Light Cleansing Oil 200ml – Aceite Limpiador Coreano.webp', 39900, 29900, 6, 50, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'skin1004', 'limpieza', 'centella', 'top ventas']::text[], true, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000005', 'SKIN1004 Madagascar Centella Ampoule 55ml', 'skin1004-madagascar-centella-ampoule-55ml', '100% extracto puro de Centella Asiática de Madagascar. El sérum calmante y reparador número 1 de Corea.', '/products/SKIN1004 Madagascar Centella Ampoule 55ml – Ampolla Facial Coreana.webp', 37900, 28500, 6, 80, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'skin1004', 'calmante', 'viral', 'top ventas']::text[], true, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000007', 'SKIN1004 Madagascar Centella Ampoule Foam 125ml', 'skin1004-madagascar-centella-ampoule-foam-125ml', 'Espuma limpiadora facial suave con pH 5.5 equilibrado enriquecida con centella de Madagascar.', '/products/SKIN1004 Madagascar Centella Ampoule Foam 125 ml.webp', 34500, 25900, 6, 45, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'skin1004', 'espuma', 'limpieza']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000008', 'SKIN1004 Madagascar Centella Poremizing Travel Kit x4', 'skin1004-madagascar-centella-poremizing-travel-kit-x4', 'Kit de viaje con 4 pasos de la línea Poremizing con sal rosa del Himalaya para poros limpios y cerrados.', '/products/SKIN1004 Madagascar Centella Poremizing Travel Kit x4 – Kit Para Poros.webp', 41500, 31000, 6, 40, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'skin1004', 'kit', 'viaje', 'poremizing']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000006', 'SKIN1004 Madagascar Centella Probio-Cica Enrich Cream 50ml', 'skin1004-madagascar-centella-probio-cica-enrich-cream-50ml', 'Crema enriquecida con centella fermentada y probióticos botánicos para restaurar la barrera de la piel.', '/products/SKIN1004 Madagascar Centella Probio-Cica Enrich Cream 50 ml.webp', 43000, 32500, 6, 36, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'skin1004', 'probioticos', 'crema']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000008', 'SKIN1004 Madagascar Centella Tea-Trica Travel Kit x4', 'skin1004-madagascar-centella-tea-trica-travel-kit-x4', 'Kit de viaje de 4 productos de la línea Tea-Trica (Árbol de Té y Centella) especial para piel con tendencia acneica.', '/products/SKIN1004 Madagascar Centella Tea-Trica Travel Kit x4 – Skincare Coreano.webp', 41500, 31000, 6, 38, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'skin1004', 'acne', 'tea-tree', 'kit']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000008', 'SKIN1004 Madagascar Centella Tone Brightening Travel Kit x4', 'skin1004-madagascar-centella-tone-brightening-travel-kit-x4', 'Kit de 4 pasos iluminador con patente Madewhite y centella para emparejar el tono y borrar manchas.', '/products/SKIN1004 Madagascar Centella Tone Brightening Travel Kit – Kit Coreano x4.webp', 41500, 31000, 6, 35, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'skin1004', 'iluminador', 'kit']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000006', 'SKIN1004 Poremizing Quick Clay Stick Mask 27g', 'skin1004-poremizing-quick-clay-stick-mask-27g', 'Mascarilla de arcilla en barra de aplicación rápida sin manchar las manos con barro rojo y sal del Himalaya.', '/products/SKIN1004 Poremizing Quick Clay Stick Mask 27g – Mascarilla Para Poros.webp', 36900, 27500, 6, 42, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['k-beauty', 'skin1004', 'stick', 'arcilla', 'mascarilla']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000004', 'Karseell Collagen Hair Mask 500ml', 'karseell-collagen-hair-mask-500ml', 'El tratamiento viral para el cabello. Mascarilla con esencia de colágeno, aceite de argán y maca para reparación total.', '/products/Karseell Collagen Hair Mask 500ml – Mascarilla Capilar Colágeno.webp', 43500, 31900, 4, 120, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['capilar', 'colageno', 'karseell', 'viral', 'top ventas']::text[], true, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000002', 'Apple iPhone 13 128GB - Meia Noite / Black', 'apple-iphone-13-128gb-meia-noite-black', 'Apple iPhone 13 128GB liberado de fábrica. Pantalla Super Retina XDR OLED 6.1", chip A15 Bionic, cámara doble 12MP y batería al 100%.', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80', 680000, 545000, 2, 15, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['apple', 'iphone', 'smartphone', 'tecnologia']::text[], true, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000002', 'Apple iPhone 13 Pro Max 256GB - Sierra Blue', 'apple-iphone-13-pro-max-256gb-sierra-blue', 'Apple iPhone 13 Pro Max 256GB. Pantalla ProMotion 120Hz de 6.7", triple cámara con sensor LiDAR, zoom óptico 3x y chasis de acero inoxidable.', 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=900&q=80', 895000, 740000, 2, 10, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['apple', 'iphone', 'pro-max', 'tecnologia']::text[], true, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000002', 'Apple iPhone 12 128GB - White', 'apple-iphone-12-128gb-white', 'Apple iPhone 12 128GB liberado. Pantalla OLED 6.1", conectividad 5G, chip A14 Bionic, compatible con MagSafe.', 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=900&q=80', 495000, 395000, 2, 20, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['apple', 'iphone', 'oportunidad']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000026', '10000000-0000-0000-0000-000000000003', 'Total Tools Taladro Percutor Inalámbrico 20V Li-Ion', 'total-tools-taladro-percutor-inalambrico-20v-li-ion', 'Taladro percutor a batería 20V con 2 velocidades mecánicas, mandril metálico autoajustable de 13mm, 2 baterías y maletín de transporte.', 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80', 115000, 89000, 3, 25, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['total-tools', 'inalambrico', 'taladro', 'herramientas']::text[], true, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000027', '10000000-0000-0000-0000-000000000003', 'Total Tools Amoladora Angular 750W 115mm', 'total-tools-amoladora-angular-750w-115mm', 'Amoladora angular profesional de 750W para discos de 115mm (4-1/2"). Bobinado 100% de cobre para uso continuo.', 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=900&q=80', 62000, 48000, 4, 30, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['total-tools', 'amoladora', 'equipamiento']::text[], false, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (id, category_id, title, slug, description, image_url, retail_price, wholesale_price, wholesale_min_qty, stock, payment_methods, tags, is_featured, is_wholesale_only, is_active)
VALUES ('20000000-0000-0000-0000-000000000028', '10000000-0000-0000-0000-000000000003', 'Wadfow Set de Herramientas 120 Piezas con Valija', 'wadfow-set-de-herramientas-120-piezas-con-valija', 'Kit completo de tubos, llaves combinadas, destornilladores, pinzas y alicates en valija reforzada de alto impacto.', 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=900&q=80', 128000, 99000, 2, 18, ARRAY['transferencia', 'tarjeta', 'mercado_pago', 'efectivo']::public.payment_method[], ARRAY['wadfow', 'set-herramientas', 'valija']::text[], true, false, true)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  wholesale_min_qty = EXCLUDED.wholesale_min_qty,
  stock = EXCLUDED.stock,
  payment_methods = EXCLUDED.payment_methods,
  tags = EXCLUDED.tags,
  is_featured = EXCLUDED.is_featured,
  is_active = true;