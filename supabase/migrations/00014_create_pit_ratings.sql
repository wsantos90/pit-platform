-- ============================================================
-- MIGRATION 00014: PIT RATINGS (Fase 2)
-- P.I.T — Performance · Intelligence · Tracking
-- ============================================================

CREATE TABLE public.pit_ratings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  season          TEXT NOT NULL,

  -- Rating atual
  rating          INTEGER NOT NULL DEFAULT 1500,
  peak_rating     INTEGER NOT NULL DEFAULT 1500,
  league          pit_league NOT NULL DEFAULT 'access',

  -- Calibração
  matches_played  INTEGER NOT NULL DEFAULT 0,
  is_calibrating  BOOLEAN NOT NULL DEFAULT true,

  -- Filtros
  competitive_rating INTEGER NOT NULL DEFAULT 1500,
  general_rating     INTEGER NOT NULL DEFAULT 1500,

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

-- ============================================================
-- NOTIFICATIONS + SUBSCRIPTIONS
-- ============================================================

-- Notificações in-app
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  data        JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications (user_id, is_read, created_at DESC);

-- Assinaturas Premium (Fase 2)
CREATE TABLE public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.users(id),
  club_id         UUID REFERENCES public.clubs(id),
  plan            subscription_plan NOT NULL,
  status          subscription_status NOT NULL DEFAULT 'active',
  gateway         TEXT NOT NULL DEFAULT 'mercadopago',
  gateway_subscription_id TEXT,
  amount          DECIMAL(10,2) NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end   TIMESTAMPTZ NOT NULL,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_subscription_target
    CHECK (user_id IS NOT NULL OR club_id IS NOT NULL)
);

CREATE INDEX idx_subs_user ON public.subscriptions (user_id);
CREATE INDEX idx_subs_club ON public.subscriptions (club_id);
CREATE INDEX idx_subs_status ON public.subscriptions (status);

CREATE TRIGGER trg_subs_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
