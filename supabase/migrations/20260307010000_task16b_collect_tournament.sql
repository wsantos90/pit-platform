BEGIN;

-- Adiciona colunas necessárias para o fluxo de coleta via browser (extensão Chrome)
-- Permite rastrear runs de campeonatos ativos com token efêmero e progresso detalhado

ALTER TABLE public.collect_runs
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'cron'
    CHECK (scope IN ('cron', 'tournament', 'club')),
  ADD COLUMN IF NOT EXISTS collect_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS collect_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clubs_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clubs_failed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_ea_club_ids JSONB;

CREATE INDEX IF NOT EXISTS idx_collect_runs_token
  ON public.collect_runs (collect_token)
  WHERE collect_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collect_runs_scope
  ON public.collect_runs (scope);

COMMIT;
