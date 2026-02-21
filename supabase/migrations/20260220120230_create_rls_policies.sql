-- ============================================================
-- MIGRATION 00015: RLS POLICIES + HELPER FUNCTIONS
-- Depende de: todas as tabelas anteriores (00001-00014B)
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovered_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovered_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineup_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confrontation_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confrontation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pit_ratings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS para verificação de role
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND required_role = ANY(roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.has_role('admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND (roles && ARRAY['moderator'::user_role, 'admin'::user_role])
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_manager_of(club UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs
    WHERE id = club AND manager_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- POLICIES: users
-- ============================================================
CREATE POLICY "Users: leitura publica" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users: atualiza proprio" ON public.users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users: admin gerencia" ON public.users
  FOR ALL USING (public.is_admin());

-- ============================================================
-- POLICIES: players
-- ============================================================
CREATE POLICY "Players: leitura publica" ON public.players
  FOR SELECT USING (true);

CREATE POLICY "Players: cria proprio" ON public.players
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Players: atualiza proprio" ON public.players
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Players: admin gerencia" ON public.players
  FOR ALL USING (public.is_admin());

-- ============================================================
-- POLICIES: clubs
-- ============================================================
CREATE POLICY "Clubs: leitura publica" ON public.clubs
  FOR SELECT USING (true);

CREATE POLICY "Clubs: manager atualiza" ON public.clubs
  FOR UPDATE USING (manager_id = auth.uid());

CREATE POLICY "Clubs: admin/mod gerencia" ON public.clubs
  FOR ALL USING (public.is_moderator_or_admin());

-- ============================================================
-- POLICIES: club_players
-- ============================================================
CREATE POLICY "Club Players: leitura publica" ON public.club_players
  FOR SELECT USING (true);

CREATE POLICY "Club Players: manager do time gerencia" ON public.club_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_players.club_id
      AND clubs.manager_id = auth.uid()
    )
  );

-- ============================================================
-- POLICIES: discovered_clubs / discovered_players
-- ============================================================
CREATE POLICY "Discovered: leitura publica" ON public.discovered_clubs
  FOR SELECT USING (true);

CREATE POLICY "Discovered: admin gerencia" ON public.discovered_clubs
  FOR ALL USING (public.is_admin());

CREATE POLICY "Disc Players: leitura publica" ON public.discovered_players
  FOR SELECT USING (true);

CREATE POLICY "Disc Players: admin gerencia" ON public.discovered_players
  FOR ALL USING (public.is_admin());

-- ============================================================
-- POLICIES: claims
-- ============================================================
CREATE POLICY "Claims: user ve proprias" ON public.claims
  FOR SELECT USING (user_id = auth.uid() OR public.is_moderator_or_admin());

CREATE POLICY "Claims: user cria" ON public.claims
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Claims: mod/admin review" ON public.claims
  FOR UPDATE USING (public.is_moderator_or_admin());

-- ============================================================
-- POLICIES: matches + match_players
-- ============================================================
CREATE POLICY "Matches: leitura publica" ON public.matches
  FOR SELECT USING (true);

CREATE POLICY "Matches: sistema insere" ON public.matches
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Match Players: leitura publica" ON public.match_players
  FOR SELECT USING (true);

CREATE POLICY "Match Players: sistema insere" ON public.match_players
  FOR INSERT WITH CHECK (public.is_admin());

-- ============================================================
-- POLICIES: lineups
-- ============================================================
CREATE POLICY "Lineups: leitura elenco/admin" ON public.lineups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.club_players cp
      JOIN public.players p ON p.id = cp.player_id
      WHERE cp.club_id = lineups.club_id AND p.user_id = auth.uid() AND cp.is_active
    )
    OR public.is_moderator_or_admin()
  );

CREATE POLICY "Lineups: manager gerencia" ON public.lineups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = lineups.club_id AND clubs.manager_id = auth.uid()
    )
  );

-- ============================================================
-- POLICIES: lineup_players
-- ============================================================
CREATE POLICY "Lineup Players: leitura elenco/admin" ON public.lineup_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lineups l
      JOIN public.club_players cp ON cp.club_id = l.club_id
      JOIN public.players p ON p.id = cp.player_id
      WHERE l.id = lineup_players.lineup_id AND p.user_id = auth.uid() AND cp.is_active
    )
    OR public.is_moderator_or_admin()
  );

