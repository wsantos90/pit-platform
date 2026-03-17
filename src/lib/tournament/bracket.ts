/**
 * Tournament Bracket — funções auxiliares de avanço de vencedores.
 *
 * A geração de bracket (estrutura inicial) fica em:
 *   /api/moderation/tournaments/[id]/bracket (não duplicar aqui).
 *
 * Este módulo expõe apenas as funções de avanço/detecção usadas
 * pelo cron e pelas API routes públicas.
 *
 * SRP: apenas avanço de vencedores em brackets existentes.
 */

import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

export type BracketRow = {
  id: string;
  tournament_id: string;
  round: string;
  round_order: number;
  match_order: number;
  home_entry_id: string | null;
  away_entry_id: string | null;
  home_club_id: string | null;
  away_club_id: string | null;
  home_score: number | null;
  away_score: number | null;
  winner_entry_id: string | null;
  winner_club_id: string | null;
  next_bracket_id: string | null;
  status: string;
  match_id: string | null;
};

export type MatchRow = {
  id: string;
  home_club_id: string | null;
  away_club_id: string | null;
  home_score: number | null;
  away_score: number | null;
};

export type DetectedWinner = {
  winnerEntryId: string;
  winnerClubId: string;
  homeScore: number;
  awayScore: number;
};

/**
 * Detecta o vencedor de um bracket a partir de um match coletado.
 * Função pura — não faz I/O.
 * Retorna null se empate ou se não houver dados suficientes.
 */
export function detectWinnerFromMatch(
  bracket: BracketRow,
  match: MatchRow
): DetectedWinner | null {
  const homeScore = match.home_score ?? 0;
  const awayScore = match.away_score ?? 0;

  if (homeScore === awayScore) return null; // empate — aguarda resolução manual

  // Identificar qual entry corresponde ao home/away do match coletado
  const matchHomeIsHome = match.home_club_id === bracket.home_club_id;

  const winnerIsMatchHome = homeScore > awayScore;

  if (matchHomeIsHome) {
    // match.home = bracket.home
    const winnerEntryId = winnerIsMatchHome ? bracket.home_entry_id : bracket.away_entry_id;
    const winnerClubId = winnerIsMatchHome ? bracket.home_club_id : bracket.away_club_id;
    if (!winnerEntryId || !winnerClubId) return null;
    return {
      winnerEntryId,
      winnerClubId,
      homeScore: winnerIsMatchHome ? homeScore : awayScore,
      awayScore: winnerIsMatchHome ? awayScore : homeScore,
    };
  } else {
    // match.home = bracket.away
    const winnerEntryId = winnerIsMatchHome ? bracket.away_entry_id : bracket.home_entry_id;
    const winnerClubId = winnerIsMatchHome ? bracket.away_club_id : bracket.home_club_id;
    if (!winnerEntryId || !winnerClubId) return null;
    return {
      winnerEntryId,
      winnerClubId,
      homeScore: winnerIsMatchHome ? awayScore : homeScore,
      awayScore: winnerIsMatchHome ? homeScore : awayScore,
    };
  }
}

/**
 * Avança o vencedor de um bracket para o próximo.
 * Marca o bracket atual como 'completed' e propaga club/entry para next_bracket_id.
 * Propaga para home se match_order par, away se ímpar.
 */
export async function advanceWinnerInBracket(
  bracketId: string,
  winnerEntryId: string,
  winnerClubId: string,
  homeScore: number,
  awayScore: number,
  admin: AdminClient
): Promise<void> {
  const { data: bracket } = await admin
    .from('tournament_brackets')
    .select('next_bracket_id, match_order, home_entry_id, away_entry_id')
    .eq('id', bracketId)
    .maybeSingle();

  if (!bracket) return;

  // Mark current bracket as completed (winner_club_id column does not exist)
  await admin
    .from('tournament_brackets')
    .update({
      winner_entry_id: winnerEntryId,
      home_score: homeScore,
      away_score: awayScore,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', bracketId);

  // Mark loser as eliminated (eliminated_at is TEXT — store round name placeholder)
  const loserEntryId =
    bracket.home_entry_id === winnerEntryId ? bracket.away_entry_id : bracket.home_entry_id;
  if (loserEntryId) {
    await admin
      .from('tournament_entries')
      .update({ eliminated_at: 'eliminated' })
      .eq('id', loserEntryId)
      .is('eliminated_at', null);
  }

  // Propagate winner to next bracket slot
  if (bracket.next_bracket_id) {
    // Even match_order → home slot, odd → away slot
    const isHomeSlot = bracket.match_order % 2 === 0;
    const updatePayload = isHomeSlot
      ? { home_entry_id: winnerEntryId, home_club_id: winnerClubId }
      : { away_entry_id: winnerEntryId, away_club_id: winnerClubId };

    await admin
      .from('tournament_brackets')
      .update(updatePayload)
      .eq('id', bracket.next_bracket_id);
  }
}

/**
 * Verifica se todos os brackets de uma rodada estão completos.
 */
export async function checkRoundComplete(
  tournamentId: string,
  round: string,
  admin: AdminClient
): Promise<boolean> {
  const { count } = await admin
    .from('tournament_brackets')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('round', round)
    .neq('status', 'completed');

  return (count ?? 1) === 0;
}

/**
 * Atualiza `tournaments.current_round` para a primeira rodada
 * com brackets ainda não completos.
 */
export async function advanceToNextRound(
  tournamentId: string,
  admin: AdminClient
): Promise<void> {
  const { data: pending } = await admin
    .from('tournament_brackets')
    .select('round, round_order')
    .eq('tournament_id', tournamentId)
    .neq('status', 'completed')
    .order('round_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pending?.round) {
    await admin
      .from('tournaments')
      .update({ current_round: pending.round, status: 'in_progress' })
      .eq('id', tournamentId)
      .in('status', ['confirmed', 'in_progress']);
  }
}

/**
 * Verifica se todos os brackets de um torneio estão completos.
 */
export async function isTournamentFinished(
  tournamentId: string,
  admin: AdminClient
): Promise<boolean> {
  const { count } = await admin
    .from('tournament_brackets')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .neq('status', 'completed');

  return (count ?? 1) === 0;
}
