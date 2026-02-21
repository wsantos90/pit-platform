-- ============================================================
-- MIGRATION 00014B: NOTIFICATIONS + SUBSCRIPTIONS
-- Depende de: 00001 (notification_type, subscription_status, subscription_plan)
--             00002 (users), 00003 (clubs)
-- ============================================================

-- Notificações in-app
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  data        JSONB,                       -- Payload contextual (IDs, links)
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

  -- Ou user_id ou club_id deve ser preenchido
  CONSTRAINT chk_subscription_target
    CHECK (user_id IS NOT NULL OR club_id IS NOT NULL)
);

CREATE INDEX idx_subs_user ON public.subscriptions (user_id);
CREATE INDEX idx_subs_club ON public.subscriptions (club_id);
CREATE INDEX idx_subs_status ON public.subscriptions (status);

CREATE TRIGGER trg_subs_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