CREATE POLICY "Lineup Players: manager gerencia" ON public.lineup_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.lineups l
      JOIN public.clubs c ON c.id = l.club_id
      WHERE l.id = lineup_players.lineup_id AND c.manager_id = auth.uid()
    )
  );

-- ============================================================
-- POLICIES: matchmaking
-- ============================================================
CREATE POLICY "MM Queue: leitura geral" ON public.matchmaking_queue
  FOR SELECT USING (true);

CREATE POLICY "MM Queue: manager do time" ON public.matchmaking_queue
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = matchmaking_queue.club_id AND clubs.manager_id = auth.uid()
    )
  );

-- ============================================================
-- POLICIES: confrontation_chats + messages
-- ============================================================
CREATE POLICY "Chats: participantes" ON public.confrontation_chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE (clubs.id = confrontation_chats.club_a_id OR clubs.id = confrontation_chats.club_b_id)
      AND clubs.manager_id = auth.uid()
    )
    OR public.is_moderator_or_admin()
  );

CREATE POLICY "Messages: participantes leem" ON public.confrontation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.confrontation_chats cc
      JOIN public.clubs c ON (c.id = cc.club_a_id OR c.id = cc.club_b_id)
      WHERE cc.id = confrontation_messages.chat_id AND c.manager_id = auth.uid()
    )
  );

CREATE POLICY "Messages: participantes enviam" ON public.confrontation_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- ============================================================
-- POLICIES: tournaments + entries + brackets
-- ============================================================
CREATE POLICY "Tournaments: leitura publica" ON public.tournaments
  FOR SELECT USING (true);

CREATE POLICY "Tournaments: mod/admin gerencia" ON public.tournaments
  FOR ALL USING (public.is_moderator_or_admin());

CREATE POLICY "Entries: leitura publica" ON public.tournament_entries
  FOR SELECT USING (true);

CREATE POLICY "Entries: manager inscreve" ON public.tournament_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = tournament_entries.club_id AND clubs.manager_id = auth.uid()
    )
  );

CREATE POLICY "Brackets: leitura publica" ON public.tournament_brackets
  FOR SELECT USING (true);

CREATE POLICY "Brackets: mod/admin gerencia" ON public.tournament_brackets
  FOR ALL USING (public.is_moderator_or_admin());

-- ============================================================
-- POLICIES: payments
-- ============================================================
CREATE POLICY "Payments: user ve proprios" ON public.payments
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Payments: admin total" ON public.payments
  FOR ALL USING (public.is_admin());

-- ============================================================
-- POLICIES: trust_scores
-- ============================================================
CREATE POLICY "Trust: leitura pelo manager" ON public.trust_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = trust_scores.club_id AND clubs.manager_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Trust: admin gerencia" ON public.trust_scores
  FOR ALL USING (public.is_admin());

-- ============================================================
-- POLICIES: hall_of_fame
-- ============================================================
CREATE POLICY "HoF: leitura publica" ON public.hall_of_fame
  FOR SELECT USING (true);

CREATE POLICY "HoF: sistema insere" ON public.hall_of_fame
  FOR INSERT WITH CHECK (public.is_moderator_or_admin());

-- ============================================================
-- POLICIES: notifications
-- ============================================================
CREATE POLICY "Notif: user ve proprias" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Notif: user marca lida" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- POLICIES: disputes (Fase 2)
-- ============================================================
CREATE POLICY "Disputes: participantes + mod" ON public.disputes
  FOR SELECT USING (
    filed_by_user = auth.uid()
    OR EXISTS (SELECT 1 FROM public.clubs WHERE clubs.id = disputes.against_club AND clubs.manager_id = auth.uid())
    OR public.is_moderator_or_admin()
  );

CREATE POLICY "Disputes: manager cria" ON public.disputes
  FOR INSERT WITH CHECK (filed_by_user = auth.uid());

CREATE POLICY "Disputes: mod/admin resolve" ON public.disputes
  FOR UPDATE USING (public.is_moderator_or_admin());

-- ============================================================
-- POLICIES: pit_ratings (Fase 2)
-- ============================================================
CREATE POLICY "Ratings: leitura publica" ON public.pit_ratings
  FOR SELECT USING (true);

CREATE POLICY "Ratings: sistema gerencia" ON public.pit_ratings
  FOR ALL USING (public.is_admin());
