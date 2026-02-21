-- ============================================================
-- P.I.T - Task 4 RLS Validation (Subtasks 4.1 -> 4.6)
-- ============================================================
-- Como usar:
-- 1) Aplique as migrations ate 20260221120000_align_task4_rls.sql
-- 2) Execute este arquivo no Supabase SQL Editor
-- 3) Blocos de validacao retornam 0 linhas quando estiver tudo correto
-- 4) A parte integrada roda em transacao e finaliza com ROLLBACK
-- ============================================================

-- ============================================================
-- PARTE 1: Estrutura esperada de policies e colunas
-- ============================================================
WITH expected AS (
  SELECT * FROM (VALUES
    ('players',  'Players: select by role'),
    ('players',  'Players: insert own or elevated'),
    ('players',  'Players: update by role'),
    ('players',  'Players: delete by role'),
    ('clubs',    'Clubs: select by role'),
    ('clubs',    'Clubs: insert by role'),
    ('clubs',    'Clubs: update by role'),
    ('clubs',    'Clubs: delete by role'),
    ('claims',   'Claims: select by role'),
    ('claims',   'Claims: insert by role'),
    ('claims',   'Claims: update by role'),
    ('claims',   'Claims: delete by role'),
    ('matches',  'Matches: select by visibility and role'),
    ('matches',  'Matches: mod/admin insert'),
    ('matches',  'Matches: mod/admin update'),
    ('matches',  'Matches: mod/admin delete'),
    ('payments', 'Payments: deny all user roles')
  ) AS t(tablename, policyname)
)
SELECT
  'PARTE 1 - POLICIES AUSENTES' AS check_name,
  e.tablename || '.' || e.policyname AS missing_item,
  'policy nao encontrada em public.' || e.tablename AS detail
FROM expected e
LEFT JOIN pg_policies p
  ON p.schemaname = 'public'
 AND p.tablename = e.tablename
 AND p.policyname = e.policyname
WHERE p.policyname IS NULL
ORDER BY e.tablename, e.policyname;

WITH forbidden AS (
  SELECT * FROM (VALUES
    ('players',  'Players: leitura publica'),
    ('players',  'Players: cria proprio'),
    ('players',  'Players: atualiza proprio'),
    ('players',  'Players: admin gerencia'),
    ('clubs',    'Clubs: leitura publica'),
    ('clubs',    'Clubs: manager atualiza'),
    ('clubs',    'Clubs: admin/mod gerencia'),
    ('claims',   'Claims: user ve proprias'),
    ('claims',   'Claims: user cria'),
    ('claims',   'Claims: mod/admin review'),
    ('matches',  'Matches: leitura publica'),
    ('matches',  'Matches: sistema insere'),
    ('payments', 'Payments: user ve proprios'),
    ('payments', 'Payments: admin total')
  ) AS t(tablename, policyname)
)
SELECT
  'PARTE 1B - POLICIES LEGADAS AINDA EXISTEM' AS check_name,
  f.tablename || '.' || f.policyname AS missing_item,
  'policy antiga deveria ter sido removida' AS detail
FROM forbidden f
JOIN pg_policies p
  ON p.schemaname = 'public'
 AND p.tablename = f.tablename
 AND p.policyname = f.policyname
ORDER BY f.tablename, f.policyname;

SELECT
  'PARTE 1C - MATCHES.IS_PUBLIC' AS check_name,
  'public.matches.is_public' AS missing_item,
  'coluna is_public nao existe' AS detail
WHERE NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'matches'
    AND column_name = 'is_public'
);

SELECT
  'PARTE 1D - FINANCIAL VIEW SECURITY INVOKER' AS check_name,
  'public.v_financial_dashboard' AS missing_item,
  'view deve estar com security_invoker=true' AS detail
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'v_financial_dashboard'
    AND c.reloptions IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM unnest(c.reloptions) AS opt
      WHERE opt = 'security_invoker=true'
    )
);

