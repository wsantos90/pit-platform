-- ============================================================
-- MIGRATION 00020: TASK 6.1 - USERS.ROLES ARRAY
-- Depende de: 00002 (users), 00016 (triggers base)
-- ============================================================

-- Garantir coluna roles em bases legadas (quando havia coluna role singular)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS roles user_role[];

    EXECUTE $sql$
      UPDATE public.users
      SET roles = CASE role::text
        WHEN 'admin' THEN ARRAY['player','manager','moderator','admin']::user_role[]
        WHEN 'moderator' THEN ARRAY['player','manager','moderator']::user_role[]
        WHEN 'manager' THEN ARRAY['player','manager']::user_role[]
        ELSE ARRAY['player']::user_role[]
      END
      WHERE roles IS NULL OR cardinality(roles) = 0
    $sql$;

    ALTER TABLE public.users
      DROP COLUMN role;
  END IF;
END;
$$;

-- Normalizar dados e defaults
UPDATE public.users
SET roles = ARRAY['player'::user_role]
WHERE roles IS NULL OR cardinality(roles) = 0;

ALTER TABLE public.users
  ALTER COLUMN roles SET DEFAULT ARRAY['player'::user_role],
  ALTER COLUMN roles SET NOT NULL;

-- Index para queries por role
CREATE INDEX IF NOT EXISTS idx_users_roles ON public.users USING GIN (roles);

-- Garantia extra: quando clube vira ativo com manager_id, promover role manager
CREATE OR REPLACE FUNCTION public.fn_sync_manager_role_from_club()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.manager_id IS NULL OR NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  UPDATE public.users
  SET roles = CASE
    WHEN 'manager'::user_role = ANY(roles) THEN roles
    ELSE array_append(roles, 'manager'::user_role)
  END
  WHERE id = NEW.manager_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_clubs_sync_manager_role ON public.clubs;

CREATE TRIGGER trg_clubs_sync_manager_role
  AFTER INSERT OR UPDATE OF manager_id, status ON public.clubs
  FOR EACH ROW
  WHEN (NEW.manager_id IS NOT NULL)
  EXECUTE FUNCTION public.fn_sync_manager_role_from_club();
