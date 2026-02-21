-- ============================================================
-- SEED: Dados iniciais da plataforma P.I.T
-- Executar APÓS todas as migrations
-- ============================================================

-- IMPORTANTE: O admin user deve ser criado via Supabase Auth (SQL Editor ou Dashboard)
-- Após criar o user no Auth, atualizar o role aqui:
--
-- UPDATE public.users
-- SET roles = '{player, manager, moderator, admin}'
-- WHERE email = 'seu-email-admin@exemplo.com';

-- ============================================================
-- Nenhum dado seed obrigatório por ora.
-- O sistema é auto-suficiente:
-- - Usuários são criados via trigger on_auth_user_created
-- - Times são descobertos via Discovery snowball
-- - Torneios são criados pelo admin via dashboard
-- ============================================================

-- Opcional: Se quiser inserir um discovered_club de teste
-- INSERT INTO public.discovered_clubs (ea_club_id, ea_name_raw, display_name)
-- VALUES ('test_club_001', 'Test FC', 'Test FC')
-- ON CONFLICT (ea_club_id) DO NOTHING;
