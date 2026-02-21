-- ============================================================
-- P.I.T — Task 3 Schema Validation (Subtasks 3.1 → 3.5)
-- ============================================================
-- Como usar: Cole CADA bloco separado no Supabase SQL Editor
-- Resultado esperado: cada query deve retornar 0 linhas
-- Se retornar linhas → algum item está faltando / errado
-- ============================================================


-- ============================================================
-- PARTE 1: TABELAS (28 esperadas)
-- Subtask 3.1–3.4
-- ============================================================
WITH expected AS (
  SELECT unnest(ARRAY[
    'users','players','clubs','club_players',
    'discovered_clubs','discovered_players','discovery_runs',
    'claims',
    'matches','match_players',
    'lineups','lineup_players',
    'matchmaking_queue','confrontation_chats','confrontation_messages',
    'tournaments','tournament_entries','tournament_brackets',
    'payments','trust_scores',
    'hall_of_fame',
    'confederations','confederation_clubs',
    'disputes',
    'pit_ratings','pit_rating_history',
    'notifications','subscriptions'
  ]) AS name
)
SELECT
  'PARTE 1 - TABELAS' AS check_name,
  name AS missing_item,
  'tabela nao existe em public' AS detail
FROM expected e
LEFT JOIN pg_catalog.pg_tables t
  ON t.schemaname = 'public' AND t.tablename = e.name
WHERE t.tablename IS NULL
ORDER BY name;


-- ============================================================
-- PARTE 2: ENUMs (18 esperados)
-- Subtask 3.1
-- ============================================================
WITH expected AS (
  SELECT unnest(ARRAY[
    'user_role','claim_status','club_status','player_position',
    'ea_position_category','match_type','matchmaking_status',
    'confrontation_status','payment_status','tournament_type',
    'tournament_format','tournament_status','hall_of_fame_award',
    'dispute_status','pit_league','subscription_status',
    'subscription_plan','notification_type'
  ]) AS name
)
SELECT
  'PARTE 2 - ENUMS' AS check_name,
  e.name AS missing_item,
  'enum nao existe em public' AS detail
FROM expected e
LEFT JOIN pg_type t ON t.typname = e.name AND t.typtype = 'e'
LEFT JOIN pg_namespace n ON n.oid = t.typnamespace AND n.nspname = 'public'
WHERE t.typname IS NULL OR n.nspname IS NULL
ORDER BY e.name;


-- ============================================================
-- PARTE 2B: VALORES DOS ENUMs (spot check chave)
-- ============================================================
WITH expected AS (
  SELECT * FROM (VALUES
    ('user_role',      ARRAY['player','manager','moderator','admin']),
    ('player_position',ARRAY['GK','ZAG','VOL','MC','AE','AD','ATA']),
    ('match_type',     ARRAY['championship','friendly_pit','friendly_external']),
    ('club_status',    ARRAY['unclaimed','pending','active','suspended','banned']),
    ('pit_league',     ARRAY['access','bronze','silver','gold','elite']),
    ('tournament_status', ARRAY['draft','open','confirmed','in_progress','finished','cancelled'])
  ) AS t(enum_name, expected_values)
),
actual AS (
  SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS actual_values
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  JOIN pg_namespace n ON n.oid = t.typnamespace AND n.nspname = 'public'
  GROUP BY t.typname
)
SELECT
  'PARTE 2B - ENUM VALUES' AS check_name,
  ex.enum_name AS missing_item,
  'valores esperados: ' || array_to_string(ex.expected_values, ',')
    || ' / encontrados: ' || COALESCE(array_to_string(ac.actual_values, ','), 'NENHUM') AS detail
FROM expected ex
LEFT JOIN actual ac ON ac.typname = ex.enum_name
WHERE ac.typname IS NULL OR ac.actual_values::text[] <> ex.expected_values
ORDER BY ex.enum_name;


