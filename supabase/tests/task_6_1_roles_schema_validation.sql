-- ============================================================
-- P.I.T - Task 6.1 Validation (Schema roles array em users)
-- ============================================================
-- Como usar:
-- 1) Aplique migrations ate 20260221133000_task6_1_users_roles_array.sql
-- 2) Execute este arquivo no Supabase SQL Editor
-- 3) Blocos de validacao retornam 0 linhas quando estiver tudo correto
-- ============================================================

-- ------------------------------------------------------------
-- PARTE 1: Estrutura da coluna users.roles
-- ------------------------------------------------------------
SELECT
  'PARTE 1 - users.roles' AS check_name,
  'public.users.roles' AS missing_item,
  'coluna roles nao existe' AS detail
WHERE NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'roles'
);

SELECT
  'PARTE 1B - users.roles tipo' AS check_name,
  'public.users.roles' AS missing_item,
  'tipo esperado: ARRAY de user_role' AS detail
WHERE EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'roles'
    AND NOT (
      udt_schema = 'public'
      AND udt_name = '_user_role'
      AND data_type = 'ARRAY'
    )
);

SELECT
  'PARTE 1C - users.roles not null' AS check_name,
  'public.users.roles' AS missing_item,
  'coluna roles permite NULL' AS detail
WHERE EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'roles'
    AND is_nullable = 'YES'
);

-- ------------------------------------------------------------
-- PARTE 2: Index e trigger esperados
-- ------------------------------------------------------------
SELECT
  'PARTE 2 - indice roles' AS check_name,
  'public.idx_users_roles' AS missing_item,
  'indice GIN para roles nao encontrado' AS detail
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'users'
    AND indexname = 'idx_users_roles'
);

SELECT
  'PARTE 2B - trigger sync manager role' AS check_name,
  'public.trg_clubs_sync_manager_role' AS missing_item,
  'trigger nao encontrado em public.clubs' AS detail
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_trigger tg
  JOIN pg_class c ON c.oid = tg.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT tg.tgisinternal
    AND n.nspname = 'public'
    AND c.relname = 'clubs'
    AND tg.tgname = 'trg_clubs_sync_manager_role'
);

-- ------------------------------------------------------------
-- PARTE 3: Teste funcional (transacional)
-- ------------------------------------------------------------
BEGIN;

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
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-0000000006a1',
  'authenticated',
  'authenticated',
  'task6_1_manager@pit.local',
  'not_used',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.users
SET roles = ARRAY['player'::user_role]
WHERE id = '00000000-0000-0000-0000-0000000006a1';

INSERT INTO public.clubs (
  id,
  ea_club_id,
  ea_name_raw,
  display_name,
  manager_id,
  status
) VALUES (
  '20000000-0000-0000-0000-0000000006a1',
  'task6_1_club',
  'Task 6.1 Club',
  'Task 6.1 Club',
  '00000000-0000-0000-0000-0000000006a1',
  'active'
)
ON CONFLICT (id) DO UPDATE
SET manager_id = EXCLUDED.manager_id,
    status = EXCLUDED.status;

SELECT
  'PARTE 3 - manager role append' AS check_name,
  'public.users.roles' AS missing_item,
  'usuario manager nao contem role manager apos clube ativo' AS detail
WHERE NOT EXISTS (
  SELECT 1
  FROM public.users
  WHERE id = '00000000-0000-0000-0000-0000000006a1'
    AND 'manager'::user_role = ANY(roles)
    AND 'player'::user_role = ANY(roles)
);

ROLLBACK;
