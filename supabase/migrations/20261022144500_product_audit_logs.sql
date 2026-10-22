-- Product Audit Logs Migration
-- Records history of changes in prices, stock, and status by admins

CREATE TABLE IF NOT EXISTS public.product_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    changed_by text NOT NULL,
    action text NOT NULL,
    old_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    new_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_audit_logs_product_id ON public.product_audit_logs(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_audit_logs_created_at ON public.product_audit_logs(created_at DESC);

ALTER TABLE public.product_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_audit_logs' AND policyname = 'Admin audit logs access'
    ) THEN
        CREATE POLICY "Admin audit logs access" ON public.product_audit_logs
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
            WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

GRANT ALL ON public.product_audit_logs TO authenticated, service_role;