-- ============================================================
-- PARTE 3: TRIGGERS (17 esperados)
-- Subtask 3.5 (on_auth_user_created no schema auth)
-- ============================================================
WITH expected AS (
  SELECT * FROM (VALUES
    ('auth',   'users',              'on_auth_user_created'),
    ('public', 'users',              'trg_users_updated_at'),
    ('public', 'players',            'trg_players_updated_at'),
    ('public', 'clubs',              'trg_clubs_updated_at'),
    ('public', 'clubs',              'trg_club_create_trust'),
    ('public', 'claims',             'trg_claims_updated_at'),
    ('public', 'claims',             'trg_claim_approved'),
    ('public', 'confederations',     'trg_confederations_updated_at'),
    ('public', 'disputes',           'trg_disputes_updated_at'),
    ('public', 'lineups',            'trg_lineups_updated_at'),
    ('public', 'matchmaking_queue',  'trg_mm_queue_updated_at'),
    ('public', 'payments',           'trg_payments_updated_at'),
    ('public', 'pit_ratings',        'trg_ratings_updated_at'),
    ('public', 'subscriptions',      'trg_subs_updated_at'),
    ('public', 'tournament_entries', 'trg_te_updated_at'),
    ('public', 'tournaments',        'trg_tournaments_updated_at'),
    ('public', 'trust_scores',       'trg_trust_updated_at')
  ) AS t(schema_name, table_name, trigger_name)
),
actual AS (
  SELECT n.nspname AS schema_name, c.relname AS table_name, tg.tgname AS trigger_name
  FROM pg_trigger tg
  JOIN pg_class c ON c.oid = tg.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT tg.tgisinternal
)
SELECT
  'PARTE 3 - TRIGGERS' AS check_name,
  e.schema_name || '.' || e.table_name || '.' || e.trigger_name AS missing_item,
  'trigger nao encontrado' AS detail
FROM expected e
LEFT JOIN actual a
  ON a.schema_name = e.schema_name
  AND a.table_name = e.table_name
  AND a.trigger_name = e.trigger_name
WHERE a.trigger_name IS NULL
ORDER BY e.schema_name, e.table_name;


-- ============================================================
-- PARTE 4: RLS ATIVO EM TODAS AS TABELAS PUBLIC
-- Subtask 3.5
-- ============================================================
SELECT
  'PARTE 4 - RLS' AS check_name,
  t.tablename AS missing_item,
  'RLS desabilitado nesta tabela' AS detail
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_tables t ON t.tablename = c.relname AND t.schemaname = n.nspname
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = FALSE
ORDER BY t.tablename;


-- ============================================================
-- PARTE 5: CONSTRAINTS ÚNICAS (UNIQUE / UNIQUE INDEX)
-- Subtask 3.1–3.4
-- ============================================================
WITH expected AS (
  SELECT * FROM (VALUES
    ('users',             'email'),
    ('players',           'ea_gamertag'),
    ('clubs',             'ea_club_id'),
    ('discovered_clubs',  'ea_club_id'),
    ('discovered_players','ea_gamertag'),
    ('matches',           'ea_match_id'),
    ('confederations',    'slug'),
    ('pit_ratings',       'club_id')   -- unique via (club_id, season) mas club_id aparece no índice
  ) AS t(tablename, columnname)
),
unique_cols AS (
  SELECT c.relname AS tablename, a.attname AS columnname
  FROM pg_index i
  JOIN pg_class c ON c.oid = i.indrelid
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND i.indisunique
)
SELECT
  'PARTE 5 - UNIQUE' AS check_name,
  e.tablename || '.' || e.columnname AS missing_item,
  'unique constraint/index nao encontrado' AS detail
FROM expected e
LEFT JOIN unique_cols u ON u.tablename = e.tablename AND u.columnname = e.columnname
WHERE u.columnname IS NULL
ORDER BY e.tablename;


