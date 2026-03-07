BEGIN;

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clubs_last_scanned
  ON public.clubs (last_scanned_at);

CREATE TABLE IF NOT EXISTS public.collect_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by    UUID REFERENCES public.users(id),
  ea_club_id      TEXT,
  is_cron         BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  clubs_processed INTEGER NOT NULL DEFAULT 0,
  matches_new     INTEGER NOT NULL DEFAULT 0,
  matches_skipped INTEGER NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  error_message   TEXT
);

CREATE INDEX IF NOT EXISTS idx_collect_runs_started
  ON public.collect_runs (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_collect_runs_ea_club
  ON public.collect_runs (ea_club_id);

ALTER TABLE public.collect_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "managers_read_own_collect_runs" ON public.collect_runs;
CREATE POLICY "managers_read_own_collect_runs"
  ON public.collect_runs
  FOR SELECT
  USING (
    ea_club_id IN (
      SELECT ea_club_id
      FROM public.clubs
      WHERE manager_id = auth.uid()
    )
  );

COMMIT;
