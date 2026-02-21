-- ============================================================
-- MIGRATION 00007: LINEUPS + LINEUP_PLAYERS
-- Depende de: 00001 (player_position), 00002 (users, players), 00003 (clubs), 00006 (matches)
-- ============================================================

CREATE TABLE public.lineups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  match_id    UUID REFERENCES public.matches(id),          -- NULL = escalação padrão
  name        TEXT NOT NULL DEFAULT 'Escalação Principal',  -- Permite múltiplas escalações
  formation   TEXT NOT NULL DEFAULT '3-5-2',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_by  UUID NOT NULL REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lineups_club ON public.lineups (club_id);
CREATE INDEX idx_lineups_match ON public.lineups (match_id);

CREATE TRIGGER trg_lineups_updated_at
  BEFORE UPDATE ON public.lineups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Jogadores na escalação com posição designada
CREATE TABLE public.lineup_players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lineup_id   UUID NOT NULL REFERENCES public.lineups(id) ON DELETE CASCADE,
  player_id   UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  position    player_position NOT NULL,
  is_starter  BOOLEAN NOT NULL DEFAULT true,
  sort_order  SMALLINT NOT NULL DEFAULT 0,  -- Ordem visual na escalação

  CONSTRAINT uq_lineup_player UNIQUE (lineup_id, player_id),
  CONSTRAINT uq_lineup_position UNIQUE (lineup_id, position, is_starter)
);

CREATE INDEX idx_lp_lineup ON public.lineup_players (lineup_id);