-- ============================================================
-- PARTE 6: NAMED CONSTRAINTS (CHECK + UNIQUE compostos)
-- Subtask 3.1–3.4
-- ============================================================
WITH expected AS (
  SELECT * FROM (VALUES
    ('public', 'club_players',      'uq_active_player_club'),
    ('public', 'match_players',     'uq_match_player'),
    ('public', 'players',           'chk_different_positions'),
    ('public', 'discovered_players','uq_discovered_gamertag'),
    ('public', 'tournament_entries','uq_tournament_club'),
    ('public', 'hall_of_fame',      'uq_hof_tournament_award'),
    ('public', 'tournament_brackets','uq_bracket_match'),
    ('public', 'pit_ratings',       'uq_club_season'),
    ('public', 'trust_scores',      'trust_scores_club_id_key'),  -- UNIQUE single col gera constraint automaticamente
    ('public', 'subscriptions',     'chk_subscription_target'),
    ('public', 'lineup_players',    'uq_lineup_player'),
    ('public', 'lineup_players',    'uq_lineup_position'),
    ('public', 'confederation_clubs','uq_conf_club')
  ) AS t(schema_name, table_name, constraint_name)
)
SELECT
  'PARTE 6 - NAMED CONSTRAINTS' AS check_name,
  e.schema_name || '.' || e.table_name || '.' || e.constraint_name AS missing_item,
  'constraint nao encontrada' AS detail
FROM expected e
LEFT JOIN pg_constraint c ON c.conname = e.constraint_name
LEFT JOIN pg_class r ON r.oid = c.conrelid
LEFT JOIN pg_namespace n ON n.oid = r.relnamespace
WHERE c.conname IS NULL
   OR n.nspname <> e.schema_name
   OR r.relname <> e.table_name
ORDER BY e.schema_name, e.table_name;


