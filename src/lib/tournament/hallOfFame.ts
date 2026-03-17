/**
 * Hall of Fame — cálculo e persistência dos awards de torneio.
 * SRP: apenas extração e salvamento dos awards a partir dos match_players.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { HallOfFameAward } from '@/types';

type AdminClient = ReturnType<typeof createAdminClient>;

type PlayerAggregated = {
  ea_gamertag: string;
  player_id: string | null;
  club_id: string | null;
  goals: number;
  assists: number;
  tackles: number;
  clean_sheets: number;
  ratings: number[];
  matches: number;
};

type HofAwardRow = {
  tournament_id: string;
  award: HallOfFameAward;
  club_id: string | null;
  player_id: string | null;
  ea_gamertag: string | null;
  stat_value: number | null;
  stat_detail: Record<string, unknown> | null;
};

/**
 * Calcula os 7 awards do Hall of Fame a partir dos match_players
 * de todas as partidas do torneio.
 *
 * @param tournamentId - ID do torneio
 * @param winnerClubId - ID do clube campeão
 * @param finalMatchId - ID da partida final (para MVP)
 * @param admin - cliente admin do Supabase
 */
export async function computeHallOfFameAwards(
  tournamentId: string,
  winnerClubId: string,
  finalMatchId: string | null,
  admin: AdminClient
): Promise<HofAwardRow[]> {
  // Fetch all match_players for this tournament
  const { data: matchPlayers } = await admin
    .from('match_players')
    .select('player_id, ea_gamertag, club_id, goals, assists, tackles_made, clean_sheets, rating, man_of_match, match_id')
    .in(
      'match_id',
      // subquery via join: all matches belonging to this tournament
      (await admin.from('matches').select('id').eq('tournament_id', tournamentId)).data?.map(
        (m) => m.id
      ) ?? []
    );

  if (!matchPlayers || matchPlayers.length === 0) {
    // Minimal award: champion only
    return [
      {
        tournament_id: tournamentId,
        award: 'champion',
        club_id: winnerClubId,
        player_id: null,
        ea_gamertag: null,
        stat_value: null,
        stat_detail: null,
      },
    ];
  }

  // Aggregate by ea_gamertag
  const statsMap = new Map<string, PlayerAggregated>();
  for (const mp of matchPlayers) {
    const key = mp.ea_gamertag;
    const existing: PlayerAggregated = statsMap.get(key) ?? {
      ea_gamertag: mp.ea_gamertag,
      player_id: mp.player_id ?? null,
      club_id: mp.club_id ?? null,
      goals: 0,
      assists: 0,
      tackles: 0,
      clean_sheets: 0,
      ratings: [] as number[],
      matches: 0,
    };
    existing.goals += mp.goals ?? 0;
    existing.assists += mp.assists ?? 0;
    existing.tackles += mp.tackles_made ?? 0;
    existing.clean_sheets += mp.clean_sheets ?? 0;
    if (mp.rating != null) existing.ratings.push(mp.rating as number);
    existing.matches++;
    statsMap.set(key, existing);
  }

  const players = Array.from(statsMap.values());

  const topBy = (
    key: keyof PlayerAggregated,
    filter?: (p: PlayerAggregated) => boolean
  ): PlayerAggregated | null => {
    const candidates = filter ? players.filter(filter) : players;
    if (candidates.length === 0) return null;
    return candidates.reduce((best, p) => ((p[key] as number) > (best[key] as number) ? p : best));
  };

  const avgRating = (p: PlayerAggregated) =>
    p.ratings.length > 0 ? p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length : 0;

  const topScorer = topBy('goals');
  const topAssister = topBy('assists');
  const pitbull = topBy('tackles');
  const muralha = topBy('clean_sheets');
  const bestRating = players
    .filter((p) => p.ratings.length >= 3)
    .reduce<PlayerAggregated | null>(
      (best, p) => (!best || avgRating(p) > avgRating(best) ? p : best),
      null
    );

  // MVP Final: man_of_match in the final match
  const finalMvpRow = finalMatchId
    ? matchPlayers.find((mp) => mp.match_id === finalMatchId && mp.man_of_match)
    : null;

  const makeRow = (
    award: HallOfFameAward,
    player: PlayerAggregated | null,
    statValue: number | null = null,
    overrideClubId?: string
  ): HofAwardRow => ({
    tournament_id: tournamentId,
    award,
    club_id: overrideClubId ?? player?.club_id ?? null,
    player_id: player?.player_id ?? null,
    ea_gamertag: player?.ea_gamertag ?? null,
    stat_value: statValue,
    stat_detail: null,
  });

  const awards: HofAwardRow[] = [
    // champion: club-level, no player
    {
      tournament_id: tournamentId,
      award: 'champion',
      club_id: winnerClubId,
      player_id: null,
      ea_gamertag: null,
      stat_value: null,
      stat_detail: null,
    },
    makeRow('top_scorer', topScorer, topScorer?.goals ?? null),
    makeRow('top_assister', topAssister, topAssister?.assists ?? null),
    makeRow('pitbull', pitbull, pitbull?.tackles ?? null),
    makeRow('muralha', muralha, muralha?.clean_sheets ?? null),
    makeRow(
      'best_avg_rating',
      bestRating,
      bestRating ? Math.round(avgRating(bestRating) * 10) / 10 : null
    ),
  ];

  // MVP Final
  if (finalMvpRow) {
    awards.push({
      tournament_id: tournamentId,
      award: 'mvp_final',
      club_id: finalMvpRow.club_id ?? null,
      player_id: finalMvpRow.player_id ?? null,
      ea_gamertag: finalMvpRow.ea_gamertag,
      stat_value: finalMvpRow.rating ?? null,
      stat_detail: null,
    });
  }

  return awards.filter((a) => a.club_id || a.player_id || a.ea_gamertag);
}

/**
 * Persiste os awards no banco, fazendo upsert por (tournament_id, award).
 */
export async function persistHallOfFameAwards(
  awards: HofAwardRow[],
  admin: AdminClient
): Promise<void> {
  if (awards.length === 0) return;
  await admin
    .from('hall_of_fame')
    .upsert(awards, { onConflict: 'tournament_id,award' });
}
