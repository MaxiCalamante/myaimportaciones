-- Migration: 20261022133000_product_soft_delete_and_recycle_bin.sql
-- Add deleted_at column for soft delete, index, and permissions

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at) WHERE deleted_at IS NOT NULL;
GRANT SELECT (deleted_at) ON public.products TO anon, authenticated;
