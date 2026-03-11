/**
 * Database Types — Gerado a partir do Schema doc
 *
 * Princípio SSOT: Estes tipos refletem 1:1 a estrutura do banco.
 * Em produção, usar `supabase gen types typescript` para gerar automaticamente.
 *
 * TODO: Substituir por tipos auto-gerados via Supabase CLI após db push.
 */

// ============================================================
// ENUMS
// ============================================================
export type UserRole = 'player' | 'manager' | 'moderator' | 'admin';
export type ClaimStatus = 'pending' | 'approved' | 'rejected';
export type ClubStatus = 'unclaimed' | 'pending' | 'active' | 'suspended' | 'banned';
export type PlayerPosition = 'GK' | 'ZAG' | 'VOL' | 'MC' | 'AE' | 'AD' | 'ATA';
export type EaPositionCategory = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
export type MatchType = 'championship' | 'friendly_pit' | 'friendly_external';
export type MatchmakingStatus = 'waiting' | 'matched' | 'confirmed' | 'expired' | 'cancelled';
export type ConfrontationStatus = 'active' | 'confirmed' | 'expired' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'overdue' | 'cancelled';
export type TournamentType = 'corujao' | 'league';
export type TournamentFormat = 'single_elimination' | 'group_stage_then_knockout' | 'round_robin';
export type TournamentStatus = 'draft' | 'open' | 'confirmed' | 'in_progress' | 'finished' | 'cancelled';
export type HallOfFameAward =
    | 'champion' | 'mvp_final' | 'top_scorer' | 'top_assister'
    | 'pitbull' | 'muralha' | 'best_avg_rating';
export type DisputeStatus = 'open' | 'under_review' | 'resolved_wo' | 'resolved_no_wo' | 'dismissed';
export type PitLeague = 'access' | 'bronze' | 'silver' | 'gold' | 'elite';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due';
export type SubscriptionPlan = 'free' | 'premium_player' | 'premium_team';
export type NotificationType =
    | 'claim_approved' | 'claim_rejected' | 'match_found' | 'match_expired'
    | 'tournament_confirmed' | 'tournament_cancelled' | 'payment_due'
    | 'payment_overdue' | 'team_discovered' | 'dispute_update'
    | 'roster_invite' | 'general';

// ============================================================
// TABLE TYPES
// ============================================================