-- ============================================================
-- PARTE 7: FOREIGN KEYS (69 esperadas)
-- Subtask 3.1–3.4
-- ============================================================
WITH expected AS (
  SELECT * FROM (VALUES
    -- users / players / clubs
    ('public','users',         'id',              'auth',  'users',             'id'),
    ('public','players',       'user_id',         'public','users',             'id'),
    ('public','clubs',         'manager_id',      'public','users',             'id'),
    ('public','club_players',  'club_id',         'public','clubs',             'id'),
    ('public','club_players',  'player_id',       'public','players',           'id'),
    -- discovery
    ('public','discovered_clubs',  'claimed_by',          'public','users',  'id'),
    ('public','discovered_clubs',  'promoted_to_club_id', 'public','clubs',  'id'),
    ('public','discovered_players','linked_player_id',    'public','players','id'),
    ('public','discovery_runs',    'triggered_by',        'public','users',  'id'),
    -- claims
    ('public','claims','user_id',           'public','users',           'id'),
    ('public','claims','discovered_club_id','public','discovered_clubs','id'),
    ('public','claims','reviewed_by',       'public','users',           'id'),
    -- matches
    ('public','matches','home_club_id',  'public','clubs',      'id'),
    ('public','matches','away_club_id',  'public','clubs',      'id'),
    ('public','matches','tournament_id', 'public','tournaments','id'),
    -- tournament_brackets FK to matches (adicionada por ALTER TABLE em 00006)
    ('public','tournament_brackets','match_id','public','matches','id'),
    -- match_players
    ('public','match_players','match_id',  'public','matches', 'id'),
    ('public','match_players','player_id', 'public','players', 'id'),
    ('public','match_players','club_id',   'public','clubs',   'id'),
    -- lineups
    ('public','lineups','club_id',    'public','clubs',   'id'),
    ('public','lineups','match_id',   'public','matches', 'id'),
    ('public','lineups','created_by', 'public','users',   'id'),
    -- lineup_players
    ('public','lineup_players','lineup_id', 'public','lineups', 'id'),
    ('public','lineup_players','player_id', 'public','players', 'id'),
    -- matchmaking
    ('public','matchmaking_queue','club_id',      'public','clubs',            'id'),
    ('public','matchmaking_queue','queued_by',    'public','users',            'id'),
    ('public','matchmaking_queue','matched_with', 'public','matchmaking_queue','id'),
    -- confrontation
    ('public','confrontation_chats','queue_entry_a','public','matchmaking_queue','id'),
    ('public','confrontation_chats','queue_entry_b','public','matchmaking_queue','id'),
    ('public','confrontation_chats','club_a_id',    'public','clubs',           'id'),
    ('public','confrontation_chats','club_b_id',    'public','clubs',           'id'),
    ('public','confrontation_chats','match_id',     'public','matches',         'id'),
    ('public','confrontation_messages','chat_id',   'public','confrontation_chats','id'),
    ('public','confrontation_messages','sender_id', 'public','users',              'id'),
    -- tournaments
    ('public','tournaments','confederation_id','public','confederations','id'),
    ('public','tournaments','created_by',      'public','users',         'id'),
    -- tournament_entries
    ('public','tournament_entries','tournament_id','public','tournaments','id'),
    ('public','tournament_entries','club_id',      'public','clubs',      'id'),
    ('public','tournament_entries','enrolled_by',  'public','users',      'id'),
    -- tournament_brackets
    ('public','tournament_brackets','tournament_id',   'public','tournaments',       'id'),
    ('public','tournament_brackets','home_entry_id',   'public','tournament_entries','id'),
    ('public','tournament_brackets','away_entry_id',   'public','tournament_entries','id'),
    ('public','tournament_brackets','home_club_id',    'public','clubs',             'id'),
    ('public','tournament_brackets','away_club_id',    'public','clubs',             'id'),
    ('public','tournament_brackets','winner_entry_id', 'public','tournament_entries','id'),
    ('public','tournament_brackets','next_bracket_id', 'public','tournament_brackets','id'),
    -- payments / trust
    ('public','payments',    'club_id',      'public','clubs',      'id'),
    ('public','payments',    'tournament_id','public','tournaments', 'id'),
    ('public','payments',    'user_id',      'public','users',       'id'),
    ('public','trust_scores','club_id',      'public','clubs',       'id'),
    -- hall_of_fame
    ('public','hall_of_fame','tournament_id','public','tournaments','id'),
    ('public','hall_of_fame','club_id',      'public','clubs',      'id'),
    ('public','hall_of_fame','player_id',    'public','players',    'id'),
    -- confederations
    ('public','confederations',     'admin_user_id',    'public','users',         'id'),
    ('public','confederation_clubs','confederation_id', 'public','confederations','id'),
    ('public','confederation_clubs','club_id',          'public','clubs',         'id'),
    -- disputes
    ('public','disputes','bracket_id',   'public','tournament_brackets','id'),
    ('public','disputes','tournament_id','public','tournaments',        'id'),
    ('public','disputes','filed_by_club','public','clubs',              'id'),
    ('public','disputes','filed_by_user','public','users',              'id'),
    ('public','disputes','against_club', 'public','clubs',              'id'),
    ('public','disputes','resolved_by',  'public','users',              'id'),
    -- pit_ratings
    ('public','pit_ratings',       'club_id',      'public','clubs',      'id'),
    ('public','pit_rating_history','pit_rating_id','public','pit_ratings', 'id'),
    ('public','pit_rating_history','match_id',     'public','matches',     'id'),
    -- notifications / subscriptions
    ('public','notifications', 'user_id', 'public','users','id'),
    ('public','subscriptions', 'user_id', 'public','users','id'),
    ('public','subscriptions', 'club_id', 'public','clubs','id')
  ) AS t(schema_name, table_name, column_name, ref_schema, ref_table, ref_column)
),
actual AS (
  SELECT
    tc.table_schema, tc.table_name, kcu.column_name,
    ccu.table_schema AS ref_schema, ccu.table_name AS ref_table, ccu.column_name AS ref_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
)
SELECT
  'PARTE 7 - FOREIGN KEYS' AS check_name,
  e.schema_name || '.' || e.table_name || '.' || e.column_name
    || ' → ' || e.ref_schema || '.' || e.ref_table || '.' || e.ref_column AS missing_item,
  'foreign key nao encontrada' AS detail
FROM expected e
LEFT JOIN actual a
  ON a.table_schema  = e.schema_name
  AND a.table_name   = e.table_name
  AND a.column_name  = e.column_name
  AND a.ref_schema   = e.ref_schema
  AND a.ref_table    = e.ref_table
  AND a.ref_column   = e.ref_column
WHERE a.table_name IS NULL
ORDER BY e.schema_name, e.table_name, e.column_name;


