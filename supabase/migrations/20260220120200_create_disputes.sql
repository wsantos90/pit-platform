-- ============================================================
-- MIGRATION 00013: DISPUTES (W.O. — Fase 2)
-- Depende de: 00001 (dispute_status), 00002 (users), 00003 (clubs)
--             00009 (tournaments, tournament_brackets)
-- ============================================================

CREATE TABLE public.disputes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id      UUID NOT NULL REFERENCES public.tournament_brackets(id),
  tournament_id   UUID NOT NULL REFERENCES public.tournaments(id),
  filed_by_club   UUID NOT NULL REFERENCES public.clubs(id),
  filed_by_user   UUID NOT NULL REFERENCES public.users(id),
  against_club    UUID NOT NULL REFERENCES public.clubs(id),

  -- Conteúdo
  reason          TEXT NOT NULL,
  evidence_urls   TEXT[],                  -- Screenshots, fotos
  status          dispute_status NOT NULL DEFAULT 'open',

  -- Resolução
  resolved_by     UUID REFERENCES public.users(id),
  resolution      TEXT,
  resolved_at     TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_tournament ON public.disputes (tournament_id);
CREATE INDEX idx_disputes_status ON public.disputes (status);
CREATE INDEX idx_disputes_bracket ON public.disputes (bracket_id);

CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
