-- ============================================================
-- MIGRATION 00009: TOURNAMENTS
-- P.I.T — Performance · Intelligence · Tracking
-- ============================================================

CREATE TABLE public.tournaments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  type            tournament_type NOT NULL,
  format          tournament_format NOT NULL DEFAULT 'single_elimination',
  status          tournament_status NOT NULL DEFAULT 'draft',

  -- Configuração
  capacity_min    SMALLINT NOT NULL DEFAULT 8,
  capacity_max    SMALLINT NOT NULL DEFAULT 32,
  group_count     SMALLINT,
  teams_per_group SMALLINT,
  advance_per_group SMALLINT,

  -- Datas/Horários
  scheduled_date  DATE NOT NULL,
  start_time      TIME NOT NULL DEFAULT '22:00',
  registration_deadline TIMESTAMPTZ,

  -- Financeiro
  entry_fee       DECIMAL(10,2) NOT NULL DEFAULT 3.00,
  prize_pool      DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Metadados
  current_round   TEXT,
  confederation_id UUID REFERENCES public.confederations(id),
  created_by      UUID NOT NULL REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tournaments_status ON public.tournaments (status);
CREATE INDEX idx_tournaments_date ON public.tournaments (scheduled_date DESC);
CREATE INDEX idx_tournaments_type ON public.tournaments (type);

CREATE TRIGGER trg_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Inscrições em torneios
CREATE TABLE public.tournament_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  club_id         UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  enrolled_by     UUID NOT NULL REFERENCES public.users(id),
  payment_status  payment_status NOT NULL DEFAULT 'pending',
  seed            SMALLINT,
  group_letter    CHAR(1),
  eliminated_at   TEXT,
  final_position  SMALLINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_tournament_club UNIQUE (tournament_id, club_id)
);

CREATE INDEX idx_te_tournament ON public.tournament_entries (tournament_id);
CREATE INDEX idx_te_club ON public.tournament_entries (club_id);
CREATE INDEX idx_te_payment ON public.tournament_entries (payment_status);

CREATE TRIGGER trg_te_updated_at
  BEFORE UPDATE ON public.tournament_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Confrontos do chaveamento
CREATE TABLE public.tournament_brackets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round           TEXT NOT NULL,
  round_order     SMALLINT NOT NULL,
  match_order     SMALLINT NOT NULL,
  home_entry_id   UUID REFERENCES public.tournament_entries(id),
  away_entry_id   UUID REFERENCES public.tournament_entries(id),
  home_club_id    UUID REFERENCES public.clubs(id),
  away_club_id    UUID REFERENCES public.clubs(id),
  match_id        UUID REFERENCES public.matches(id),
  home_score      SMALLINT,
  away_score      SMALLINT,
  winner_entry_id UUID REFERENCES public.tournament_entries(id),
  status          TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'completed', 'wo_home', 'wo_away', 'disputed')),
  scheduled_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  next_bracket_id UUID REFERENCES public.tournament_brackets(id),

  CONSTRAINT uq_bracket_match UNIQUE (tournament_id, round, match_order)
);

CREATE INDEX idx_tb_tournament ON public.tournament_brackets (tournament_id);
CREATE INDEX idx_tb_round ON public.tournament_brackets (tournament_id, round);
CREATE INDEX idx_tb_status ON public.tournament_brackets (status);
