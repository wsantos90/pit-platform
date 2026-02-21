-- ============================================================
-- MIGRATION 00017: VIEWS (Dashboards e Rankings)
-- Depende de: todas as tabelas anteriores
-- ============================================================

-- ============================================================
-- VIEW: Stats acumuladas por jogador (dashboard do perfil)
-- ============================================================
CREATE OR REPLACE VIEW public.v_player_stats AS
SELECT
  p.id AS player_id,
  p.ea_gamertag,
  p.primary_position,
  p.user_id,
  COUNT(mp.id) AS total_matches,
  SUM(mp.goals) AS total_goals,
  SUM(mp.assists) AS total_assists,
  ROUND(AVG(mp.rating), 2) AS avg_rating,
  SUM(mp.passes_completed) AS total_passes,
  SUM(mp.tackles_made) AS total_tackles,
  SUM(mp.saves) AS total_saves,
  SUM(mp.clean_sheets) AS total_clean_sheets,
  SUM(CASE WHEN mp.man_of_match THEN 1 ELSE 0 END) AS total_mom,
  SUM(mp.yellow_cards) AS total_yellows,
  SUM(mp.red_cards) AS total_reds,
  MAX(mp.rating) AS best_rating,
  SUM(mp.minutes_played) AS total_minutes
FROM public.players p
LEFT JOIN public.match_players mp ON mp.player_id = p.id
GROUP BY p.id, p.ea_gamertag, p.primary_position, p.user_id;

-- ============================================================
-- VIEW: Stats acumuladas por time
-- ============================================================
CREATE OR REPLACE VIEW public.v_club_stats AS
SELECT
  c.id AS club_id,
  c.display_name,
  c.ea_club_id,
  COUNT(DISTINCT m.id) AS total_matches,
  SUM(CASE
    WHEN (m.home_club_id = c.id AND m.home_score > m.away_score)
      OR (m.away_club_id = c.id AND m.away_score > m.home_score) THEN 1
    ELSE 0
  END) AS wins,
  SUM(CASE
    WHEN m.home_score = m.away_score THEN 1
    ELSE 0
  END) AS draws,
  SUM(CASE
    WHEN (m.home_club_id = c.id AND m.home_score < m.away_score)
      OR (m.away_club_id = c.id AND m.away_score < m.home_score) THEN 1
    ELSE 0
  END) AS losses,
  SUM(CASE WHEN m.home_club_id = c.id THEN m.home_score ELSE m.away_score END) AS goals_for,
  SUM(CASE WHEN m.home_club_id = c.id THEN m.away_score ELSE m.home_score END) AS goals_against
FROM public.clubs c
LEFT JOIN public.matches m ON m.home_club_id = c.id OR m.away_club_id = c.id
WHERE c.status = 'active'
GROUP BY c.id, c.display_name, c.ea_club_id;

-- ============================================================
-- VIEW: Stats por jogador POR POSICAO
-- ============================================================
CREATE OR REPLACE VIEW public.v_player_stats_by_position AS
SELECT
  mp.player_id,
  mp.resolved_position,
  COUNT(*) AS matches_at_position,
  SUM(mp.goals) AS goals,
  SUM(mp.assists) AS assists,
  ROUND(AVG(mp.rating), 2) AS avg_rating,
  SUM(mp.tackles_made) AS tackles,
  SUM(mp.saves) AS saves,
  SUM(mp.clean_sheets) AS clean_sheets
FROM public.match_players mp
WHERE mp.player_id IS NOT NULL AND mp.resolved_position IS NOT NULL
GROUP BY mp.player_id, mp.resolved_position;

-- ============================================================
-- VIEW: Dashboard financeiro (Admin only)
-- ============================================================
CREATE OR REPLACE VIEW public.v_financial_dashboard AS
SELECT
  DATE_TRUNC('day', p.created_at) AS period,
  COUNT(*) FILTER (WHERE p.status = 'paid') AS paid_count,
  SUM(p.amount) FILTER (WHERE p.status = 'paid') AS total_revenue,
  SUM(p.amount) FILTER (WHERE p.status = 'refunded') AS total_refunded,
  SUM(p.amount) FILTER (WHERE p.status = 'pending') AS total_pending,
  COUNT(*) FILTER (WHERE p.status = 'overdue') AS overdue_count,
  SUM(p.amount) FILTER (WHERE p.tournament_id IS NOT NULL AND p.status = 'paid') AS tournament_revenue,
  SUM(p.amount) FILTER (WHERE p.is_recurring AND p.status = 'paid') AS subscription_revenue
FROM public.payments p
GROUP BY DATE_TRUNC('day', p.created_at)
ORDER BY period DESC;

-- ============================================================
-- VIEW: Ranking de times por Pit Rating (Fase 2)
-- ============================================================
CREATE OR REPLACE VIEW public.v_club_rankings AS
SELECT
  pr.club_id,
  c.display_name,
  pr.season,
  pr.rating,
  pr.league,
  pr.competitive_rating,
  pr.wins,
  pr.losses,
  pr.draws,
  pr.matches_played,
  pr.is_calibrating,
  RANK() OVER (PARTITION BY pr.season ORDER BY pr.rating DESC) AS rank_general,
  RANK() OVER (PARTITION BY pr.season ORDER BY pr.competitive_rating DESC) AS rank_competitive
FROM public.pit_ratings pr
JOIN public.clubs c ON c.id = pr.club_id
ORDER BY pr.rating DESC;

-- ============================================================
-- VIEW: Torneios com contagem de inscritos
-- ============================================================
CREATE OR REPLACE VIEW public.v_tournaments_with_entries AS
SELECT
  t.*,
  COUNT(te.id) AS entries_count,
  COUNT(te.id) FILTER (WHERE te.payment_status = 'paid') AS paid_count,
  COUNT(te.id) FILTER (WHERE te.payment_status = 'pending') AS pending_count,
  CASE
    WHEN COUNT(te.id) >= t.capacity_min THEN true
    ELSE false
  END AS has_minimum
FROM public.tournaments t
LEFT JOIN public.tournament_entries te ON te.tournament_id = t.id
GROUP BY t.id;
