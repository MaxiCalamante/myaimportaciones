-- Migration: 20261022141500_product_soft_delete_audit_and_cleanup.sql
-- Add deleted_by column for audit traceability of soft delete actions

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_by text;
GRANT SELECT (deleted_by) ON public.products TO anon, authenticated;
