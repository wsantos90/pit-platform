-- ============================================================
-- MIGRATION 00008: MATCHMAKING
-- P.I.T — Performance · Intelligence · Tracking
-- ============================================================

-- Fila de matchmaking
CREATE TABLE public.matchmaking_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  queued_by   UUID NOT NULL REFERENCES public.users(id),
  slot_time   TEXT NOT NULL,
  custom_time TIMESTAMPTZ,
  status      matchmaking_status NOT NULL DEFAULT 'waiting',
  matched_with UUID REFERENCES public.matchmaking_queue(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mm_queue_status ON public.matchmaking_queue (status) WHERE status = 'waiting';
CREATE INDEX idx_mm_queue_slot ON public.matchmaking_queue (slot_time, status);
CREATE INDEX idx_mm_queue_club ON public.matchmaking_queue (club_id);
CREATE INDEX idx_mm_queue_expires ON public.matchmaking_queue (expires_at);

CREATE TRIGGER trg_mm_queue_updated_at
  BEFORE UPDATE ON public.matchmaking_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Chat de confronto (após match)
CREATE TABLE public.confrontation_chats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_a   UUID NOT NULL REFERENCES public.matchmaking_queue(id),
  queue_entry_b   UUID NOT NULL REFERENCES public.matchmaking_queue(id),
  club_a_id       UUID NOT NULL REFERENCES public.clubs(id),
  club_b_id       UUID NOT NULL REFERENCES public.clubs(id),
  status          confrontation_status NOT NULL DEFAULT 'active',
  confirmed_by_a  BOOLEAN NOT NULL DEFAULT false,
  confirmed_by_b  BOOLEAN NOT NULL DEFAULT false,
  match_id        UUID REFERENCES public.matches(id),
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cc_status ON public.confrontation_chats (status);
CREATE INDEX idx_cc_clubs ON public.confrontation_chats (club_a_id, club_b_id);

-- Mensagens do chat de confronto (Supabase Realtime)
CREATE TABLE public.confrontation_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     UUID NOT NULL REFERENCES public.confrontation_chats(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES public.users(id),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cm_chat ON public.confrontation_messages (chat_id, created_at);
