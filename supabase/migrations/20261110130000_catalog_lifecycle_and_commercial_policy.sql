-- Migration: 20261110130000_catalog_lifecycle_and_commercial_policy.sql
-- Description: Centralized commercial lifecycle, 7-day out-of-stock rule, and consumable exclusion for MYA Importaciones.

BEGIN;

-- 1. Add commercial status and out_of_stock_since to products and product_variants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'commercial_status'
  ) THEN
    ALTER TABLE public.products ADD COLUMN commercial_status text NOT NULL DEFAULT 'AVAILABLE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'out_of_stock_since'
  ) THEN
    ALTER TABLE public.products ADD COLUMN out_of_stock_since timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'product_variants' AND column_name = 'commercial_status'
  ) THEN
    ALTER TABLE public.product_variants ADD COLUMN commercial_status text NOT NULL DEFAULT 'AVAILABLE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'product_variants' AND column_name = 'out_of_stock_since'
  ) THEN
    ALTER TABLE public.product_variants ADD COLUMN out_of_stock_since timestamptz;
  END IF;

  -- Grant column select to public/client roles
  GRANT SELECT (commercial_status, out_of_stock_since) ON public.products TO anon, authenticated;
  GRANT SELECT (commercial_status, out_of_stock_since) ON public.product_variants TO anon, authenticated;
END $$;

-- 2. Indexes for efficient lifecycle and public storefront querying
CREATE INDEX IF NOT EXISTS idx_products_commercial_status 
  ON public.products(commercial_status) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_out_of_stock_since 
  ON public.products(out_of_stock_since) 
  WHERE out_of_stock_since IS NOT NULL;

-- 3. SQL function to evaluate catalog lifecycle (Day 0 out-of-stock, Day 7 archiving, negative margins, missing URL)
CREATE OR REPLACE FUNCTION public.evaluate_catalog_lifecycle_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_day0_count integer := 0;
  v_day7_archived integer := 0;
  v_restored_count integer := 0;
  v_negative_margin_count integer := 0;
  v_missing_url_count integer := 0;
  v_result jsonb;
BEGIN
  -- A. Day 7 Rule: Products out of stock for >= 7 days become ARCHIVED
  WITH to_archive AS (
    UPDATE public.products
    SET 
      commercial_status = 'ARCHIVED',
      is_active = false,
      deleted_at = COALESCE(deleted_at, now())
    WHERE deleted_at IS NULL
      AND out_of_stock_since IS NOT NULL
      AND out_of_stock_since <= now() - interval '7 days'
      AND (stock IS NULL OR stock <= 0)
    RETURNING id
  )
  SELECT count(*) INTO v_day7_archived FROM to_archive;

  -- B. Day 0 Rule: Products confirmed out of stock in all valid suppliers (and no physical stock)
  WITH day0_candidates AS (
    UPDATE public.products
    SET 
      commercial_status = 'OUT_OF_STOCK',
      is_active = false,
      out_of_stock_since = COALESCE(out_of_stock_since, now())
    WHERE deleted_at IS NULL
      AND (stock IS NULL OR stock <= 0)
      AND (
        supplier_available = false
        OR (
          EXISTS (
            SELECT 1 FROM public.supplier_offers so
            WHERE so.product_id = products.id
              AND so.availability = 'out_of_stock'
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.supplier_offers so
            JOIN public.suppliers s ON s.id = so.supplier_id
            WHERE so.product_id = products.id
              AND so.availability = 'in_stock'
              AND s.is_active = true
              AND s.archived_at IS NULL
          )
        )
      )
      AND (out_of_stock_since IS NULL OR commercial_status <> 'OUT_OF_STOCK')
      AND commercial_status <> 'ARCHIVED'
    RETURNING id
  )
  SELECT count(*) INTO v_day0_count FROM day0_candidates;

  -- C. Restoration Rule: Products with restored stock or confirmed supplier stock
  WITH restored AS (
    UPDATE public.products
    SET 
      commercial_status = 'AVAILABLE',
      out_of_stock_since = NULL
    WHERE deleted_at IS NULL
      AND is_active = true
      AND commercial_status = 'OUT_OF_STOCK'
      AND (
        (stock IS NOT NULL AND stock > 0)
        OR (
          supplier_available = true
          AND EXISTS (
            SELECT 1 FROM public.supplier_offers so
            JOIN public.suppliers s ON s.id = so.supplier_id
            WHERE so.product_id = products.id
              AND so.availability = 'in_stock'
              AND s.is_active = true
              AND s.archived_at IS NULL
          )
        )
      )
    RETURNING id
  )
  SELECT count(*) INTO v_restored_count FROM restored;

  -- D. Safety Protection: Flag products with negative margins as REVIEW_REQUIRED and state = 'review'
  WITH neg_margins AS (
    UPDATE public.products p
    SET 
      commercial_status = 'REVIEW_REQUIRED',
      is_active = false
    FROM public.product_usd_prices pr
    WHERE pr.product_id = p.id
      AND pr.variant_id IS NULL
      AND p.deleted_at IS NULL
      AND (
        (pr.total_cost_usd IS NOT NULL AND pr.retail_usd < pr.total_cost_usd)
        OR (pr.total_cost_usd IS NOT NULL AND pr.wholesale_usd IS NOT NULL AND pr.wholesale_usd < pr.total_cost_usd)
      )
    RETURNING p.id
  )
  SELECT count(*) INTO v_negative_margin_count FROM neg_margins;

  -- Update state in product_usd_prices for negative margins
  UPDATE public.product_usd_prices
  SET state = 'review'
  WHERE total_cost_usd IS NOT NULL
    AND (
      retail_usd < total_cost_usd
      OR (wholesale_usd IS NOT NULL AND wholesale_usd < total_cost_usd)
    );

  -- E. Missing Source URL Protection: Supplier-fulfilled products with 0 stock and no source URL
  WITH missing_urls AS (
    UPDATE public.products
    SET 
      commercial_status = 'REVIEW_REQUIRED',
      is_active = false
    WHERE deleted_at IS NULL
      AND fulfillment_mode = 'supplier'
      AND (stock IS NULL OR stock <= 0)
      AND (source_url IS NULL OR trim(source_url) = '')
      AND commercial_status NOT IN ('REVIEW_REQUIRED', 'ARCHIVED')
    RETURNING id
  )
  SELECT count(*) INTO v_missing_url_count FROM missing_urls;

  -- F. Synchronize variant status with parent products where appropriate
  UPDATE public.product_variants pv
  SET 
    commercial_status = p.commercial_status,
    out_of_stock_since = p.out_of_stock_since
  FROM public.products p
  WHERE pv.product_id = p.id
    AND (pv.commercial_status IS DISTINCT FROM p.commercial_status 
         OR pv.out_of_stock_since IS DISTINCT FROM p.out_of_stock_since);

  v_result := jsonb_build_object(
    'evaluated_at', now(),
    'day0_out_of_stock', v_day0_count,
    'day7_archived', v_day7_archived,
    'restored_available', v_restored_count,
    'negative_margin_flagged', v_negative_margin_count,
    'missing_url_flagged', v_missing_url_count
  );

  RETURN v_result;
