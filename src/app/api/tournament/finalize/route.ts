import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireModeratorOrAdmin } from '@/app/api/moderation/_auth';
import { isTournamentFinished } from '@/lib/tournament/bracket';
import { computeHallOfFameAwards, persistHallOfFameAwards } from '@/lib/tournament/hallOfFame';
import { calculatePrizeDistribution } from '@/lib/tournament/scoring';

const schema = z.object({
  tournament_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const auth = await requireModeratorOrAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { tournament_id } = parsed.data;
  const admin = createAdminClient();

  const { data: tournament } = await admin
    .from('tournaments')
    .select('id, name, status, capacity_max, entry_fee')
    .eq('id', tournament_id)
    .maybeSingle();

  if (!tournament) return NextResponse.json({ error: 'tournament_not_found' }, { status: 404 });
  if (tournament.status === 'finished') return NextResponse.json({ error: 'already_finished' }, { status: 409 });
  if (!['in_progress', 'confirmed'].includes(tournament.status)) {
    return NextResponse.json({ error: 'tournament_not_active' }, { status: 409 });
  }

  const finished = await isTournamentFinished(tournament_id, admin);
  if (!finished) {
    return NextResponse.json({ error: 'brackets_not_completed' }, { status: 409 });
  }

  // Find final bracket (last round, single match)
  const { data: finalBracket } = await admin
    .from('tournament_brackets')
    .select('id, winner_entry_id, home_entry_id, away_entry_id, match_id')
    .eq('tournament_id', tournament_id)
    .eq('status', 'completed')
    .order('round_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!finalBracket?.winner_entry_id) {
    return NextResponse.json({ error: 'final_bracket_no_winner' }, { status: 409 });
  }

  // Resolve winner club from tournament_entries (winner_club_id column does not exist in brackets)
  const { data: winnerEntry } = await admin
    .from('tournament_entries')
    .select('club_id')
    .eq('id', finalBracket.winner_entry_id)
    .maybeSingle();

  if (!winnerEntry?.club_id) {
    return NextResponse.json({ error: 'winner_club_not_found' }, { status: 409 });
  }

  const winnerClubId = winnerEntry.club_id;
  const runnerUpEntryId =
    finalBracket.home_entry_id === finalBracket.winner_entry_id
      ? finalBracket.away_entry_id
      : finalBracket.home_entry_id;

  // Set final_position for champion and runner-up
  await admin
    .from('tournament_entries')
    .update({ final_position: 1 })
    .eq('id', finalBracket.winner_entry_id);

  if (runnerUpEntryId) {
    await admin
      .from('tournament_entries')
      .update({ final_position: 2, eliminated_at: new Date().toISOString() })
      .eq('id', runnerUpEntryId)
      .is('eliminated_at', null);
  }

  // Compute Hall of Fame
  const awards = await computeHallOfFameAwards(
    tournament_id,
    winnerClubId,
    finalBracket.match_id ?? null,
    admin
  );
  await persistHallOfFameAwards(awards, admin);

  // Prize distribution
  const { data: paidEntries } = await admin
    .from('tournament_entries')
    .select('id', { count: 'exact', head: false })
    .eq('tournament_id', tournament_id)
    .eq('payment_status', 'paid');

  const paidCount = paidEntries?.length ?? 0;
  const prizes = calculatePrizeDistribution(tournament.entry_fee, paidCount);

  // Mark tournament as finished
  await admin
    .from('tournaments')
    .update({ status: 'finished', prize_pool: prizes.champion + prizes.runnerUp })
    .eq('id', tournament_id);

  console.info('tournament.finalized', { tournament_id, winnerClubId, awardsCount: awards.length });

  return NextResponse.json({
    success: true,
    champion: { club_id: winnerClubId },
    prizeDistribution: prizes,
    awardsCount: awards.length,
  });
}