-- ============================================================
-- PARTE 2: Testes integrados por role (4.6)
-- Roda em transacao e reverte tudo ao final.
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- Fixtures de usuarios (auth + public.users via trigger)
-- ------------------------------------------------------------
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'task4-player@pit.local',    'not_used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'task4-manager@pit.local',   'not_used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated', 'task4-moderator@pit.local', 'not_used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a4', 'authenticated', 'authenticated', 'task4-admin@pit.local',     'not_used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a5', 'authenticated', 'authenticated', 'task4-other@pit.local',     'not_used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

UPDATE public.users
SET roles = '{player}'
WHERE id = '00000000-0000-0000-0000-0000000000a1';

UPDATE public.users
SET roles = '{player,manager}'
WHERE id = '00000000-0000-0000-0000-0000000000a2';

UPDATE public.users
SET roles = '{player,moderator}'
WHERE id = '00000000-0000-0000-0000-0000000000a3';

UPDATE public.users
SET roles = '{player,admin}'
WHERE id = '00000000-0000-0000-0000-0000000000a4';

UPDATE public.users
SET roles = '{player,manager}'
WHERE id = '00000000-0000-0000-0000-0000000000a5';

-- ------------------------------------------------------------
-- Fixtures de dominio: players, clubs, claims, matches, payments
-- ------------------------------------------------------------
INSERT INTO public.players (id, user_id, ea_gamertag, primary_position, bio)
VALUES
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'task4_player_a1',  'MC', 'seed'),
  ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a2', 'task4_player_a2',  'VOL', 'seed'),
  ('10000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a5', 'task4_player_a5',  'ATA', 'seed')
ON CONFLICT (id) DO UPDATE
SET user_id = EXCLUDED.user_id,
    ea_gamertag = EXCLUDED.ea_gamertag,
    primary_position = EXCLUDED.primary_position,
    bio = EXCLUDED.bio;

INSERT INTO public.clubs (id, ea_club_id, ea_name_raw, display_name, manager_id, status)
VALUES
  ('20000000-0000-0000-0000-0000000000a1', 'task4_club_mgr',   'Task 4 Club Manager', 'Task 4 Club Manager', '00000000-0000-0000-0000-0000000000a2', 'active'),
  ('20000000-0000-0000-0000-0000000000a2', 'task4_club_other', 'Task 4 Club Other',   'Task 4 Club Other',   '00000000-0000-0000-0000-0000000000a5', 'active')
ON CONFLICT (id) DO UPDATE
SET manager_id = EXCLUDED.manager_id,
    status = EXCLUDED.status,
    display_name = EXCLUDED.display_name;

INSERT INTO public.club_players (club_id, player_id, role_in_club, is_active)
VALUES
  ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'player',  true),
  ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a2', 'manager', true),
  ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a5', 'manager', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.discovered_clubs (id, ea_club_id, ea_name_raw, display_name, discovered_via, status)
VALUES
  ('30000000-0000-0000-0000-0000000000a1', 'task4_disc_1', 'Task 4 Disc 1', 'Task 4 Disc 1', 'manual_test', 'unclaimed'),
  ('30000000-0000-0000-0000-0000000000a2', 'task4_disc_2', 'Task 4 Disc 2', 'Task 4 Disc 2', 'manual_test', 'unclaimed')
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name;

INSERT INTO public.claims (id, user_id, discovered_club_id, photo_url, status)
VALUES
  ('40000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', 'https://example.com/task4_a1.png', 'pending'),
  ('40000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a5', '30000000-0000-0000-0000-0000000000a2', 'https://example.com/task4_a2.png', 'pending')
ON CONFLICT (id) DO UPDATE
SET photo_url = EXCLUDED.photo_url;

