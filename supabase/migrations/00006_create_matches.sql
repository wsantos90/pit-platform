-- ============================================================
-- MIGRATION 00006: MATCHES + MATCH_PLAYERS
-- P.I.T — Performance · Intelligence · Tracking
-- ============================================================

CREATE TABLE public.matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ea_match_id     TEXT NOT NULL UNIQUE,
  match_timestamp TIMESTAMPTZ NOT NULL,
  home_club_id    UUID REFERENCES public.clubs(id),
  away_club_id    UUID REFERENCES public.clubs(id),
  home_ea_club_id TEXT NOT NULL,
  away_ea_club_id TEXT NOT NULL,
  home_club_name  TEXT NOT NULL,
  away_club_name  TEXT NOT NULL,
  home_score      SMALLINT NOT NULL DEFAULT 0,
  away_score      SMALLINT NOT NULL DEFAULT 0,
  match_type      match_type NOT NULL DEFAULT 'friendly_external',
  tournament_id   UUID REFERENCES public.tournaments(id),
  tournament_round TEXT,
  matchmaking_id  UUID,
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_data        JSONB
);

CREATE INDEX idx_matches_ea_id ON public.matches (ea_match_id);
CREATE INDEX idx_matches_timestamp ON public.matches (match_timestamp DESC);
CREATE INDEX idx_matches_home_club ON public.matches (home_club_id);
CREATE INDEX idx_matches_away_club ON public.matches (away_club_id);
CREATE INDEX idx_matches_type ON public.matches (match_type);
CREATE INDEX idx_matches_tournament ON public.matches (tournament_id);
CREATE INDEX idx_matches_home_ea ON public.matches (home_ea_club_id);
CREATE INDEX idx_matches_away_ea ON public.matches (away_ea_club_id);

-- ============================================================
-- MATCH_PLAYERS: Stats individuais por partida
-- ============================================================
CREATE TABLE public.match_players (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id            UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id           UUID REFERENCES public.players(id),
  ea_gamertag         TEXT NOT NULL,
  club_id             UUID REFERENCES public.clubs(id),
  ea_club_id          TEXT NOT NULL,

  -- Posição
  ea_position         ea_position_category NOT NULL,
  resolved_position   player_position,

  -- Stats da partida (vindos da API EA)
  goals               SMALLINT NOT NULL DEFAULT 0,
  assists             SMALLINT NOT NULL DEFAULT 0,
  rating              DECIMAL(4,2),
  passes_completed    INTEGER NOT NULL DEFAULT 0,
  passes_attempted    INTEGER NOT NULL DEFAULT 0,
  tackles_made        INTEGER NOT NULL DEFAULT 0,
  tackles_attempted   INTEGER NOT NULL DEFAULT 0,
  shots               SMALLINT NOT NULL DEFAULT 0,
  shots_on_target     SMALLINT NOT NULL DEFAULT 0,
  yellow_cards        SMALLINT NOT NULL DEFAULT 0,
  red_cards           SMALLINT NOT NULL DEFAULT 0,
  clean_sheets        SMALLINT NOT NULL DEFAULT 0,
  saves               SMALLINT NOT NULL DEFAULT 0,
  man_of_match        BOOLEAN NOT NULL DEFAULT false,
  minutes_played      SMALLINT NOT NULL DEFAULT 0,
  interceptions       INTEGER NOT NULL DEFAULT 0,
  possession          DECIMAL(5,2),

  CONSTRAINT uq_match_player UNIQUE (match_id, ea_gamertag)
);

CREATE INDEX idx_mp_match ON public.match_players (match_id);
CREATE INDEX idx_mp_player ON public.match_players (player_id);
CREATE INDEX idx_mp_club ON public.match_players (club_id);
CREATE INDEX idx_mp_gamertag ON public.match_players (LOWER(ea_gamertag));
