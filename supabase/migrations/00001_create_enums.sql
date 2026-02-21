-- ============================================================
-- MIGRATION 00001: ENUMS
-- Executar PRIMEIRO no Supabase SQL Editor
-- ============================================================

-- Roles do sistema (acumulativos)
CREATE TYPE user_role AS ENUM ('player', 'manager', 'moderator', 'admin');

-- Status de reivindicação de time
CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected');

-- Status do time na plataforma
CREATE TYPE club_status AS ENUM ('unclaimed', 'pending', 'active', 'suspended', 'banned');

-- Posições detalhadas (formação 3-5-2)
CREATE TYPE player_position AS ENUM ('GK', 'ZAG', 'VOL', 'MC', 'AE', 'AD', 'ATA');

-- Categorias genéricas da API EA
CREATE TYPE ea_position_category AS ENUM ('goalkeeper', 'defender', 'midfielder', 'forward');

-- Tipo de partida (classificação interna)
CREATE TYPE match_type AS ENUM ('championship', 'friendly_pit', 'friendly_external');

-- Status de matchmaking
CREATE TYPE matchmaking_status AS ENUM ('waiting', 'matched', 'confirmed', 'expired', 'cancelled');

-- Status de chat de confronto
CREATE TYPE confrontation_status AS ENUM ('active', 'confirmed', 'expired', 'cancelled');

-- Status de pagamento
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded', 'overdue', 'cancelled');

-- Tipo de torneio
CREATE TYPE tournament_type AS ENUM ('corujao', 'league');

-- Formato de torneio
CREATE TYPE tournament_format AS ENUM ('single_elimination', 'group_stage_then_knockout', 'round_robin');

-- Status de torneio
CREATE TYPE tournament_status AS ENUM ('draft', 'open', 'confirmed', 'in_progress', 'finished', 'cancelled');

-- Tipo de premiação Hall of Fame
CREATE TYPE hall_of_fame_award AS ENUM (
  'champion', 'mvp_final', 'top_scorer', 'top_assister',
  'pitbull', 'muralha', 'best_avg_rating'
);

-- Status de disputa W.O. (Fase 2)
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved_wo', 'resolved_no_wo', 'dismissed');

-- Ligas do Pit Rating (Fase 2)
CREATE TYPE pit_league AS ENUM ('access', 'bronze', 'silver', 'gold', 'elite');

-- Status de assinatura (Fase 2)
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'past_due');

-- Plano de assinatura (Fase 2)
CREATE TYPE subscription_plan AS ENUM ('free', 'premium_player', 'premium_team');

-- Tipo de notificação
CREATE TYPE notification_type AS ENUM (
  'claim_approved', 'claim_rejected', 'match_found', 'match_expired',
  'tournament_confirmed', 'tournament_cancelled', 'payment_due',
  'payment_overdue', 'team_discovered', 'dispute_update',
  'roster_invite', 'general'
);
