ALTER TABLE public.discovery_runs
  ADD COLUMN IF NOT EXISTS run_type TEXT NOT NULL DEFAULT 'automatic';

CREATE INDEX IF NOT EXISTS idx_discovery_runs_run_type
  ON public.discovery_runs (run_type);
