-- ============================================================
-- MIGRATION 00004: DISCOVERY
-- P.I.T — Performance · Intelligence · Tracking
-- ============================================================

-- Times descobertos pelo snowball (antes de serem reivindicados)
CREATE TABLE public.discovered_clubs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ea_club_id      TEXT NOT NULL UNIQUE,
  ea_name_raw     TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  discovered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  discovered_via  TEXT,
  last_scanned_at TIMESTAMPTZ,
  scan_count      INTEGER NOT NULL DEFAULT 0,
  claimed_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status          club_status NOT NULL DEFAULT 'unclaimed',
  promoted_to_club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL
);

CREATE INDEX idx_discovered_ea_id ON public.discovered_clubs (ea_club_id);
CREATE INDEX idx_discovered_display_name ON public.discovered_clubs USING GIN (display_name gin_trgm_ops);
CREATE INDEX idx_discovered_status ON public.discovered_clubs (status);
CREATE INDEX idx_discovered_scanned ON public.discovered_clubs (last_scanned_at);

-- Jogadores descobertos durante varreduras
CREATE TABLE public.discovered_players (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ea_gamertag     TEXT NOT NULL,
  last_seen_club  TEXT,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  matches_seen    INTEGER NOT NULL DEFAULT 0,
  linked_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,

  CONSTRAINT uq_discovered_gamertag UNIQUE (ea_gamertag)
);

CREATE INDEX idx_disc_players_gamertag ON public.discovered_players (LOWER(ea_gamertag));
CREATE INDEX idx_disc_players_club ON public.discovered_players (last_seen_club);

-- Log de execuções do Discovery (auditoria)
CREATE TABLE public.discovery_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  triggered_by    UUID REFERENCES public.users(id),
  clubs_scanned   INTEGER NOT NULL DEFAULT 0,
  clubs_new       INTEGER NOT NULL DEFAULT 0,
  players_found   INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error_message   TEXT
);
