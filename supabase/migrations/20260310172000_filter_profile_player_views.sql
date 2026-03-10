-- ============================================================
-- TASK 18: PROFILE PLAYER VIEWS
-- Ajusta as views de perfil para ignorar friendly_external
-- ============================================================

CREATE OR REPLACE VIEW public.v_player_stats AS
SELECT
  p.id AS player_id,
  p.ea_gamertag,
  p.primary_position,
  p.user_id,
  COUNT(mp.id) AS total_matches,
  COALESCE(SUM(mp.goals), 0) AS total_goals,
  COALESCE(SUM(mp.assists), 0) AS total_assists,
  ROUND(AVG(mp.rating), 2) AS avg_rating,
  COALESCE(SUM(mp.passes_completed), 0) AS total_passes,
  COALESCE(SUM(mp.tackles_made), 0) AS total_tackles,
  COALESCE(SUM(mp.saves), 0) AS total_saves,
  COALESCE(SUM(mp.clean_sheets), 0) AS total_clean_sheets,
  COALESCE(SUM(CASE WHEN mp.man_of_match THEN 1 ELSE 0 END), 0) AS total_mom,
  COALESCE(SUM(mp.yellow_cards), 0) AS total_yellows,
  COALESCE(SUM(mp.red_cards), 0) AS total_reds,
  MAX(mp.rating) AS best_rating,
  COALESCE(SUM(mp.minutes_played), 0) AS total_minutes
FROM public.players p
LEFT JOIN (
  public.match_players mp
  JOIN public.matches m ON m.id = mp.match_id
)
  ON mp.player_id = p.id
  AND m.match_type IN ('championship', 'friendly_pit')
GROUP BY p.id, p.ea_gamertag, p.primary_position, p.user_id;

CREATE OR REPLACE VIEW public.v_player_stats_by_position AS
SELECT
  mp.player_id,
  mp.resolved_position,
  COUNT(*) AS matches_at_position,
  COALESCE(SUM(mp.goals), 0) AS goals,
  COALESCE(SUM(mp.assists), 0) AS assists,
  ROUND(AVG(mp.rating), 2) AS avg_rating,
  COALESCE(SUM(mp.tackles_made), 0) AS tackles,
  COALESCE(SUM(mp.saves), 0) AS saves,
  COALESCE(SUM(mp.clean_sheets), 0) AS clean_sheets
FROM public.match_players mp
JOIN public.matches m ON m.id = mp.match_id
WHERE mp.player_id IS NOT NULL
  AND mp.resolved_position IS NOT NULL
  AND m.match_type IN ('championship', 'friendly_pit')
GROUP BY mp.player_id, mp.resolved_position;