END;
$$;

-- 4. Exclude loose hardware consumables in supplier_tracker_items
-- Loose screws, washers, nuts, single drill bits, motor brushes, loose nails
-- (Excluding bench vises, claw hammers, bolt cutters, extractors, riveters, sets/kits)
CREATE OR REPLACE FUNCTION public.filter_tracker_consumables_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_excluded_count integer := 0;
BEGIN
  WITH to_exclude AS (
    UPDATE public.supplier_tracker_items
    SET 
      excluded = true,
      status = 'issue',
      last_error = 'Descartado: consumible menor / tornillería suelta sin valor comercial de importación'
    WHERE (
        -- Screws that are NOT bench vises, bolt cutters, extractors
        (lower(title) ~* '\ytornillos?\y' 
         AND NOT lower(title) ~* '\y(banco|prensa|cortador|corta|extractor|juego|kit|set|caja|maletin)\y')
        -- Loose nuts, washers, rivets, motor carbons
        OR (lower(title) ~* '\y(arandelas?|tuercas?|remaches?|carbones)\y'
            AND NOT lower(title) ~* '\y(remachadora|juego|kit|set|caja|maletin)\y')
        -- Loose nails (not hammers, not nail guns)
        OR (lower(title) ~* '\yclavos?\y' 
            AND NOT lower(title) ~* '\y(martillo|clavadora|engrapadora|juego|kit|set|caja|maletin)\y')
      )
      AND excluded = false
    RETURNING id
  )
  SELECT count(*) INTO v_excluded_count FROM to_exclude;

  RETURN jsonb_build_object(
    'filtered_at', now(),
    'excluded_consumables', v_excluded_count
  );
END;
$$;

-- 5. Baseline initialization
UPDATE public.products
SET commercial_status = 'ARCHIVED', is_active = false
WHERE deleted_at IS NOT NULL AND (commercial_status <> 'ARCHIVED' OR is_active = true);

UPDATE public.products
SET commercial_status = 'HIDDEN'
WHERE is_active = false AND deleted_at IS NULL AND commercial_status = 'AVAILABLE';

-- Execute initial filter and lifecycle evaluation
SELECT public.filter_tracker_consumables_v1();
SELECT public.evaluate_catalog_lifecycle_v1();

COMMIT;
