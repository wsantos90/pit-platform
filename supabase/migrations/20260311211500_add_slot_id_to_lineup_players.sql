ALTER TABLE public.lineup_players
ADD COLUMN slot_id TEXT;

UPDATE public.lineup_players
SET slot_id = CASE position
  WHEN 'GK' THEN 'GK'
  WHEN 'ZAG' THEN 'ZAG1'
  WHEN 'VOL' THEN 'VOL1'
  WHEN 'MC' THEN 'MC'
  WHEN 'AE' THEN 'AE'
  WHEN 'AD' THEN 'AD'
  WHEN 'ATA' THEN 'ATA1'
  ELSE NULL
END
WHERE slot_id IS NULL;

ALTER TABLE public.lineup_players
ALTER COLUMN slot_id SET NOT NULL;

ALTER TABLE public.lineup_players
ADD CONSTRAINT lineup_players_slot_id_check
CHECK (slot_id IN ('GK', 'ZAG1', 'ZAG2', 'ZAG3', 'VOL1', 'VOL2', 'MC', 'AE', 'AD', 'ATA1', 'ATA2'));

ALTER TABLE public.lineup_players
DROP CONSTRAINT uq_lineup_position;

ALTER TABLE public.lineup_players
ADD CONSTRAINT uq_lineup_slot UNIQUE (lineup_id, slot_id, is_starter);

CREATE INDEX idx_lp_slot ON public.lineup_players (slot_id);
