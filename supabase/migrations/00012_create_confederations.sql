-- ============================================================
-- MIGRATION 00012: CONFEDERATIONS
-- Depende de: 00002 (users), 00003 (clubs)
-- NOTA: Executar ANTES de 00009 (tournaments referencia confederations)
-- ============================================================

CREATE TABLE public.confederations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  logo_url        TEXT,
  admin_user_id   UUID NOT NULL REFERENCES public.users(id),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_confederations_updated_at
  BEFORE UPDATE ON public.confederations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Relação confederação-time
CREATE TABLE public.confederation_clubs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confederation_id UUID NOT NULL REFERENCES public.confederations(id) ON DELETE CASCADE,
  club_id         UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at         TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT uq_conf_club UNIQUE (confederation_id, club_id)
);
