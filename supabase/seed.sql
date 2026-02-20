-- ============================================================
-- SEED: Dados iniciais obrigatórios
-- P.I.T — Performance · Intelligence · Tracking
-- ============================================================

-- Admin PIT (Wander) — o id vem do auth.users após cadastro
-- Executar APÓS o primeiro cadastro via UI e pegar o UUID
-- UPDATE public.users SET roles = '{player, manager, moderator, admin}' WHERE email = 'wander@pit.gg';

-- Posições de referência (informativo — usadas como ENUM)
-- GK = Goleiro | ZAG = Zagueiro | VOL = Volante | MC = Meia Central
-- AE = Ala Esquerdo | AD = Ala Direito | ATA = Atacante

-- Season inicial
-- INSERT INTO public.pit_ratings ... quando Fase 2 for implementada