-- ============================================================
-- PARTE 8: NOT NULL em colunas críticas
-- Subtask 3.1–3.4 (BUG CORRIGIDO: coluna ausente também falha)
-- ============================================================
WITH expected AS (
  SELECT * FROM (VALUES
    -- users
    ('public','users','email'),('public','users','roles'),
    ('public','users','is_active'),('public','users','created_at'),
    -- players
    ('public','players','user_id'),('public','players','ea_gamertag'),
    ('public','players','primary_position'),('public','players','status'),
    -- clubs
    ('public','clubs','ea_club_id'),('public','clubs','ea_name_raw'),
    ('public','clubs','display_name'),('public','clubs','status'),
    ('public','clubs','subscription_plan'),
    -- club_players
    ('public','club_players','club_id'),('public','club_players','player_id'),
    ('public','club_players','is_active'),('public','club_players','role_in_club'),
    -- discovered_clubs
    ('public','discovered_clubs','ea_club_id'),('public','discovered_clubs','display_name'),
    ('public','discovered_clubs','scan_count'),('public','discovered_clubs','status'),
    -- discovered_players
    ('public','discovered_players','ea_gamertag'),('public','discovered_players','matches_seen'),
    -- discovery_runs
    ('public','discovery_runs','clubs_scanned'),('public','discovery_runs','status'),
    -- claims
    ('public','claims','user_id'),('public','claims','discovered_club_id'),
    ('public','claims','photo_url'),('public','claims','status'),
    -- matches
    ('public','matches','ea_match_id'),('public','matches','match_timestamp'),
    ('public','matches','home_ea_club_id'),('public','matches','away_ea_club_id'),
    ('public','matches','match_type'),
    -- match_players
    ('public','match_players','match_id'),('public','match_players','ea_gamertag'),
    ('public','match_players','ea_club_id'),('public','match_players','ea_position'),
    -- lineups
    ('public','lineups','club_id'),('public','lineups','name'),('public','lineups','formation'),
    -- lineup_players
    ('public','lineup_players','lineup_id'),('public','lineup_players','player_id'),
    ('public','lineup_players','position'),
    -- matchmaking_queue
    ('public','matchmaking_queue','club_id'),('public','matchmaking_queue','slot_time'),
    ('public','matchmaking_queue','status'),('public','matchmaking_queue','expires_at'),
    -- confrontation_chats
    ('public','confrontation_chats','queue_entry_a'),('public','confrontation_chats','queue_entry_b'),
    ('public','confrontation_chats','status'),('public','confrontation_chats','expires_at'),
    -- confrontation_messages
    ('public','confrontation_messages','chat_id'),('public','confrontation_messages','sender_id'),
    ('public','confrontation_messages','message'),
    -- tournaments
    ('public','tournaments','name'),('public','tournaments','type'),
    ('public','tournaments','format'),('public','tournaments','status'),
    ('public','tournaments','scheduled_date'),('public','tournaments','entry_fee'),
    -- tournament_entries
    ('public','tournament_entries','tournament_id'),('public','tournament_entries','club_id'),
    ('public','tournament_entries','payment_status'),
    -- tournament_brackets
    ('public','tournament_brackets','tournament_id'),('public','tournament_brackets','round'),
    ('public','tournament_brackets','status'),
    -- payments
    ('public','payments','club_id'),('public','payments','user_id'),
    ('public','payments','amount'),('public','payments','status'),
    -- trust_scores
    ('public','trust_scores','club_id'),('public','trust_scores','strikes'),
    ('public','trust_scores','is_trusted'),
    -- hall_of_fame
    ('public','hall_of_fame','tournament_id'),('public','hall_of_fame','award'),
    -- confederations
    ('public','confederations','name'),('public','confederations','slug'),
    -- disputes
    ('public','disputes','bracket_id'),('public','disputes','tournament_id'),
    ('public','disputes','filed_by_club'),('public','disputes','status'),
    -- pit_ratings
    ('public','pit_ratings','club_id'),('public','pit_ratings','season'),
    ('public','pit_ratings','rating'),('public','pit_ratings','league'),
    -- pit_rating_history
    ('public','pit_rating_history','pit_rating_id'),('public','pit_rating_history','match_id'),
    ('public','pit_rating_history','rating_before'),('public','pit_rating_history','delta'),
    -- notifications
    ('public','notifications','user_id'),('public','notifications','type'),
    ('public','notifications','title'),('public','notifications','message'),
    -- subscriptions
    ('public','subscriptions','plan'),('public','subscriptions','status'),
    ('public','subscriptions','amount')
  ) AS t(schema_name, table_name, column_name)
)
SELECT
  'PARTE 8 - NOT NULL' AS check_name,
  e.schema_name || '.' || e.table_name || '.' || e.column_name AS missing_item,
  CASE
    WHEN c.column_name IS NULL THEN 'coluna nao existe'
    ELSE 'coluna permite NULL (deveria ser NOT NULL)'
  END AS detail
