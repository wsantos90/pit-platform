-- ============================================================
-- MIGRATION 00010: PAYMENTS + TRUST SCORES
-- P.I.T — Performance · Intelligence · Tracking
-- ============================================================

CREATE TABLE public.payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES public.clubs(id),
  tournament_id   UUID REFERENCES public.tournaments(id),
  user_id         UUID NOT NULL REFERENCES public.users(id),

  -- Gateway
  gateway         TEXT NOT NULL DEFAULT 'mercadopago'
    CHECK (gateway IN ('mercadopago', 'stripe')),
  gateway_payment_id TEXT,
  gateway_status  TEXT,

  -- Valores
  amount          DECIMAL(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'BRL',
  description     TEXT,

  -- Status
  status          payment_status NOT NULL DEFAULT 'pending',
  paid_at         TIMESTAMPTZ,
  refunded_at     TIMESTAMPTZ,
  refund_reason   TEXT,

  -- PIX específico
  pix_qr_code     TEXT,
  pix_copy_paste  TEXT,
  pix_expiration  TIMESTAMPTZ,

  -- Assinatura (Fase 2)
  subscription_id UUID,
  is_recurring    BOOLEAN NOT NULL DEFAULT false,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_club ON public.payments (club_id);
CREATE INDEX idx_payments_tournament ON public.payments (tournament_id);
CREATE INDEX idx_payments_status ON public.payments (status);
CREATE INDEX idx_payments_gateway ON public.payments (gateway_payment_id);
CREATE INDEX idx_payments_user ON public.payments (user_id);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRUST SCORES: Sistema de confiança para pagamento
-- ============================================================
CREATE TABLE public.trust_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL UNIQUE REFERENCES public.clubs(id) ON DELETE CASCADE,
  strikes         SMALLINT NOT NULL DEFAULT 0
    CHECK (strikes >= 0 AND strikes <= 3),
  is_trusted      BOOLEAN NOT NULL DEFAULT true,
  suspended_until TIMESTAMPTZ,
  banned_until    TIMESTAMPTZ,
  last_strike_at  TIMESTAMPTZ,
  notes           TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_trust_updated_at
  BEFORE UPDATE ON public.trust_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