INSERT INTO public.matches (
  id, ea_match_id, match_timestamp,
  home_club_id, away_club_id,
  home_ea_club_id, away_ea_club_id,
  home_club_name, away_club_name,
  home_score, away_score, match_type, is_public
) VALUES
  ('50000000-0000-0000-0000-0000000000a1', 'task4_match_public',         now(), NULL,                                   NULL,                                   'ea_pub_home', 'ea_pub_away', 'Public Home', 'Public Away', 1, 1, 'friendly_external', true),
  ('50000000-0000-0000-0000-0000000000a2', 'task4_match_manager_private', now(), '20000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2', 'ea_mgr_home', 'ea_mgr_away', 'Mgr Home',    'Mgr Away',    2, 0, 'friendly_pit',      false),
  ('50000000-0000-0000-0000-0000000000a3', 'task4_match_other_private',   now(), '20000000-0000-0000-0000-0000000000a2', NULL,                                   'ea_oth_home', 'ea_oth_away', 'Oth Home',    'Oth Away',    3, 2, 'friendly_pit',      false)
ON CONFLICT (id) DO UPDATE
SET is_public = EXCLUDED.is_public,
    home_score = EXCLUDED.home_score,
    away_score = EXCLUDED.away_score;

INSERT INTO public.payments (id, club_id, user_id, amount, currency, description, status, gateway)
VALUES
  ('60000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', 3.00, 'BRL', 'Task4 Test Payment', 'pending', 'mercadopago')
ON CONFLICT (id) DO UPDATE
SET amount = EXCLUDED.amount,
    description = EXCLUDED.description;

-- ------------------------------------------------------------
-- 2A) Visibility matrix - players
-- ------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a1';
SELECT 'IT-PLAYERS-PLAYER-SELECT' AS check_name, 1 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.players) s
WHERE s.cnt <> 1;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a2';
SELECT 'IT-PLAYERS-MANAGER-SELECT' AS check_name, 2 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.players) s
WHERE s.cnt <> 2;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a3';
SELECT 'IT-PLAYERS-MOD-SELECT' AS check_name, 3 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.players) s
WHERE s.cnt <> 3;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a4';
SELECT 'IT-PLAYERS-ADMIN-SELECT' AS check_name, 3 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.players) s
WHERE s.cnt <> 3;
RESET ROLE;

-- ------------------------------------------------------------
-- 2B) Visibility matrix - clubs
-- ------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a1';
SELECT 'IT-CLUBS-PLAYER-SELECT' AS check_name, 0 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.clubs) s
WHERE s.cnt <> 0;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a2';
SELECT 'IT-CLUBS-MANAGER-SELECT' AS check_name, 1 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.clubs) s
WHERE s.cnt <> 1;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a3';
SELECT 'IT-CLUBS-MOD-SELECT' AS check_name, 2 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.clubs) s
WHERE s.cnt <> 2;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a4';
SELECT 'IT-CLUBS-ADMIN-SELECT' AS check_name, 2 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.clubs) s
WHERE s.cnt <> 2;
RESET ROLE;

-- ------------------------------------------------------------
-- 2C) Visibility matrix - claims
-- ------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a1';
SELECT 'IT-CLAIMS-PLAYER-SELECT' AS check_name, 1 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.claims) s
WHERE s.cnt <> 1;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a2';
SELECT 'IT-CLAIMS-MANAGER-SELECT' AS check_name, 0 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.claims) s
WHERE s.cnt <> 0;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a3';
SELECT 'IT-CLAIMS-MOD-SELECT' AS check_name, 2 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.claims) s
WHERE s.cnt <> 2;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a4';
SELECT 'IT-CLAIMS-ADMIN-SELECT' AS check_name, 2 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.claims) s
WHERE s.cnt <> 2;
RESET ROLE;

