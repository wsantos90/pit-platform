import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import {
  detectWinnerFromMatch,
  advanceWinnerInBracket,
  advanceToNextRound,
  isTournamentFinished,
  type BracketRow,
} from '@/lib/tournament/bracket';

const cronHeaderSchema = z.object({
  secret: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET;
  const parsed = cronHeaderSchema.safeParse({
    secret: request.headers.get('x-cron-secret') ?? '',
  });

  if (!expectedSecret || !parsed.success || parsed.data.secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  let tournamentsProcessed = 0;
  let winnersAdvanced = 0;
  let tournamentsFinished = 0;

  try {
    // Load active tournaments
    const { data: tournaments } = await admin
      .from('tournaments')
      .select('id, scheduled_date, start_time, status')
      .in('status', ['confirmed', 'in_progress']);

    for (const tournament of tournaments ?? []) {
      tournamentsProcessed++;

      // Load pending brackets with both clubs assigned
      const { data: pendingBrackets } = await admin
        .from('tournament_brackets')
        .select('id, tournament_id, round, round_order, match_order, home_entry_id, away_entry_id, home_club_id, away_club_id, home_score, away_score, winner_entry_id, next_bracket_id, status, match_id')
        .eq('tournament_id', tournament.id)
        .eq('status', 'scheduled')
        .not('home_club_id', 'is', null)
        .not('away_club_id', 'is', null);

      for (const bracket of pendingBrackets ?? []) {
        const b = bracket as BracketRow;
        if (!b.home_club_id || !b.away_club_id) continue;

        // Find a collected match for this bracket pair on tournament night
        const { data: match } = await admin
          .from('matches')
          .select('id, home_club_id, away_club_id, home_score, away_score')
          .eq('tournament_id', tournament.id)
          .gte('match_timestamp', `${tournament.scheduled_date}T00:00:00Z`)
          .or(`and(home_club_id.eq.${b.home_club_id},away_club_id.eq.${b.away_club_id}),and(home_club_id.eq.${b.away_club_id},away_club_id.eq.${b.home_club_id})`)
          .maybeSingle();

        if (!match) continue;

        const detected = detectWinnerFromMatch(b, {
          id: match.id,
          home_club_id: match.home_club_id,
          away_club_id: match.away_club_id,
          home_score: match.home_score,
          away_score: match.away_score,
        });

        if (!detected) continue; // empate — aguarda resolução manual

        await advanceWinnerInBracket(
          b.id,
          detected.winnerEntryId,
          detected.winnerClubId,
          detected.homeScore,
          detected.awayScore,
          admin
        );

        // Link match to bracket
        await admin
          .from('tournament_brackets')
          .update({ match_id: match.id })
          .eq('id', b.id);

        winnersAdvanced++;
      }

      await advanceToNextRound(tournament.id, admin);

      // Auto-finalize if all brackets completed
      const finished = await isTournamentFinished(tournament.id, admin);
      if (finished) {
        await admin
          .from('tournaments')
          .update({ status: 'in_progress' }) // finalize route completes it
          .eq('id', tournament.id)
          .eq('status', 'confirmed');

        tournamentsFinished++;
      }
    }

    return NextResponse.json({ tournamentsProcessed, winnersAdvanced, tournamentsFinished });
  } catch (err) {
    logger.error('[Cron/Tournament]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