FROM expected e
LEFT JOIN information_schema.columns c
  ON c.table_schema  = e.schema_name
  AND c.table_name   = e.table_name
  AND c.column_name  = e.column_name
WHERE c.column_name IS NULL   -- coluna não existe
   OR c.is_nullable = 'YES'   -- coluna existe mas permite NULL
ORDER BY e.schema_name, e.table_name, e.column_name;


-- ============================================================
-- PARTE 9: VIEWS (6 esperadas)
-- Subtask 3.5
-- ============================================================
WITH expected AS (
  SELECT unnest(ARRAY[
    'v_player_stats',
    'v_club_stats',
    'v_player_stats_by_position',
    'v_financial_dashboard',
    'v_club_rankings',
    'v_tournaments_with_entries'
  ]) AS name
)
SELECT
  'PARTE 9 - VIEWS' AS check_name,
  e.name AS missing_item,
  'view nao existe em public' AS detail
FROM expected e
LEFT JOIN pg_catalog.pg_views v
  ON v.schemaname = 'public' AND v.viewname = e.name
WHERE v.viewname IS NULL
ORDER BY e.name;


-- ============================================================
-- PARTE 10: FUNÇÕES (10 esperadas)
-- Subtask 3.5 (triggers + helpers RLS)
-- ============================================================
WITH expected AS (
  SELECT unnest(ARRAY[
    'update_updated_at',
    'fn_handle_new_user',
    'fn_create_trust_score',
    'fn_approve_claim',
    'fn_resolve_position',
    'fn_increment_strike',
    'fn_calculate_elo_delta',
    'has_role',
    'is_admin',
    'is_moderator_or_admin',
    'is_manager_of'
  ]) AS name
)
SELECT
  'PARTE 10 - FUNCOES' AS check_name,
  e.name AS missing_item,
  'funcao nao existe em public' AS detail
FROM expected e
LEFT JOIN pg_proc p ON p.proname = e.name
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
WHERE p.proname IS NULL OR n.nspname IS NULL
ORDER BY e.name;


-- ============================================================
-- PARTE 11: ÍNDICES ESPECIAIS (GIN + Expression)
-- Subtask 3.1–3.4
-- ============================================================
WITH expected AS (
  SELECT * FROM (VALUES
    ('clubs',           'idx_clubs_display_name'),       -- GIN trgm
    ('discovered_clubs','idx_discovered_display_name'),  -- GIN trgm
    ('users',           'idx_users_roles'),              -- GIN array
    ('players',         'idx_players_gamertag'),         -- expression LOWER()
    ('match_players',   'idx_mp_gamertag'),              -- expression LOWER()
    ('discovered_players','idx_disc_players_gamertag'),  -- expression LOWER()
    ('matchmaking_queue','idx_mm_queue_status'),         -- partial (status='waiting')
    ('club_players',    'idx_club_players_club'),        -- partial (is_active=true)
    ('club_players',    'idx_club_players_player'),      -- partial (is_active=true)
    ('players',         'idx_players_free_agent'),       -- partial (is_free_agent=true)
    ('matches',         'idx_matches_timestamp'),        -- DESC
    ('notifications',   'idx_notifications_user'),       -- composite
    ('pit_rating_history','idx_rh_rating')               -- composite + DESC
  ) AS t(table_name, index_name)
)
SELECT
  'PARTE 11 - INDICES' AS check_name,
  e.table_name || '.' || e.index_name AS missing_item,
  'indice nao encontrado' AS detail
FROM expected e
LEFT JOIN pg_indexes i
  ON i.schemaname = 'public'
  AND i.tablename = e.table_name
  AND i.indexname = e.index_name
WHERE i.indexname IS NULL
ORDER BY e.table_name;


