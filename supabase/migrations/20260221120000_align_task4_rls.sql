-- ============================================================
-- MIGRATION 00018: TASK 4 - RLS ALIGNMENT (4.1 -> 4.6)
-- Ajusta politicas de players, clubs, claims, matches e payments/financial
-- ============================================================

-- ============================================================
-- SUPPORT: helper para validar se auth.uid() gerencia um player
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_manager_of_player(p_player_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_players cp
    JOIN public.clubs c ON c.id = cp.club_id
    WHERE cp.player_id = p_player_id
      AND cp.is_active = true
      AND c.manager_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================
-- MATCHES: adicionar flag de visibilidade publica para RLS por role
-- ============================================================
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_matches_is_public ON public.matches (is_public);

-- Regra inicial: friendly_pit privado; demais publicos
UPDATE public.matches
SET is_public = CASE
  WHEN match_type = 'friendly_pit' THEN false
  ELSE true
END
WHERE is_public IS DISTINCT FROM CASE
  WHEN match_type = 'friendly_pit' THEN false
  ELSE true
END;

-- ============================================================
-- PLAYERS (4.1)
-- ============================================================
DROP POLICY IF EXISTS "Players: leitura publica" ON public.players;
DROP POLICY IF EXISTS "Players: cria proprio" ON public.players;
DROP POLICY IF EXISTS "Players: atualiza proprio" ON public.players;
DROP POLICY IF EXISTS "Players: admin gerencia" ON public.players;

CREATE POLICY "Players: select by role" ON public.players
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_manager_of_player(id)
    OR public.is_moderator_or_admin()
  );

CREATE POLICY "Players: insert own or elevated" ON public.players
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR public.is_moderator_or_admin()
  );

CREATE POLICY "Players: update by role" ON public.players
  FOR UPDATE USING (
    user_id = auth.uid()
    OR public.is_manager_of_player(id)
    OR public.is_moderator_or_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_manager_of_player(id)
    OR public.is_moderator_or_admin()
  );

CREATE POLICY "Players: delete by role" ON public.players
  FOR DELETE USING (
    user_id = auth.uid()
    OR public.is_manager_of_player(id)
    OR public.is_moderator_or_admin()
  );

-- ============================================================
-- CLUBS (4.2)
-- ============================================================
DROP POLICY IF EXISTS "Clubs: leitura publica" ON public.clubs;
DROP POLICY IF EXISTS "Clubs: manager atualiza" ON public.clubs;
DROP POLICY IF EXISTS "Clubs: admin/mod gerencia" ON public.clubs;

CREATE POLICY "Clubs: select by role" ON public.clubs
  FOR SELECT USING (
    manager_id = auth.uid()
    OR public.is_moderator_or_admin()
  );

CREATE POLICY "Clubs: insert by role" ON public.clubs
  FOR INSERT WITH CHECK (
    manager_id = auth.uid()
    OR public.is_moderator_or_admin()
  );

CREATE POLICY "Clubs: update by role" ON public.clubs
  FOR UPDATE USING (
    manager_id = auth.uid()
    OR public.is_moderator_or_admin()
  )
  WITH CHECK (
    manager_id = auth.uid()
    OR public.is_moderator_or_admin()
  );

CREATE POLICY "Clubs: delete by role" ON public.clubs
  FOR DELETE USING (
    manager_id = auth.uid()
    OR public.is_moderator_or_admin()
  );

-- ============================================================
-- CLAIMS (4.3)
-- ============================================================
DROP POLICY IF EXISTS "Claims: user ve proprias" ON public.claims;
DROP POLICY IF EXISTS "Claims: user cria" ON public.claims;
DROP POLICY IF EXISTS "Claims: mod/admin review" ON public.claims;

CREATE POLICY "Claims: select by role" ON public.claims
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_moderator_or_admin()
  );

CREATE POLICY "Claims: insert by role" ON public.claims
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR public.is_moderator_or_admin()
  );

CREATE POLICY "Claims: update by role" ON public.claims
  FOR UPDATE USING (
    (user_id = auth.uid() AND status = 'pending')
    OR public.is_moderator_or_admin()
  )
  WITH CHECK (
    (user_id = auth.uid() AND status = 'pending')
    OR public.is_moderator_or_admin()
  );

CREATE POLICY "Claims: delete by role" ON public.claims
  FOR DELETE USING (
    (user_id = auth.uid() AND status = 'pending')
    OR public.is_moderator_or_admin()
  );

-- ============================================================
-- MATCHES (4.4)
-- ============================================================
DROP POLICY IF EXISTS "Matches: leitura publica" ON public.matches;
DROP POLICY IF EXISTS "Matches: sistema insere" ON public.matches;

CREATE POLICY "Matches: select by visibility and role" ON public.matches
  FOR SELECT USING (
    is_public = true
    OR public.is_moderator_or_admin()
    OR EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.manager_id = auth.uid()
        AND (c.id = matches.home_club_id OR c.id = matches.away_club_id)
    )
  );

CREATE POLICY "Matches: mod/admin insert" ON public.matches
  FOR INSERT WITH CHECK (public.is_moderator_or_admin());

CREATE POLICY "Matches: mod/admin update" ON public.matches
  FOR UPDATE USING (public.is_moderator_or_admin())
  WITH CHECK (public.is_moderator_or_admin());

CREATE POLICY "Matches: mod/admin delete" ON public.matches
  FOR DELETE USING (public.is_moderator_or_admin());

-- ============================================================
-- PAYMENTS + FINANCIAL (4.5)
-- service_role bypassa RLS por padrao; usuarios comuns devem receber DENY
-- ============================================================
DROP POLICY IF EXISTS "Payments: user ve proprios" ON public.payments;
DROP POLICY IF EXISTS "Payments: admin total" ON public.payments;

CREATE POLICY "Payments: deny all user roles" ON public.payments
  FOR ALL USING (false)
  WITH CHECK (false);

-- Garantir que a view financeira respeite o contexto do usuario executor
ALTER VIEW public.v_financial_dashboard SET (security_invoker = true);
REVOKE ALL ON TABLE public.v_financial_dashboard FROM anon, authenticated;
GRANT SELECT ON TABLE public.v_financial_dashboard TO service_role;