export interface User {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    roles: UserRole[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Player {
    id: string;
    user_id: string;
    ea_gamertag: string;
    primary_position: PlayerPosition;
    secondary_position: PlayerPosition | null;
    bio: string | null;
    is_free_agent: boolean;
    status: 'active' | 'inactive' | 'banned';
    created_at: string;
    updated_at: string;
}

export interface Club {
    id: string;
    ea_club_id: string;
    ea_name_raw: string;
    display_name: string;
    manager_id: string | null;
    logo_url: string | null;
    status: ClubStatus;
    subscription_plan: SubscriptionPlan;
    created_at: string;
    updated_at: string;
    last_scanned_at: string | null;
}

export interface ClubPlayer {
    id: string;
    club_id: string;
    player_id: string;
    joined_at: string;
    left_at: string | null;
    is_active: boolean;
    role_in_club: 'player' | 'captain' | 'manager';
}

export interface DiscoveredClub {
    id: string;
    ea_club_id: string;
    ea_name_raw: string;
    display_name: string;
    discovered_at: string;
    discovered_via: string | null;
    last_scanned_at: string | null;
    scan_count: number;
    claimed_by: string | null;
    status: ClubStatus;
    promoted_to_club_id: string | null;
}

export interface DiscoveredPlayer {
    id: string;
    ea_gamertag: string;
    last_seen_club: string | null;
    last_seen_at: string;
    matches_seen: number;
    linked_player_id: string | null;
}

export interface CollectRun {
    id: string;
    triggered_by: string | null;
    ea_club_id: string | null;
    is_cron: boolean;
    status: 'running' | 'completed' | 'failed';
    clubs_processed: number;
    matches_new: number;
    matches_skipped: number;
    started_at: string;
    finished_at: string | null;
    error_message: string | null;
    scope: 'cron' | 'tournament' | 'club';
    collect_token: string | null;
    collect_token_expires_at: string | null;
    clubs_total: number;
    clubs_failed: number;
    target_ea_club_ids: unknown;
}

export interface Claim {
    id: string;
    user_id: string;
    discovered_club_id: string;
    photo_url: string;
    status: ClaimStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    rejection_reason: string | null;
    created_at: string;
    updated_at: string;
}

export interface Match {
    id: string;
    ea_match_id: string;
    match_timestamp: string;
    home_club_id: string | null;
    away_club_id: string | null;
    home_ea_club_id: string;
    away_ea_club_id: string;
    home_club_name: string;
    away_club_name: string;
    home_score: number;
    away_score: number;
    match_type: MatchType;
    tournament_id: string | null;
    tournament_round: string | null;
    matchmaking_id: string | null;
    collected_at: string;
    raw_data: unknown;
}

export interface MatchPlayer {
    id: string;
    match_id: string;
    player_id: string | null;
    ea_gamertag: string;
    club_id: string | null;
    ea_club_id: string;
    ea_position: EaPositionCategory;
    resolved_position: PlayerPosition | null;
    goals: number;
    assists: number;
    rating: number | null;
    passes_completed: number;
    passes_attempted: number;
    tackles_made: number;
    tackles_attempted: number;
    shots: number;
    shots_on_target: number;
    yellow_cards: number;
    red_cards: number;
    clean_sheets: number;
    saves: number;
    man_of_match: boolean;
    minutes_played: number;
    interceptions: number;
    possession: number | null;
}

export interface Lineup {
    id: string;
    club_id: string;
    match_id: string | null;
    name: string;
    formation: string;
    is_default: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface LineupPlayer {
    id: string;
    lineup_id: string;
    player_id: string;
    position: PlayerPosition;
    is_starter: boolean;
    sort_order: number;
}

export interface PlayerStatsView {
    player_id: string;
    ea_gamertag: string;
    primary_position: PlayerPosition;
    user_id: string;
    total_matches: number;
    total_goals: number;
    total_assists: number;
    avg_rating: number | null;
    total_passes: number;
    total_tackles: number;
    total_saves: number;
    total_clean_sheets: number;
    total_mom: number;
    total_yellows: number;
    total_reds: number;
    best_rating: number | null;
    total_minutes: number;
}

export interface PlayerStatsByPositionView {
    player_id: string;
    resolved_position: PlayerPosition;
    matches_at_position: number;
    goals: number;
    assists: number;
    avg_rating: number | null;
    tackles: number;
    saves: number;
    clean_sheets: number;
}

export interface Tournament {
    id: string;
    name: string;
    type: TournamentType;
    format: TournamentFormat;
    status: TournamentStatus;
    capacity_min: number;
    capacity_max: number;
    group_count: number | null;
    teams_per_group: number | null;
    advance_per_group: number | null;
    scheduled_date: string;
    start_time: string;
    registration_deadline: string | null;
    entry_fee: number;
    prize_pool: number;
    current_round: string | null;
    confederation_id: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface TournamentEntry {
    id: string;
    tournament_id: string;
    club_id: string;
    enrolled_by: string;
    payment_status: PaymentStatus;
    seed: number | null;
    group_letter: string | null;
    eliminated_at: string | null;
    final_position: number | null;
    created_at: string;
    updated_at: string;
}

export interface Payment {
    id: string;
    club_id: string;
    tournament_id: string | null;
    user_id: string;
    gateway: 'mercadopago' | 'stripe';
    gateway_payment_id: string | null;
    gateway_status: string | null;
    amount: number;
    currency: string;
    description: string | null;
    status: PaymentStatus;
    paid_at: string | null;
    refunded_at: string | null;
    refund_reason: string | null;
    pix_qr_code: string | null;
    pix_copy_paste: string | null;
    pix_expiration: string | null;
    subscription_id: string | null;
    is_recurring: boolean;
    created_at: string;
    updated_at: string;
}

export interface TrustScore {
    id: string;
    club_id: string;
    strikes: number;
    is_trusted: boolean;
    suspended_until: string | null;
    banned_until: string | null;
    last_strike_at: string | null;
    notes: string | null;
    updated_at: string;
}

export interface Subscription {
    id: string;
    user_id: string | null;
    club_id: string | null;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    gateway: string;
    gateway_subscription_id: string | null;
    amount: number;
    current_period_start: string;
    current_period_end: string;
    cancelled_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    data: unknown;
    is_read: boolean;
    created_at: string;
}
