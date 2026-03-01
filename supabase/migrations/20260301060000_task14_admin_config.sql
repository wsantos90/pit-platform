BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id)
);

ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_config: deny all user roles" ON public.admin_config;
CREATE POLICY "admin_config: deny all user roles"
  ON public.admin_config
  FOR ALL
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.admin_config FROM anon, authenticated, PUBLIC;
GRANT ALL ON TABLE public.admin_config TO service_role;

INSERT INTO public.admin_config (key, value, description)
VALUES
  ('discovery_batch_size', to_jsonb(10), 'Clubes por batch no discovery'),
  ('discovery_rate_limit_ms', to_jsonb(1500), 'Delay entre batches (ms)'),
  ('max_claims_per_club', to_jsonb(3), 'Max tentativas de claim por clube'),
  ('tournament_entry_fee_brl', to_jsonb(29.90::numeric), 'Taxa default de entrada em torneios')
ON CONFLICT (key) DO NOTHING;

COMMIT;
