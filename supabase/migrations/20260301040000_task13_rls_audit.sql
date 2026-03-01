-- ============================================================
-- TASK 13.5: RLS AUDIT HARDENING (MODERATION SAFETY)
-- Ensures moderator/admin flows cannot read financial data.
-- ============================================================

-- Keep RLS enabled and explicit deny-all for user-facing roles.
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payments: deny all user roles" ON public.payments;
DROP POLICY IF EXISTS "Payments: user ve proprios" ON public.payments;
DROP POLICY IF EXISTS "Payments: admin total" ON public.payments;

CREATE POLICY "Payments: deny all user roles" ON public.payments
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Defense in depth: remove direct grants from runtime roles.
REVOKE ALL ON TABLE public.payments FROM anon, authenticated, PUBLIC;
GRANT ALL ON TABLE public.payments TO service_role;

-- Ensure financial dashboard view is service-only (guarded against missing view).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE viewname = 'v_financial_dashboard' AND schemaname = 'public'
  ) THEN
    ALTER VIEW public.v_financial_dashboard SET (security_invoker = true);
    REVOKE ALL ON TABLE public.v_financial_dashboard FROM anon, authenticated, PUBLIC;
    GRANT SELECT ON TABLE public.v_financial_dashboard TO service_role;
  END IF;
END $$;

