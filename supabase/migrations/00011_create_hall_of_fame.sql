-- ============================================================
-- MIGRATION 00011: HALL OF FAME
-- P.I.T — Performance · Intelligence · Tracking
-- ============================================================

CREATE TABLE public.hall_of_fame (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  award           hall_of_fame_award NOT NULL,
  club_id         UUID REFERENCES public.clubs(id),
  player_id       UUID REFERENCES public.players(id),
  ea_gamertag     TEXT,
  stat_value      DECIMAL(10,2),
  stat_detail     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_hof_tournament_award UNIQUE (tournament_id, award)
);

CREATE INDEX idx_hof_tournament ON public.hall_of_fame (tournament_id);
CREATE INDEX idx_hof_player ON public.hall_of_fame (player_id);
CREATE INDEX idx_hof_club ON public.hall_of_fame (club_id);
CREATE INDEX idx_hof_award ON public.hall_of_fame (award);
