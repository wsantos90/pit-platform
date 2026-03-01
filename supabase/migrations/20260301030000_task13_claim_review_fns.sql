-- ============================================================
-- MIGRATION TASK 13.2: CLAIM REVIEW RPCs (approve/reject)
-- ============================================================

-- Aprovacao/rejeicao passam a ser feitas por RPC atomica.
-- Remove o trigger legado para evitar efeitos duplicados.
DROP TRIGGER IF EXISTS trg_claim_approved ON public.claims;
DROP FUNCTION IF EXISTS public.fn_approve_claim();

-- ------------------------------------------------------------
-- fn_approve_claim(p_claim_id, p_reviewer_id)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_approve_claim(
  p_claim_id UUID,
  p_reviewer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim_id UUID;
  v_claim_user_id UUID;
  v_discovered_club_id UUID;
  v_claim_status claim_status;
  v_ea_club_id TEXT;
  v_ea_name_raw TEXT;
  v_display_name TEXT;
  v_club_id UUID;
BEGIN
  SELECT
    c.id,
    c.user_id,
    c.discovered_club_id,
    c.status,
    dc.ea_club_id,
    dc.ea_name_raw,
    dc.display_name
  INTO
    v_claim_id,
    v_claim_user_id,
    v_discovered_club_id,
    v_claim_status,
    v_ea_club_id,
    v_ea_name_raw,
    v_display_name
  FROM public.claims c
  JOIN public.discovered_clubs dc ON dc.id = c.discovered_club_id
  WHERE c.id = p_claim_id
  FOR UPDATE OF c, dc;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'claim_not_found';
  END IF;

  IF v_claim_status <> 'pending' THEN
    RAISE EXCEPTION 'claim_not_pending';
  END IF;

  INSERT INTO public.clubs (
    ea_club_id,
    ea_name_raw,
    display_name,
    manager_id,
    status
  )
  VALUES (
    v_ea_club_id,
    v_ea_name_raw,
    v_display_name,
    v_claim_user_id,
    'active'
  )
  ON CONFLICT (ea_club_id)
  DO UPDATE
    SET manager_id = EXCLUDED.manager_id,
        status = 'active',
        updated_at = now()
  RETURNING id INTO v_club_id;

  UPDATE public.discovered_clubs
  SET status = 'active',
      claimed_by = v_claim_user_id,
      promoted_to_club_id = v_club_id
  WHERE id = v_discovered_club_id;

  UPDATE public.claims
  SET status = 'approved',
      reviewed_by = p_reviewer_id,
      reviewed_at = now(),
      rejection_reason = NULL
  WHERE id = v_claim_id;

  UPDATE public.users
  SET roles = CASE
      WHEN 'manager'::user_role = ANY(roles) THEN roles
      ELSE array_append(roles, 'manager'::user_role)
    END
  WHERE id = v_claim_user_id;

  RETURN jsonb_build_object(
    'club_id', v_club_id,
    'user_id', v_claim_user_id,
    'club_name', v_display_name
  );
END;
$$;

-- ------------------------------------------------------------
-- fn_reject_claim(p_claim_id, p_reviewer_id, p_rejection_reason)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_reject_claim(
  p_claim_id UUID,
  p_reviewer_id UUID,
  p_rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim_id UUID;
  v_claim_user_id UUID;
  v_discovered_club_id UUID;
  v_claim_status claim_status;
BEGIN
  SELECT
    c.id,
    c.user_id,
    c.discovered_club_id,
    c.status
  INTO
    v_claim_id,
    v_claim_user_id,
    v_discovered_club_id,
    v_claim_status
  FROM public.claims c
  WHERE c.id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'claim_not_found';
  END IF;

  IF v_claim_status <> 'pending' THEN
    RAISE EXCEPTION 'claim_not_pending';
  END IF;

  UPDATE public.discovered_clubs
  SET status = 'unclaimed',
      claimed_by = NULL
  WHERE id = v_discovered_club_id;

  UPDATE public.claims
  SET status = 'rejected',
      rejection_reason = p_rejection_reason,
      reviewed_by = p_reviewer_id,
      reviewed_at = now()
  WHERE id = v_claim_id;

  RETURN jsonb_build_object(
    'user_id', v_claim_user_id,
    'discovered_club_id', v_discovered_club_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_approve_claim(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_reject_claim(UUID, UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.fn_approve_claim(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_reject_claim(UUID, UUID, TEXT) TO authenticated, service_role;