-- ------------------------------------------------------------
-- 2D) Visibility matrix - matches
-- ------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a1';
SELECT 'IT-MATCHES-PLAYER-SELECT' AS check_name, 1 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.matches) s
WHERE s.cnt <> 1;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a2';
SELECT 'IT-MATCHES-MANAGER-SELECT' AS check_name, 2 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.matches) s
WHERE s.cnt <> 2;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a3';
SELECT 'IT-MATCHES-MOD-SELECT' AS check_name, 3 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.matches) s
WHERE s.cnt <> 3;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a4';
SELECT 'IT-MATCHES-ADMIN-SELECT' AS check_name, 3 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.matches) s
WHERE s.cnt <> 3;
RESET ROLE;

-- ------------------------------------------------------------
-- 2E) Payments e financial: deny para usuarios; bypass para role tecnico
-- ------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a1';
SELECT 'IT-PAYMENTS-PLAYER-SELECT' AS check_name, 0 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.payments) s
WHERE s.cnt <> 0;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a2';
SELECT 'IT-PAYMENTS-MANAGER-SELECT' AS check_name, 0 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.payments) s
WHERE s.cnt <> 0;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a3';
SELECT 'IT-PAYMENTS-MOD-SELECT' AS check_name, 0 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.payments) s
WHERE s.cnt <> 0;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a4';
SELECT 'IT-PAYMENTS-ADMIN-SELECT' AS check_name, 0 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.payments) s
WHERE s.cnt <> 0;
RESET ROLE;

SELECT 'IT-PAYMENTS-BYPASS-TECHNICAL-ROLE' AS check_name, 1 AS expected, s.cnt AS actual
FROM (SELECT COUNT(*)::INT AS cnt FROM public.payments WHERE id = '60000000-0000-0000-0000-0000000000a1') s
WHERE s.cnt <> 1;

