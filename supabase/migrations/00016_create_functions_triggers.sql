-- ============================================================
-- MIGRATION 00016: FUNCTIONS + TRIGGERS
-- P.I.T — Performance · Intelligence · Tracking
-- ============================================================

-- ============================================================
-- FUNCTION: Auto-criar trust_score quando club fica active
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_create_trust_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    INSERT INTO public.trust_scores (club_id)
    VALUES (NEW.id)
    ON CONFLICT (club_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_club_create_trust
  AFTER UPDATE OF status ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.fn_create_trust_score();

-- ============================================================
-- FUNCTION: Quando claim é aprovado → promover time
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_approve_claim()
RETURNS TRIGGER AS $$
DECLARE
  v_club_id UUID;
  v_dc RECORD;
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Buscar discovered_club
    SELECT * INTO v_dc FROM public.discovered_clubs WHERE id = NEW.discovered_club_id;

    -- Criar ou atualizar club ativo
    INSERT INTO public.clubs (ea_club_id, ea_name_raw, display_name, manager_id, status)
    VALUES (v_dc.ea_club_id, v_dc.ea_name_raw, v_dc.display_name, NEW.user_id, 'active')
    ON CONFLICT (ea_club_id)
    DO UPDATE SET manager_id = NEW.user_id, status = 'active', updated_at = now()
    RETURNING id INTO v_club_id;

    -- Atualizar discovered_club
    UPDATE public.discovered_clubs
    SET status = 'active', claimed_by = NEW.user_id, promoted_to_club_id = v_club_id
    WHERE id = NEW.discovered_club_id;

    -- Adicionar role 'manager' ao usuário se não tiver
    UPDATE public.users
    SET roles = array_append(roles, 'manager')
    WHERE id = NEW.user_id AND NOT ('manager' = ANY(roles));

    -- Criar player como membro do time (manager é jogador do time)
    INSERT INTO public.club_players (club_id, player_id, role_in_club)
    SELECT v_club_id, p.id, 'manager'
    FROM public.players p WHERE p.user_id = NEW.user_id
    ON CONFLICT DO NOTHING;

    -- Criar notificação
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (NEW.user_id, 'claim_approved', 'Time vinculado!',
      'Seu time ' || v_dc.display_name || ' foi aprovado e vinculado à sua conta.',
      jsonb_build_object('club_id', v_club_id, 'club_name', v_dc.display_name));
  END IF;

  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- Liberar o time para novo claim
    UPDATE public.discovered_clubs
    SET status = 'unclaimed', claimed_by = NULL
    WHERE id = NEW.discovered_club_id;

    -- Notificar rejeição
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (NEW.user_id, 'claim_rejected', 'Reivindicação rejeitada',
      COALESCE('Motivo: ' || NEW.rejection_reason, 'Sua reivindicação foi rejeitada. Tente novamente.'),
      jsonb_build_object('claim_id', NEW.id));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_claim_approved
  AFTER UPDATE OF status ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.fn_approve_claim();

-- ============================================================
-- FUNCTION: Resolver posição detalhada do jogador
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_resolve_position(
  p_ea_position ea_position_category,
  p_primary_pos player_position,
  p_secondary_pos player_position
) RETURNS player_position AS $$
DECLARE
  pos_map JSONB := '{
    "goalkeeper": ["GK"],
    "defender": ["ZAG"],
    "midfielder": ["VOL", "MC", "AE", "AD"],
    "forward": ["ATA"]
  }'::JSONB;
  valid_positions TEXT[];
BEGIN
  -- Extrair posições válidas para a categoria da API
  SELECT array_agg(value::TEXT)
  INTO valid_positions
  FROM jsonb_array_elements_text(pos_map -> p_ea_position::TEXT);

  -- Se posição primária é válida para esta categoria → retorna primária
  IF p_primary_pos::TEXT = ANY(valid_positions) THEN
    RETURN p_primary_pos;
  END IF;

  -- Se posição secundária é válida para esta categoria → retorna secundária
  IF p_secondary_pos IS NOT NULL AND p_secondary_pos::TEXT = ANY(valid_positions) THEN
    RETURN p_secondary_pos;
  END IF;

  -- Fallback: primeira posição válida da categoria
  RETURN valid_positions[1]::player_position;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- FUNCTION: Incrementar strike no trust score
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_increment_strike(p_club_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_strikes SMALLINT;
BEGIN
  SELECT strikes INTO v_current_strikes
  FROM public.trust_scores WHERE club_id = p_club_id;

  IF v_current_strikes IS NULL THEN RETURN; END IF;

  v_current_strikes := v_current_strikes + 1;

  UPDATE public.trust_scores SET
    strikes = v_current_strikes,
    last_strike_at = now(),
    is_trusted = CASE WHEN v_current_strikes >= 1 THEN false ELSE true END,
    suspended_until = CASE
      WHEN v_current_strikes = 2 THEN now() + INTERVAL '1 month'
      ELSE suspended_until
    END,
    banned_until = CASE
      WHEN v_current_strikes >= 3 THEN '2099-12-31'::TIMESTAMPTZ
      ELSE banned_until
    END
  WHERE club_id = p_club_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Calcular Pit Rating delta (Fase 2 — ELO)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_calculate_elo_delta(
  p_rating_a INTEGER,
  p_rating_b INTEGER,
  p_result DECIMAL,
  p_is_calibrating BOOLEAN
) RETURNS INTEGER AS $$
DECLARE
  k_factor INTEGER := CASE WHEN p_is_calibrating THEN 64 ELSE 32 END;
  expected DECIMAL;
  delta INTEGER;
BEGIN
  expected := 1.0 / (1.0 + POWER(10, (p_rating_b - p_rating_a)::DECIMAL / 400));
  delta := ROUND(k_factor * (p_result - expected));
  RETURN delta;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