-- ============================================================
-- PARTE 12: POLÍTICAS RLS (contagem mínima por tabela)
-- Subtask 3.5
-- ============================================================
WITH expected AS (
  SELECT * FROM (VALUES
    ('users',                1),
    ('players',              1),
    ('clubs',                1),
    ('club_players',         1),
    ('discovered_clubs',     1),
    ('discovered_players',   1),
    ('claims',               1),
    ('matches',              1),
    ('match_players',        1),
    ('lineups',              1),
    ('lineup_players',       1),
    ('matchmaking_queue',    1),
    ('confrontation_chats',  1),
    ('confrontation_messages',1),
    ('tournaments',          1),
    ('tournament_entries',   1),
    ('tournament_brackets',  1),
    ('payments',             1),
    ('trust_scores',         1),
    ('hall_of_fame',         1),
    ('notifications',        1),
    ('disputes',             1),
    ('pit_ratings',          1)
  ) AS t(table_name, min_policies)
),
actual AS (
  SELECT tablename, COUNT(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
)
SELECT
  'PARTE 12 - RLS POLICIES' AS check_name,
  e.table_name AS missing_item,
  'esperado >= ' || e.min_policies || ' policies, encontrado: '
    || COALESCE(a.policy_count::TEXT, '0') AS detail
FROM expected e
LEFT JOIN actual a ON a.tablename = e.table_name
WHERE COALESCE(a.policy_count, 0) < e.min_policies
ORDER BY e.table_name;


-- ============================================================
-- PARTE 13: DEFAULTS CRÍTICOS
-- Subtask 3.1–3.4
-- ============================================================
WITH expected AS (
  SELECT * FROM (VALUES
    ('public','users',            'roles',           'ARRAY[''player''::user_role]'),
    ('public','users',            'is_active',       'true'),
    ('public','players',          'is_free_agent',   'false'),
    ('public','players',          'status',          '''active'''),
    ('public','clubs',            'status',          '''unclaimed''::club_status'),
    ('public','clubs',            'subscription_plan','''free''::subscription_plan'),
    ('public','matches',          'match_type',      '''friendly_external''::match_type'),
    ('public','tournaments',      'format',          '''single_elimination''::tournament_format'),
    ('public','tournaments',      'status',          '''draft''::tournament_status'),
    ('public','trust_scores',     'strikes',         '0'),
    ('public','trust_scores',     'is_trusted',      'true'),
    ('public','pit_ratings',      'rating',          '1500'),
    ('public','pit_ratings',      'is_calibrating',  'true'),
    ('public','matchmaking_queue','status',          '''waiting''::matchmaking_status'),
    ('public','notifications',    'is_read',         'false')
  ) AS t(schema_name, table_name, column_name, expected_default)
)
SELECT
  'PARTE 13 - DEFAULTS' AS check_name,
  e.schema_name || '.' || e.table_name || '.' || e.column_name AS missing_item,
  'sem default definido (esperado: ' || e.expected_default || ')' AS detail
FROM expected e
LEFT JOIN information_schema.columns c
  ON c.table_schema  = e.schema_name
  AND c.table_name   = e.table_name
  AND c.column_name  = e.column_name
WHERE c.column_default IS NULL
ORDER BY e.schema_name, e.table_name, e.column_name;


-- ============================================================
-- PARTE 14: CONTAGEM FINAL (sanidade geral)
-- Deve mostrar os totais encontrados
-- ============================================================
SELECT
  'PARTE 14 - SANIDADE' AS check_name,
  (SELECT COUNT(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public') AS total_tables,
  (SELECT COUNT(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
   WHERE n.nspname = 'public' AND t.typtype = 'e') AS total_enums,
  (SELECT COUNT(*) FROM pg_trigger tg
   JOIN pg_class c ON c.oid = tg.tgrelid
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE NOT tg.tgisinternal AND (n.nspname = 'public' OR n.nspname = 'auth')) AS total_triggers,
  (SELECT COUNT(*) FROM pg_catalog.pg_views WHERE schemaname = 'public') AS total_views,
  (SELECT COUNT(*) FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public') AS total_functions,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') AS total_policies,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') AS total_indexes;
-- Esperado: tables=28, enums=18, triggers=17, views=6, functions>=10, policies>=50, indexes>=40
