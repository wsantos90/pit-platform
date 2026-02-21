-- ============================================================
-- MIGRATION 00014: PIT RATINGS (Fase 2)
-- Depende de: 00001 (pit_league), 00003 (clubs), 00006 (matches)
-- ============================================================

CREATE TABLE public.pit_ratings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  season          TEXT NOT NULL,            -- Ex: "FC25", "FC26"

  -- Rating atual
  rating          INTEGER NOT NULL DEFAULT 1500,
  peak_rating     INTEGER NOT NULL DEFAULT 1500,
  league          pit_league NOT NULL DEFAULT 'access',

  -- Calibração
  matches_played  INTEGER NOT NULL DEFAULT 0,
  is_calibrating  BOOLEAN NOT NULL DEFAULT true,  -- true até 15 jogos

  -- Filtros
  competitive_rating INTEGER NOT NULL DEFAULT 1500,  -- Só campeonatos
  general_rating     INTEGER NOT NULL DEFAULT 1500,  -- + amistosos PIT

  -- Histórico
  wins            INTEGER NOT NULL DEFAULT 0,
  losses          INTEGER NOT NULL DEFAULT 0,
  draws           INTEGER NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_club_season UNIQUE (club_id, season)
);

CREATE INDEX idx_ratings_club ON public.pit_ratings (club_id);
CREATE INDEX idx_ratings_season ON public.pit_ratings (season);
CREATE INDEX idx_ratings_league ON public.pit_ratings (league);
CREATE INDEX idx_ratings_rating ON public.pit_ratings (rating DESC);

CREATE TRIGGER trg_ratings_updated_at
  BEFORE UPDATE ON public.pit_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Histórico de alterações de rating (para gráfico de evolução)
CREATE TABLE public.pit_rating_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pit_rating_id   UUID NOT NULL REFERENCES public.pit_ratings(id) ON DELETE CASCADE,
  match_id        UUID NOT NULL REFERENCES public.matches(id),
  rating_before   INTEGER NOT NULL,
  rating_after    INTEGER NOT NULL,
  delta           INTEGER NOT NULL,
  opponent_rating INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rh_rating ON public.pit_rating_history (pit_rating_id, created_at DESC);
