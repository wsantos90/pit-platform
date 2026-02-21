-- ============================================================
-- MIGRATION 00011: HALL OF FAME
-- Depende de: 00001 (hall_of_fame_award), 00002 (players), 00003 (clubs), 00009 (tournaments)
-- ============================================================

CREATE TABLE public.hall_of_fame (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  award           hall_of_fame_award NOT NULL,
  club_id         UUID REFERENCES public.clubs(id),          -- Para award 'champion'
  player_id       UUID REFERENCES public.players(id),        -- Para awards individuais
  ea_gamertag     TEXT,                                       -- Backup caso jogador não cadastrado
  stat_value      DECIMAL(10,2),                              -- Valor da stat (gols, rating, etc.)
  stat_detail     JSONB,                                      -- Detalhes extras (breakdown)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_hof_tournament_award UNIQUE (tournament_id, award)
);

CREATE INDEX idx_hof_tournament ON public.hall_of_fame (tournament_id);
CREATE INDEX idx_hof_player ON public.hall_of_fame (player_id);
CREATE INDEX idx_hof_club ON public.hall_of_fame (club_id);
CREATE INDEX idx_hof_award ON public.hall_of_fame (award);
