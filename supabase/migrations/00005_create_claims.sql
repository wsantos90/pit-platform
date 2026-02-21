-- ============================================================
-- MIGRATION 00005: CLAIMS (Reivindicações de Time)
-- Depende de: 00001 (claim_status), 00002 (users), 00004 (discovered_clubs)
-- ============================================================

CREATE TABLE public.claims (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  discovered_club_id UUID NOT NULL REFERENCES public.discovered_clubs(id),
  photo_url         TEXT NOT NULL,          -- URL no Supabase Storage
  status            claim_status NOT NULL DEFAULT 'pending',
  reviewed_by       UUID REFERENCES public.users(id),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_claims_user ON public.claims (user_id);
CREATE INDEX idx_claims_status ON public.claims (status);
CREATE INDEX idx_claims_club ON public.claims (discovered_club_id);

CREATE TRIGGER trg_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
