-- ============================================================
-- MIGRATION 00019: Criar registro em players via trigger no signup
--
-- Problema: fn_handle_new_user criava apenas o registro em public.users.
-- O registro em public.players dependia de ensurePlayerProfile() ser chamado
-- pela aplicação, o que não ocorria quando confirmação de email estava ativa
-- (signUpData.session === null no register/page.tsx).
--
-- Solução: expandir fn_handle_new_user para também criar o registro em
-- public.players quando ea_gamertag estiver presente no user_metadata.
-- A função roda como SECURITY DEFINER, então bypassa RLS sem precisar de
-- sessão ativa — funciona mesmo com confirmação de email habilitada.
--
-- Dependências: 00002 (players), 00016 (fn_handle_new_user)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_gamertag TEXT;
BEGIN
  -- Criar registro em public.users (comportamento original)
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  -- Criar registro em public.players se ea_gamertag estiver presente no metadata
  v_gamertag := TRIM(COALESCE(NEW.raw_user_meta_data->>'ea_gamertag', ''));
  IF v_gamertag != '' THEN
    INSERT INTO public.players (user_id, ea_gamertag, primary_position)
    VALUES (NEW.id, v_gamertag, 'MC')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