-- ------------------------------------------------------------
-- 2F) CRUD spot checks (UPDATE) por role
-- ------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a1';
WITH changed AS (
  UPDATE public.players
  SET bio = 'player-own-update'
  WHERE id = '10000000-0000-0000-0000-0000000000a1'
  RETURNING 1
)
SELECT 'IT-CRUD-PLAYER-UPDATES-OWN-PLAYER' AS check_name, 1 AS expected, (SELECT COUNT(*)::INT FROM changed) AS actual
WHERE (SELECT COUNT(*) FROM changed) <> 1;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a1';
WITH changed AS (
  UPDATE public.players
  SET bio = 'player-should-not-update-other'
  WHERE id = '10000000-0000-0000-0000-0000000000a5'
  RETURNING 1
)
SELECT 'IT-CRUD-PLAYER-CANNOT-UPDATE-OTHER-PLAYER' AS check_name, 0 AS expected, (SELECT COUNT(*)::INT FROM changed) AS actual
WHERE (SELECT COUNT(*) FROM changed) <> 0;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a2';
WITH changed AS (
  UPDATE public.players
  SET bio = 'manager-update-team-player'
  WHERE id = '10000000-0000-0000-0000-0000000000a1'
  RETURNING 1
)
SELECT 'IT-CRUD-MANAGER-UPDATES-TEAM-PLAYER' AS check_name, 1 AS expected, (SELECT COUNT(*)::INT FROM changed) AS actual
WHERE (SELECT COUNT(*) FROM changed) <> 1;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a2';
WITH changed AS (
  UPDATE public.players
  SET bio = 'manager-should-not-update-outsider'
  WHERE id = '10000000-0000-0000-0000-0000000000a5'
  RETURNING 1
)
SELECT 'IT-CRUD-MANAGER-CANNOT-UPDATE-OUTSIDER' AS check_name, 0 AS expected, (SELECT COUNT(*)::INT FROM changed) AS actual
WHERE (SELECT COUNT(*) FROM changed) <> 0;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a1';
WITH changed AS (
  UPDATE public.claims
  SET photo_url = 'https://example.com/task4_a1_updated.png'
  WHERE id = '40000000-0000-0000-0000-0000000000a1'
  RETURNING 1
)
SELECT 'IT-CRUD-PLAYER-UPDATES-OWN-CLAIM' AS check_name, 1 AS expected, (SELECT COUNT(*)::INT FROM changed) AS actual
WHERE (SELECT COUNT(*) FROM changed) <> 1;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a1';
WITH changed AS (
  UPDATE public.claims
  SET photo_url = 'https://example.com/task4_forbidden.png'
  WHERE id = '40000000-0000-0000-0000-0000000000a2'
  RETURNING 1
)
SELECT 'IT-CRUD-PLAYER-CANNOT-UPDATE-OTHER-CLAIM' AS check_name, 0 AS expected, (SELECT COUNT(*)::INT FROM changed) AS actual
WHERE (SELECT COUNT(*) FROM changed) <> 0;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a3';
WITH changed AS (
  UPDATE public.claims
  SET rejection_reason = 'moderator-note'
  WHERE id = '40000000-0000-0000-0000-0000000000a2'
  RETURNING 1
)
SELECT 'IT-CRUD-MOD-UPDATES-CLAIM' AS check_name, 1 AS expected, (SELECT COUNT(*)::INT FROM changed) AS actual
WHERE (SELECT COUNT(*) FROM changed) <> 1;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a2';
WITH changed AS (
  UPDATE public.clubs
  SET display_name = 'manager-updated-own-club'
  WHERE id = '20000000-0000-0000-0000-0000000000a1'
  RETURNING 1
)
SELECT 'IT-CRUD-MANAGER-UPDATES-OWN-CLUB' AS check_name, 1 AS expected, (SELECT COUNT(*)::INT FROM changed) AS actual
WHERE (SELECT COUNT(*) FROM changed) <> 1;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a2';
WITH changed AS (
  UPDATE public.clubs
  SET display_name = 'manager-should-not-update-other-club'
  WHERE id = '20000000-0000-0000-0000-0000000000a2'
  RETURNING 1
)
SELECT 'IT-CRUD-MANAGER-CANNOT-UPDATE-OTHER-CLUB' AS check_name, 0 AS expected, (SELECT COUNT(*)::INT FROM changed) AS actual
WHERE (SELECT COUNT(*) FROM changed) <> 0;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a2';
WITH changed AS (
  UPDATE public.matches
  SET home_score = 9
  WHERE id = '50000000-0000-0000-0000-0000000000a2'
  RETURNING 1
)
SELECT 'IT-CRUD-MANAGER-CANNOT-UPDATE-MATCH' AS check_name, 0 AS expected, (SELECT COUNT(*)::INT FROM changed) AS actual
WHERE (SELECT COUNT(*) FROM changed) <> 0;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a3';
WITH changed AS (
  UPDATE public.matches
  SET home_score = 8
  WHERE id = '50000000-0000-0000-0000-0000000000a2'
  RETURNING 1
)
SELECT 'IT-CRUD-MOD-UPDATES-MATCH' AS check_name, 1 AS expected, (SELECT COUNT(*)::INT FROM changed) AS actual
WHERE (SELECT COUNT(*) FROM changed) <> 1;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000a4';
WITH changed AS (
  UPDATE public.payments
  SET description = 'admin-should-not-update-payments'
  WHERE id = '60000000-0000-0000-0000-0000000000a1'
  RETURNING 1
)
SELECT 'IT-CRUD-ADMIN-CANNOT-UPDATE-PAYMENTS' AS check_name, 0 AS expected, (SELECT COUNT(*)::INT FROM changed) AS actual
WHERE (SELECT COUNT(*) FROM changed) <> 0;
RESET ROLE;

WITH changed AS (
  UPDATE public.payments
  SET description = 'technical-role-update-ok'
  WHERE id = '60000000-0000-0000-0000-0000000000a1'
  RETURNING 1
)
SELECT 'IT-CRUD-TECHNICAL-ROLE-CAN-UPDATE-PAYMENTS' AS check_name, 1 AS expected, (SELECT COUNT(*)::INT FROM changed) AS actual
WHERE (SELECT COUNT(*) FROM changed) <> 1;

ROLLBACK;

