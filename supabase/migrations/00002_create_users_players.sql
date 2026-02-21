-- ============================================================
-- MIGRATION 00002: USERS + PLAYERS
-- Depende de: 00001 (user_role, player_position)
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS: Estende o auth.users do Supabase com dados do perfil PIT
-- ============================================================
CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  display_name    TEXT,
  avatar_url      TEXT,
  roles           user_role[] NOT NULL DEFAULT '{player}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_users_roles ON public.users USING GIN (roles);
CREATE INDEX idx_users_email ON public.users (email);

-- Função reutilizável para updated_at (usada em todas as tabelas)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PLAYERS: Perfil de jogador vinculado à conta
-- ============================================================
CREATE TABLE public.players (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  ea_gamertag         TEXT NOT NULL UNIQUE,
  primary_position    player_position NOT NULL,
  secondary_position  player_position,
  bio                 TEXT,
  is_free_agent       BOOLEAN NOT NULL DEFAULT false,  -- Fase 2: mercado de jogadores
  status              TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'banned')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint: posições primária e secundária devem ser diferentes
  CONSTRAINT chk_different_positions
    CHECK (secondary_position IS NULL OR primary_position != secondary_position)
);

CREATE UNIQUE INDEX idx_players_gamertag ON public.players (LOWER(ea_gamertag));
CREATE INDEX idx_players_user_id ON public.players (user_id);
CREATE INDEX idx_players_primary_pos ON public.players (primary_position);
CREATE INDEX idx_players_free_agent ON public.players (is_free_agent) WHERE is_free_agent = true;

CREATE TRIGGER trg_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
