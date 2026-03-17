import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { advanceWinnerInBracket, advanceToNextRound, isTournamentFinished } from '@/lib/tournament/bracket';
import { requireModeratorOrAdmin } from '@/app/api/moderation/_auth';

const schema = z.object({
  bracket_id: z.string().uuid(),
  winner_entry_id: z.string().uuid(),
  home_score: z.number().int().min(0),
  away_score: z.number().int().min(0),
});

export async function POST(request: NextRequest) {
  const auth = await requireModeratorOrAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { bracket_id, winner_entry_id, home_score, away_score } = parsed.data;
  const admin = createAdminClient();

  // Load bracket and validate winner
  const { data: bracket } = await admin
    .from('tournament_brackets')
    .select('id, tournament_id, home_entry_id, away_entry_id, home_club_id, away_club_id, status')
    .eq('id', bracket_id)
    .maybeSingle();

  if (!bracket) return NextResponse.json({ error: 'bracket_not_found' }, { status: 404 });
  if (bracket.status === 'completed') return NextResponse.json({ error: 'bracket_already_completed' }, { status: 409 });

  const validEntries = [bracket.home_entry_id, bracket.away_entry_id].filter(Boolean);
  if (!validEntries.includes(winner_entry_id)) {
    return NextResponse.json({ error: 'winner_not_in_bracket' }, { status: 400 });
  }

  const winnerClubId =
    bracket.home_entry_id === winner_entry_id ? bracket.home_club_id : bracket.away_club_id;

  if (!winnerClubId) return NextResponse.json({ error: 'winner_club_not_found' }, { status: 400 });

  await advanceWinnerInBracket(bracket_id, winner_entry_id, winnerClubId, home_score, away_score, admin);
  await advanceToNextRound(bracket.tournament_id, admin);

  const finished = await isTournamentFinished(bracket.tournament_id, admin);

  return NextResponse.json({ success: true, tournamentFinished: finished });
}
