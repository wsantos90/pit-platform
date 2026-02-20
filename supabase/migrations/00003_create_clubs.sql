-- ============================================================
-- MIGRATION 00003: CLUBS + CLUB_PLAYERS
-- P.I.T — Performance · Intelligence · Tracking
-- ============================================================

CREATE TABLE public.clubs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ea_club_id      TEXT NOT NULL UNIQUE,
  ea_name_raw     TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  manager_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  logo_url        TEXT,
  status          club_status NOT NULL DEFAULT 'unclaimed',
  subscription_plan subscription_plan NOT NULL DEFAULT 'free',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clubs_ea_id ON public.clubs (ea_club_id);
CREATE INDEX idx_clubs_display_name ON public.clubs USING GIN (display_name gin_trgm_ops);
CREATE INDEX idx_clubs_manager ON public.clubs (manager_id);
CREATE INDEX idx_clubs_status ON public.clubs (status);

CREATE TRIGGER trg_clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CLUB_PLAYERS: Relação N:N jogador-time com histórico
-- ============================================================
CREATE TABLE public.club_players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  player_id   UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at     TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  role_in_club TEXT NOT NULL DEFAULT 'player'
    CHECK (role_in_club IN ('player', 'captain', 'manager')),

  CONSTRAINT uq_active_player_club UNIQUE (player_id, club_id, is_active)
);

CREATE INDEX idx_club_players_club ON public.club_players (club_id) WHERE is_active = true;
CREATE INDEX idx_club_players_player ON public.club_players (player_id) WHERE is_active = true;
