-- ============================================================
-- MIGRATION: Add PIX payment columns to tournament_entries
-- Task 23: Mercado Pago PIX payment gateway
-- ============================================================

ALTER TABLE public.tournament_entries
  ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS pix_qr_code        TEXT,
  ADD COLUMN IF NOT EXISTS pix_copy_paste      TEXT,
  ADD COLUMN IF NOT EXISTS pix_expiration      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS amount              DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS entry_status        TEXT;

CREATE INDEX IF NOT EXISTS idx_tournament_entries_gateway_payment_id
  ON public.tournament_entries (gateway_payment_id);
