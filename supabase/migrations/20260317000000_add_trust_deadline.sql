ALTER TABLE public.tournament_entries
  ADD COLUMN IF NOT EXISTS trust_deadline TIMESTAMPTZ;
